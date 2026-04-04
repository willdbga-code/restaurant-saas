import * as functions from "firebase-functions";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const logger = functions.logger;
const HttpsError = functions.https.HttpsError;

// 1. Atribuição de Custom Claims e Profile (v1)
// Chamado pelo App React para initial Onboarding do Admin, ou para convite de Time.
export const setCustomClaimsAndProfile = functions.region("us-central1").https.onCall(async (data, context) => {
  const auth = context.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  // --- Fluxo 1: Onboarding de Dono de Restaurante ---
  if (data.action === "onboard_owner") {
    // Gerar um ID de tenant isolado
    const restaurantId = "rest_" + Date.now().toString(36);
    const userId = auth.uid;

    // Seta Custom Claim
    await admin.auth().setCustomUserClaims(userId, {
      restaurant_id: restaurantId,
      role: "admin",
    });

    // Cria documento do restaurante
    await db.collection("restaurants").doc(restaurantId).set({
      restaurant_id: restaurantId,
      name: data.restaurantName,
      slug: data.slug,
      owner_uid: userId,
      is_active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Cria documento do usuário admin
    await db.collection("users").doc(userId).set({
      uid: userId,
      restaurant_id: restaurantId,
      role: "admin",
      name: data.userName,
      email: auth.token.email || "",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, restaurantId, role: "admin" };
  }

  // --- Fluxo 2: Convidar Equipe (Garçom / Cozinha / Admin) ---
  if (data.action === "invite_staff") {
    try {
      let myRestaurantId = auth?.token?.restaurant_id;
      let myRole = auth?.token?.role;

      // 1. Log para Depuração 
      logger.info(`Invite Staff Triggered: Requester UID=${auth.uid}, Role=${myRole}, RestID=${myRestaurantId}`);

      if (!myRole || !myRestaurantId) {
        const userDoc = await db.collection("users").doc(auth.uid).get();
        if (userDoc.exists) {
          const udata = userDoc.data();
          myRole = udata?.role;
          myRestaurantId = udata?.restaurant_id;
          
          if (myRole === "admin" && myRestaurantId) {
            await admin.auth().setCustomUserClaims(auth.uid, {
              restaurant_id: myRestaurantId,
              role: "admin",
            });
          }
        }
      }

      if (!myRestaurantId && data.restaurant_id) {
        myRestaurantId = data.restaurant_id;
      }

      if (myRole !== "admin") {
        throw new HttpsError("permission-denied", "Apenas administradores podem convidar membros.");
      }
      
      if (!myRestaurantId) {
        throw new HttpsError("failed-precondition", "Não foi possível identificar o seu restaurante.");
      }

      const { role, name, email, password } = data;

      if (!email || !password || !name || !role) {
        throw new HttpsError("invalid-argument", "Todos os campos são obrigatórios.");
      }

      // 2. Criar usuário no Auth
      let targetUser;
      try {
        targetUser = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name,
        });
      } catch (authError: any) {
        if (authError.code === "auth/email-already-exists") {
          throw new HttpsError("already-exists", "Este e-mail já está sendo usado.");
        }
        throw new HttpsError("internal", `Erro no Auth: ${authError.message}`);
      }
      const targetUid = targetUser.uid;

      try {
        await admin.auth().setCustomUserClaims(targetUid, {
          restaurant_id: myRestaurantId,
          role: role, 
        });

        await db.collection("users").doc(targetUid).set({
          uid: targetUid,
          restaurant_id: myRestaurantId,
          role: role,
          name: name,
          email: email,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (postAuthErr: any) {
        throw new HttpsError("internal", `Erro pós-criação: ${postAuthErr.message}`);
      }

      return { success: true, role, restaurant_id: myRestaurantId, targetUid };

    } catch (globalErr: any) {
       logger.error("Global Error in invite_staff:", globalErr);
       if (globalErr instanceof HttpsError) throw globalErr;
       throw new HttpsError("internal", `Erro crítico: ${globalErr.message}`);
    }
  }

  // --- Fluxo 3: Reivindicar Convite (Aceite de Equipe) ---
  if (data.action === "claim_invitation") {
    try {
      const { inviteId, name } = data;
      if (!inviteId) throw new HttpsError("invalid-argument", "ID de convite ausente.");

      const inviteRef = db.collection("invitations").doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        throw new HttpsError("not-found", "Convite não encontrado.");
      }

      const invData = inviteSnap.data();
      if (invData?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Este convite não está mais pendente.");
      }

      const { restaurant_id, role, email: inviteEmail } = invData;

      // 1. Seta Custom Claims
      await admin.auth().setCustomUserClaims(auth.uid, {
        restaurant_id: restaurant_id,
        role: role,
      });

      // 2. Cria/Atualiza perfil
      await db.collection("users").doc(auth.uid).set({
        uid: auth.uid,
        restaurant_id: restaurant_id,
        role: role,
        name: name || invData.name,
        email: auth.token.email || inviteEmail || "",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // 3. Marca convite como aceito
      await inviteRef.update({
        status: "accepted",
        accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        accepted_by: auth.uid,
      });

      logger.info(`Invitation ${inviteId} accepted by UID=${auth.uid}`);
      return { success: true, restaurant_id, role };

    } catch (err: any) {
      logger.error("Error in claim_invitation:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", `Erro ao aceitar convite: ${err.message}`);
    }
  }

  throw new HttpsError("invalid-argument", "Action not understood");
});


// 2. Geração de Ordem Numérica Sequencial (Trigger v2)
export const assignSequentialOrderNumber = onDocumentCreated(
  "orders/{orderId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    
    const data = snap.data();
    const restaurantId = data.restaurant_id;
    if (!restaurantId) return;

    const metaRef = db.collection("metadata").doc(restaurantId);

    try {
      const orderNumber = await db.runTransaction(async (t) => {
        const metaDoc = await t.get(metaRef);
        let newNumber = 1;
        
        if (metaDoc.exists) {
          const mData = metaDoc.data();
          newNumber = (mData?.last_order_number || 0) + 1;
          t.update(metaRef, { last_order_number: newNumber });
        } else {
          t.set(metaRef, { last_order_number: newNumber });
        }
        
        return newNumber;
      });

      await snap.ref.update({ order_number: orderNumber });
      
    } catch (err) {
      logger.error(`Erro ao transacionar order_number`, err);
    }
  }
);

// 3. Billing & SaaS Automation
export { stripeWebhook } from "./billing";
export { infinitepayWebhook } from "./infinitepay";

// 4. Pulse
export const onRestaurantCreatedPulse = onDocumentCreated("restaurants/{restaurantId}", async (event) => {
  const systemRef = db.collection("metadata").doc("system");
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(systemRef);
    const data = snap.data() || { total_restaurants: 0, active_restaurants: 0 };
    transaction.set(systemRef, {
      total_restaurants: (data.total_restaurants || 0) + 1,
      active_restaurants: (data.active_restaurants || 0) + 1,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  logger.info("Pulse: Contador incrementado");
});

export const onRestaurantDeletedPulse = onDocumentDeleted("restaurants/{restaurantId}", async (event) => {
  const systemRef = db.collection("metadata").doc("system");
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(systemRef);
    const data = snap.data();
    if (!data) return;
    transaction.set(systemRef, {
      total_restaurants: Math.max(0, (data.total_restaurants || 1) - 1),
      active_restaurants: Math.max(0, (data.active_restaurants || 1) - 1),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  logger.info("Pulse: Contador decrementado");
});

// 5. Notifications
export const onOrderCreatedNotification = onDocumentCreated("orders/{orderId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const order = snap.data();
  await db.collection("notifications").add({
    restaurant_id: order.restaurant_id,
    order_id: snap.id,
    table_label: order.table_label || "Balcão",
    type: "order_created",
    is_read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onNotificationCreated = onDocumentCreated("notifications/{notifId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const notif = snap.data();
  const restaurantId = notif.restaurant_id;
  if (!restaurantId) return;

  const staffSnap = await db.collection("users").where("restaurant_id", "==", restaurantId).get();
  const tokens: string[] = [];
  staffSnap.forEach(doc => {
    const userData = doc.data();
    if (userData.fcm_tokens && Array.isArray(userData.fcm_tokens)) {
      tokens.push(...userData.fcm_tokens);
    }
  });

  if (tokens.length === 0) return;

  const titles: Record<string, string> = {
    table_opening_request: "🔓 Solicitação de Abertura",
    order_created: "🍕 Novo Pedido!",
    payment_partial: "💰 Pagamento Parcial",
    payment_completed: "✅ Mesa Finalizada",
  };

  const payload = {
    notification: {
      title: titles[notif.type] || "🔔 Nova Atividade",
      body: `${notif.table_label}: Verifique o painel`,
    },
    data: {
      restaurant_id: restaurantId,
      type: notif.type,
      click_action: "/admin/kds", 
    },
    tokens: [...new Set(tokens)], 
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    logger.info(`Notificações enviadas: ${response.successCount}`);
  } catch (err) {
    logger.error("Erro FCM:", err);
  }
});
