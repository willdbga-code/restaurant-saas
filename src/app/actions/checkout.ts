"use server";

import { addSystemLog, getRestaurantPaymentConfig } from "@/lib/firebase/firestore";

interface InfinitePayItem {
  quantity: number;
  price: number; // centavos
  description: string;
}

interface CustomerData {
  name: string;
  email: string;
  phone_number: string;
}

/**
 * Gera um link de checkout da InfinitePay.
 */
export async function createCheckoutLink(planId: string, customer: CustomerData, restaurantId?: string, isAnnual?: boolean) {
  const isPro = planId === "pro";
  
  // Mensal: 150/300 | Anual: 1500/3000 (2 meses grátis)
  const monthlyAmount = isPro ? 30000 : 15000;
  const annualAmount = isPro ? 300000 : 150000;
  
  const amount = isAnnual ? annualAmount : monthlyAmount;
  const period = isAnnual ? "Anual" : "Mensal";
  const description = `RestaurantOS - Plano ${isPro ? "Premium Pro" : "Essencial"} (${period})`;

  // NSU contendo o ID do restaurante para identificação no Webhook
  const orderNsu = restaurantId ? `REST_${restaurantId}_${isAnnual ? 'ANNUAL' : 'MONTHLY'}_${Date.now()}` : `LEAD_${Date.now()}`;

  const payload: any = {
    handle: "william-del-barrio",
    redirect_url: "https://restaurant-saas-will.vercel.app/admin/billing?success=true",
    webhook_url: "https://restaurant-saas-will.vercel.app/api/webhook/infinitepay",
    order_nsu: orderNsu,
    items: [
      {
        quantity: 1,
        price: amount,
        description: description
      }
    ],
    customer: {
      name: customer.name,
      email: customer.email,
      phone_number: customer.phone_number
    }
  };

  // Se for anual, sugere/habilita o parcelamento em 12x
  if (isAnnual) {
    payload.installments = 12;
  }

  try {
    const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`InfinitePay Error: ${errorText}`);
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error: any) {
    console.error("Checkout Action Error:", error);
    
    addSystemLog({
      type: "error",
      message: `Falha no Checkout: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      restaurant_id: restaurantId || "lead",
      metadata: { planId, isAnnual }
    });

    throw new Error(error.message || "Falha ao gerar link de pagamento.");
  }
}

/**
 * Gera um link de checkout para o CLIENTE do restaurante (Gateway Individual).
 * Usa as chaves privadas que o dono do restaurante salvou no Vault.
 */
export async function createCustomerCheckoutLink(restaurantId: string, orderId: string, amountCents: number, customer: CustomerData) {
  try {
    // 1. Busca as chaves do cofre (Vault)
    const config = await getRestaurantPaymentConfig(restaurantId);
    
    if (!config || config.provider !== "infinitepay" || !config.access_token) {
      throw new Error("InfinitePay não configurada corretamente neste restaurante.");
    }

    const payload = {
      handle: config.public_key, // Na cloud API da InfinitePay, o handle costuma ser o public_key ou ID da conta
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://restaurant-saas-will.vercel.app'}/menu/success?order=${orderId}`,
      webhook_url: "https://us-central1-restaurant-saas-a9dca.cloudfunctions.net/infinitepayWebhook",
      order_nsu: `ORDER_${orderId}`,
      items: [
        {
          quantity: 1,
          price: amountCents,
          description: `Pedido ${orderId}`
        }
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number
      }
    };

    const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.access_token}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`InfinitePay Error: ${errorText}`);
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error: any) {
    console.error("Customer Checkout Error:", error);
    throw error;
  }
}

/**
 * Gera um pagamento PIX real para um pedido do restaurante.
 * Lê as credenciais do Vault e chama a API do provider configurado.
 * 
 * Retorna QR code base64, código copia e cola, e payment_id.
 * Se o restaurante não tiver gateway configurado, retorna null.
 */
export async function createPixPaymentForOrder(
  restaurantId: string,
  orderId: string,
  amountCents: number,
  customerName?: string,
): Promise<{
  provider: string;
  qr_code_base64: string | null;
  qr_code_text: string | null;
  checkout_url?: string;
  payment_id: string;
  expires_at: string;
  amount_brl: number;
} | null> {
  try {
    // 1. Busca config do Vault
    const config = await getRestaurantPaymentConfig(restaurantId);
    
    if (!config || !config.is_active || !config.access_token) {
      return null; // Sem gateway configurado
    }

    const provider = config.provider;

    if (provider === "mercadopago") {
      return await generateMercadoPagoPix(config, orderId, amountCents, customerName);
    } else if (provider === "infinitepay") {
      // Para InfinitePay, usa o checkout link existente
      const result = await createCustomerCheckoutLink(restaurantId, orderId, amountCents, {
        name: customerName || "Cliente",
        email: "cliente@restaurantos.com.br",
        phone_number: "",
      });
      return {
        provider: "infinitepay",
        qr_code_base64: null,
        qr_code_text: null,
        checkout_url: result.url,
        payment_id: orderId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        amount_brl: amountCents / 100,
      };
    }

    return null; // Provider não suportado
  } catch (error: any) {
    console.error("createPixPaymentForOrder Error:", error);
    throw new Error(error.message || "Erro ao gerar PIX.");
  }
}

/**
 * Gera PIX via MercadoPago API diretamente (Server Action — roda no servidor Next.js).
 */
async function generateMercadoPagoPix(
  config: { access_token: string; public_key: string },
  orderId: string,
  amountCents: number,
  customerName?: string,
) {
  const amountBRL = amountCents / 100;
  const idempotencyKey = `pix_${orderId}_${Date.now()}`;

  const payload = {
    transaction_amount: amountBRL,
    description: `Pedido #${orderId.slice(-6)}`,
    payment_method_id: "pix",
    payer: {
      email: "cliente@restaurantos.com.br",
      first_name: customerName || "Cliente",
    },
    external_reference: orderId,
  };

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.access_token}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MercadoPago API Error:", errorText);
    throw new Error(`MercadoPago (${response.status}): Verifique suas credenciais no Hub de Integrações.`);
  }

  const mpPayment = await response.json();
  const txData = mpPayment.point_of_interaction?.transaction_data;

  if (!txData?.qr_code_base64 || !txData?.qr_code) {
    throw new Error("MercadoPago não retornou QR code. Verifique se PIX está ativo na sua conta.");
  }

  return {
    provider: "mercadopago",
    qr_code_base64: txData.qr_code_base64,
    qr_code_text: txData.qr_code,
    payment_id: String(mpPayment.id),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    amount_brl: amountBRL,
  };
}
