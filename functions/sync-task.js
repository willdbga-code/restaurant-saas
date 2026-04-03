const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'restaurant-saas-will'
  });
}

const db = admin.firestore();

async function sync() {
  const snap = await db.collection('restaurants').get();
  const active = snap.docs.filter(d => d.data().is_active).length;
  
  await db.collection('metadata').doc('system').set({
    total_restaurants: snap.size,
    active_restaurants: active,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log('SYNC_COMPLETE');
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
