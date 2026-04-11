import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 1. Atribuição de Custom Claims e Profile (v2)
 * Centraliza o onboarding e aceite de convites.
 */
export const setCustomClaimsAndProfile = onCall({ cors: true }, async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError("unauthenticated", "Usuário precisa estar logado para processar o convite.");
  }

  const action = data.action;

  // --- Fluxo 1: Onboarding de Dono ---
  if (action === "onboard_owner") {
    const restaurantId = "rest_" + Date.now().toString(36);
    const userId = auth.uid;

    await admin.auth().setCustomUserClaims(userId, {
      restaurant_id: restaurantId,
      role: "admin",
    });

    await db.collection("restaurants").doc(restaurantId).set({
      restaurant_id: restaurantId,
      name: data.restaurantName,
      slug: data.slug,
      owner_uid: userId,
      is_active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

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

  // --- Fluxo 2: Convidar Equipe ---
  if (action === "invite_staff") {
    try {
      const myRestaurantId = auth.token.restaurant_id;
      const myRole = auth.token.role;

      if (myRole !== "admin") {
        throw new HttpsError("permission-denied", "Apenas administradores podem convidar membros.");
      }

      const { role, name, email, password } = data;
      
      const targetUser = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      const targetUid = targetUser.uid;

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

      return { success: true, targetUid };
    } catch (err: any) {
      logger.error("Invite Staff Error:", err);
      throw new HttpsError("internal", err.message);
    }
  }

  // --- Fluxo 3: Aceitar Convite (Membro de Equipe) ---
  if (action === "claim_invitation") {
    try {
      const { inviteId, name } = data;
      if (!inviteId) throw new HttpsError("invalid-argument", "ID do convite ausente.");

      const inviteRef = db.collection("invitations").doc(inviteId);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        throw new HttpsError("not-found", "Convite não encontrado.");
      }

      const invData = inviteSnap.data();
      if (invData?.status !== "pending") {
        throw new HttpsError("failed-precondition", "Este convite já foi aceito ou expirou.");
      }

      const { restaurant_id, role, email: inviteEmail } = invData;

      // 1. Sincroniza Claims
      await admin.auth().setCustomUserClaims(auth.uid, {
        restaurant_id,
        role,
      });

      // 2. Atualiza Perfil
      await db.collection("users").doc(auth.uid).set({
        uid: auth.uid,
        restaurant_id,
        role,
        name: name || invData.name,
        email: auth.token.email || inviteEmail || "",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // 3. Finaliza Convite
      await inviteRef.update({
        status: "accepted",
        accepted_at: admin.firestore.FieldValue.serverTimestamp(),
        accepted_by: auth.uid,
      });

      logger.info(`Convite ${inviteId} aceito por ${auth.uid}`);
      return { success: true, restaurant_id, role };
    } catch (err: any) {
      logger.error("Claim Invitation Error:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", `Erro interno ao aceitar convite: ${err.message}`);
    }
  }

  throw new HttpsError("unimplemented", "Ação não suportada por este endpoint.");
});

// --- Triggers v2 ---
export const assignSequentialOrderNumber = onDocumentCreated("orders/{orderId}", async (event) => {
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
        newNumber = (metaDoc.data()?.last_order_number || 0) + 1;
        t.update(metaRef, { last_order_number: newNumber });
      } else {
        t.set(metaRef, { last_order_number: newNumber });
      }
      return newNumber;
    });

    await snap.ref.update({ order_number: orderNumber });
  } catch (err) {
    logger.error("Sequential Order Error:", err);
  }
});

export const onRestaurantCreatedPulse = onDocumentCreated("restaurants/{restaurantId}", async (event) => {
  const systemRef = db.collection("metadata").doc("system");
  await db.runTransaction(async (t) => {
    const snap = await t.get(systemRef);
    const data = snap.data() || { total_restaurants: 0, active_restaurants: 0 };
    t.set(systemRef, {
      total_restaurants: (data.total_restaurants || 0) + 1,
      active_restaurants: (data.active_restaurants || 0) + 1,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
});

export const onRestaurantDeletedPulse = onDocumentDeleted("restaurants/{restaurantId}", async (event) => {
  const systemRef = db.collection("metadata").doc("system");
  await db.runTransaction(async (t) => {
    const snap = await t.get(systemRef);
    const data = snap.data();
    if (!data) return;
    t.set(systemRef, {
      total_restaurants: Math.max(0, (data.total_restaurants || 1) - 1),
      active_restaurants: Math.max(0, (data.active_restaurants || 1) - 1),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
});

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
  const staffSnap = await db.collection("users").where("restaurant_id", "==", notif.restaurant_id).get();
  
  const tokens: string[] = [];
  staffSnap.forEach(doc => {
    const userData = doc.data();
    if (userData.fcm_tokens) tokens.push(...userData.fcm_tokens);
  });

  if (tokens.length === 0) return;

  const titles: Record<string, string> = {
    order_created: "🍕 Novo Pedido!",
    table_opening_request: "🔓 Solicitação de Abertura",
  };

  try {
    await admin.messaging().sendEachForMulticast({
      notification: {
        title: titles[notif.type] || "🔔 Nova Atividade",
        body: `${notif.table_label}: Verifique o painel`,
      },
      data: { click_action: "/admin/kds" },
      tokens: [...new Set(tokens)],
    });
  } catch (err) {
    logger.error("FCM Error:", err);
  }
});

export { stripeWebhook } from "./billing";
export { infinitepayWebhook } from "./infinitepay";

/**
 * 6. Auto-exclusão do cliente quando a conta é fechada.
 * Quando um pedido muda de qualquer status para "closed",
 * verifica se o waiter_uid pertence a um cliente anônimo e
 * deleta o documento do usuário + a conta anônima do Firebase Auth.
 */
export const onOrderClosed = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  // Só executa na transição exata para "closed"
  if (!before || !after) return;
  if (before.status === "closed" || after.status !== "closed") return;

  const waiterUid = after.waiter_uid as string | null;
  if (!waiterUid) {
    logger.info(`Pedido ${event.params.orderId} fechado sem waiter_uid, ignorando limpeza.`);
    return;
  }

  try {
    const userRef = db.collection("users").doc(waiterUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      logger.info(`Doc de usuário ${waiterUid} não encontrado, nada a limpar.`);
      return;
    }

    const userData = userSnap.data();
    
    // Só limpa se for um cliente (role: 'customer' ou sem role)
    if (userData?.role !== "customer") {
      logger.info(`Usuário ${waiterUid} tem role '${userData?.role}', não é cliente. Ignorando.`);
      return;
    }

    // 1. Deleta o documento do Firestore
    await userRef.delete();
    logger.info(`Doc do cliente ${waiterUid} (${userData?.customer_tag}) deletado após fechamento do pedido ${event.params.orderId}.`);

    // 2. Deleta o usuário anônimo do Firebase Auth (limpeza completa)
    try {
      await admin.auth().deleteUser(waiterUid);
      logger.info(`Usuário anônimo ${waiterUid} deletado do Firebase Auth.`);
    } catch (authErr: any) {
      // Silencia: o usuário pode já ter sido deletado ou a conta pode ser real
      logger.warn(`Não foi possível deletar Auth user ${waiterUid}: ${authErr.message}`);
    }

  } catch (err: any) {
    logger.error(`Erro ao limpar cliente ${waiterUid} após fechamento do pedido:`, err);
  }
});
