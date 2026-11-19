export type ActiveSection = 'overview' | 'remedies' | 'plants' | 'symptoms' | 'hotlines' | 'assistant' | 'posts' | 'admin' | 'home_treatments';

export type ThemeMode = 'light' | 'comfort' | 'dark';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface HomeMedicalRecord {
  id: string;
  patientName: string;
  date: string;
  symptoms: string;
  remedyTaken: string;
  notes?: string;
  status: 'recovered' | 'treating' | 'consulted';
  createdAt: number;
}

export interface CustomSymptomRemedy {
  id: string;
  symptomName: string;
  symptomNameMy: string;
  category: string;
  categoryMy: string;
  description: string;
  descriptionMy: string;
  remedies: string[];
  remediesMy: string[];
  precautions?: string[];
  precautionsMy?: string[];
  isCustom?: boolean;
}

export interface Herb {
  id: string;
  scientificName: string;
  myanmarName: string;
  englishName: string;
  pharmaceuticalPart: string;
  pharmaceuticalPartMy?: string;
  category: 'digestive' | 'respiratory' | 'antimicrobial' | 'anti-inflammatory' | 'adaptogen' | 'circulatory';
  tags: string[];
  tagsMy?: string[];
  description: string;
  myanmarDescription?: string;
  dosage: string;
  dosageMy?: string;
  preparation: string;
  preparationMy?: string;
  clinicalIndication: string;
  clinicalIndicationMy?: string;
  imageUrl: string;
  activeCompounds: string[];
  activeCompoundsMy?: string[];
  traditionalUses: string[];
  traditionalUsesMy?: string[];
  contraindications: string[];
  contraindicationsMy?: string[];
  chemicalFamily: string;
  chemicalFamilyMy?: string;
  verified: boolean;
}

export interface ProtocolStep {
  title: string;
  instruction: string;
  caution?: string;
}

export interface EmergencyProtocol {
  id: string;
  number: number;
  title: string;
  myanmarTitle: string;
  category: 'respiratory' | 'gastrointestinal' | 'musculoskeletal' | 'heat-fevers' | 'cardiovascular';
  badge: 'CRITICAL' | 'LIFE SAFETY' | 'RAPID ACTION' | 'URGENT';
  badgeType: 'black' | 'canvas-soft';
  steps: ProtocolStep[];
}

export interface EmergencyHotline {
  id: string;
  name: string;
  myanmarName: string;
  number: string;
  icon: string;
  isPrimary?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  myanmarText?: string;
  timestamp: string;
  suggestions?: string[];
  isEmergencyAlert?: boolean;
  image?: string;
  medicineResult?: MedicineAnalysisResult;
  liked?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  hasImage?: boolean;
  messages: ChatMessage[];
}

export interface SeniorHealthTopic {
  id: string;
  titleEn: string;
  titleMy: string;
  subtitleEn: string;
  subtitleMy: string;
  icon: string;
  category: 'cardiovascular' | 'metabolic' | 'musculoskeletal' | 'neurological' | 'lifestyle';
  vitalGuide?: {
    metric: string;
    normal: string;
    warning: string;
    crisis: string;
  };
  herbalRemedies: {
    herbId: string;
    nameEn: string;
    nameMy: string;
    actionEn: string;
    actionMy: string;
    prepEn: string;
    prepMy: string;
  }[];
  lifestyleTipsEn: string[];
  lifestyleTipsMy: string[];
  precautionsEn: string[];
  precautionsMy: string[];
}

export interface MedicineAnalysisResult {
  medicineName: string;
  myanmarName?: string;
  genericName?: string;
  category?: string;
  purpose: string;
  myanmarPurpose?: string;
  instructions: string[];
  myanmarInstructions?: string[];
  timing?: string;
  myanmarTiming?: string;
  precautions: string[];
  myanmarPrecautions?: string[];
  storageAdvice?: string;
  myanmarStorageAdvice?: string;
  summaryForSpeech?: string;
  myanmarSummaryForSpeech?: string;
  confidence?: 'high' | 'medium' | 'low';
  disclaimer?: string;
  source?: string;
}
