import {
  collection, query, where, getDocs, orderBy, doc, getDoc,
} from "firebase/firestore";
import { db } from "./config";
import type { Category, Product, Table, Restaurant } from "./firestore";

// Busca restaurante pelo slug (campo público, sem auth)
export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const q = query(collection(db, "restaurants"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Restaurant;
}

// Busca categorias ativas do cardápio
export async function getMenuCategories(restaurantId: string): Promise<Category[]> {
  const q = query(
    collection(db, "categories"),
    where("restaurant_id", "==", restaurantId),
    where("is_active", "==", true),
    orderBy("sort_order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

// Busca produtos disponíveis do cardápio
export async function getMenuProducts(restaurantId: string): Promise<Product[]> {
  const q = query(
    collection(db, "products"),
    where("restaurant_id", "==", restaurantId),
    where("is_active", "==", true),
    where("is_available", "==", true),
    orderBy("sort_order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}

// Busca mesa pelo ID para exibir o label ao cliente
export async function getTableById(tableId: string): Promise<Table | null> {
  const snap = await getDoc(doc(db, "tables", tableId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Table;
}
