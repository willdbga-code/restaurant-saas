importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// O Service Worker precisa de sua própria inicialização (Compat)
firebase.initializeApp({
  apiKey: "env-placeholder", // Firebase preenche automaticamente em tempo de execução se houver link de aplicação, mas o SW não tem acesso ao process.env
  authDomain: "env-placeholder",
  projectId: "env-placeholder",
  storageBucket: "env-placeholder",
  messagingSenderId: "env-placeholder",
  appId: "env-placeholder"
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
