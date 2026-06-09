/**
 * Backend Script Analysis Service
 */

import { apiClient } from './api';

export interface ScriptAnalysisResult {
  locations: Array<{
    name: string;
    country: string;
    territory: string;
    frequency: number;
    isMainLocation: boolean;
  }>;
  budgetEstimate: {
    range: 'micro' | 'low' | 'medium' | 'high' | 'tentpole';
    minUSD: number;
    maxUSD: number;
    confidence: number;
    indicators: string[];
  };
  productionScale: {
    crewSize: 'small' | 'medium' | 'large' | 'extra_large';
    principalCast: 'small' | 'medium' | 'large' | 'extra_large';
    supportingCast: 'small' | 'medium' | 'large' | 'extra_large';
    backgroundExtras: 'small' | 'medium' | 'large' | 'extra_large';
    estimatedShootingDays: number;
  };
  equipment: {
    cameraEquipment: 'arri' | 'red' | 'sony' | 'panavision' | 'blackmagic' | 'canon' | 'other';
    specialEquipment: string[];
    vfxRequirements: 'minimal' | 'moderate' | 'heavy' | 'intensive';
  };
  metadata: {
    genres: string[];
    format: 'feature' | 'tv_series' | 'limited_series' | 'documentary' | 'short';
    tone: string;
    targetAudience: string;
  };
  challenges: {
    weatherDependent: boolean;
    historicalPeriod: boolean;
    specialPermits: boolean;
    stunts: boolean;
    animalWrangling: boolean;
    waterWork: boolean;
    nightShooting: boolean;
    notes: string[];
  };
  rawResponse?: string;
}

export async function analyzeScript(
  scriptContent: string,
  scriptTitle: string | { scriptTitle?: string },
  _options?: Record<string, unknown>
): Promise<ScriptAnalysisResult> {
  const resolvedTitle = typeof scriptTitle === 'string' ? scriptTitle : scriptTitle?.scriptTitle || 'Untitled';
  const file = new File([scriptContent], `${resolvedTitle || 'script'}.txt`, { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.upload<ScriptAnalysisResult>('/api/scripts/analyze', formData, { auth: true });
}

export async function testAnalysis(): Promise<ScriptAnalysisResult> {
  const sample = `INT. STUDIO NIGHT\nA producer reviews locations and discusses VFX heavy sequences.`;
  return analyzeScript(sample, 'Sample Script');
}

export async function extractTextFromPDF(_file: File): Promise<string> {
  throw new Error('PDF extraction is handled on backend.');
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') {
    return extractTextFromPDF(file);
  }
  return file.text();
}

export function validateScriptFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024;
  const allowedExtensions = ['pdf', 'txt', 'fountain', 'fdx'];
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size: 50MB',
    };
  }

  return { valid: true };
}

export function getFallbackAnalysis(_scriptTitle: string): ScriptAnalysisResult {
  return {
    locations: [],
    budgetEstimate: {
      range: 'medium',
      minUSD: 5000000,
      maxUSD: 30000000,
      confidence: 0.5,
      indicators: ['Fallback analysis'],
    },
    productionScale: {
      crewSize: 'medium',
      principalCast: 'medium',
      supportingCast: 'medium',
      backgroundExtras: 'medium',
      estimatedShootingDays: 30,
    },
    equipment: {
      cameraEquipment: 'arri',
      specialEquipment: [],
      vfxRequirements: 'moderate',
    },
    metadata: {
      genres: ['Drama'],
      format: 'feature',
      tone: 'Unknown',
      targetAudience: 'General audiences',
    },
    challenges: {
      weatherDependent: false,
      historicalPeriod: false,
      specialPermits: false,
      stunts: false,
      animalWrangling: false,
      waterWork: false,
      nightShooting: false,
      notes: ['Fallback analysis used'],
    },
  };
}

export default {
  analyzeScript,
  testAnalysis,
  extractTextFromFile,
  validateScriptFile,
  getFallbackAnalysis,
};
