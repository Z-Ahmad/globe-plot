import { useSyncExternalStore } from 'react';

export type InstallPlatform = 'ios' | 'android' | 'desktop' | null;

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // Standard way: already running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari legacy (window.navigator.standalone)
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  // Some browsers use display-mode: fullscreen or minimal-ui when installed
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
}

function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
}

function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function usePWAInstall() {
  const isStandalone = useSyncExternalStore(
    subscribe,
    getIsStandalone,
    () => false
  );
  const platform = getInstallPlatform();
  const canShowInstallPrompt = !isStandalone && platform !== null;
  return {
    isStandalone,
    platform,
    canShowInstallPrompt,
  };
}

const STORAGE_KEY = 'install-tutorial-dismissed';

export function getInstallTutorialDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setInstallTutorialDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
