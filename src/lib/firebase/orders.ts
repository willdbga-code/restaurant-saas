import {
  collection, query, where, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, Timestamp, increment,
  runTransaction,
} from "firebase/firestore";
import { db } from "./config";
import type { Product } from "./firestore";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled" | "closed";
export type OrderItemStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled" | "request_cancel";
export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "voucher";

export type Order = {
  id: string;
  order_id: string;
  restaurant_id: string;
  order_number: number;
  table_id: string | null;
  table_label: string | null;
  type: "dine_in" | "takeaway" | "delivery";
  waiter_uid: string | null;
  waiter_name: string | null;
  status: OrderStatus;
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  payment_method: PaymentMethod | null;
  subtotal: number;
  discount: number;
  tax: number;
  service_fee: number;
  total: number;
  notes: string | null;
  address: string | null;
  delivery_fee: number;
  items_count: number;
  amount_paid: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  confirmed_at: Timestamp | null;
  closed_at: Timestamp | null;
};

export type OrderItem = {
  id: string;
  item_id: string;
  restaurant_id: string;
  order_id: string;
  order_number: number;
  table_label: string | null;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  category_id: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: OrderItemStatus;
  customer_name?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

// ─── Queries ──────────────────────────────────────────────────────────────────
export const ordersQueryByDate = (restaurantId: string, start: Date, end: Date) =>
  query(
    collection(db, "orders"),
    where("restaurant_id", "==", restaurantId),
    where("created_at", ">=", start),
    where("created_at", "<=", end)
  );

// NOTE: requires composite index on (table_id, restaurant_id) — Firebase console will provide the link
export const activeOrdersForTableQuery = (restaurantId: string, tableId: string) =>
  query(collection(db, "orders"), where("table_id", "==", tableId), where("restaurant_id", "==", restaurantId));

export const orderItemsByOrderQuery = (restaurantId: string, orderId: string) =>
  query(collection(db, "order_items"), 
    where("restaurant_id", "==", restaurantId),
    where("order_id", "==", orderId)
  );

// NOTE: requires composite index on (restaurant_id ASC, status ASC) — Firebase will provide a direct link on first run
export const kdsItemsQuery = (restaurantId: string) =>
  query(collection(db, "order_items"), where("restaurant_id", "==", restaurantId), where("status", "in", ["pending", "preparing", "ready", "request_cancel"]));

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export const createOrder = async (p: { 
  restaurantId: string; 
  tableId: string; 
  tableLabel: string; 
  waiterUid: string; 
  waiterName: string; 
  type?: Order["type"];
  address?: string | null;
}) => {
  const metadataRef = doc(db, "metadata", p.restaurantId, "counters", "orders");
  const ordersCol = collection(db, "orders");
  const newOrderRef = doc(ordersCol);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  return await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metadataRef);
    let nextNumber = 1;

    if (metaSnap.exists()) {
      const data = metaSnap.data();
      if (data.last_reset_date === today) {
        nextNumber = (data.current_sequence || 0) + 1;
      }
    }

    // Atualiza o contador atômico com reset diário
    transaction.set(metadataRef, {
      last_reset_date: today,
      current_sequence: nextNumber,
      updated_at: serverTimestamp()
    }, { merge: true });

    // Cria o pedido com o número sequencial garantido
    transaction.set(newOrderRef, {
      restaurant_id: p.restaurantId,
      order_id: crypto.randomUUID(),
      order_number: nextNumber,
      table_id: p.tableId || null,
      table_label: p.tableLabel || null,
      type: p.type || "dine_in",
      waiter_uid: p.waiterUid || null,
      waiter_name: p.waiterName || null,
      address: p.address || null,
      delivery_fee: 0,
      status: "pending",
      payment_status: "unpaid",
      payment_method: null,
      subtotal: 0, discount: 0, tax: 0, service_fee: 0, total: 0,
      notes: null, items_count: 0, amount_paid: 0,
      created_at: serverTimestamp(), 
      updated_at: serverTimestamp(),
      confirmed_at: null, 
      closed_at: null,
    });

    return newOrderRef;
  });
};

export const addOrderItem = async (p: {
  restaurantId: string; orderId: string; orderNumber: number;
  tableLabel: string | null; product: Product; categoryName: string;
  quantity: number; notes: string | null; address?: string | null;
  customerName?: string | null;
}) => {
  const orderRef = doc(db, "orders", p.orderId);
  const productRef = doc(db, "products", p.product.id);
  const newItemRef = doc(collection(db, "order_items"));

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Produto não encontrado.");

    const productData = productSnap.data() as Product;
    
    // BLINDAGEM #1: Preço sempre vem do Banco de Dados (Anti-Hacker)
    const unitPrice = productData.price;
    const totalPrice = unitPrice * p.quantity;

    // BLINDAGEM #2: Sincronismo de Estoque Atômico
    if (productData.track_stock) {
      if ((productData.stock || 0) < p.quantity) {
        throw new Error(`Estoque insuficiente: ${productData.name} (${productData.stock} restritos).`);
      }
      // Decrementa estoque
      transaction.update(productRef, { 
        stock: increment(-p.quantity),
        updated_at: serverTimestamp() 
      });
    }

    // Cria o item do pedido
    transaction.set(newItemRef, {
      restaurant_id: p.restaurantId,
      item_id: crypto.randomUUID(),
      order_id: p.orderId,
      order_number: p.orderNumber || 0,
      table_label: p.tableLabel || null,
      product_id: p.product.id,
      product_name: productData.name,
      product_image_url: productData.image_url || null,
      category_id: productData.category_id || "",
      category_name: p.categoryName || "Sem categoria",
      quantity: p.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes: p.notes || null,
      address: p.address || null,
      status: "pending",
      customer_name: p.customerName || null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Atualiza o total do pedido pai
    transaction.update(orderRef, {
      subtotal: increment(totalPrice),
      total: increment(totalPrice),
      items_count: increment(p.quantity),
      updated_at: serverTimestamp(),
    });
  });
};

export const removeOrderItem = async (itemId: string, orderId: string, itemTotal: number, itemQty: number) => {
  await updateDoc(doc(db, "orders", orderId), {
    subtotal: increment(-itemTotal), total: increment(-itemTotal),
    items_count: increment(-itemQty), updated_at: serverTimestamp(),
  });
  await deleteDoc(doc(db, "order_items", itemId));
};

// ─── Status & Cancellation Management (Chef & Manager Hierarchy) ──────────────

// ─── Status & Cancellation Management (Chef & Manager Hierarchy) ──────────────

export const updateOrderItemStatus = async (restaurantId: string, itemId: string, status: OrderItemStatus, orderId?: string) => {
  await updateDoc(doc(db, "order_items", itemId), { status, updated_at: serverTimestamp() });

  // Se o item foi entregue, verificamos se o pedido todo pode ser encerrado
  if (status === "delivered" && orderId) {
    const { getDocs } = await import("firebase/firestore");
    const q = orderItemsByOrderQuery(restaurantId, orderId);
    const snap = await getDocs(q);
    const documents = snap.docs;
    const allDelivered = documents.every(d => d.data().status === "delivered");
    
    if (allDelivered) {
      await updateDoc(doc(db, "orders", orderId), { 
        status: "delivered", 
        updated_at: serverTimestamp() 
      });
    }
  }
};

export const requestItemCancellation = (itemId: string) =>
  updateDoc(doc(db, "order_items", itemId), { status: "request_cancel", updated_at: serverTimestamp() });

export const rejectItemCancellation = (itemId: string) =>
  updateDoc(doc(db, "order_items", itemId), { status: "preparing", updated_at: serverTimestamp() });

/**
 * Aprova o cancelamento vindo da cozinha. 
 * Estorna o dinheiro no Pedido e devolve o item ao estoque. Atômico.
 */
export const approveItemCancellation = async (itemId: string, orderId: string, restaurantId: string) => {
  const itemRef = doc(db, "order_items", itemId);
  const orderRef = doc(db, "orders", orderId);

  return await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) return;
    const itemData = itemSnap.data() as OrderItem;

    if (itemData.status !== "request_cancel") return;

    // 1. Mark as cancelled
    transaction.update(itemRef, { status: "cancelled", updated_at: serverTimestamp() });

    // 2. Decrement Order Total & Count
    transaction.update(orderRef, {
      subtotal: increment(-itemData.total_price),
      total: increment(-itemData.total_price),
      items_count: increment(-itemData.quantity),
      updated_at: serverTimestamp(),
    });

    // 3. Replenish Product Stock
    const prodRef = doc(db, "products", itemData.product_id);
    transaction.update(prodRef, {
      stock: increment(itemData.quantity),
      updated_at: serverTimestamp(),
    });
  });
};

/**
 * Cancelamento forçado pelo Gerente (Admin). 
 * Bypass do fluxo da cozinha. Força a remoção imediata e estorno.
 */
export const forceCancelItem = async (itemId: string, orderId: string, restaurantId: string) => {
  const itemRef = doc(db, "order_items", itemId);
  const orderRef = doc(db, "orders", orderId);

  return await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) return;
    const itemData = itemSnap.data() as OrderItem;

    // Diferente da cozinha, o Gerente ignora o status e cancela direto
    transaction.update(itemRef, { status: "cancelled", updated_at: serverTimestamp() });

    transaction.update(orderRef, {
      subtotal: increment(-itemData.total_price),
      total: increment(-itemData.total_price),
      items_count: increment(-itemData.quantity),
      updated_at: serverTimestamp(),
    });

    const prodRef = doc(db, "products", itemData.product_id);
    transaction.update(prodRef, {
      stock: increment(itemData.quantity),
      updated_at: serverTimestamp(),
    });
  });
};

export const updateOrderItemNotes = (itemId: string, notes: string | null) =>
  updateDoc(doc(db, "order_items", itemId), { notes, updated_at: serverTimestamp() });

export const confirmOrder = (orderId: string) =>
  updateDoc(doc(db, "orders", orderId), { status: "confirmed", confirmed_at: serverTimestamp(), updated_at: serverTimestamp() });

export const closeOrder = (orderId: string, paymentMethod: PaymentMethod) =>
  updateDoc(doc(db, "orders", orderId), { status: "closed", payment_status: "paid", payment_method: paymentMethod, closed_at: serverTimestamp(), updated_at: serverTimestamp(), amount_paid: increment(0) }); // Will be handled by processOrderPayment

export type OrderPayment = {
  id: string;
  order_id: string;
  restaurant_id: string;
  amount: number;
  method: PaymentMethod;
  created_at: Timestamp;
};

export type Notification = {
  id: string;
  restaurant_id: string;
  type: "payment_started" | "payment_partial" | "payment_completed" | "table_opening_request" | "order_created";
  table_label: string;
  order_id?: string; // Agora opcional para alertas de abertura
  amount?: number;
  is_read: boolean;
  created_at: Timestamp;
};

// ... existing queries ...

export const notifyPaymentActivity = async (p: {
  restaurantId: string;
  orderId?: string;
  tableLabel: string;
  type: Notification["type"];
  amount?: number;
}) => {
  await addDoc(collection(db, "notifications"), {
    restaurant_id: p.restaurantId,
    order_id: p.orderId || null,
    table_label: p.tableLabel,
    type: p.type,
    amount: p.amount || 0,
    is_read: false,
    created_at: serverTimestamp(),
  });
};

export const updateOrderServiceFee = async (orderId: string, applyFee: boolean) => {
  const orderRef = doc(db, "orders", orderId);
  return await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const order = orderSnap.data() as Order;
    
    // Calcula 10% do subtotal
    const serviceFee = applyFee ? Math.round(order.subtotal * 0.1) : 0;
    const newTotal = order.subtotal + serviceFee;
    
    transaction.update(orderRef, {
      service_fee: serviceFee,
      total: newTotal,
      updated_at: serverTimestamp()
    });
  });
};

export const processOrderPayment = async (orderId: string, amount: number, method: PaymentMethod) => {
  const orderRef = doc(db, "orders", orderId);

  return await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    
    const order = orderSnap.data() as Order;
    const currentPaid = order.amount_paid || 0;
    const newTotalPaid = currentPaid + amount;
    
    // Verificamos se atingiu o total (com margem para floats)
    const totalToPay = order.total;
    const isFullyPaid = newTotalPaid >= (totalToPay - 1); // Margem de 1 centavo

    // 1. Log the individual payment
    const paymentRef = doc(collection(db, "order_payments"));
    transaction.set(paymentRef, {
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      amount,
      method,
      created_at: serverTimestamp(),
    });

    // 2. Update Order State
    transaction.update(orderRef, {
      amount_paid: increment(amount),
      payment_status: isFullyPaid ? "paid" : "partial",
      status: isFullyPaid ? "closed" : order.status,
      payment_method: isFullyPaid ? method : order.payment_method,
      closed_at: isFullyPaid ? serverTimestamp() : null,
      updated_at: serverTimestamp(),
    });

    return { 
      restaurantId: order.restaurant_id, 
      tableLabel: order.table_label || "Mesa",
      isFullyPaid 
    };
  }).then(async (res) => {
    if (res) {
      await notifyPaymentActivity({
        restaurantId: res.restaurantId,
        orderId: orderId,
        tableLabel: res.tableLabel,
        type: res.isFullyPaid ? "payment_completed" : "payment_partial",
        amount,
      });
    }
  });
};


