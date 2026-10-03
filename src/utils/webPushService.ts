// Web Push Notification API Service
// Standard W3C Push API & Service Worker Background Notification Manager
// Sistem Penjadwalan Shif & Pengingat Wali Asuh - Kemensos RI

import { getSupabaseClient } from './supabaseService';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';

// Standard VAPID Public Key (Uncompressed P-256 EC Key in Base64URL format)
export const VAPID_PUBLIC_KEY =
  'BJBjY8ipch6lBfk4rIIhEvbZFI4ZyL78MjinZFNkDWrprsfLwT67pdenYnAY0URsRoMMCvOJtzsgmyuW2OlKxbs';

export interface PushSubscriptionData {
  id: string;
  staffId?: number;
  staffName?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo: string;
  platform: string;
  subscribedAt: string;
  lastActive: string;
  isActive: boolean;
}

export interface ScheduledPushAlarm {
  id: string;
  title: string;
  body: string;
  timestamp: number; // Unix epoch ms
  targetTimeStr: string;
  shiftCode: string;
  tag: string;
  url?: string;
}

// Convert Base64URL string to Uint8Array for PushManager subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Generate unique device ID for localStorage
function getOrCreateDeviceId(): string {
  const key = 'wali_asuh_push_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

// Device platform detection summary
export function getDeviceInfo(): { name: string; isMobile: boolean; isStandalone: boolean } {
  if (typeof window === 'undefined') {
    return { name: 'Unknown', isMobile: false, isStandalone: false };
  }
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  let name = 'Desktop Browser';
  if (/Android/i.test(ua)) name = 'Android Device';
  else if (/iPhone|iPad|iPod/i.test(ua)) name = 'Apple iOS Device';
  else if (/Windows/i.test(ua)) name = 'Windows PC';
  else if (/Macintosh/i.test(ua)) name = 'Mac OS';
  else if (/Linux/i.test(ua)) name = 'Linux Desktop';

  return { name: `${name}${isStandalone ? ' (PWA Terinstal)' : ''}`, isMobile, isStandalone };
}

class WebPushService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribing: boolean = false;

  // 1. Check if browser supports Web Push API
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // 2. Get current browser permission
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // 3. Request Notification Permission
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  // 4. Ensure Service Worker Registration is active
  public async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    if (this.swRegistration) {
      return this.swRegistration;
    }

    try {
      // First wait for ready registration (registered by vite-plugin-pwa)
      const reg = await navigator.serviceWorker.ready;
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('ServiceWorker ready fallback attempt:', err);
      try {
        const fallbackReg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
        this.swRegistration = fallbackReg;
        return fallbackReg;
      } catch (regErr) {
        console.error('Failed to register ServiceWorker:', regErr);
        return null;
      }
    }
  }

  // 5. Get existing Push Subscription from browser
  public async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await this.getServiceWorkerRegistration();
      if (!reg) return null;
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.warn('Error reading PushSubscription:', err);
      return null;
    }
  }

  // 6. Subscribe Device to Web Push API and save to Supabase
  public async subscribeUser(
    staffId?: number,
    staffName?: string
  ): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Web Push API tidak didukung oleh peramban ini.' };
    }

    if (this.isSubscribing) {
      return { success: false, error: 'Proses pendaftaran sedang berlangsung.' };
    }

    this.isSubscribing = true;

    try {
      // Step A: Request notification permission if not yet granted
      if (Notification.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) {
          return {
            success: false,
            error: 'Izin notifikasi ditolak oleh pengguna. Silakan aktifkan izin notifikasi di pengaturan browser.',
          };
        }
      }

      // Step B: Get ServiceWorker registration
      const reg = await this.getServiceWorkerRegistration();
      if (!reg) {
        return { success: false, error: 'Gagal mengaktifkan Service Worker pada perangkat.' };
      }

      // Step C: Subscribe to browser PushManager
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // Step D: Serialize subscription
      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        return { success: false, error: 'Format kunci enkripsi Web Push tidak lengkap.' };
      }

      const deviceId = getOrCreateDeviceId();
      const devInfo = getDeviceInfo();
      const subRecord: PushSubscriptionData = {
        id: `push_${deviceId}`,
        staffId: staffId || undefined,
        staffName: staffName || undefined,
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        deviceInfo: devInfo.name,
        platform: navigator.platform || 'Unknown',
        subscribedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isActive: true,
      };

      // Step E: Save to Supabase
      try {
        const client = getSupabaseClient();
        if (client) {
          await client.from('push_subscriptions').upsert({
            id: subRecord.id,
            staff_id: subRecord.staffId || null,
            endpoint: subRecord.endpoint,
            keys_json: subRecord.keys,
            device_info: subRecord.deviceInfo,
            last_active: subRecord.lastActive,
            is_active: subRecord.isActive,
          });
        }
      } catch (subErr) {
        console.warn('Supabase push subscription save warning (cached locally):', subErr);
      }

      // Step F: Save local cache
      localStorage.setItem('wali_asuh_push_active', 'true');
      localStorage.setItem('wali_asuh_push_subscription', JSON.stringify(subRecord));

      // Step G: Trigger welcome background notification
      await this.showSystemNotification('🔔 Web Push Berhasil Diaktifkan!', {
        body: `Perangkat ${devInfo.name} kini terdaftar menerima alarm & pengingat shif bahkan saat aplikasi tertutup.`,
        tag: 'welcome-push',
      });

      return { success: true, subscription };
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      return { success: false, error: err?.message || 'Gagal mendaftarkan Web Push pada perangkat.' };
    } finally {
      this.isSubscribing = false;
    }
  }

  // 7. Unsubscribe device from Web Push API
  public async unsubscribeUser(): Promise<{ success: boolean; error?: string }> {
    try {
      const reg = await this.getServiceWorkerRegistration();
      if (reg) {
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      const deviceId = getOrCreateDeviceId();
      try {
        const client = getSupabaseClient();
        if (client) {
          await client.from('push_subscriptions').update({
            is_active: false,
            last_active: new Date().toISOString(),
          }).eq('id', `push_${deviceId}`);
        }
      } catch {
        // Ignore delete error
      }

      localStorage.removeItem('wali_asuh_push_active');
      localStorage.removeItem('wali_asuh_push_subscription');

      // Cancel all SW alarms
      await this.cancelAllAlarms();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal membatalkan langganan push.' };
    }
  }

  // 8. Safely display system notification through Service Worker
  public async showSystemNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      badge?: string;
      tag?: string;
      url?: string;
    }
  ): Promise<void> {
    try {
      const reg = await this.getServiceWorkerRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body: options?.body || 'Pemberitahuan tugas wali asuh.',
          icon: options?.icon || '/logo.svg',
          badge: options?.badge || '/logo.svg',
          tag: options?.tag || 'notification-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          vibrate: [250, 100, 250, 100, 400],
          data: {
            url: options?.url || '/',
            timestamp: Date.now(),
          },
          actions: [
            { action: 'open', title: 'Buka Jadwal' },
            { action: 'close', title: 'Tutup' },
          ],
        } as any);
        return;
      }
    } catch (err) {
      console.warn('SW showNotification failed, trying fallback:', err);
    }

    // Fallback if Service Worker is unavailable
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/logo.svg',
          tag: options?.tag,
        });
      } catch (err) {
        console.warn('Native notification fallback failed:', err);
      }
    }
  }

  // 9. Test Web Push in Background with Delay (User can minimize browser to verify)
  public async triggerTestBackgroundPush(delaySeconds: number = 5): Promise<{ success: boolean; message: string }> {
    const reg = await this.getServiceWorkerRegistration();
    if (!reg) {
      return { success: false, message: 'Service Worker tidak tersedia.' };
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data?.success) {
          resolve({
            success: true,
            message: `Uji coba Web Push dijadwalkan! Notifikasi akan muncul dalam ${delaySeconds} detik. Silakan minimalkan atau tutup sementara browser untuk menguji.`,
          });
        } else {
          resolve({ success: false, message: 'Gagal menjadwalkan notifikasi latar belakang.' });
        }
      };

      if (reg.active) {
        reg.active.postMessage(
          {
            type: 'TEST_BACKGROUND_PUSH',
            payload: {
              delayMs: delaySeconds * 1000,
              title: '🔔 Uji Web Push Background Berhasil!',
              body: 'Notifikasi ini dikirim langsung ke sistem OS Anda meskipun aplikasi sedang ditutup.',
            },
          },
          [messageChannel.port2]
        );
      } else {
        // If SW not active yet, use setTimeout
        setTimeout(() => {
          this.showSystemNotification('🔔 Uji Web Push Background Berhasil!', {
            body: 'Notifikasi ini dikirim langsung ke sistem OS Anda.',
          });
        }, delaySeconds * 1000);
        resolve({
          success: true,
          message: `Uji coba Web Push aktif dalam ${delaySeconds} detik. Silakan cek layar perangkat Anda.`,
        });
      }
    });
  }

  // 10. Schedule Shif & Task Alarms into Service Worker Background Worker
  public async scheduleShiftAlarms(
    staffId: number,
    staffName: string,
    shiftCode: string,
    targetDateStr?: string
  ): Promise<{ count: number; alarms: ScheduledPushAlarm[] }> {
    const reg = await this.getServiceWorkerRegistration();
    if (!reg || !reg.active) {
      return { count: 0, alarms: [] };
    }

    const shiftInfo = (SHIFT_DEFINITIONS as any)[shiftCode];
    if (!shiftInfo) {
      return { count: 0, alarms: [] };
    }

    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const createdAlarms: ScheduledPushAlarm[] = [];

    // Helper to compute epoch ms for specific HH:mm today
    const makeTime = (hour: number, minute: number): number => {
      const d = new Date(todayY, todayM, todayD, hour, minute, 0, 0);
      return d.getTime();
    };

    // Shif Pagi (P1, P2, P3, P4)
    if (shiftCode.startsWith('P')) {
      // 30 mins before shift: 06:30
      createdAlarms.push({
        id: `alarm_${staffId}_pagi_start`,
        title: `⏰ Pengingat Shif Pagi (${shiftCode}): Siap Apel 06:30`,
        body: `Halo ${staffName}, 30 menit lagi shif dinas ${shiftCode} dimulai (07:00 WIB). Siapkan seragam & log buku jaga.`,
        timestamp: makeTime(6, 30),
        targetTimeStr: '06:30 WIB',
        shiftCode,
        tag: 'shift-morning-pre',
        url: '/#dashboard',
      });

      // Dzuhur & Makan Siang: 11:45
      createdAlarms.push({
        id: `alarm_${staffId}_pagi_dzuhur`,
        title: `🕌 Pengingat Tugas Shif Pagi: Sholat Dzuhur & Makan Siang`,
        body: `Pukul 11:45 WIB: Bimbing siswa ke masjid untuk Sholat Dzuhur berjamaah dan dampingi makan siang tertib.`,
        timestamp: makeTime(11, 45),
        targetTimeStr: '11:45 WIB',
        shiftCode,
        tag: 'task-morning-dzuhur',
        url: '/#dashboard',
      });

      // Handover Shif Sore: 14:30
      createdAlarms.push({
        id: `alarm_${staffId}_pagi_handover`,
        title: `📋 Pengingat Serah Terima (Handover): Shif Pagi ke Sore`,
        body: `Pukul 14:30 WIB: Siapkan Laporan Serah Terima & Jurnal Santri sebelum pergantian shif pukul 15:00 WIB.`,
        timestamp: makeTime(14, 30),
        targetTimeStr: '14:30 WIB',
        shiftCode,
        tag: 'task-morning-handover',
        url: '/#handover',
      });

      // Khusus P4: Tugas Tambahan Makan Malam Asrama & Siaga s.d 20:00
      if (shiftCode === 'P4') {
        createdAlarms.push({
          id: `alarm_${staffId}_p4_maghrib`,
          title: `🍽️ Pengingat Khusus P4: Makan Malam Santri & Siaga Asrama`,
          body: `Pukul 17:30 WIB: Petugas P4 mendampingi makan malam santri di asrama dan siaga kunjungan tamu luar.`,
          timestamp: makeTime(17, 30),
          targetTimeStr: '17:30 WIB',
          shiftCode,
          tag: 'task-p4-dinner',
          url: '/#codeguide',
        });

        createdAlarms.push({
          id: `alarm_${staffId}_p4_pulang`,
          title: `🏁 Waktu Kepulangan Resmi P4: 20:00 WIB`,
          body: `Pukul 20:00 WIB: Shif P4 selesai setelah makan malam & monitoring asrama selesai. Selamat beristirahat!`,
          timestamp: makeTime(20, 0),
          targetTimeStr: '20:00 WIB',
          shiftCode,
          tag: 'task-p4-finish',
          url: '/#dashboard',
        });
      }
    }

    // Shif Sore (S2A, S3A, S4A)
    if (shiftCode.startsWith('S')) {
      createdAlarms.push({
        id: `alarm_${staffId}_sore_start`,
        title: `⏰ Pengingat Shif Sore (${shiftCode}): Siap Apel 14:30`,
        body: `Halo ${staffName}, 30 menit lagi Shif Sore ${shiftCode} dimulai (15:00 WIB). Lakukan koordinasi serah terima dengan shif pagi.`,
        timestamp: makeTime(14, 30),
        targetTimeStr: '14:30 WIB',
        shiftCode,
        tag: 'shift-afternoon-pre',
        url: '/#dashboard',
      });

      createdAlarms.push({
        id: `alarm_${staffId}_sore_maghrib`,
        title: `🕌 Pengingat Tugas Shif Sore: Sholat Maghrib & Makan Malam`,
        body: `Pukul 17:30 WIB: Dampingi sholat Maghrib, Isya', serta evaluasi ketertiban ruang makan/kantin santri.`,
        timestamp: makeTime(17, 30),
        targetTimeStr: '17:30 WIB',
        shiftCode,
        tag: 'task-afternoon-maghrib',
        url: '/#dashboard',
      });

      createdAlarms.push({
        id: `alarm_${staffId}_sore_belajar`,
        title: `📚 Pengingat Jam Belajar Mandiri & Ketertiban Asrama`,
        body: `Pukul 19:30 WIB: Keliling kamar asrama memastikan seluruh santri mengikuti jam belajar malam dengan tenang.`,
        timestamp: makeTime(19, 30),
        targetTimeStr: '19:30 WIB',
        shiftCode,
        tag: 'task-afternoon-study',
        url: '/#dashboard',
      });

      createdAlarms.push({
        id: `alarm_${staffId}_sore_handover`,
        title: `📋 Pengingat Handover Shif Sore ke Shif Malam`,
        body: `Pukul 22:30 WIB: Siapkan buku jurnal jaga malam dan serah terima kepada petugas M1/M2/M3.`,
        timestamp: makeTime(22, 30),
        targetTimeStr: '22:30 WIB',
        shiftCode,
        tag: 'task-afternoon-handover',
        url: '/#handover',
      });
    }

    // Shif Malam (M1, M2, M3)
    if (shiftCode.startsWith('M')) {
      createdAlarms.push({
        id: `alarm_${staffId}_malam_start`,
        title: `⏰ Pengingat Shif Malam (${shiftCode}): Mulai Jaga Malam`,
        body: `Halo ${staffName}, Shif Malam ${shiftCode} aktif. Ambil alih kendali keamanan barak dan penguncian gerbang asrama.`,
        timestamp: makeTime(22, 30),
        targetTimeStr: '22:30 WIB',
        shiftCode,
        tag: 'shift-night-pre',
        url: '/#dashboard',
      });

      // Khusus M3: Wajib Foto Keliling 23:00 WIB
      if (shiftCode === 'M3') {
        createdAlarms.push({
          id: `alarm_${staffId}_m3_patroli`,
          title: `🚨 PENGINGAT WAJIB M3: Patroli & Foto Keliling Asrama 23:00 WIB`,
          body: `Perhatian petugas M3! Pukul 23:00 WIB wajib melakukan patroli keliling seluruh barak asrama dan mengirimkan foto dokumentasi ke Grup WhatsApp.`,
          timestamp: makeTime(23, 0),
          targetTimeStr: '23:00 WIB',
          shiftCode,
          tag: 'task-m3-photo-patrol',
          url: '/#codeguide',
        });
      }

      // Bangunkan Subuh: 04:00
      createdAlarms.push({
        id: `alarm_${staffId}_malam_subuh`,
        title: `🕌 Pengingat Bangunkan Sholat Subuh: 04:00 WIB`,
        body: `Pukul 04:00 WIB: Bangunkan santri di seluruh barak, hidupkan lampu, dan bimbing persiapan sholat Subuh berjamaah.`,
        timestamp: makeTime(4, 0),
        targetTimeStr: '04:00 WIB',
        shiftCode,
        tag: 'task-night-subuh',
        url: '/#dashboard',
      });
    }

    // Filter alarms that are still in the future or within next 24 hours
    const validAlarms = createdAlarms.filter((a) => a.timestamp > now.getTime());

    // Register each alarm in Service Worker
    for (const alarm of validAlarms) {
      reg.active.postMessage({
        type: 'SCHEDULE_ALARM',
        payload: alarm,
      });
    }

    // Cache locally
    localStorage.setItem(`scheduled_alarms_${staffId}`, JSON.stringify(validAlarms));

    return { count: validAlarms.length, alarms: validAlarms };
  }

  // 11. Cancel all Service Worker Alarms
  public async cancelAllAlarms(): Promise<void> {
    const reg = await this.getServiceWorkerRegistration();
    if (reg && reg.active) {
      reg.active.postMessage({ type: 'CANCEL_ALL_ALARMS' });
    }
  }

  // 12. Check if device has active subscription locally
  public hasLocalSubscription(): boolean {
    return (
      typeof window !== 'undefined' &&
      localStorage.getItem('wali_asuh_push_active') === 'true' &&
      Notification.permission === 'granted'
    );
  }
}

export const webPushService = new WebPushService();
