import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 1. Atribuição de Custom Claims e Profile (Callable)
// Chamado pelo App React para initial Onboarding do Admin, ou para convite de Time.
export const setCustomClaimsAndProfile = onCall(async (request) => {
  const { auth, data } = request;
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

      // 1. Log para Depuração (Essencial para entender falhas de permissão)
      logger.info(`Invite Staff Triggered: Requester UID=${auth.uid}, Role=${myRole}, RestID=${myRestaurantId}`);

      // Se o usuário foi criado direto no frontend, ele não terá custom claims no token ainda.
      // Lemos do Firestore para validar e aproveitar para "curar" (self-heal) o token.
      if (!myRole || !myRestaurantId) {
        logger.info(`Claims missing in token, checking Firestore for UID=${auth.uid}`);
        const userDoc = await db.collection("users").doc(auth.uid).get();
        if (userDoc.exists) {
          const udata = userDoc.data();
          myRole = udata?.role;
          myRestaurantId = udata?.restaurant_id;
          
          // Aplica os claims que faltavam no dono se ele for admin e tiver rest_id no doc
          if (myRole === "admin" && myRestaurantId) {
            logger.info(`Self-healing Admin Claims for ${auth.uid} with RestID=${myRestaurantId}`);
            await admin.auth().setCustomUserClaims(auth.uid, {
              restaurant_id: myRestaurantId,
              role: "admin",
            });
          }
        } else {
           logger.error(`User document not found for UID=${auth.uid}`);
        }
      }

      // Se ainda não temos o restID no token/doc, mas veio no data (segurança menor, mas útil para o primeiro setup)
      if (!myRestaurantId && data.restaurant_id) {
        logger.info(`Using restaurant_id from request data as fallback: ${data.restaurant_id}`);
        myRestaurantId = data.restaurant_id;
      }

      if (myRole !== "admin") {
        logger.warn(`Permission Denied: User role is ${myRole}, expected admin.`);
        throw new HttpsError("permission-denied", "Apenas administradores podem convidar membros.");
      }
      
      if (!myRestaurantId) {
        logger.warn(`Failed Precondition: Restaurant ID not found.`);
        throw new HttpsError("failed-precondition", "Não foi possível identificar o seu restaurante.");
      }

      const { role, name, email, password } = data; // role: waiter, kitchen, admin

      if (!email || !password || !name || !role) {
        throw new HttpsError("invalid-argument", "Todos os campos (nome, email, senha, cargo) são obrigatórios.");
      }

      // 2. Criar usuário no Auth via Admin SDK
      let targetUser;
      try {
        targetUser = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name,
        });
        logger.info(`User Created in Auth: UID=${targetUser.uid}, Email=${email}`);
      } catch (authError: any) {
        logger.error("Error creating user in Auth:", authError);
        // Tratamento de erro amigável para e-mail já existente
        if (authError.code === "auth/email-already-exists") {
          throw new HttpsError("already-exists", "Este e-mail já está sendo usado por outro usuário.");
        }
        throw new HttpsError("internal", `Erro no Auth: ${authError.message}`);
      }
      const targetUid = targetUser.uid;

      try {
        // 3. Seta Custom Claims
        await admin.auth().setCustomUserClaims(targetUid, {
          restaurant_id: myRestaurantId,
          role: role, 
        });

        // 4. Cria documento no Firestore
        await db.collection("users").doc(targetUid).set({
          uid: targetUid,
          restaurant_id: myRestaurantId,
          role: role,
          name: name,
          email: email,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        logger.info(`Staff Profile Created in Firestore: UID=${targetUid}`);
      } catch (postAuthErr: any) {
        logger.error(`Error configuring profile for ${targetUid}:`, postAuthErr);
        throw new HttpsError("internal", `Usuário criado (${targetUid}), mas houve erro ao definir permissões: ${postAuthErr.message}`);
      }

      return { success: true, role, restaurant_id: myRestaurantId, targetUid };

    } catch (globalErr: any) {
       logger.error("Global Error in invite_staff:", globalErr);
       // Se for um HttpsError, repassa
       if (globalErr instanceof HttpsError) throw globalErr;
       // Caso contrário, encapsula
       throw new HttpsError("internal", `Erro crítico no servidor: ${globalErr.message}`);
    }
  }


  throw new HttpsError("invalid-argument", "Action not understood");
});


// 2. Geração de Ordem Numérica Sequencial à prova de Race Conditions (Trigger)
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
      // Transaction garante atomicidade na contagem do 1, 2, 3...
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

      // Atualiza o documento final com seu número sequencial
      await snap.ref.update({ order_number: orderNumber });
      
    } catch (err) {
      console.error(`Erro ao transacionar order_number para rest_id [${restaurantId}]`, err);
    }
  }
);

// 3. Billing & SaaS Automation (Webhooks)
export { stripeWebhook } from "./billing";
export { infinitepayWebhook } from "./infinitepay";
/**
 * SAAS MASTER COUNTERS (Pulse)
 * Mantém contadores globais sincronizados em tempo real.
 */
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
  
  logger.info("Pulse: Contador de restaurantes incrementado");
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
  
  logger.info("Pulse: Contador de restaurantes decrementado");
});

/**
 * 4. Trigger de Notificação para Novos Pedidos
 */
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

/**
 * WEB PUSH NOTIFICATIONS (FCM)
 * Dispara notificações Push para todos os membros da equipe do restaurante.
 */
export const onNotificationCreated = onDocumentCreated("notifications/{notifId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const notif = snap.data();
  const restaurantId = notif.restaurant_id;
  if (!restaurantId) return;

  // 1. Busca todos os usuários vinculados a este restaurante que possuem tokens FCM
  const staffSnap = await db.collection("users")
    .where("restaurant_id", "==", restaurantId)
    .get();

  const tokens: string[] = [];
  staffSnap.forEach(doc => {
    const userData = doc.data();
    if (userData.fcm_tokens && Array.isArray(userData.fcm_tokens)) {
      tokens.push(...userData.fcm_tokens);
    }
  });

  if (tokens.length === 0) {
    logger.info(`Nenhum token FCM encontrado para o restaurante ${restaurantId}`);
    return;
  }

  // 2. Prepara a carga da notificação
  const titles: Record<string, string> = {
    table_opening_request: "🔓 Solicitação de Abertura",
    order_created: "🍕 Novo Pedido!",
    payment_partial: "💰 Pagamento Parcial",
    payment_completed: "✅ Mesa Finalizada",
  };

  const bodies: Record<string, string> = {
    table_opening_request: "Cliente aguardando liberação",
    order_created: "Um novo pedido acaba de chegar",
    payment_partial: "Um pagamento parcial foi registrado",
    payment_completed: "A conta foi totalmente paga",
  };

  const payload = {
    notification: {
      title: titles[notif.type] || "🔔 Nova Atividade",
      body: `${notif.table_label}: ${bodies[notif.type] || "Verifique o painel"}`,
    },
    data: {
      restaurant_id: restaurantId,
      type: notif.type,
      click_action: "/admin/kds", 
    },
    tokens: [...new Set(tokens)], 
  };

  // 3. Envia via Multicast (até 500 tokens por vez)
  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    logger.info(`Notificações enviadas: ${response.successCount} sucesso, ${response.failureCount} falha.`);
  } catch (err) {
    logger.error("Erro ao enviar multicast FCM:", err);
  }
});
