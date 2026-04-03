importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// O Service Worker precisa de sua própria inicialização (Compat)
firebase.initializeApp({
  apiKey: "AIzaSyBL-MheF_0In0Xcn3-IX69MZ-Rl5eBSiOI",
  authDomain: "restaurant-saas-a9dca.firebaseapp.com",
  projectId: "restaurant-saas-a9dca",
  storageBucket: "restaurant-saas-a9dca.firebasestorage.app",
  messagingSenderId: "87503141663",
  appId: "1:87503141663:web:4773b104e0fb0bee200e2a"
});

const messaging = firebase.messaging();

// Handler de notificações em background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png', // Substitua pelo seu logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
