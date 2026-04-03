"use client";

import { OrderItem } from "@/lib/firebase/orders";

interface ThermalReceiptProps {
  item: OrderItem;
  restaurantName?: string;
}

/**
 * Componente otimizado para rolos de 80mm e 58mm.
 * Usa fontes nativas e alto contraste para impressoras térmicas.
 */
export function ThermalReceipt({ item, restaurantName }: ThermalReceiptProps) {
  const now = new Date();
  const timeStr = new Intl.DateTimeFormat("pt-BR", { 
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric" 
  }).format(now);

  return (
    <div className="receipt-container bg-white text-black p-4 font-mono leading-tight w-[300px]">
      <style jsx global>{`
        @media print {
          /* Esconde tudo no corpo */
          body {
            visibility: hidden;
            background: white !important;
          }
          
          /* Garante que o container do recibo e seus conteúdos fiquem visíveis */
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          
          /* Posiciona o recibo no topo da página impressa */
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }

          /* Remove cabeçalhos/rodapés do navegador */
          @page {
            margin: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        {restaurantName && <h1 className="text-lg font-black uppercase">{restaurantName}</h1>}
        <p className="text-[10px]">{timeStr}</p>
        <h2 className="text-2xl font-black mt-1">PEDIDO #{item.order_number}</h2>
      </div>

      {/* Item Info */}
      <div className="py-2">
        <div className="flex justify-between items-start gap-4 mb-2">
          <span className="text-4xl font-black shrink-0">x{item.quantity}</span>
          <span className="text-2xl font-bold text-right flex-1 break-words">{item.product_name}</span>
        </div>
        
        {item.table_label && (
           <div className="border-y-2 border-black py-2 my-2 bg-black/5">
             <span className="text-lg font-black">MESA: {item.table_label}</span>
           </div>
        )}

        {item.category_name && (
           <p className="text-[10px] uppercase opacity-60">Setor: {item.category_name}</p>
        )}
      </div>

      {/* Notes / Ingredients */}
      {item.notes && (
        <div className="mt-2 border-[3px] border-black p-3">
          <p className="text-xs font-black uppercase mb-1">OBSERVAÇÕES:</p>
          <p className="text-base font-bold underline decoration-2">{item.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-black pt-2 text-center opacity-70">
        <p className="text-[10px] font-bold">RestaurantOS SaaS</p>
      </div>

      {/* Cutting Space (Essential to avoid cutting the text) */}
      <div className="h-24" />
    </div>
  );
}
