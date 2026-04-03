import { collection, query, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "./config";

/**
 * Operação de Reparo Fort Knox: Unifica os dados órfãos sob o tenant de teste.
 * Carimba restaurant_id: "rest_mnidfw3f" em todos os documentos sem dono.
 */
export async function repairOrphanedData() {
  const TARGET_REST_ID = "rest_mnidfw3f";
  const collections = ["tables", "products", "categories", "orders", "order_items", "notifications", "order_payments", "users"];
  let totalFixed = 0;

  console.log("🚀 Iniciando Operação de Reparo Fort Knox...");

  for (const colName of collections) {
    const q = query(collection(db, colName));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach((snapDoc) => {
      const data = snapDoc.data();
      if (!data.restaurant_id) {
        batch.update(doc(db, colName, snapDoc.id), {
          restaurant_id: TARGET_REST_ID
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      totalFixed += count;
      console.log(`✅ Coleção [${colName}]: ${count} documentos reparados.`);
    }
  }

  console.log(`🏁 Reparo concluído! Total de ${totalFixed} documentos carimbados.`);
  return totalFixed;
}
