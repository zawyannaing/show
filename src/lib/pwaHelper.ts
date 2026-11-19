// Progressive Web App (PWA) Helper & Install Manager

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isPwaInstallable(): boolean {
  return deferredPrompt !== null && !isPwaStandalone();
}

export function subscribePwaInstall(callback: (canInstall: boolean) => void): () => void {
  listeners.add(callback);
  callback(isPwaInstallable());
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  const installable = isPwaInstallable();
  listeners.forEach((cb) => cb(installable));
}

// Global listener setup (called once on boot)
export function initPwa() {
  if (typeof window === 'undefined') return;

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA ServiceWorker registration failed:', err);
        });
    });
  }

  // 2. Capture beforeinstallprompt for Android & Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  // 3. Track successful installation
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
    console.log('SHOW CARE MYANMAR PWA installed successfully!');
  });
}

// Trigger Android native install dialog
export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredPrompt) {
    return 'unsupported';
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyListeners();
    return choiceResult.outcome;
  } catch (err) {
    console.error('Error during PWA install prompt:', err);
    return 'unsupported';
  }
}
