import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { apiRequest } from './api';

const FCM_TOKEN_KEY = 'shadow_system_fcm_token';
let deviceRegistrationPromise: Promise<string | null> | null = null;

const firebaseConfig: FirebaseOptions = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function hasFirebaseConfig(): boolean {
    return Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId &&
        import.meta.env.VITE_FIREBASE_VAPID_KEY,
    );
}

function serviceWorkerUrl(): string {
    const params = new URLSearchParams();
    Object.entries(firebaseConfig).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
    });
    return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function performDeviceRegistration(): Promise<string | null> {
    if (!hasFirebaseConfig() || !('Notification' in window) || !(await isSupported())) {
        return null;
    }

    // iOS requires requestPermission() to originate from a direct user gesture.
    // The automatic startup path may only register an already-authorized device.
    if (Notification.permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register(serviceWorkerUrl());
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    await apiRequest('/notifications/devices', {
        method: 'POST',
        body: JSON.stringify({ fcmToken: token, deviceType: 'WEB' }),
    });
    localStorage.setItem(FCM_TOKEN_KEY, token);
    return token;
}

/**
 * Requests browser permission, obtains the current web FCM token and saves it in the backend.
 * The shared promise prevents React StrictMode from registering twice in development.
 */
export function registerCurrentDevice(): Promise<string | null> {
    if (!deviceRegistrationPromise) {
        deviceRegistrationPromise = performDeviceRegistration()
            .then((token) => {
                // Keep successful registration deduplicated, but allow a button click to retry
                // when startup could not register because permission was still undecided.
                if (!token) deviceRegistrationPromise = null;
                return token;
            })
            .catch((error) => {
                // Allow a later retry when a temporary Firebase/backend failure occurs.
                deviceRegistrationPromise = null;
                throw error;
            });
    }
    return deviceRegistrationPromise;
}

/** Call only from a click/tap handler so Safari on iOS accepts the permission request. */
export async function enableNotifications(): Promise<string | null> {
    if (!('Notification' in window)) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    return registerCurrentDevice();
}

export async function unregisterCurrentDevice(): Promise<void> {
    const token = localStorage.getItem(FCM_TOKEN_KEY);
    if (!token) return;

    await apiRequest(`/notifications/devices?fcmToken=${encodeURIComponent(token)}`, {
        method: 'DELETE',
    });
    localStorage.removeItem(FCM_TOKEN_KEY);
}

export async function unregisterAllDevices(): Promise<void> {
    await apiRequest('/notifications/devices/all', { method: 'DELETE' });
    localStorage.removeItem(FCM_TOKEN_KEY);
}

export type TestNotification = {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
};

/** Development/admin helper for POST /notifications/send. */
export function sendTestNotification(payload: TestNotification): Promise<string> {
    return apiRequest<string>('/notifications/send', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function listenForForegroundMessages(
    handler: (payload: MessagePayload) => void,
): Promise<(() => void) | undefined> {
    if (!hasFirebaseConfig() || !(await isSupported())) return undefined;
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return onMessage(getMessaging(app), handler);
}
