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
