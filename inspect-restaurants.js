const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'restaurant-saas-will' // Assuming this based on current setup
  });
}

const db = admin.firestore();

async function checkRestaurants() {
  const restSnap = await db.collection('restaurants').get();
  console.log('--- Restaurant Data ---');
  restSnap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${data.name}`);
    console.log(`Table Count: ${data.table_count}`);
    console.log(`Plan Type: ${data.plan_type}`);
    console.log('------------------------');
  });
}

checkRestaurants().catch(console.error);
