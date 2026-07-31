/* global firebase, importScripts, clients */
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const firebaseConfig = Object.fromEntries(
    ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
        .map((key) => [key, params.get(key)])
        .filter(([, value]) => Boolean(value)),
);

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    // A payload containing `notification` is displayed by FCM automatically.
    // Only render data-only messages here to avoid duplicate notifications.
    if (payload.notification) return;
    const title = payload.data?.title || 'SHADOW SYSTEM';
    self.registration.showNotification(title, {
        body: payload.data?.body || 'You have a new notification.',
        icon: '/favicon.svg',
        data: payload.data || {},
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    const targetPath = data.screenToOpen === 'QUEST_DETAIL'
        ? `/daily-quest${data.questId ? `?questId=${encodeURIComponent(data.questId)}` : ''}`
        : '/daily-quest';
    event.waitUntil(clients.openWindow(targetPath));
});
