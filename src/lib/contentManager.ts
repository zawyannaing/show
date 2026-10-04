import { Herb, EmergencyProtocol, EmergencyHotline, SeniorHealthTopic, CustomSymptomRemedy } from '../types';
import { HERBS_DATA } from '../data/herbs';
import { PROTOCOLS_DATA } from '../data/protocols';
import { HOTLINES_DATA } from '../data/hotlines';
import { SENIOR_HEALTH_DATA } from '../data/seniorHealth';
import { DEFAULT_SYMPTOMS } from '../data/symptoms';

// Storage keys
const STORAGE_KEYS = {
  HERBS: 'tmhip_custom_herbs',
  PROTOCOLS: 'tmhip_custom_protocols',
  HOTLINES: 'tmhip_custom_hotlines',
  SENIOR: 'tmhip_custom_senior',
  SYMPTOMS: 'tmhip_custom_symptom_remedies',
};

// --- HERBS (Medicinal Plants) ---
export function getManagedHerbs(): Herb[] {
  if (typeof window === 'undefined') return HERBS_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HERBS);
    if (!saved) return HERBS_DATA;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = parsed.map((item: Herb) => {
        const defaultHerb = HERBS_DATA.find(h => h.id === item.id);
        if (!defaultHerb) return item;
        return {
          ...defaultHerb,
          ...item,
          myanmarName: item.myanmarName || defaultHerb.myanmarName,
          myanmarDescription: item.myanmarDescription || defaultHerb.myanmarDescription,
          dosageMy: item.dosageMy || defaultHerb.dosageMy,
          preparationMy: item.preparationMy || defaultHerb.preparationMy,
          clinicalIndicationMy: item.clinicalIndicationMy || defaultHerb.clinicalIndicationMy,
          pharmaceuticalPartMy: item.pharmaceuticalPartMy || defaultHerb.pharmaceuticalPartMy,
          chemicalFamilyMy: item.chemicalFamilyMy || defaultHerb.chemicalFamilyMy,
          tagsMy: (item.tagsMy && item.tagsMy.length > 0) ? item.tagsMy : defaultHerb.tagsMy,
          activeCompoundsMy: (item.activeCompoundsMy && item.activeCompoundsMy.length > 0) ? item.activeCompoundsMy : defaultHerb.activeCompoundsMy,
          traditionalUsesMy: (item.traditionalUsesMy && item.traditionalUsesMy.length > 0) ? item.traditionalUsesMy : defaultHerb.traditionalUsesMy,
          contraindicationsMy: (item.contraindicationsMy && item.contraindicationsMy.length > 0) ? item.contraindicationsMy : defaultHerb.contraindicationsMy,
        };
      });
      const existingIds = new Set(parsed.map((item: Herb) => item.id));
      const newDefaults = HERBS_DATA.filter(h => !existingIds.has(h.id));
      return [...merged, ...newDefaults];
    }
    return HERBS_DATA;
  } catch (e) {
    console.error('Failed to parse managed herbs:', e);
    return HERBS_DATA;
  }
}

export function saveManagedHerbs(herbs: Herb[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.HERBS, JSON.stringify(herbs));
  window.dispatchEvent(new Event('tmhip_content_updated'));
}

export function resetHerbsToDefault(): Herb[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.HERBS);
    window.dispatchEvent(new Event('tmhip_content_updated'));
  }
  return HERBS_DATA;
}

// --- EMERGENCY PROTOCOLS (First Aid) ---
export function getManagedProtocols(): EmergencyProtocol[] {
  if (typeof window === 'undefined') return PROTOCOLS_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROTOCOLS);
    if (!saved) return PROTOCOLS_DATA;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : PROTOCOLS_DATA;
  } catch (e) {
    console.error('Failed to parse managed protocols:', e);
    return PROTOCOLS_DATA;
  }
}

export function saveManagedProtocols(protocols: EmergencyProtocol[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROTOCOLS, JSON.stringify(protocols));
  window.dispatchEvent(new Event('tmhip_content_updated'));
}

export function resetProtocolsToDefault(): EmergencyProtocol[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.PROTOCOLS);
    window.dispatchEvent(new Event('tmhip_content_updated'));
  }
  return PROTOCOLS_DATA;
}

// --- EMERGENCY HOTLINES & PHONES ---
export function getManagedHotlines(): EmergencyHotline[] {
  if (typeof window === 'undefined') return HOTLINES_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HOTLINES);
    if (!saved) return HOTLINES_DATA;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : HOTLINES_DATA;
  } catch (e) {
    console.error('Failed to parse managed hotlines:', e);
    return HOTLINES_DATA;
  }
}

export function saveManagedHotlines(hotlines: EmergencyHotline[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.HOTLINES, JSON.stringify(hotlines));
  window.dispatchEvent(new Event('tmhip_content_updated'));
}

export function resetHotlinesToDefault(): EmergencyHotline[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.HOTLINES);
    window.dispatchEvent(new Event('tmhip_content_updated'));
  }
  return HOTLINES_DATA;
}

// --- 40+ SENIOR CARE TOPICS ---
export function getManagedSeniorTopics(): SeniorHealthTopic[] {
  if (typeof window === 'undefined') return SENIOR_HEALTH_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SENIOR);
    if (!saved) return SENIOR_HEALTH_DATA;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SENIOR_HEALTH_DATA;
  } catch (e) {
    console.error('Failed to parse managed senior topics:', e);
    return SENIOR_HEALTH_DATA;
  }
}

export function saveManagedSeniorTopics(topics: SeniorHealthTopic[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SENIOR, JSON.stringify(topics));
  window.dispatchEvent(new Event('tmhip_content_updated'));
}

export function resetSeniorTopicsToDefault(): SeniorHealthTopic[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.SENIOR);
    window.dispatchEvent(new Event('tmhip_content_updated'));
  }
  return SENIOR_HEALTH_DATA;
}

// --- SYMPTOMS & HOME REMEDIES ---
export function getManagedSymptoms(): CustomSymptomRemedy[] {
  if (typeof window === 'undefined') return DEFAULT_SYMPTOMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SYMPTOMS);
    if (!saved) return DEFAULT_SYMPTOMS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SYMPTOMS;
  } catch (e) {
    console.error('Failed to parse managed symptoms:', e);
    return DEFAULT_SYMPTOMS;
  }
}

export function saveManagedSymptoms(symptoms: CustomSymptomRemedy[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SYMPTOMS, JSON.stringify(symptoms));
  window.dispatchEvent(new Event('tmhip_content_updated'));
}

export function resetSymptomsToDefault(): CustomSymptomRemedy[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.SYMPTOMS);
    window.dispatchEvent(new Event('tmhip_content_updated'));
  }
  return DEFAULT_SYMPTOMS;
}
