// OZT Digital panel bildirimleri (web push).
// Yalnızca bildirim gösterir; sayfa isteklerine karışmaz (fetch dinlenmez).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "OZT Digital", body: event.data ? event.data.text() : "" };
  }

  const url = data.url || "/personel";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Panel ekranda açıksa uyarıyı sayfa kendisi verir (ses ve vurgu).
      const visible = windows.some(
        (client) => client.visibilityState === "visible" && new URL(client.url).pathname.startsWith(url.split("?")[0])
      );
      if (visible) return undefined;

      return self.registration.showNotification(data.title || "OZT Digital", {
        body: data.body || "",
        tag: data.tag,
        icon: "/panel-icon",
        badge: "/panel-icon",
        data: { url },
        vibrate: [200, 100, 200],
        requireInteraction: false,
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/personel";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).pathname.startsWith(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
