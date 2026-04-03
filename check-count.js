const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'restaurant-saas-will'
  });
}

const db = admin.firestore();

async function run() {
  const restSnap = await db.collection('restaurants').get();
  const activeSnap = await db.collection('restaurants').where('is_active', '==', true).get();
  
  console.log('Total Restaurants:', restSnap.size);
  console.log('Active Restaurants:', activeSnap.size);
  
  // Check if they have created_at
  if (restSnap.size > 0) {
    console.log('First Doc created_at:', restSnap.docs[0].data().created_at?.toDate() || 'N/A');
  }
}

run().catch(console.error);
