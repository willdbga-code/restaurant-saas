const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'restaurant-saas-will'
  });
}

const db = admin.firestore();

async function syncCounter() {
  console.log('🔄 Iniciando sincronização do SaaS Pulse...');
  
  const restSnap = await db.collection('restaurants').get();
  const activeCount = restSnap.docs.filter(d => d.data().is_active).length;
  const totalCount = restSnap.size;
  
  // Calcular MRR e Lucro se necessário, mas o foco agora são os contadores
  await db.collection('metadata').doc('system').set({
    total_restaurants: totalCount,
    active_restaurants: activeCount,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log(`✅ Sincronização concluída!`);
  console.log(`📊 Restaurantes Totais: ${totalCount}`);
  console.log(`📊 Restaurantes Ativos: ${activeCount}`);
}

syncCounter().catch(console.error);
