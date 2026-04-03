"use client";

import { useState } from "react";
import { repairOrphanedData } from "@/lib/firebase/repair_data";
import { Loader2, ShieldCheck, Database, Zap } from "lucide-react";
import { toast } from "sonner";

export default function RepairPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const runRepair = async () => {
    setBusy(true);
    setResult(null);
    try {
      const count = await repairOrphanedData();
      setResult(count);
      toast.success("Dados Reparados com Sucesso!");
    } catch (err: any) {
      toast.error(`Falha no Reparo: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-white font-sans">
      <div className="max-w-md w-full p-8 rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent blur-sm" />
        
        <div className="flex h-16 w-16 mb-6 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 mx-auto">
          <ShieldCheck className="h-8 w-8 text-orange-500" />
        </div>

        <h1 className="text-2xl font-black text-center mb-2 tracking-tight">Cofre de Reparo Fort Knox</h1>
        <p className="text-zinc-500 text-sm text-center mb-8">
          Esta operação injetará o selo de tenant em todos os documentos órfãos para restaurar a visibilidade total.
        </p>

        <div className="space-y-4">
          <button
            onClick={runRepair}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
            {busy ? "Carimbando Dados..." : "Executar Migração Cirúrgica"}
          </button>

          {result !== null && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
              <Database className="h-5 w-5 text-green-400" />
              <p className="text-sm font-medium text-green-400">
                {result} documentos foram reparados e blindados.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">Sincronização Orbital Fortress SaaS</p>
        </div>
      </div>
    </div>
  );
}
