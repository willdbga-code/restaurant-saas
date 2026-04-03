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

// Busca mesa pelo ID ou Número, garantindo que pertença ao restaurante correto
export async function getTable(restaurantId: string, tableIdOrNumber: string): Promise<Table | null> {
  // Primeiro tenta buscar por ID direto (mais performático)
  const docRef = doc(db, "tables", tableIdOrNumber);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const data = snap.data() as Table;
    // Validação crucial de multitenancy: o restaurant_id deve bater!
    if (data.restaurant_id === restaurantId) {
      return { ...data, id: snap.id } as Table;
    }
  }

  // Se não encontrou por ID, tenta buscar por número (número da mesa)
  const num = Number(tableIdOrNumber);
  if (!isNaN(num)) {
    const q = query(
      collection(db, "tables"),
      where("restaurant_id", "==", restaurantId),
      where("number", "==", num)
    );
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const d = qSnap.docs[0];
      return { id: d.id, ...d.data() } as Table;
    }
  }

  return null;
}
