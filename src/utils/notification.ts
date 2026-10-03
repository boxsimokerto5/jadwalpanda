import { soundManager } from './audio';
import { webPushService } from './webPushService';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  sound?: 'bell' | 'chime' | 'digital' | 'gong' | 'none';
}

class NotificationService {
  private hasNotificationApi: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasNotificationApi = true;
    }
  }

  public isSupported(): boolean {
    return this.hasNotificationApi;
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.hasNotificationApi) return 'unsupported';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.hasNotificationApi) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  public triggerNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      sound?: 'bell' | 'chime' | 'digital' | 'gong' | 'none';
      tag?: string;
      url?: string;
    }
  ) {
    const sound = options?.sound || 'bell';
    try {
      soundManager.playSound(sound);
    } catch {
      // Ignore audio error
    }

    if (this.hasNotificationApi && Notification.permission === 'granted') {
      // Deliver through Web Push Service Worker for background and system tray integration
      webPushService.showSystemNotification(title, {
        body: options?.body,
        icon: options?.icon || '/logo.svg',
        tag: options?.tag,
        url: options?.url || '/',
      }).catch((err) => {
        console.warn('Web push show notification fallback:', err);
      });
    }
  }
}

export const notificationService = new NotificationService();

