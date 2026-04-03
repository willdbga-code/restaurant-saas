import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Webhook para processar eventos da InfinitePay (Gateway Individual).
 * Identifica o restaurante e o pedido através do `order_nsu`.
 */
export const infinitepayWebhook = onRequest(async (req, res) => {
  const data = req.body;
  console.log("Recebido Webhook InfinitePay (Individual):", JSON.stringify(data));

  // O NSU que enviaremos no checkout será "ORDER_{orderId}"
  const orderNsu = data.order_nsu;
  
  if (orderNsu && orderNsu.startsWith("ORDER_")) {
    const orderId = orderNsu.replace("ORDER_", "");

    if (orderId) {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        
        // Só atualiza se o status estiver pendente ou precisando de confirmação
        if (orderData?.status === "pending" || orderData?.payment_status === "pending") {
          await orderRef.update({
            payment_status: "paid",
            status: "preparing", // Já manda pra cozinha!
            paid_at: admin.firestore.FieldValue.serverTimestamp(),
            last_payment_id: data.transaction_nsu || data.invoice_slug,
          });
          
          console.log(`Pedido ${orderId} atualizado para PAGO via InfinitePay.`);
        }
      }
    }
  }

  res.json({ received: true });
});
