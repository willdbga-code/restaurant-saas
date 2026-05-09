import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { randomUUID } from "crypto";

const db = admin.firestore();

interface CreatePixRequest {
  restaurantId: string;
  orderId: string;
  amountCents: number;
  customerEmail?: string;
  customerName?: string;
}

/**
 * Cloud Function: Gera um pagamento PIX real usando as credenciais do restaurante.
 * 
 * Suporta MercadoPago e InfinitePay.
 * As credenciais são lidas do Vault (private_settings/payment).
 * 
 * Retorna:
 * - qr_code_base64: imagem do QR code (para renderizar no front)
 * - qr_code_text: código copia e cola
 * - payment_id: ID do pagamento no provider
 * - expires_at: quando o QR expira (ISO string)
 */
export const createPixPayment = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário precisa estar autenticado.");
  }

  const { restaurantId, orderId, amountCents, customerEmail, customerName } = request.data as CreatePixRequest;

  if (!restaurantId || !orderId || !amountCents || amountCents <= 0) {
    throw new HttpsError("invalid-argument", "restaurantId, orderId e amountCents são obrigatórios.");
  }

  // 1. Busca credenciais do Vault
  const configRef = db.collection("restaurants").doc(restaurantId).collection("private_settings").doc("payment");
  const configSnap = await configRef.get();

  if (!configSnap.exists) {
    throw new HttpsError("not-found", "Nenhum gateway de pagamento configurado. Vá em Configurações → Integrações.");
  }

  const config = configSnap.data()!;
  
  if (!config.is_active) {
    throw new HttpsError("failed-precondition", "Gateway de pagamento está desativado.");
  }

  const provider = config.provider as string;
  const accessToken = config.access_token as string;

  if (!accessToken) {
    throw new HttpsError("failed-precondition", "Token de acesso não configurado no gateway.");
  }

  try {
    // 2. Roteamento por provider
    if (provider === "mercadopago") {
      return await createMercadoPagoPix(accessToken, orderId, amountCents, customerEmail, customerName);
    } else if (provider === "infinitepay") {
      return await createInfinitePayPix(config, orderId, amountCents, customerEmail, customerName);
    } else {
      throw new HttpsError("unimplemented", `Provider "${provider}" ainda não suporta PIX automático. Use pagamento manual no PDV.`);
    }
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    logger.error(`Erro ao criar PIX (${provider}):`, err);
    throw new HttpsError("internal", `Erro ao gerar PIX: ${err.message}`);
  }
});

/**
 * MercadoPago: Cria pagamento PIX via API v1/payments
 * Retorna QR code base64 e código copia e cola
 */
async function createMercadoPagoPix(
  accessToken: string,
  orderId: string,
  amountCents: number,
  email?: string,
  name?: string,
) {
  const amountBRL = amountCents / 100; // MercadoPago usa valor em reais (float)
  const idempotencyKey = randomUUID();

  const payload = {
    transaction_amount: amountBRL,
    description: `Pedido #${orderId.slice(-6)}`,
    payment_method_id: "pix",
    payer: {
      email: email || "cliente@restaurantos.com.br",
      first_name: name || "Cliente",
    },
    external_reference: orderId, // Usado no webhook para identificar o pedido
  };

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("MercadoPago API Error:", errorText);
    throw new Error(`MercadoPago API (${response.status}): ${errorText}`);
  }

  const mpPayment = await response.json();
  const txData = mpPayment.point_of_interaction?.transaction_data;

  if (!txData?.qr_code_base64 || !txData?.qr_code) {
    logger.error("MercadoPago response sem QR code:", JSON.stringify(mpPayment));
    throw new Error("MercadoPago não retornou QR code. Verifique se PIX está ativo na sua conta.");
  }

  // Calcula expiração (MercadoPago PIX expira em ~30 min por padrão)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    provider: "mercadopago",
    qr_code_base64: txData.qr_code_base64,
    qr_code_text: txData.qr_code,
    payment_id: String(mpPayment.id),
    expires_at: expiresAt,
    amount_brl: amountBRL,
  };
}

/**
 * InfinitePay: Cria checkout link com QR code
 * (Usa a API de checkout links pública)
 */
async function createInfinitePayPix(
  config: FirebaseFirestore.DocumentData,
  orderId: string,
  amountCents: number,
  email?: string,
  name?: string,
) {
  const payload = {
    handle: config.public_key,
    order_nsu: `ORDER_${orderId}`,
    items: [{
      quantity: 1,
      price: amountCents,
      description: `Pedido #${orderId.slice(-6)}`,
    }],
    customer: {
      name: name || "Cliente",
      email: email || "cliente@restaurantos.com.br",
      phone_number: "",
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.access_token) {
    headers["Authorization"] = `Bearer ${config.access_token}`;
  }

  const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`InfinitePay API (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    provider: "infinitepay",
    qr_code_base64: null, // InfinitePay não retorna QR base64 direto
    qr_code_text: null,
    checkout_url: data.url, // Redireciona para a página de checkout
    payment_id: data.id || orderId,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    amount_brl: amountCents / 100,
  };
}
