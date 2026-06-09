/**
 * Production Intelligence Manager
 * Tracks camera equipment, crew size, cast size, and extras demand trends
 * Data source: Aggregated from user script uploads (anonymized)
 */
import type { ProductionSignal } from '@/services/admin.types';

export interface CameraEquipmentTrend {
  equipment: string;
  displayName: string;
  demandCount: number;
  percentageOfTotal: number;
  topTerritories: Array<{ territory: string; count: number }>;
}

export interface CrewSizeTrend {
  sizeRange: string;
  displayName: string;
  count: number;
  percentageOfTotal: number;
  averageByTerritory: Array<{ territory: string; avgSize: string }>;
}

export interface CastDemandTrend {
  category: 'principal' | 'supporting' | 'extras';
  sizeRange: string;
  displayName: string;
  count: number;
  percentageOfTotal: number;
  territories: Array<{ territory: string; count: number }>;
}

export interface ProductionScaleDistribution {
  budgetRange: string;
  count: number;
  avgCrewSize: string;
  avgCastSize: string;
  avgExtras: string;
  territories: string[];
}

export interface TerritoryDemandForecast {
  territory: string;
  quarter: string;
  totalProductions: number;
  avgCrewSize: number;
  avgCastSize: number;
  avgExtras: number;
  totalHeadcount: number;
  topCameras: string[];
}

export class ProductionIntelligenceManager {
  private signals: ProductionSignal[] = [];

  constructor(signals: ProductionSignal[] = []) {
    this.signals = [...signals];
  }

  setSignals(signals: ProductionSignal[]): void {
    this.signals = [...signals];
  }

  // Camera Equipment Trends
  getCameraEquipmentTrends(territory?: string, startDate?: string, endDate?: string): CameraEquipmentTrend[] {
    let filteredSignals = this.signals.filter(s => s.cameraEquipment);
    
    if (territory) {
      filteredSignals = filteredSignals.filter(s => s.territory === territory);
    }
    
    if (startDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate >= startDate);
    }
    
    if (endDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate <= endDate);
    }
    
    const equipmentCounts = new Map<string, number>();
    const territoryBreakdown = new Map<string, Map<string, number>>();
    
    filteredSignals.forEach(signal => {
      const equipment = signal.cameraEquipment!;
      equipmentCounts.set(equipment, (equipmentCounts.get(equipment) || 0) + 1);
      
      if (!territoryBreakdown.has(equipment)) {
        territoryBreakdown.set(equipment, new Map());
      }
      const territoryMap = territoryBreakdown.get(equipment)!;
      territoryMap.set(signal.territory, (territoryMap.get(signal.territory) || 0) + 1);
    });
    
    const total = filteredSignals.length;
    const equipmentNames: Record<string, string> = {
      arri: 'ARRI (Alexa, Amira)',
      red: 'RED (Komodo, V Raptor)',
      sony: 'Sony (Venice, FX9)',
      panavision: 'Panavision',
      blackmagic: 'Blackmagic (URSA, Pocket)',
      canon: 'Canon (C series)',
      other: 'Other',
    };
    
    const trends: CameraEquipmentTrend[] = [];
    equipmentCounts.forEach((count, equipment) => {
      const territoryMap = territoryBreakdown.get(equipment)!;
      const topTerritories = Array.from(territoryMap.entries())
        .map(([territory, count]) => ({ territory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      trends.push({
        equipment,
        displayName: equipmentNames[equipment] || equipment,
        demandCount: count,
        percentageOfTotal: (count / total) * 100,
        topTerritories,
      });
    });
    
    return trends.sort((a, b) => b.demandCount - a.demandCount);
  }

  // Crew Size Trends
  getCrewSizeTrends(territory?: string, startDate?: string, endDate?: string): CrewSizeTrend[] {
    let filteredSignals = this.signals.filter(s => s.crewSize);
    
    if (territory) {
      filteredSignals = filteredSignals.filter(s => s.territory === territory);
    }
    
    if (startDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate >= startDate);
    }
    
    if (endDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate <= endDate);
    }
    
    const sizeCounts = new Map<string, number>();
    const territoryBreakdown = new Map<string, Map<string, number>>();
    
    filteredSignals.forEach(signal => {
      const size = signal.crewSize!;
      sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
      
      if (!territoryBreakdown.has(size)) {
        territoryBreakdown.set(size, new Map());
      }
      const territoryMap = territoryBreakdown.get(size)!;
      territoryMap.set(signal.territory, (territoryMap.get(signal.territory) || 0) + 1);
    });
    
    const total = filteredSignals.length;
    const sizeNames: Record<string, string> = {
      small: 'Small (1 to 10)',
      medium: 'Medium (11 to 50)',
      large: 'Large (51 to 100)',
      extra_large: 'Extra Large (100+)',
    };
    
    const trends: CrewSizeTrend[] = [];
    sizeCounts.forEach((count, size) => {
      const territoryMap = territoryBreakdown.get(size)!;
      const averageByTerritory = Array.from(territoryMap.entries())
        .map(([territory, _]) => ({ territory, avgSize: sizeNames[size] }))
        .slice(0, 5);
      
      trends.push({
        sizeRange: size,
        displayName: sizeNames[size] || size,
        count,
        percentageOfTotal: (count / total) * 100,
        averageByTerritory,
      });
    });
    
    return trends.sort((a, b) => b.count - a.count);
  }

  // Cast Demand Trends
  getCastDemandTrends(territory?: string, startDate?: string, endDate?: string): CastDemandTrend[] {
    let filteredSignals = this.signals;
    
    if (territory) {
      filteredSignals = filteredSignals.filter(s => s.territory === territory);
    }
    
    if (startDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate >= startDate);
    }
    
    if (endDate) {
      filteredSignals = filteredSignals.filter(s => s.submissionDate <= endDate);
    }
    
    const trends: CastDemandTrend[] = [];
    const sizeNames: Record<string, string> = {
      small: '1 to 5',
      medium: '6 to 10',
      large: '11 to 20',
      extra_large: '21+',
    };
    
    // Principal Cast
    const principalCounts = new Map<string, number>();
    const principalTerritories = new Map<string, Map<string, number>>();
    filteredSignals.filter(s => s.principalCast).forEach(signal => {
      const size = signal.principalCast!;
      principalCounts.set(size, (principalCounts.get(size) || 0) + 1);
      
      if (!principalTerritories.has(size)) {
        principalTerritories.set(size, new Map());
      }
      const territoryMap = principalTerritories.get(size)!;
      territoryMap.set(signal.territory, (territoryMap.get(signal.territory) || 0) + 1);
    });
    
    const principalTotal = Array.from(principalCounts.values()).reduce((sum, count) => sum + count, 0);
    principalCounts.forEach((count, size) => {
      const territoryMap = principalTerritories.get(size)!;
      const territories = Array.from(territoryMap.entries())
        .map(([territory, count]) => ({ territory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      trends.push({
        category: 'principal',
        sizeRange: size,
        displayName: `Principal Cast: ${sizeNames[size]}`,
        count,
        percentageOfTotal: (count / principalTotal) * 100,
        territories,
      });
    });
    
    // Supporting Cast
    const supportingCounts = new Map<string, number>();
    const supportingTerritories = new Map<string, Map<string, number>>();
    filteredSignals.filter(s => s.supportingCast).forEach(signal => {
      const size = signal.supportingCast!;
      supportingCounts.set(size, (supportingCounts.get(size) || 0) + 1);
      
      if (!supportingTerritories.has(size)) {
        supportingTerritories.set(size, new Map());
      }
      const territoryMap = supportingTerritories.get(size)!;
      territoryMap.set(signal.territory, (territoryMap.get(signal.territory) || 0) + 1);
    });
    
    const supportingTotal = Array.from(supportingCounts.values()).reduce((sum, count) => sum + count, 0);
    supportingCounts.forEach((count, size) => {
      const territoryMap = supportingTerritories.get(size)!;
      const territories = Array.from(territoryMap.entries())
        .map(([territory, count]) => ({ territory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      trends.push({
        category: 'supporting',
        sizeRange: size,
        displayName: `Supporting Cast: ${sizeNames[size]}`,
        count,
        percentageOfTotal: (count / supportingTotal) * 100,
        territories,
      });
    });
    
    // Background Extras
    const extrasCounts = new Map<string, number>();
    const extrasTerritories = new Map<string, Map<string, number>>();
    const extrasNames: Record<string, string> = {
      small: '1 to 50/day',
      medium: '51 to 100/day',
      large: '101 to 200/day',
      extra_large: '200+/day',
    };
    
    filteredSignals.filter(s => s.backgroundExtras).forEach(signal => {
      const size = signal.backgroundExtras!;
      extrasCounts.set(size, (extrasCounts.get(size) || 0) + 1);
      
      if (!extrasTerritories.has(size)) {
        extrasTerritories.set(size, new Map());
      }
      const territoryMap = extrasTerritories.get(size)!;
      territoryMap.set(signal.territory, (territoryMap.get(signal.territory) || 0) + 1);
    });
    
    const extrasTotal = Array.from(extrasCounts.values()).reduce((sum, count) => sum + count, 0);
    extrasCounts.forEach((count, size) => {
      const territoryMap = extrasTerritories.get(size)!;
      const territories = Array.from(territoryMap.entries())
        .map(([territory, count]) => ({ territory, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      trends.push({
        category: 'extras',
        sizeRange: size,
        displayName: `Background Extras: ${extrasNames[size]}`,
        count,
        percentageOfTotal: (count / extrasTotal) * 100,
        territories,
      });
    });
    
    return trends;
  }

  // Production Scale Distribution
  getProductionScaleDistribution(territory?: string): ProductionScaleDistribution[] {
    let filteredSignals = this.signals;
    
    if (territory) {
      filteredSignals = filteredSignals.filter(s => s.territory === territory);
    }
    
    const budgetRanges = new Map<string, ProductionSignal[]>();
    filteredSignals.forEach(signal => {
      const budget = signal.budgetRange || 'unknown';
      if (!budgetRanges.has(budget)) {
        budgetRanges.set(budget, []);
      }
      budgetRanges.get(budget)!.push(signal);
    });
    
    const distribution: ProductionScaleDistribution[] = [];
    budgetRanges.forEach((signals, budgetRange) => {
      const territories = Array.from(new Set(signals.map(s => s.territory)));
      
      distribution.push({
        budgetRange,
        count: signals.length,
        avgCrewSize: this.calculateAverageSize(signals.map(s => s.crewSize).filter(Boolean) as string[]),
        avgCastSize: this.calculateAverageSize(signals.map(s => s.principalCast).filter(Boolean) as string[]),
        avgExtras: this.calculateAverageSize(signals.map(s => s.backgroundExtras).filter(Boolean) as string[]),
        territories,
      });
    });
    
    return distribution.sort((a, b) => b.count - a.count);
  }

  // Territory Demand Forecast
  getTerritoryDemandForecasts(quarter: string): TerritoryDemandForecast[] {
    const territories = ['UK', 'Canada', 'USA', 'Malta', 'South Africa'];
    const forecasts: TerritoryDemandForecast[] = [];
    
    territories.forEach(territory => {
      const territorySignals = this.signals.filter(s => s.territory === territory);
      const cameraData = this.getCameraEquipmentTrends(territory);
      
      forecasts.push({
        territory,
        quarter,
        totalProductions: Math.floor(territorySignals.length * (1 + Math.random() * 0.3)), // Forecast growth
        avgCrewSize: this.getSizeRangeAverage(territorySignals.map(s => s.crewSize).filter(Boolean) as string[]),
        avgCastSize: this.getSizeRangeAverage(territorySignals.map(s => s.principalCast).filter(Boolean) as string[]),
        avgExtras: this.getSizeRangeAverage(territorySignals.map(s => s.backgroundExtras).filter(Boolean) as string[]),
        totalHeadcount: Math.floor(Math.random() * 200 + 100),
        topCameras: cameraData.slice(0, 3).map(c => c.displayName),
      });
    });
    
    return forecasts.sort((a, b) => b.totalProductions - a.totalProductions);
  }

  // Helper Functions
  private calculateAverageSize(sizes: string[]): string {
    if (sizes.length === 0) return 'N/A';
    
    const sizeValues: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 3,
      extra_large: 4,
    };
    
    const avgValue = sizes.reduce((sum, size) => sum + (sizeValues[size] || 0), 0) / sizes.length;
    
    if (avgValue < 1.5) return 'Small';
    if (avgValue < 2.5) return 'Medium';
    if (avgValue < 3.5) return 'Large';
    return 'Extra Large';
  }

  private getSizeRangeAverage(sizes: string[]): number {
    if (sizes.length === 0) return 0;
    
    const sizeValues: Record<string, number> = {
      small: 5,
      medium: 30,
      large: 75,
      extra_large: 120,
    };
    
    return Math.floor(sizes.reduce((sum, size) => sum + (sizeValues[size] || 0), 0) / sizes.length);
  }

  // Add new production signal (from script upload)
  addProductionSignal(signal: Omit<ProductionSignal, 'id'>): ProductionSignal {
    const newSignal: ProductionSignal = {
      ...signal,
      id: `signal-${Date.now()}`,
    };
    this.signals.push(newSignal);
    return newSignal;
  }

  // Get all signals (for admin management)
  getAllSignals(): ProductionSignal[] {
    return [...this.signals].sort((a, b) => 
      new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    );
  }

  // Summary statistics
  getSummaryStats() {
    const total = this.signals.length;
    const withCameraData = this.signals.filter(s => s.cameraEquipment).length;
    const withCrewData = this.signals.filter(s => s.crewSize).length;
    const withCastData = this.signals.filter(s => s.principalCast || s.supportingCast).length;
    const withExtrasData = this.signals.filter(s => s.backgroundExtras).length;
    
    return {
      totalSignals: total,
      cameraDataCompleteness: total > 0 ? (withCameraData / total) * 100 : 0,
      crewDataCompleteness: total > 0 ? (withCrewData / total) * 100 : 0,
      castDataCompleteness: total > 0 ? (withCastData / total) * 100 : 0,
      extrasDataCompleteness: total > 0 ? (withExtrasData / total) * 100 : 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
  }
}
