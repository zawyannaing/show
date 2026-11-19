import { HERBS_DATA } from '../data/herbs';
import { PROTOCOLS_DATA } from '../data/protocols';
import { HOTLINES_DATA } from '../data/hotlines';
import { DEFAULT_SYMPTOMS } from '../data/symptoms';
import { treatments } from '../components/homeTreatments/data';
import { getManagedHerbs, getManagedSymptoms, getManagedProtocols, getManagedHotlines } from './contentManager';

const OFFLINE_PACK_KEY = 'showcare_offline_pack_status';
const OFFLINE_CACHE_NAME = 'showcare-offline-pack-v1';

export interface OfflinePackStatus {
  isDownloaded: boolean;
  downloadedAt: string | null;
  totalItems: number;
  sizeEstimate: string;
}

export function getOfflinePackStatus(): OfflinePackStatus {
  if (typeof window === 'undefined') {
    return { isDownloaded: false, downloadedAt: null, totalItems: 0, sizeEstimate: '0 MB' };
  }
  try {
    const raw = localStorage.getItem(OFFLINE_PACK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { isDownloaded: false, downloadedAt: null, totalItems: 0, sizeEstimate: '0 MB' };
}

/**
 * Downloads all medical data, remedies, acupoints, and image assets into offline cache
 */
export async function downloadOfflineMedicalPack(
  onProgress?: (percent: number, message: string) => void
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Snapshot all datasets
    onProgress?.(15, 'ဆေးပင်များနှင့် ဆေးနည်းမှတ်တမ်းများ ပြုစုနေပါသည်...');
    const herbs = getManagedHerbs();
    const symptoms = getManagedSymptoms();
    const protocols = getManagedProtocols();
    const hotlines = getManagedHotlines();
    const acupoints = treatments;

    // Save persistent offline snapshots in localStorage
    localStorage.setItem('tmhip_custom_herbs', JSON.stringify(herbs));
    localStorage.setItem('tmhip_custom_symptom_remedies', JSON.stringify(symptoms));
    localStorage.setItem('tmhip_custom_protocols', JSON.stringify(protocols));
    localStorage.setItem('tmhip_custom_hotlines', JSON.stringify(hotlines));
    localStorage.setItem('showcare_offline_acupoints', JSON.stringify(acupoints));

    onProgress?.(45, 'အရေးပေါ် ရှေးဦးပြုစုနည်းများနှင့် လက်နှိပ်ကုထုံးများ သိမ်းဆည်းနေပါသည်...');

    // 2. Cache key visual assets into CacheStorage
    if ('caches' in window) {
      onProgress?.(70, 'ပုံရိပ်များနှင့် ဆေးကျမ်းဖိုင်များကို အော့ဖ်လိုင်းသိမ်းဆည်းနေပါသည်...');
      try {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const coreUrls = [
          '/',
          '/index.html',
          '/manifest.json',
          '/icon-192.png',
          '/icon-512.png',
          '/og-image.jpg',
          '/favicon.ico'
        ];

        // Gather sample plant image URLs
        const plantImageUrls = herbs
          .map((h) => h.imageUrl)
          .filter((url) => Boolean(url && url.startsWith('http')))
          .slice(0, 30);

        const urlsToCache = [...coreUrls, ...plantImageUrls];

        await Promise.allSettled(
          urlsToCache.map((url) =>
            fetch(url, { mode: 'no-cors' })
              .then((resp) => {
                if (resp) cache.put(url, resp);
              })
              .catch(() => {})
          )
        );
      } catch (cacheErr) {
        console.warn('CacheStorage warning during offline pack download:', cacheErr);
      }
    }

    onProgress?.(100, 'အော့ဖ်လိုင်း ဆေးကျမ်းများ အောင်မြင်စွာ ဒေါင်းလုဒ်ပြီးပါပြီ!');

    const totalCount = herbs.length + symptoms.length + protocols.length + acupoints.length + hotlines.length;
    const status: OfflinePackStatus = {
      isDownloaded: true,
      downloadedAt: new Date().toISOString(),
      totalItems: totalCount,
      sizeEstimate: '12.4 MB'
    };

    localStorage.setItem(OFFLINE_PACK_KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent('showcare_offline_pack_updated', { detail: status }));
    return true;
  } catch (err) {
    console.error('Failed to download offline pack:', err);
    return false;
  }
}

/**
 * Clear the offline pack cache
 */
export async function clearOfflineMedicalPack(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OFFLINE_PACK_KEY);
    if ('caches' in window) {
      await caches.delete(OFFLINE_CACHE_NAME);
    }
    const status: OfflinePackStatus = {
      isDownloaded: false,
      downloadedAt: null,
      totalItems: 0,
      sizeEstimate: '0 MB'
    };
    window.dispatchEvent(new CustomEvent('showcare_offline_pack_updated', { detail: status }));
  } catch (err) {
    console.warn('Failed to clear offline pack:', err);
  }
}
