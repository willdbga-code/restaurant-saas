/**
 * Motor de Precificação Estratégica (SaaS Manager)
 * 
 * Lógica baseada em:
 * 1. Custo de Suporte (SAC) - R$ 50,00 / hora
 * 2. Custo de Infraestrutura (DB) - R$ 35,00 / GB
 * 3. Margem de Reinvestimento - 35% fixos
 */

export type PlanTier = "free" | "essential" | "pro" | "enterprise";

interface PlanConfig {
  label: string;
  maxTables: number;
  estSupportHours: number;
  estDataGB: number;
  setupFee: number;
  fixedPrice: number;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    label: "Degustação (Free)",
    maxTables: 2,
    estSupportHours: 0.2, // 12 min
    estDataGB: 0.5,
    setupFee: 0,
    fixedPrice: 0
  },
  essential: {
    label: "SaaS Starter",
    maxTables: 5,
    estSupportHours: 1.5,
    estDataGB: 10,
    setupFee: 30000, // R$ 300,00 fixo
    fixedPrice: 21000 // R$ 210,00
  },
  pro: {
    label: "SaaS Business",
    maxTables: 12,
    estSupportHours: 3.0,
    estDataGB: 25,
    setupFee: 50000, // R$ 500,00
    fixedPrice: 38000 // R$ 380,00
  },
  enterprise: {
    label: "SaaS Enterprise",
    maxTables: 30,
    estSupportHours: 8.0,
    estDataGB: 80,
    setupFee: 150000, // R$ 1.500,00
    fixedPrice: 65000 // R$ 650,00
  }
};

const HOURLY_RATE = 5000; // R$ 50,00 (em centavos)
const GB_RATE = 3500;     // R$ 35,00 (em centavos)

export function calculatePlanPricing(tier: PlanTier) {
  const config = PLAN_CONFIGS[tier];
  
  const supportCost = config.estSupportHours * HOURLY_RATE;
  const cloudCost = config.estDataGB * GB_RATE;
  const totalCost = supportCost + cloudCost;
  
  // O preço agora é fixo conforme solicitação do usuário
  const actualPrice = config.fixedPrice;
  const netProfit = actualPrice - totalCost;

  return {
    tierId: tier,
    label: config.label,
    supportCost,
    supportHours: config.estSupportHours,
    cloudCost,
    cloudGB: config.estDataGB,
    totalCost,
    actualPrice,
    netProfit,
    setupFee: config.setupFee
  };
}
