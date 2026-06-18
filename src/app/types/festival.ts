export interface FestivalDeadline {
  tier: 'early-bird' | 'regular' | 'late' | 'extended';
  date: string; // ISO format: 2026-09-12
  fee: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
}

export interface Festival {
  id: string;
  name: string;
  year: number;
  genres: string[]; // ["Drama", "Documentary", "Thriller"]
  budgetTiers: ('micro' | 'low' | 'mid' | 'high')[]; // micro: <$50K, low: <$500K, mid: $500K-$5M, high: >$5M
  location: string;
  festivalDates: string; // "Jan 21-31, 2027"
  
  premiereRequirement: 'world' | 'international' | 'us' | 'regional' | 'none';
  
  deadlines: FestivalDeadline[];
  
  tier: 'a-list' | 'tier-2' | 'regional' | 'specialized';
  acceptanceRate: number; // 0.05 = 5%
  websiteUrl: string;
  filmfreewayUrl?: string;
  
  // Status calculated based on current date vs deadlines
  currentStatus: 'upcoming' | 'early-bird-open' | 'regular-open' | 'late-open' | 'closed';
  daysUntilNextDeadline?: number;
  nextDeadline?: FestivalDeadline;
  
  // Admin metadata
  dataSource: 'manual' | 'filmfreeway-api' | 'api' | 'scrape';
  verified: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  
  // Optional additional info
  notableAlumni?: string[]; // ["Whiplash", "Little Miss Sunshine"]
  averageBudgetOfAcceptedFilms?: string;
  notes?: string;
}
