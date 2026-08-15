// Web Push API & Service Worker Integration Helper

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register Service Worker for Web Push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this environment.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;
    console.log('Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if the browser is running on iOS (iPhone/iPad)
 */
export function isIOSBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if the app is currently running in standalone (PWA) mode
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/**
 * Check if Web Notification is supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from browser user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    // Ensure service worker is registered first
    await registerServiceWorker();

    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

/**
 * Send a real browser push notification using Service Worker or Notification API
 */
export async function sendLocalPushNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) {
    if (isIOSBrowser() && !isStandaloneMode()) {
      alert(
        '【iOSで通知を受け取る方法】\n' +
        'iOS (iPhone) では、Safariの「共有ボタン（↑）」をタップして「ホーム画面に追加」を行ってからアプリを起動すると、Web Push通知をご利用いただけます。'
      );
    } else {
      alert('お使いのブラウザはWeb Push通知に対応していません。Google ChromeやEdgeなどでお試しください。');
    }
    return false;
  }

  let currentPermission: NotificationPermission | 'unsupported' = Notification.permission;

  if (currentPermission === 'default') {
    currentPermission = await requestNotificationPermission();
  }

  if (currentPermission !== 'granted') {
    alert('ブラウザの通知許可が拒否（Block）されています。ブラウザの設定から通知を許可してください。');
    return false;
  }

  try {
    // Attempt Service Worker registration notification first
    if (!swRegistration) {
      swRegistration = await registerServiceWorker();
    }

    if (swRegistration && swRegistration.active) {
      await swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.tag || 'kanzaki-railway',
        data: { url: payload.url || '/' },
        vibrate: [200, 100, 200],
      } as NotificationOptions);
      return true;
    }

    // Fallback to standard Notification API
    new Notification(payload.title, {
      body: payload.body,
      icon: '/favicon.ico',
      tag: payload.tag || 'kanzaki-railway',
    });
    return true;
  } catch (error) {
    console.error('Failed to trigger notification:', error);
    // Fallback attempt
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: '/favicon.ico',
      });
      return true;
    } catch (fallbackError) {
      console.error('Fallback notification failed:', fallbackError);
      return false;
    }
  }
}
