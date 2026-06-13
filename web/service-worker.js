self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'DSicario', body: '', icon: '/favicon.png', badge: '/favicon.png' };
  if (event.data) {
    try {
      const parsed = JSON.parse(event.data.text());
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  // Forward to all open windows (foreground notification handling)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage(data));
    })
  );

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data || {},
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL('/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
