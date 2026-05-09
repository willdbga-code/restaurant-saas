import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

const db = admin.firestore();

/**
 * Webhook para processar notificações do MercadoPago.
 * 
 * Fluxo:
 * 1. MercadoPago envia notificação com { action, data: { id } }
 * 2. Buscamos o pagamento na API do MercadoPago para confirmar status
 * 3. Se aprovado, atualizamos o pedido no Firestore
 * 
 * O external_reference contém o orderId para identificação.
 */
export const mercadopagoWebhook = onRequest(async (req, res) => {
  // MercadoPago envia GET para validação e POST para notificações
  if (req.method === "GET") {
    res.status(200).send("OK");
    return;
  }

  const { action, data, type } = req.body;
  logger.info("MercadoPago Webhook recebido:", { action, type, dataId: data?.id });

  // Só processamos notificações de pagamento
  if (type !== "payment" && action !== "payment.created" && action !== "payment.updated") {
    res.json({ received: true, skipped: true });
    return;
  }

  const paymentId = data?.id;
  if (!paymentId) {
    res.status(400).json({ error: "Payment ID ausente" });
    return;
  }

  try {
    // Buscar o pagamento no Firestore para encontrar o restaurante e suas credenciais
    // Primeiro, tentamos encontrar pelo payment_id salvo no pedido
    const pendingPayments = await db.collectionGroup("private_settings")
      .where("provider", "==", "mercadopago")
      .limit(50)
      .get();

    // Para cada restaurante com MercadoPago configurado, verificamos se o payment pertence a ele
    for (const configDoc of pendingPayments.docs) {
      const config = configDoc.data();
      const accessToken = config.access_token;
      if (!accessToken) continue;

      // Consulta a API do MercadoPago para obter detalhes do pagamento
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!mpResponse.ok) continue; // Não é deste restaurante

      const mpPayment = await mpResponse.json();
      
      // Se o pagamento foi aprovado e tem external_reference (orderId)
      if (mpPayment.status === "approved" && mpPayment.external_reference) {
        const orderId = mpPayment.external_reference;
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          
          // Verifica se o restaurante bate (segurança multi-tenant)
          const restaurantId = configDoc.ref.parent.parent?.id;
          if (orderData?.restaurant_id !== restaurantId) continue;

          // Só atualiza se ainda não foi pago
          if (orderData?.payment_status !== "paid") {
            const amountPaid = Math.round((mpPayment.transaction_amount || 0) * 100); // MP usa reais, nós centavos
            
            await orderRef.update({
              payment_status: "paid",
              amount_paid: admin.firestore.FieldValue.increment(amountPaid),
              payment_method: "pix",
              status: "confirmed",
              paid_at: admin.firestore.FieldValue.serverTimestamp(),
              last_payment_id: String(paymentId),
              mp_payment_id: String(paymentId),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Cria notificação para o admin
            await db.collection("notifications").add({
              restaurant_id: restaurantId,
              order_id: orderId,
              table_label: orderData?.table_label || "Mesa",
              type: "payment_completed",
              is_read: false,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`✅ Pedido ${orderId} confirmado via MercadoPago PIX (Payment: ${paymentId})`);
          }
        }
        break; // Encontrou — não precisa continuar
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("Erro ao processar webhook MercadoPago:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
