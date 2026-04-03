"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { onSnapshot, doc, query, collection, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { signInAnonymously } from "firebase/auth";
import { createCustomerCheckoutLink } from "@/app/actions/checkout";
import { getRestaurantBySlug, getMenuCategories, getMenuProducts, getTable } from "@/lib/firebase/menu";
import { createOrder, addOrderItem, notifyPaymentActivity } from "@/lib/firebase/orders";
import { useActiveOrder } from "@/hooks/useActiveOrder";
import { OrderStatusOverlay } from "@/components/menu/OrderStatusOverlay";
import { OrderDetailsDrawer } from "@/components/menu/OrderDetailsDrawer";
import { PaymentDrawer } from "@/components/menu/PaymentDrawer";
import { Category, Product, Table, Restaurant, updateTable } from "@/lib/firebase/firestore";
import { ShoppingCart, Plus, Minus, MapPin, X, Check, Loader2, UtensilsCrossed, Settings2, Trash2, ArrowRight, ChefHat, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThemeInjector } from "@/components/menu/ThemeInjector";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  category_name: string;
  category_id: string;
  image_url: string | null;
  product_id: string;
};


// ─── Landing Hero ─────────────────────────────────────────────────────────────
function LandingHero({ restaurant, onEnter }: { restaurant: Restaurant, onEnter: () => void }) {
  const branding = restaurant?.branding;
  const hasCover = !!branding?.cover_url;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-zinc-950">
      {/* Background with Blur/Overlay */}
      {hasCover ? (
        <img 
          src={branding.cover_url} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105 blur-sm"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 opacity-50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      
      <div className="relative z-10 max-w-2xl space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl p-4">
             {restaurant?.logo_url ? (
               <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-contain" />
             ) : (
               <UtensilsCrossed className="h-10 w-10 text-white/20" />
             )}
          </div>
        </div>

        <div className="space-y-4 px-4">
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter">
            {branding?.hero_title || restaurant?.name}
          </h1>
          <p className="text-zinc-400 text-base md:text-xl font-medium max-w-md mx-auto">
            {branding?.hero_subtitle || "Seja bem-vindo ao nosso cardápio digital interativo."}
          </p>
        </div>

        <div className="pt-8 px-6 w-full max-w-xs mx-auto">
          <button
            onClick={onEnter}
            className="group relative h-16 w-full bg-primary-theme text-white rounded-2xl font-black text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            Ver Cardápio
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scroll Spy Nav ───────────────────────────────────────────────────────────
function StickyNav({ categories, activeCategoryId, onSelect }: { categories: Category[], activeCategoryId: string | null, onSelect: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCategoryId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-cat="${activeCategoryId}"]`) as HTMLElement;
      if (el) {
        scrollRef.current.scrollTo({
          left: el.offsetLeft - scrollRef.current.offsetWidth / 2 + el.offsetWidth / 2,
          behavior: "smooth"
        });
      }
    }
  }, [activeCategoryId]);

  return (
    <div className="sticky top-0 z-40 glass-morphism-heavy border-b border-white/10 shadow-2xl">
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-6 py-4 scrollbar-none items-center"
      >
        {categories.map((cat) => {
          const catId = cat.category_id ?? cat.id;
          const isActive = activeCategoryId === catId;
          return (
            <button
              key={catId}
              data-cat={catId}
              onClick={() => onSelect(catId)}
              className={cn(
                "shrink-0 rounded-2xl px-6 py-2.5 text-[13px] font-black tracking-tight transition-all duration-300",
                isActive 
                  ? "bg-primary-theme text-white shadow-lg scale-105 border-t border-white/20" 
                  : "bg-white/5 text-zinc-500 hover:text-white"
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Feed Product Card ────────────────────────────────────────────────────────
function FeedCard({ product, onOpenDrawer }: { product: Product; onOpenDrawer: (p: Product) => void }) {
  const hasImage = !!product.image_url;

  return (
    <div className="flex flex-col bg-zinc-900 overflow-hidden w-full rounded-[2.5rem] border border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all active:scale-[0.98] hover:border-white/10 group">
      
      {/* Image Area (Unobstructed) */}
      <div 
        className={cn("relative w-full overflow-hidden", hasImage ? "aspect-[4/5] sm:aspect-[4/3]" : "aspect-[3/2] bg-white/[0.02] flex items-center justify-center")}
        onClick={() => onOpenDrawer(product)}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={product.image_url!} 
            alt={product.name} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <UtensilsCrossed className="h-16 w-16 text-white/5" />
        )}
      </div>

      {/* Content Area (Stacked Below) */}
      <div className="p-6 sm:p-8 space-y-6 bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight uppercase">{product.name}</h3>
            {product.description && (
              <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed line-clamp-2">{product.description}</p>
            )}
          </div>
          <div className="shrink-0 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-white/10">
            <span className="text-white text-lg sm:text-xl font-black tracking-tighter">{fmt(product.price)}</span>
          </div>
        </div>

        <button 
          onClick={() => onOpenDrawer(product)}
          className="btn-primary-theme w-full py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[1.8rem] text-xs sm:text-sm font-black uppercase tracking-widest active:scale-95 transition-all bg-primary-theme text-white flex items-center justify-center gap-2 shadow-lg shadow-primary-theme/20"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Adicionar
        </button>
      </div>
    </div>
  );
}

// ─── Customization Drawer ─────────────────────────────────────────────────────
function CustomizationDrawer({ 
  product, 
  isOpen, 
  onClose,
  onConfirm
}: { 
  product: Product | null; 
  isOpen: boolean; 
  onClose: () => void;
  onConfirm: (product: Product, removedIngredients: string[], extraNotes: string) => void;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const ingredients = product?.ingredients ?? [];

  useEffect(() => {
    if (isOpen) {
      setRemoved([]);
      setNotes("");
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-opacity duration-500",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[90vh] rounded-t-[3rem] glass-morphism-heavy border-t border-white/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-full flex justify-center py-5">
          <div className="w-14 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-32 scrollbar-none">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-tight">{product.name}</h2>
              <div className="mt-3 inline-flex px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white font-black text-lg">
                <p>{fmt(product.price)}</p>
              </div>
            </div>
            {product.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="Thumb" className="h-24 w-24 rounded-[2rem] object-cover shadow-2xl border border-white/5" />
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="mb-10">
              <div className="mb-6">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                  <Settings2 className="h-4 w-4" /> Personalizar Receita
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium">Os itens marcados abaixo serão **REMOVIDOS** do seu pedido.</p>
              </div>
              
              <div className="space-y-3">
                {ingredients.map(ing => {
                  const isRemoved = removed.includes(ing);
                  return (
                    <button
                      key={ing}
                      onClick={() => {
                        if (isRemoved) setRemoved(prev => prev.filter(i => i !== ing));
                        else setRemoved(prev => [...prev, ing]);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-5 rounded-2xl transition-all border",
                        isRemoved ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/5"
                      )}
                    >
                      <span className={cn("text-base font-bold transition-colors", isRemoved ? "text-red-400 line-through" : "text-white")}>
                        {ing}
                      </span>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isRemoved ? "border-red-500 bg-red-500" : "border-zinc-700 bg-transparent"
                      )}>
                        {isRemoved && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-6">
             <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Notas para a Cozinha</h3>
             <textarea 
               placeholder="Ex: Sem cebola, carne bem passada..."
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none h-32 transition-all"
             />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-16 font-outfit">
          <button 
            onClick={() => onConfirm(product, removed, notes)}
            className="w-full bg-primary-theme text-white rounded-2xl py-5 font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-2xl"
          >
            Confirmar e Adicionar <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function MenuContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  const [status, setStatus] = useState<"loading" | "ready" | "error" | "success" | "locked">("loading");
  const [showLanding, setShowLanding] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { order: activeOrder, items: orderItems, derivedStatus } = useActiveOrder(restaurant?.id, tableId ?? "balcao");
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [address, setAddress] = useState("");
  const [modeSelected, setModeSelected] = useState(!!tableId); // Se tem mesa, já está no modo dine_in

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    let unsubCats: () => void = () => {};
    let unsubProds: () => void = () => {};

    async function init() {
      try {
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (e) {}
        }
        const rest = await getRestaurantBySlug(slug);
        if (!rest) { setStatus("error"); return; }
        setRestaurant(rest);

        if (tableId && typeof tableId === "string") {
          const t = await getTable(rest.id, tableId);
          if (t) {
            setTable(t);
            setTableLabel(t.label);
          }
        }

        // Real-time Categories & Products
        unsubCats = onSnapshot(
          query(collection(db, "categories"), where("restaurant_id", "==", rest.id), where("is_active", "==", true), orderBy("sort_order", "asc")),
          (snap) => {
            const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
            setCategories(cats);
          }
        );

        unsubProds = onSnapshot(
          query(collection(db, "products"), where("restaurant_id", "==", rest.id), where("is_active", "==", true), where("is_available", "==", true), orderBy("sort_order", "asc")),
          (snap) => {
            const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            setProducts(prods);
            setStatus("ready"); 
          }
        );
      } catch (err) {
        setStatus("error");
      }
    }
    
    init();

    return () => {
      unsubCats();
      unsubProds();
    };
  }, [slug, tableId]);

  // Sincronização em tempo real do STATUS da Mesa
  useEffect(() => {
    // Se temos a mesa (pelo init), usamos o ID dela. Se não, usamos o que está na URL
    const finalTableId = table?.id || tableId;
    if (!finalTableId || status === "error") return;
    
    const unsub = onSnapshot(doc(db, "tables", finalTableId), (snap) => {
      if (snap.exists()) {
        const t = { id: snap.id, ...snap.data() } as Table;
        setTable(t);
        setTableLabel(t.label);
        
        // Regra de Ouro: Se a mesa for dine-in e estiver "available", bloqueia
        if (t.status === "available") {
          setStatus("locked");
        } else if (status === "locked") {
          // Se estava bloqueado e agora mudou (occupied/etc), libera
          setStatus("ready");
        }
      }
    });

    return () => unsub();
  }, [tableId, status, table?.id]);

  // Auto-reset após sucesso
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setStatus("ready");
        setModeSelected(false);
        setCart([]);
        setShowLanding(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          const id = entry.target.getAttribute("data-section-id");
          if (id) setActiveCatId(id);
        }
      });
    }, { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.5, 0.8] });

    const currentRefs = Array.from(sectionRefs.current.values());
    currentRefs.forEach(el => observer.observe(el));

    return () => currentRefs.forEach(el => observer.unobserve(el));
  }, [status, categories]);

  async function handleRequestOpen() {
    const finalTableId = table?.id || tableId;
    if (!finalTableId || !restaurant) return;
    
    setSubmitting(true);
    try {
      // Cria um alerta/solicitação para o garçom
      await addDoc(collection(db, "table_alerts"), {
        restaurant_id: restaurant.id,
        table_id: finalTableId,
        table_label: tableLabel || "Mesa",
        type: "opening_request",
        status: "pending",
        created_at: serverTimestamp()
      });

      // Cria a notificação global no sino (Bell)
      await notifyPaymentActivity({
        restaurantId: restaurant.id as string,
        tableLabel: tableLabel || "Mesa",
        type: "table_opening_request",
      });
      // Atualiza o status da mesa para 'reserved' para sinalizar no PDV
      await updateTable(finalTableId, { status: "reserved" });
      
      toast.success("Solicitação enviada! Um garçom virá até você.");
    } catch (err) {
      console.error("Erro ao solicitar abertura:", err);
      toast.error("Erro ao enviar solicitação. Por favor, chame um garçom.");
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToCategory(catId: string) {
    setActiveCatId(catId);
    const element = sectionRefs.current.get(catId);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  }

  function confirmAdd(product: Product, removed: string[], extraNotes: string) {
    const compiledNotes: string[] = [];
    if (removed.length > 0) compiledNotes.push(`Remover: ${removed.join(", ")}`);
    if (extraNotes.trim()) compiledNotes.push(`Obs: ${extraNotes.trim()}`);
    const finalNotes = compiledNotes.join(" | ");

    const catName = categories.find(c => (c.category_id ?? c.id) === (product.category_id ?? product.id))?.name ?? "";

    setCart(prev => [...prev, {
      productId: product.id,
      product_id: product.product_id ?? product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      notes: finalNotes,
      category_name: catName,
      category_id: product.category_id ?? "",
      image_url: product.image_url,
    }]);

    setDrawerOpen(false);
    toast.success(`${product.name} adicionado!`);
  }

  function removeFromCart(index: number) {
    setCart(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitOrder() {
    if (!restaurant || cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderRef = await createOrder({
        restaurantId: restaurant.id!,
        tableId: tableId ?? "balcao",
        tableLabel: tableLabel ?? (orderType === "delivery" ? "Delivery" : "Balcão"),
        waiterUid: "customer",
        waiterName: customerName || "Cliente",
        type: orderType,
        address: orderType === "delivery" ? address : null,
      });
      const orderNum = Math.floor(Date.now() / 1000) % 10000;

      await Promise.all(
        cart.map(item =>
          addOrderItem({
            restaurantId: restaurant!.id!,
            orderId: orderRef.id,
            orderNumber: orderNum,
            tableLabel: tableLabel ?? (orderType === "delivery" ? "Delivery" : "Balcão"),
            product: {
              id: item.productId,
              product_id: item.product_id,
              name: item.name,
              price: item.price,
              image_url: item.image_url,
              category_id: item.category_id,
            } as Product,
            categoryName: item.category_name,
            quantity: item.quantity,
            notes: item.notes || null,
            address: orderType === "delivery" ? address : null,
          })
        )
      );

      // ─── Fluxo de Pagamento ───
      if (restaurant?.payment_linked && restaurant?.payment_provider === "infinitepay") {
        try {
          const { url } = await createCustomerCheckoutLink(
            restaurant.id!,
            orderRef.id,
            totalCartValue, // Já está em centavos? (Preciso conferir se cart.price é em centavos)
            {
              name: customerName || "Cliente",
              email: "checkout@saas.com", // Placeholder se oculto
              phone_number: "00000000000"  // Placeholder se oculto
            }
          );
          
          if (url) {
            window.location.href = url;
            return;
          }
        } catch (payErr) {
          console.error("Erro ao gerar link de pagamento:", payErr);
          toast.error("Erro ao processar pagamento, mas seu pedido foi registrado.");
        }
      }

      setOrderNumber(orderNum);
      if (typeof window !== "undefined") {
        localStorage.setItem(`last_order_id_${restaurant?.id}`, orderRef.id);
      }
      setCart([]);
      setCartOpen(false);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center p-6 bg-zinc-950">
        <ThemeInjector color={restaurant?.branding?.primary_color} />
        <UtensilsCrossed className="h-16 w-16 text-zinc-900 mb-6" />
        <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Ops! Restaurante não encontrado</h1>
        <p className="text-sm text-zinc-400">Verifique o QR Code ou tente novamente.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <ThemeInjector color={restaurant?.branding?.primary_color} />
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-theme" />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white font-outfit">
        <ThemeInjector color={restaurant?.branding?.primary_color} />
        <div className="mb-10 relative">
          <div className="h-32 w-32 rounded-[2.5rem] bg-primary-theme/10 flex items-center justify-center border border-primary-theme/20 shadow-2xl">
             <Lock className="h-16 w-16 text-primary-theme animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-zinc-950 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
             <UtensilsCrossed className="h-5 w-5 text-zinc-500" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-white leading-tight tracking-tighter mb-4">Mesa Bloqueada</h1>
        <p className="text-zinc-500 text-lg font-medium leading-relaxed max-w-xs mb-8">
          Esta mesa ({tableLabel}) ainda não foi aberta. <br/>
          <span className="text-primary-theme font-bold">Solicite a abertura para fazer o seu pedido.</span>
        </p>

        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={handleRequestOpen}
            disabled={submitting}
            className="w-full bg-primary-theme text-white rounded-3xl py-6 font-black text-xl shadow-2xl shadow-primary-theme/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ChefHat className="h-6 w-6" />}
            Solicitar Abertura
          </button>

          <div className="p-6 glass-morphism rounded-3xl w-full border border-white/5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Segurança de Acesso</p>
            <p className="text-sm font-bold text-white uppercase italic">Liberação exclusiva pelo garçom</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white font-outfit">
        <ThemeInjector color={restaurant?.branding?.primary_color} />
        <div className="mb-8 rounded-full h-24 w-24 bg-green-500 flex items-center justify-center shadow-3xl shadow-green-500/20">
          <Check className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white leading-tight tracking-tight">Pedido na<br/>Cozinha!</h1>
        {orderNumber && (
          <div className="mt-8 p-6 glass-morphism rounded-3xl w-full border border-white/5 shadow-2xl">
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Sua Senha</p>
            <p className="text-6xl font-black text-primary-theme tracking-tighter">{orderNumber}</p>
          </div>
        )}
        <button
          onClick={() => setStatus("ready")}
          className="mt-12 w-full bg-white text-black py-5 rounded-3xl font-black text-lg transition-transform active:scale-95 shadow-2xl"
        >
          Fazer outro pedido
        </button>
      </div>
    );
  }

  if (showLanding && status === "ready") {
    return (
      <>
        <ThemeInjector color={restaurant?.branding?.primary_color} />
        <LandingHero 
           restaurant={restaurant!} 
           onEnter={() => { 
             setShowLanding(false); 
             window.scrollTo(0,0);
           }} 
        />
      </>
    );
  }

  // ─── Main Feed Render ───
  const featuredProductsList = (products || []).filter(p => p.is_featured);
  const totalCartValue = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-32 font-outfit">
      <ThemeInjector color={restaurant?.branding?.primary_color} />
      
      {/* Mini-Header for Branding */}
      <div className="p-8 pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter leading-tight">{restaurant?.name}</h1>
          {tableLabel && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-theme/10 rounded-full border border-primary-theme/20">
               <MapPin className="h-3 w-3 text-primary-theme" />
               <span className="text-[10px] font-black text-primary-theme uppercase tracking-wider">{tableLabel}</span>
            </div>
          )}
        </div>
        {restaurant?.logo_url && (
          <img src={restaurant.logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-contain bg-white/5 p-1.5" />
        )}
      </div>

      <StickyNav 
        categories={categories} 
        activeCategoryId={activeCatId} 
        onSelect={scrollToCategory}
      />

      <div className="px-6 py-8">
        
        {/* Featured Section */}
        {featuredProductsList.length > 0 && (
          <div className="mb-12 space-y-6">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="h-5 w-5 text-primary-theme" />
              <h3 className="text-xl font-black tracking-tight">Destaques da Casa</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-6 px-6">
              {featuredProductsList.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setDrawerOpen(true); }}
                  className="shrink-0 w-64 aspect-[4/5] relative rounded-[2.5rem] overflow-hidden glass-morphism border border-white/5 active:scale-[0.98] transition-all duration-300"
                >
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 space-y-2">
                    <div className="bg-primary-theme px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit text-white">Destaque</div>
                    <h4 className="font-bold text-lg leading-tight line-clamp-2 text-white">{p.name}</h4>
                    <p className="text-primary-theme font-black">{fmt(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.map((cat) => {
          const catId = cat.category_id ?? cat.id;
          return (
            <section 
              key={catId} 
              ref={el => { if(el) sectionRefs.current.set(catId, el); }}
              data-section-id={catId} 
              className="scroll-mt-32 mb-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-1.5 bg-primary-theme rounded-full shadow-lg shadow-primary-theme/20" />
                <h2 className="text-3xl font-black tracking-tight">{cat.name}</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {products
                  .filter(p => (p.category_id ?? p.id) === catId)
                  .map((p) => (
                    <FeedCard 
                      key={p.id} 
                      product={p} 
                      onOpenDrawer={(prod) => {
                        setSelectedProduct(prod);
                        setDrawerOpen(true);
                      }}
                    />
                  ))}
              </div>
            </section>
          );
        })}
      </div>

      <CustomizationDrawer 
        product={selectedProduct}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirm={confirmAdd}
      />

      {/* Floating Cart Button */}
      <div className="fixed bottom-10 inset-x-0 flex justify-center z-50 pointer-events-none px-6">
        <button 
          onClick={() => setCartOpen(true)}
          className={cn(
            "h-20 max-w-sm w-full bg-primary-theme text-white rounded-[2.5rem] shadow-2xl flex items-center justify-between px-8 transition-all duration-500 pointer-events-auto",
            cart.length > 0 ? "translate-y-0 scale-100 opacity-100 shadow-primary-theme/40" : "translate-y-20 scale-90 opacity-0"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <ShoppingCart className="h-7 w-7 text-white" />
              <span className="absolute -top-2 -right-2 bg-white text-primary-theme text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-primary-theme">
                {cart.length}
              </span>
            </div>
            <div className="text-left text-white">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ver Sacola</p>
              <p className="text-xl font-black">{fmt(totalCartValue)}</p>
            </div>
          </div>
          <ArrowRight className="h-7 w-7 opacity-50 text-white" />
        </button>
      </div>

      {activeOrder && (
        <OrderStatusOverlay 
          status={derivedStatus} 
          orderNumber={activeOrder.order_number} 
          onClick={() => setOrderDetailsOpen(true)}
        />
      )}

      <OrderDetailsDrawer 
        isOpen={orderDetailsOpen}
        onClose={() => setOrderDetailsOpen(false)}
        onOpenPayment={() => {
          setOrderDetailsOpen(false);
          setPaymentOpen(true);
        }}
        order={activeOrder}
        items={orderItems}
        derivedStatus={derivedStatus}
      />

      <PaymentDrawer 
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        order={activeOrder}
      />

      {/* Fullscreen Cart Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col glass-morphism-heavy animate-in slide-in-from-bottom-full duration-500 font-outfit">
          <div className="flex items-center justify-between px-8 py-8">
            <h2 className="text-4xl font-black text-white tracking-tight">Pedido</h2>
            <button onClick={() => setCartOpen(false)} className="rounded-2xl bg-white/5 p-3 text-zinc-400 active:scale-90 transition-transform">
              <X className="h-7 w-7" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 space-y-6">
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-4 rounded-[2rem] bg-white/[0.04] p-5 border border-white/5">
                 {item.image_url ? (
                   <img src={item.image_url} alt="" className="h-24 w-24 rounded-[1.5rem] object-cover shadow-xl" />
                 ) : (
                   <div className="h-24 w-24 rounded-[1.5rem] bg-white/5 flex items-center justify-center">
                     <UtensilsCrossed className="h-8 w-8 text-white/10" />
                   </div>
                 )}
                 <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-lg font-black text-white leading-tight">{item.name}</p>
                      <button onClick={() => removeFromCart(idx)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                         <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-zinc-500 font-bold mb-3 line-clamp-2 leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                    <span className="text-xl font-black text-primary-theme mt-auto tracking-tighter">{fmt(item.price)}</span>
                 </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-10" />
                <p className="font-bold">Sacola vazia</p>
              </div>
            )}

            <div className="pt-6 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 block">Nome no Pedido</label>
                <input
                  type="text"
                  placeholder="Seu nome..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold text-lg placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary-theme/20 transition-all"
                />
              </div>

              {orderType === "delivery" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3 block">Endereço de Entrega</label>
                  <textarea
                    placeholder="Rua, Número, Bairro..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold text-lg placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary-theme/20 transition-all h-28"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-8 pb-12 bg-zinc-950/40 backdrop-blur-3xl border-t border-white/5">
            <div className="flex justify-between items-end mb-8">
              <span className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Total do Pedido</span>
              <span className="text-4xl font-black text-white tracking-tighter">{fmt(totalCartValue)}</span>
            </div>
            
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full bg-primary-theme text-white rounded-[2rem] py-6 text-xl font-black active:scale-95 transition-all shadow-2xl shadow-primary-theme/20 disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? <Loader2 className="h-7 w-7 animate-spin mx-auto" /> : "Confirmar Pedido"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={
       <div className="flex min-h-screen items-center justify-center bg-zinc-950">
         <Loader2 className="h-10 w-10 animate-spin text-white" />
       </div>
    }>
      <MenuContent slug={slug} />
    </Suspense>
  );
}
