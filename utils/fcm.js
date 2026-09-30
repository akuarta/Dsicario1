import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const VAPID_KEY = 'BPvkF9pSNQ4AMYQFycckdxp_YqXP7qwKpkMkve76UEw78WlU7dCFgGJEPi4MtgelEbD4Md7xUANmGPdtzOiEJDE';

const _FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC-vXDqKvSotlNqS7ovqOSl5bXyL-HQnyw',
  authDomain: 'dsicario-cd723.firebaseapp.com',
  projectId: 'dsicario-cd723',
  storageBucket: 'dsicario-cd723.firebasestorage.app',
  messagingSenderId: '758740272138',
  appId: '1:758740272138:web:fd1cace942a589f01d8bf3',
  measurementId: 'G-1F5XJQFVJ7',
};

// ── URL-safe base64 → Uint8Array (copied from expo-notifications internal) ──
const _urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

// ── Get/create push subscription with existing-subscription check ──
const _getPushSubscription = async () => {
  const registration = await navigator.serviceWorker.register('/service-worker.js');
  await navigator.serviceWorker.ready;
  if (!registration.active) return null;

  let sub = await registration.pushManager.getSubscription();
  if (sub) return { subscription: sub, registration };

  try {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_KEY),
    });
    return { subscription: sub, registration };
  } catch (e) {
    console.warn('[FCM] pushManager.subscribe() falló:', e?.message || e);
    return null;
  }
};

let _firebase = null;
let _firebaseLoading = false;
let _firebaseLoadResolve = null;

const getFirebaseCompat = async (forceReload = false) => {
  if (_firebase && _firebase.apps && _firebase.apps.length > 0) return _firebase;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const initApp = (fb) => {
    try {
      if (!fb.apps || fb.apps.length === 0) {
        fb.initializeApp(_FIREBASE_CONFIG);
      }
    } catch (e) {
      console.warn('[FCM] Error in initializeApp:', e);
    }
    return fb;
  };

  if (window.firebase && window.firebase.messaging) {
    _firebase = initApp(window.firebase);
    return _firebase;
  }

  if (forceReload && !_firebaseLoading) {
    _firebaseLoading = true;
    try {
      await new Promise((resolve, reject) => {
        const s1 = document.createElement('script');
        s1.src = 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js';
        s1.onload = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js';
          s2.onload = resolve;
          s2.onerror = reject;
          document.head.appendChild(s2);
        };
        s1.onerror = reject;
        document.head.appendChild(s1);
      });
      if (window.firebase && window.firebase.messaging) {
        _firebase = initApp(window.firebase);
        return _firebase;
      }
    } catch (e) {
      console.warn('[FCM] Error cargando Firebase compat:', e?.message || e);
    } finally {
      _firebaseLoading = false;
    }
  }

  // If we are already loading, wait a bit
  if (forceReload && _firebaseLoading) {
    let retries = 20; // max 2 seconds
    while (_firebaseLoading && retries > 0) {
      await new Promise(r => setTimeout(r, 100));
      retries--;
    }
    if (window.firebase && window.firebase.messaging) {
      _firebase = initApp(window.firebase);
      return _firebase;
    }
  }

  return null;
};

const _patchConstants = () => {
  if (!Constants.expoConfig) Constants.expoConfig = {};
  if (!Constants.expoConfig.notification) Constants.expoConfig.notification = {};
  Constants.expoConfig.notification.vapidPublicKey = VAPID_KEY;
  Constants.expoConfig.notification.serviceWorkerPath = '/service-worker.js';
};

const _isLocalhost = () => {
  try {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  } catch {
    return false;
  }
};

const _getProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  'f2b86deb-3577-44c9-8400-4ec78784f8f9';

export const registerExpoPushTokenWeb = async () => {
  if (Platform.OS !== 'web') return null;

  if (_isLocalhost()) {
    console.warn('[FCM] Saltando Expo Push API en localhost (CORS bloqueado). Las notificaciones locales siguen funcionando.');
    return null;
  }

  try {
    _patchConstants();
  } catch (e) {
    console.warn('[FCM] Error configurando Constants:', e?.message || e);
    return null;
  }

  const appId = Constants.expoConfig?.android?.package || Constants.expoConfig?.ios?.bundleIdentifier || window.location.origin || 'com.akuarta.dsicario';

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId: _getProjectId() });
    const token = result?.data;
    if (typeof token === 'string' && token.startsWith('ExponentPushToken')) return token;
  } catch (e) {
    console.warn('[FCM] Intento 1 (projectId) falló:', e?.message || e);
  }

  try {
    const pushResult = await _getPushSubscription();
    if (!pushResult) return null;

    const { subscription, registration } = pushResult;
    const subJSON = subscription.toJSON();
    const devicePushToken = {
      type: 'web',
      data: {
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth,
        },
      },
    };

    if (registration.active) {
      registration.active.postMessage(JSON.stringify({ fromExpoWebClient: {} }));
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ devicePushToken, applicationId: appId });
    const token = tokenResult?.data;
    if (typeof token === 'string' && token.startsWith('ExponentPushToken')) return token;
    return null;
  } catch (e) {
    console.warn('[FCM] Ambos intentos fallaron:', e?.message || e);
    return null;
  }
};

// ── Obtener el token FCM raw de Firebase (no Expo Push Token) ──
const _detectBrowser = () => {
  try {
    const ua = navigator.userAgent;
    if (ua.includes('OPR') || ua.includes('Opera')) return 'OperaGX';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari')) return 'Safari';
    return 'unknown';
  } catch { return 'unknown'; }
};

export const getFCMToken = async () => {
  if (Platform.OS !== 'web') return null;

  const browser = _detectBrowser();
  if (browser === 'OperaGX') {
    console.warn('[FCM] OperaGX bloquea el servicio push de Google. Usa Chrome para notificaciones.');
    window.__FCM_TOKEN_ERROR__ = 'OperaGX bloquea el push service. Usa Chrome.';
    return null;
  }

  delete window.__FCM_TOKEN_ERROR__;

  const fb = await getFirebaseCompat(true);
  if (fb) {
    try {
      const currentToken = await fb.messaging().getToken({ vapidKey: VAPID_KEY });
      if (currentToken && typeof currentToken === 'string') return currentToken;
    } catch (e) {
      console.warn('[FCM] getToken() falló:', e?.message || e);
    }
  }

  // Buscar suscripciones existentes en CUALQUIER service worker registrado
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        const match = endpoint.match(/\/send\/([^/]+)$/);
        if (match) return match[1];
        return endpoint;
      }
    }
  } catch {}

  // Solución de último recurso: intentar subscribe
  try {
    const pushResult = await _getPushSubscription();
    if (!pushResult) return null;
    const endpoint = pushResult.subscription.endpoint;
    const match = endpoint.match(/\/send\/([^/]+)$/);
    return match ? match[1] : endpoint;
  } catch {
    return null;
  }
};

export const onFCMForegroundMessage = async (callback) => {
  const fb = await getFirebaseCompat(true);
  if (fb) {
    try {
      const unsub = fb.messaging().onMessage((payload) => {
        callback(payload);
      });
      return () => { try { unsub(); } catch {} };
    } catch {}
  }

  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const handler = (event) => {
    if (!event.data) return;
    try {
      const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      const n = payload?.notification || payload?.data || payload;
      callback({ notification: { title: n.title || '', body: n.body || '' }, data: payload.data || payload });
    } catch {}
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
};
