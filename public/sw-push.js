// Service Worker for Web Push Notification API & Background Task Reminders
// Sistem Penjadwalan Shif & Pengingat Wali Asuh - Kemensos RI

const CACHE_NAME = 'wali-asuh-push-cache-v1';
const DB_NAME = 'WaliAsuhNotificationDB';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_alarms';

// Helper: Open IndexedDB in Service Worker
function openAlarmDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

// Helper: Get all active alarms from IndexedDB
async function getStoredAlarms() {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// Helper: Save an alarm to IndexedDB
async function storeAlarm(alarm) {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(alarm);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

// Helper: Remove an alarm from IndexedDB
async function removeAlarm(id) {
  try {
    const db = await openAlarmDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (e) {
    // Ignore
  }
}

// Active in-memory timers
const activeTimers = new Map();

function setupTimerForAlarm(alarm) {
  if (activeTimers.has(alarm.id)) {
    clearTimeout(activeTimers.get(alarm.id));
    activeTimers.delete(alarm.id);
  }

  const now = Date.now();
  const delay = Math.max(0, alarm.timestamp - now);

  // If already expired more than 15 minutes ago, remove it
  if (alarm.timestamp < now - 15 * 60 * 1000) {
    removeAlarm(alarm.id);
    return;
  }

  const timerId = setTimeout(async () => {
    activeTimers.delete(alarm.id);
    await removeAlarm(alarm.id);

    self.registration.showNotification(alarm.title || 'Pengingat Tugas Wali Asuh', {
      body: alarm.body || 'Waktunya agenda tugas shif harian Anda.',
      icon: alarm.icon || '/logo.svg',
      badge: alarm.badge || '/logo.svg',
      tag: alarm.tag || `alarm-${alarm.id}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 400],
      data: {
        url: alarm.url || '/',
        id: alarm.id,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Buka Jadwal' },
        { action: 'close', title: 'Tutup' }
      ]
    });
  }, delay);

  activeTimers.set(alarm.id, timerId);
}

// Load and schedule pending alarms on SW start
getStoredAlarms().then((alarms) => {
  alarms.forEach(setupTimerForAlarm);
});

// 1. PUSH EVENT: Triggered by Web Push API (Remote / FCM / WebPush Server)
// Runs even when the web application is completely closed or inactive!
self.addEventListener('push', function (event) {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      payload = {
        title: 'Pengingat Tugas Wali Asuh',
        body: event.data.text() || 'Ada pemberitahuan tugas shif baru.'
      };
    }
  } else {
    payload = {
      title: 'Pengingat Shif & Tugas',
      body: 'Waktunya melaksanakan agenda shif wali asuh hari ini.'
    };
  }

  const title = payload.title || 'Pengingat Tugas Wali Asuh';
  const notificationOptions = {
    body: payload.body || 'Pemberitahuan tugas shif Sekolah Rakyat.',
    icon: payload.icon || '/logo.svg',
    badge: payload.badge || '/logo.svg',
    tag: payload.tag || 'wali-asuh-push-' + Date.now(),
    renotify: true,
    requireInteraction: payload.requireInteraction !== false,
    vibrate: [250, 100, 250, 100, 400],
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
      ...(payload.data || {})
    },
    actions: payload.actions || [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// 2. NOTIFICATION CLICK EVENT: Handles user interaction from the OS Notification Tray
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If there's an existing open tab for this app, focus and navigate it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. MESSAGE EVENT: For communication between React App and Service Worker
self.addEventListener('message', async function (event) {
  if (!event.data) return;

  const { type, payload } = event.data;

  // Immediate notification requested by the app (uses SW for background/tray display)
  if (type === 'TRIGGER_IMMEDIATE_NOTIFICATION') {
    const title = payload.title || 'Pengingat Tugas Wali Asuh';
    self.registration.showNotification(title, {
      body: payload.body || 'Pemberitahuan tugas harian.',
      icon: payload.icon || '/logo.svg',
      badge: payload.badge || '/logo.svg',
      tag: payload.tag || 'immediate-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: payload.url || '/',
        timestamp: Date.now()
      },
      actions: [
        { action: 'open', title: 'Lihat Jadwal' },
        { action: 'close', title: 'Tutup' }
      ]
    });
  }

  // Schedule an alarm to fire in the background (even if tab is closed)
  if (type === 'SCHEDULE_ALARM') {
    const alarm = {
      id: payload.id || `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: payload.title,
      body: payload.body,
      timestamp: payload.timestamp, // Unix epoch ms
      tag: payload.tag || 'task-alarm',
      url: payload.url || '/',
      icon: payload.icon || '/logo.svg',
      badge: payload.badge || '/logo.svg'
    };

    await storeAlarm(alarm);
    setupTimerForAlarm(alarm);

    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true, id: alarm.id, delay: Math.max(0, alarm.timestamp - Date.now()) });
    }
  }

  // Test simulation: Fires a notification after N seconds delay
  // Perfect for user to minimize/close browser and test background push!
  if (type === 'TEST_BACKGROUND_PUSH') {
    const delayMs = payload.delayMs || 5000;
    const testAlarm = {
      id: 'test-push-' + Date.now(),
      title: payload.title || '🔔 Uji Web Push Background Sukses!',
      body: payload.body || 'Pemberitahuan ini muncul langsung ke layar perangkat Anda bahkan saat aplikasi tertutup.',
      timestamp: Date.now() + delayMs,
      tag: 'test-push-notification',
      url: payload.url || '/',
      icon: '/logo.svg',
      badge: '/logo.svg'
    };

    await storeAlarm(testAlarm);
    setupTimerForAlarm(testAlarm);

    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true, delayMs });
    }
  }

  // Cancel all alarms
  if (type === 'CANCEL_ALL_ALARMS') {
    activeTimers.forEach((timerId) => clearTimeout(timerId));
    activeTimers.clear();
    try {
      const db = await openAlarmDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch (e) {
      // Ignore
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  }

  // Get active alarms
  if (type === 'GET_ACTIVE_ALARMS') {
    const alarms = await getStoredAlarms();
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ alarms });
    }
  }

  // Ping SW
  if (type === 'PING') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'PONG', time: Date.now() });
    }
  }
});

// 4. PERIODIC SYNC EVENT (for supported browsers, e.g., Chromium on Android)
self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'check-scheduled-reminders') {
    event.waitUntil(
      (async () => {
        const alarms = await getStoredAlarms();
        const now = Date.now();
        for (const alarm of alarms) {
          if (alarm.timestamp <= now && alarm.timestamp >= now - 15 * 60 * 1000) {
            await self.registration.showNotification(alarm.title, {
              body: alarm.body,
              icon: alarm.icon || '/logo.svg',
              badge: alarm.badge || '/logo.svg',
              tag: alarm.tag,
              data: { url: alarm.url || '/' }
            });
            await removeAlarm(alarm.id);
          }
        }
      })()
    );
  }
});
