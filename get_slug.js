const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Assume or use default

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function getSlug() {
  const snapshot = await db.collection("restaurants").limit(1).get();
  if (snapshot.empty) {
    console.log("NO_RESTAURANT");
    return;
  }
  console.log(snapshot.docs[0].data().slug);
}

getSlug();
