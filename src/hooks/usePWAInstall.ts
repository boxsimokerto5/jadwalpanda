import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global reference so the event is captured immediately if fired before React component mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let isGloballyInstalled = false;

// Determine if currently running in installed standalone mode
export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Check whether app is already recorded as installed
export function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (checkIsStandalone()) return true;
  try {
    if (localStorage.getItem('pwa_installed') === 'true') {
      return true;
    }
  } catch {
    // Ignore localStorage errors
  }
  return false;
}

// Global browser event listeners
if (typeof window !== 'undefined') {
  if (checkIsStandalone()) {
    isGloballyInstalled = true;
    try {
      localStorage.setItem('pwa_installed', 'true');
    } catch {}
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar to let our 1-click install button trigger the prompt
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa_prompt_ready'));
  });

  window.addEventListener('appinstalled', () => {
    isGloballyInstalled = true;
    globalDeferredPrompt = null;
    try {
      localStorage.setItem('pwa_installed', 'true');
    } catch {}
    window.dispatchEvent(new CustomEvent('pwa_installed_event'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsInstalled());
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('pwa_banner_dismissed');
      return dismissed === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Re-verify installation status
    if (checkIsInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isIOSDevice);

    // If global prompt already exists, use it
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    // Check Chrome / Chromium installed apps API
    if ('getInstalledRelatedApps' in window.navigator) {
      try {
        (window.navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> })
          .getInstalledRelatedApps()
          .then((relatedApps) => {
            if (relatedApps && relatedApps.length > 0) {
              setIsInstalled(true);
              try {
                localStorage.setItem('pwa_installed', 'true');
              } catch {}
            }
          })
          .catch(() => {});
      } catch {}
    }

    // Listener for when deferred prompt becomes ready
    const handlePromptReady = () => {
      if (globalDeferredPrompt) {
        setDeferredPrompt(globalDeferredPrompt);
      }
    };

    // Listener for app installed event
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
    };

    // Listener for display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        try {
          localStorage.setItem('pwa_installed', 'true');
        } catch {}
      }
    };

    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('pwa_installed_event', handleInstalled);
    window.addEventListener('appinstalled', handleInstalled);
    try {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } catch {}

    return () => {
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('pwa_installed_event', handleInstalled);
      window.removeEventListener('appinstalled', handleInstalled);
      try {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } catch {}
    };
  }, []);

  // 1-Click direct install action
  const install = useCallback(async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (!promptToUse) {
      return false;
    }
    try {
      await promptToUse.prompt();
      const choiceResult = await promptToUse.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        try {
          localStorage.setItem('pwa_installed', 'true');
        } catch {}
        return true;
      }
      return false;
    } catch (err) {
      console.error('PWA install prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {}
  }, []);

  return {
    isInstallable: !!(deferredPrompt || globalDeferredPrompt),
    isInstalled,
    isIOS,
    isDismissed,
    install,
    dismiss,
    deferredPrompt: deferredPrompt || globalDeferredPrompt,
  };
}
