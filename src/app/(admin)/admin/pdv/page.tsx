"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTables } from "@/hooks/useTables";
import { Loader2, Users, ArrowRight, Plus, QrCode, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateTable } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Table } from "@/lib/firebase/firestore";

const STATUS_CFG: Record<Table["status"], { label: string; border: string; badge: string }> = {
  available: { label: "Livre", border: "border-green-500/40 hover:border-green-400 hover:bg-green-500/10", badge: "bg-green-500/20 text-green-400" },
  occupied:  { label: "Ocupada", border: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10", badge: "bg-orange-500/20 text-orange-400" },
  reserved:  { label: "Reservada", border: "border-yellow-500/40 hover:border-yellow-400 hover:bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-400" },
  cleaning:  { label: "Limpeza", border: "border-blue-500/40 hover:border-blue-400 hover:bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400" },
};

export default function PDVPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tables, loading } = useTables(user?.restaurant_id);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedTable, setScannedTable] = useState<Table | null>(null);

  // Scanner Logic
  useEffect(() => {
    let scanner: any = null;
    let timer: any = null;

    if (scanOpen) {
      timer = setTimeout(() => {
        const reader = document.getElementById("reader");
        if (!reader) return;

        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        scanner.render(
          (decodedText: string) => {
            try {
              const url = new URL(decodedText);
              const tableIdOrNum = url.searchParams.get("table");
              if (tableIdOrNum) {
                const table = tables.find(t => t.id === tableIdOrNum || t.number === Number(tableIdOrNum));
                if (table) {
                  setScannedTable(table);
                  scanner?.clear();
                } else {
                  toast.error("Mesa não encontrada.");
                }
              }
            } catch (e) {
              toast.error("QR Code inválido.");
            }
          },
          (err: any) => {}
        );
      }, 400); // Aguarda o Dialog abrir e o DOM renderizar
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [scanOpen, tables]);

  async function handleOpenTable(table: Table) {
    try {
      await updateTable(table.id, { status: "occupied" });
      toast.success(`Mesa ${table.number} aberta!`);
      setScanOpen(false);
      setScannedTable(null);
      router.push(`/admin/pdv/${table.id}`);
    } catch (e) {
      toast.error("Erro ao abrir mesa.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">PDV — Seleção de Mesa</h1>
          <p className="mt-1 text-sm text-zinc-400">Toque em uma mesa para abrir ou continuar um pedido.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setScanOpen(true)}
            className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700"
          >
            <QrCode className="mr-2 h-4 w-4 text-orange-400" /> Escanear Mesa
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" /> Comanda Avulsa
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-24">
          <p className="text-zinc-500">Nenhuma mesa cadastrada.</p>
          <Button variant="link" className="mt-2 text-orange-400" onClick={() => router.push("/admin/tables")}>
            Cadastrar mesas →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table) => {
            const cfg = STATUS_CFG[table.status];
            return (
              <button
                key={table.id}
                onClick={() => router.push(`/admin/pdv/${table.id}`)}
                className={cn(
                  "group relative flex flex-col items-center justify-center rounded-2xl border-2 bg-zinc-900 p-6 text-center transition-all duration-200",
                  cfg.border
                )}
              >
                <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", cfg.badge)}>
                  {cfg.label}
                </span>
                <span className="text-4xl font-black text-white">{table.number}</span>
                <span className="mt-1 text-sm font-medium text-zinc-300">{table.label}</span>
                <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity} pessoas</span>
                </div>
                <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code da Mesa</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {!scannedTable ? (
               <div id="reader" className="overflow-hidden rounded-xl border border-zinc-800" />
            ) : (
               <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95 duration-300">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orange-500 shadow-2xl shadow-orange-500/20">
                     <Users className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Mesa {scannedTable.number} — {scannedTable.label}</h3>
                  <p className="mt-2 text-zinc-400">Status atual: <span className="font-bold text-green-400 uppercase tracking-widest text-xs">Livre</span></p>
                  
                  <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                     <Button variant="ghost" onClick={() => setScannedTable(null)} className="text-zinc-500">
                        Voltar
                     </Button>
                     <Button onClick={() => handleOpenTable(scannedTable)} className="bg-orange-500 text-white font-black">
                        Abrir Mesa <Check className="ml-2 h-4 w-4" />
                     </Button>
                  </div>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
