import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

// TODO: Instalar 'stripe' nas funções: cd functions && npm install stripe
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const db = admin.firestore();

/**
 * Webhook para processar eventos do Stripe.
 * Responsável por ativar/desativar o restaurante baseado no pagamento.
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  // const signature = req.headers["stripe-signature"] as string;
  // const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Na vida real, validaríamos a assinatura aqui.
    // event = stripe.webhooks.constructEvent(req.rawBody, signature, endpointSecret!);
    event = req.body; // Simulação para desenvolvimento básico
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const session = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      // O lojista acabou de assinar o plano
      const restaurantId = session.client_reference_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (restaurantId) {
        await db.collection("restaurants").doc(restaurantId).update({
          is_active: true,
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_status: "active",
          plan_type: session.metadata?.plan_type || "pro",
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Restaurante ${restaurantId} ativado via Stripe.`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      // Assinatura cancelada ou pagamento falhou definitivamente
      const subscriptionId = session.id;
      const restaurants = await db.collection("restaurants")
        .where("subscription_id", "==", subscriptionId)
        .limit(1)
        .get();

      if (!restaurants.empty) {
        const restDoc = restaurants.docs[0];
        await restDoc.ref.update({
          is_active: false,
          subscription_status: "canceled",
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Assinatura ${subscriptionId} cancelada. Restaurante desativado.`);
      }
      break;
    }

    case "invoice.payment_failed": {
      // Pagamento falhou (mas pode tentar de novo)
      const customerId = session.customer;
      const restaurants = await db.collection("restaurants")
        .where("stripe_customer_id", "==", customerId)
        .limit(1)
        .get();

      if (!restaurants.empty) {
        await restaurants.docs[0].ref.update({
          subscription_status: "past_due",
        });
      }
      break;
    }
  }

  res.json({ received: true });
});

/**
 * Webhook para processar eventos da InfinitePay.
 * Identifica o restaurante através do `order_nsu` e ativa a assinatura.
 */
export const infinitepayWebhook = functions.https.onRequest(async (req, res) => {
  const data = req.body;
  console.log("Recebido Webhook InfinitePay:", JSON.stringify(data));

  // O NSU que enviamos é "REST_{restaurantId}_{timestamp}" ou "LEAD_{timestamp}"
  const orderNsu = data.order_nsu;
  
  if (orderNsu && orderNsu.startsWith("REST_")) {
    const parts = orderNsu.split("_");
    const restaurantId = parts[1];

    if (restaurantId) {
      const amount = data.paid_amount || data.amount;
      const planType = amount >= 30000 ? "pro" : "essential";

      await db.collection("restaurants").doc(restaurantId).update({
        is_active: true,
        subscription_status: "active",
        plan_type: planType,
        last_payment_id: data.transaction_nsu || data.invoice_slug,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Restaurante ${restaurantId} ativado via InfinitePay (Valor: ${amount}).`);
    }
  } else {
    console.log("Pagamento de LEAD/Visitante ignorado ou processamento manual necessário.");
  }

  res.json({ received: true });
});
