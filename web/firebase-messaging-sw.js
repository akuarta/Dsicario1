importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-vXDqKvSotlNqS7ovqOSl5bXyL-HQnyw",
  authDomain: "dsicario-cd723.firebaseapp.com",
  projectId: "dsicario-cd723",
  storageBucket: "dsicario-cd723.firebasestorage.app",
  messagingSenderId: "758740272138",
  appId: "1:758740272138:web:fd1cace942a589f01d8bf3",
  measurementId: "G-1F5XJQFVJ7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification || {};
  self.registration.showNotification(title || 'DSicario', {
    body: body || '',
    icon: icon || '/favicon.png',
    badge: '/favicon.png',
    data: data || payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir App' }
    ]
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Comparar por el origen (ej. http://localhost:8081)
      var targetOrigin = self.location.origin;
      
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        try {
          var clientOrigin = new URL(client.url).origin;
          if (clientOrigin === targetOrigin && 'focus' in client) {
            return client.focus();
          }
        } catch (e) {
          console.warn('[SW] URL inválida:', client.url);
        }
      }
      // Si no hay ninguna pestaña de la app abierta, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
