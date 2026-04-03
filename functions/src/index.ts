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
    let myRestaurantId = auth.token.restaurant_id;
    let myRole = auth.token.role;

    // Se o usuário foi criado direto no frontend, ele não terá custom claims no token ainda.
    // Lemos do Firestore para validar e aproveitar para "curar" (self-heal) o token.
    if (!myRole || !myRestaurantId) {
      const userDoc = await db.collection("users").doc(auth.uid).get();
      if (userDoc.exists) {
        const udata = userDoc.data();
        myRole = udata?.role;
        myRestaurantId = udata?.restaurant_id;
        
        // Aplica os claims que faltavam no dono
        if (myRole === "admin" && myRestaurantId) {
          await admin.auth().setCustomUserClaims(auth.uid, {
            restaurant_id: myRestaurantId,
            role: "admin",
          });
        }
      }
    }

    if (myRole !== "admin") {
      throw new HttpsError("permission-denied", "Apenas admins do restaurante autorizados.");
    }
    
    if (!myRestaurantId) {
      throw new HttpsError("failed-precondition", "Restaurante não encontrado no perfil do usuário.");
    }

    const { role, name, email, password } = data; // role: waiter, kitchen, admin

    // 1. Criar usuário no Auth via Admin SDK (evita deslogar o admin atual que está fazendo o convite)
    let targetUser;
    try {
      targetUser = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: name,
      });
    } catch (e: any) {
      throw new HttpsError("already-exists", e.message || "Erro ao criar usuário.");
    }
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
    });

    return { success: true, role, restaurant_id: myRestaurantId, targetUid };
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
