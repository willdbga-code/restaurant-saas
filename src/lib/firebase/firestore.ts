import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  limit,
  increment,
  getDocs,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppUser = {
  uid: string;
  restaurant_id: string;
  role: "admin" | "waiter" | "kitchen";
  name: string;
  email: string;
  fcm_tokens?: string[]; // Para Web Push Notifications
  created_at: Timestamp;
};

export type Restaurant = {
  id?: string;
  restaurant_id: string;
  name: string;
  slug: string;
  owner_uid: string;
  is_active: boolean;
  logo_url?: string | null;
  phone?: string | null;
  
  // Billing & Subscription
  stripe_customer_id?: string | null;
  subscription_id?: string | null;
  plan_type?: "free" | "essential" | "pro";
  subscription_status?: "active" | "past_due" | "canceled" | "trialing" | "unpaid";
  current_period_end?: Timestamp | null;
  
  branding?: {
    primary_color?: string;
    hero_title?: string;
    hero_subtitle?: string;
    cover_url?: string;
  };
  
  // Hub de Pagamentos (Configurações Públicas)
  payment_linked?: boolean;
  payment_provider?: "mercadopago" | "infinitepay" | "stone" | "santander";

  // Quotas & Stats
  table_count?: number;

  created_at: Timestamp;
};

export type Category = {
  id: string;
  category_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Product = {
  id: string;
  product_id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number; // em centavos
  promotional_price: number | null;
  image_url: string | null;
  track_stock: boolean;
  stock: number;
  is_available: boolean;
  is_active: boolean;
  is_featured?: boolean;
  tags: string[];
  ingredients?: string[];
  preparation_time_minutes: number | null;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type Table = {
  id: string;
  table_id: string;
  restaurant_id: string;
  label: string;
  number: number;
  capacity: number;
  qr_code_url: string | null;
  qr_target_url: string;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_id: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SystemLog = {
  id?: string;
  type: "error" | "warning" | "info" | "incident" | "billing" | "auth";
  message: string;
  restaurant_id: string; // "master" para sistema global
  metadata?: any;
  archived: boolean;
  created_at: Timestamp;
};

export type SupportTicket = {
  id?: string;
  ticket_id: string;
  restaurant_id: string;
  restaurant_name: string;
  user_id: string;
  user_name: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  is_chat_active: boolean;
  last_message_at: Timestamp;
  created_at: Timestamp;
};

export type ChatMessage = {
  id?: string;
  ticket_id: string;
  restaurant_id: string; // ID do restaurante alvo
  sender_uid: string;
  sender_name: string;
  text: string;
  is_support: boolean;
  created_at: Timestamp;
};

// ─── Query Builders ───────────────────────────────────────────────────────────

export const categoriesQuery = (restaurantId: string) =>
  query(
    collection(db, "categories"),
    where("restaurant_id", "==", restaurantId),
    where("is_active", "==", true),
    orderBy("sort_order", "asc")
  );

export const productsQuery = (restaurantId: string) =>
  query(
    collection(db, "products"),
    where("restaurant_id", "==", restaurantId),
    where("is_active", "==", true),
    orderBy("sort_order", "asc")
  );

export const tablesQuery = (restaurantId: string) =>
  query(
    collection(db, "tables"),
    where("restaurant_id", "==", restaurantId),
    where("is_active", "==", true),
    orderBy("number", "asc")
  );

export const staffQuery = (restaurantId: string) =>
  query(
    collection(db, "users"),
    where("restaurant_id", "==", restaurantId),
    orderBy("created_at", "desc")
  );

export const restaurantsGlobalQuery = () =>
  query(
    collection(db, "restaurants"),
    orderBy("created_at", "desc")
  );

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export const addCategory = (restaurantId: string, data: Omit<Category, "id" | "category_id" | "restaurant_id" | "created_at" | "updated_at">) =>
  addDoc(collection(db, "categories"), {
    ...data,
    restaurant_id: restaurantId, // CONSTRAINT #1: sempre injeta restaurant_id
    category_id: crypto.randomUUID(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

export const updateCategory = (id: string, data: Partial<Category>) =>
  updateDoc(doc(db, "categories", id), { ...data, updated_at: serverTimestamp() });

export const deleteCategory = (id: string) =>
  updateDoc(doc(db, "categories", id), { is_active: false, updated_at: serverTimestamp() });

// ─── Products CRUD ────────────────────────────────────────────────────────────

export const addProduct = (restaurantId: string, data: Omit<Product, "id" | "product_id" | "restaurant_id" | "created_at" | "updated_at">) =>
  addDoc(collection(db, "products"), {
    ...data,
    restaurant_id: restaurantId, // CONSTRAINT #1
    product_id: crypto.randomUUID(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

export const updateProduct = (id: string, data: Partial<Product>) =>
  updateDoc(doc(db, "products", id), { ...data, updated_at: serverTimestamp() });

export const deleteProduct = (id: string) =>
  updateDoc(doc(db, "products", id), { is_active: false, updated_at: serverTimestamp() });

// ─── Tables CRUD ──────────────────────────────────────────────────────────────

export const addTable = async (restaurantId: string, data: Omit<Table, "id" | "table_id" | "restaurant_id" | "created_at" | "updated_at">) => {
  const restRef = doc(db, "restaurants", restaurantId);
  
  const docRef = await addDoc(collection(db, "tables"), {
    ...data,
    restaurant_id: restaurantId,
    table_id: crypto.randomUUID(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Incrementa contador para Enforcement de Quotas
  await updateDoc(restRef, {
    table_count: increment(1),
    updated_at: serverTimestamp(),
  });

  return docRef;
};

export const updateTable = (id: string, data: Partial<Table>) =>
  updateDoc(doc(db, "tables", id), { ...data, updated_at: serverTimestamp() });

export const deleteTable = async (id: string, restaurantId: string) => {
  await updateDoc(doc(db, "tables", id), { is_active: false, updated_at: serverTimestamp() });
  
  // Decrementa contador
  return updateDoc(doc(db, "restaurants", restaurantId), {
    table_count: increment(-1),
    updated_at: serverTimestamp(),
  });
};

// ─── Restaurant Update ───────────────────────────────────────────────────────

export const updateRestaurantSettings = (id: string, data: Partial<Restaurant>) =>
  updateDoc(doc(db, "restaurants", id), { ...data });

// ─── SaaS Management Logging ──────────────────────────────────────────────────

export const addSystemLog = (data: Omit<SystemLog, "created_at" | "archived" | "id">) =>
  addDoc(collection(db, "system_logs"), {
    ...data,
    archived: false,
    created_at: serverTimestamp(),
  });

export const archiveLogs = async () => {
  const q = query(collection(db, "system_logs"), where("archived", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  
  snap.docs.forEach((snapDoc) => {
    batch.update(doc(db, "system_logs", snapDoc.id), { archived: true });
  });
  
  return batch.commit();
};

export const createTicket = (data: Omit<SupportTicket, "id" | "ticket_id" | "created_at" | "last_message_at" | "status" | "is_chat_active">) =>
  addDoc(collection(db, "support_tickets"), {
    ...data,
    ticket_id: `T-${Math.floor(1000 + Math.random() * 9000)}`,
    is_chat_active: false,
    status: "open",
    created_at: serverTimestamp(),
    last_message_at: serverTimestamp(),
  });

export const sendSupportMessage = (data: Omit<ChatMessage, "id" | "created_at">) =>
  addDoc(collection(db, "support_messages"), {
    ...data,
    created_at: serverTimestamp(),
  });


export const getRestaurantPaymentConfig = async (restaurantId: string) => {
  const docRef = doc(db, "restaurants", restaurantId, "private_settings", "payment");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as { 
      provider: string; 
      public_key: string; 
      access_token: string; 
      is_active: boolean;
    };
  }
  return null;
};
