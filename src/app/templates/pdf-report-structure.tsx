/**
 * SCRIPTELIGENCE PDF REPORT STRUCTURE v6.8
 * 
 * This file defines the structure and styling for investor-grade PDF reports
 * generated from script analysis.
 * 
 * IMPLEMENTATION NOTES:
 * - Use a PDF generation library like jsPDF, PDFKit, or Puppeteer
 * - Apply black (#000000) and gold (#D4AF37) color scheme throughout
 * - Include data source badges and verification dates on every data-driven section
 * - Maintain professional typography and spacing
 * - Total report length: 15-25 pages depending on script complexity
 */

export interface PDFReportData {
  // Report Metadata
  reportId: string;
  generatedDate: string;
  scriptTitle: string;
  genre: string;
  logline: string;
  userName: string;
  userEmail: string;
  
  // Script Analysis
  pageCount: number;
  estimatedRuntime: string;
  sceneCount: number;
  locationCount: number;
  characterCount: number;
  productionScale: 'Low Budget' | 'Mid Budget' | 'High Budget';
  
  // Location Recommendations (Top 5)
  recommendedLocations: Array<{
    territory: string;
    country: string;
    overallScore: number;
    incentiveAmount: string;
    crewCostIndex: number;
    reasoning: string[];
  }>;
  
  // Tax Incentives (5 territories)
  taxIncentives: Array<{
    territory: string;
    programName: string;
    incentiveType: string;
    rebatePercentage: string;
    maxRebate: string;
    estimatedRebate: string;
    qualifyingExpenses: string[];
    applicationDeadlines: string;
    dataSource: string;
    lastVerified: string;
  }>;
  
  // Crew Costs
  crewCosts: Array<{
    territory: string;
    department: string;
    role: string;
    weeklyRate: string;
    estimatedWeeks: number;
    totalCost: string;
    dataSource: string;
    lastVerified: string;
  }>;
  
  // Comparable Productions
  comparableProductions: Array<{
    title: string;
    year: number;
    budget: string;
    territory: string;
    genre: string;
    similarities: string[];
  }>;
  
  // Regional Film Funds
  filmFunds: Array<{
    fundName: string;
    territory: string;
    fundingType: string;
    maxAmount: string;
    deadline: string;
    eligibility: string[];
    contactUrl: string;
    dataSource: string;
    lastVerified: string;
  }>;
  
  // Production Economics
  economics: {
    estimatedBudget: string;
    estimatedIncentives: string;
    netCostAfterIncentives: string;
    savingsPercentage: string;
    breakdownByTerritory: Array<{
      territory: string;
      grossCost: string;
      incentives: string;
      netCost: string;
    }>;
  };
  
  // Next Steps
  nextSteps: string[];
  
  // Disclaimers
  disclaimers: {
    dataAccuracy: string;
    taxAdvice: string;
    estimatesOnly: string;
  };
}

/**
 * PDF REPORT PAGE STRUCTURE
 */
export const pdfReportStructure = {
  // ========================================
  // COVER PAGE (Page 1)
  // ========================================
  coverPage: {
    background: '#000000',
    logo: 'Prodculator logo in white',
    title: {
      text: 'SCRIPTELIGENCE REPORT',
      fontSize: 42,
      fontWeight: 'bold',
      color: '#D4AF37',
      marginTop: 150,
    },
    scriptTitle: {
      text: '[Script Title]',
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginTop: 24,
    },
    subtitle: {
      text: 'Production Location Strategy & Financial Intelligence',
      fontSize: 16,
      color: '#CCCCCC',
      marginTop: 16,
    },
    metadata: {
      reportId: 'Report ID: RPT2026001234',
      generated: 'Generated: January 23, 2026',
      version: 'Scripteligence v6.8',
      fontSize: 12,
      color: '#888888',
      position: 'bottom',
    },
    goldAccent: {
      border: '3px solid #D4AF37',
      borderRadius: 8,
      padding: 24,
    },
  },

  // ========================================
  // TABLE OF CONTENTS (Page 2)
  // ========================================
  tableOfContents: {
    title: 'CONTENTS',
    sections: [
      { name: 'Executive Summary', page: 3 },
      { name: '1. Script Analysis Overview', page: 4 },
      { name: '2. Production Location Strategy', page: 6 },
      { name: '3. Tax Incentive Analysis', page: 9 },
      { name: '4. Crew Cost Estimates', page: 12 },
      { name: '5. Comparable Productions', page: 14 },
      { name: '6. Regional Film Fund Opportunities', page: 16 },
      { name: '7. Production Economics Summary', page: 18 },
      { name: '8. Next Steps & Recommendations', page: 20 },
      { name: 'Appendix: Data Sources & Disclaimers', page: 21 },
    ],
  },

  // ========================================
  // EXECUTIVE SUMMARY (Page 3)
  // ========================================
  executiveSummary: {
    title: 'EXECUTIVE SUMMARY',
    subtitle: 'Key Findings & Recommendations',
    sections: [
      {
        label: 'Top Recommended Location',
        icon: '🎯',
        content: '[Territory Name]',
        highlight: true,
      },
      {
        label: 'Estimated Tax Incentive',
        icon: '💰',
        content: '$XXX,XXX to $XXX,XXX',
      },
      {
        label: 'Projected Net Savings',
        icon: '📊',
        content: 'XX% reduction in total production cost',
      },
      {
        label: 'Production Scale',
        icon: '🎬',
        content: 'Mid Budget Feature',
      },
    ],
    keyInsights: [
      'Brief insight 1',
      'Brief insight 2',
      'Brief insight 3',
    ],
  },

  // ========================================
  // SECTION 1: SCRIPT ANALYSIS (Pages 4-5)
  // ========================================
  scriptAnalysis: {
    title: '1. SCRIPT ANALYSIS OVERVIEW',
    subsections: [
      {
        heading: 'Script Metadata',
        data: [
          { label: 'Title', value: '[Script Title]' },
          { label: 'Genre', value: 'Drama / Thriller' },
          { label: 'Logline', value: '...' },
          { label: 'Page Count', value: '110 pages' },
          { label: 'Estimated Runtime', value: '100 to 110 minutes' },
        ],
      },
      {
        heading: 'Production Breakdown',
        data: [
          { label: 'Total Scenes', value: '87 scenes' },
          { label: 'Unique Locations', value: '32 locations' },
          { label: 'Interior/Exterior Split', value: '60% INT / 40% EXT' },
          { label: 'Day/Night Split', value: '70% DAY / 30% NIGHT' },
          { label: 'Principal Characters', value: '8 characters' },
        ],
      },
      {
        heading: 'Location Requirements',
        visualization: 'Pie chart showing location type distribution',
        topLocations: [
          'Urban Apartment (15 scenes)',
          'Office Building (12 scenes)',
          'City Streets (10 scenes)',
          'Restaurant/Bar (8 scenes)',
          'Airport (6 scenes)',
        ],
      },
      {
        heading: 'Production Scale Assessment',
        content: 'Based on script analysis, this production is classified as MID BUDGET...',
        factors: [
          'Scene count and complexity',
          'Location diversity',
          'Special requirements (VFX, stunts, etc.)',
          'Cast size',
        ],
      },
    ],
    dataBadge: {
      text: 'AI Analysis | Verified: Jan 2026',
      position: 'bottom-right',
    },
  },

  // ========================================
  // SECTION 2: LOCATION STRATEGY (Pages 6-8)
  // ========================================
  locationStrategy: {
    title: '2. PRODUCTION LOCATION STRATEGY',
    subtitle: 'Top 5 Recommended Territories',
    
    // Each territory gets its own detailed breakdown
    territories: [
      {
        rank: 1,
        name: 'British Columbia, Canada',
        overallScore: 94,
        scoreBreakdown: {
          incentives: 95,
          crewAvailability: 92,
          infrastructure: 96,
          costEffectiveness: 91,
          locationMatch: 93,
        },
        keyBenefits: [
          'Up to 36% tax credit on eligible BC labor',
          'Established film infrastructure (studios, equipment)',
          'Skilled crew base with competitive rates',
          'Diverse locations (urban, mountains, coast)',
          'Favorable exchange rate',
        ],
        estimatedIncentive: '$450,000 to $650,000',
        considerations: [
          'Weather can be unpredictable (rain)',
          'Application timeline: 6 to 8 weeks',
        ],
        visualization: 'Radar chart showing 5 score categories',
      },
      // ... 4 more territories with similar structure
    ],
    
    comparisonTable: {
      headers: ['Territory', 'Incentive %', 'Est. Rebate', 'Crew Cost Index', 'Overall Score'],
      rows: [
        ['British Columbia, Canada', '36%', '$450K to $650K', '92/100', '94/100'],
        ['UK (England)', '25%', '$380K to $520K', '78/100', '89/100'],
        ['Georgia, USA', '30%', '$420K to $580K', '85/100', '87/100'],
        ['Malta', '40%', '$320K to $480K', '82/100', '84/100'],
        ['South Africa (Cape Town)', '35%', '$280K to $420K', '95/100', '82/100'],
      ],
    },
    
    dataBadge: {
      text: 'Sources: Film Commissions, KFTV, ProductionHUB | Verified: Jan 2026',
      position: 'bottom',
    },
  },

  // ========================================
  // SECTION 3: TAX INCENTIVES (Pages 9-11)
  // ========================================
  taxIncentives: {
    title: '3. TAX INCENTIVE ANALYSIS',
    subtitle: 'Detailed Breakdown by Territory',
    
    incentiveProfiles: [
      {
        territory: 'British Columbia, Canada',
        programName: 'BC Film Incentive BC (FIBC)',
        incentiveType: 'Refundable Tax Credit',
        
        rebateDetails: {
          basicRate: '35% on eligible BC labor',
          regionalBonus: '+6% for qualifying regional production',
          digitalAnimation: '+17.5% for digital animation',
          maxRebate: 'No cap',
          estimatedRebate: '$450,000 to $650,000',
        },
        
        qualifyingExpenses: [
          'BC labor costs (salaries, wages)',
          'BC resident labor only',
          'Post production labor (if done in BC)',
          'Excludes above the line costs',
        ],
        
        eligibility: [
          'Minimum 75% BC labor expenditure',
          'Copyright ownership restrictions',
          'Eligible distributor requirements',
          'Principal photography primarily in BC',
        ],
        
        applicationProcess: {
          timing: '6 to 8 weeks before principal photography',
          documents: [
            'Detailed budget',
            'Shooting schedule',
            'Financing plan',
            'BC content certification',
          ],
          contact: 'Creative BC creativebc.com',
        },
        
        paymentSchedule: {
          interim: 'Eligible during production (with audit)',
          final: 'Within 90 days of final audit',
          notes: 'Payment issues: None reported',
        },
        
        dataBadge: 'Source: Creative BC | Verified: Jan 2026',
      },
      // ... 4 more territories
    ],
    
    warningBoxes: {
      southAfrica: {
        title: '⚠️ SOUTH AFRICA PAYMENT ADVISORY',
        content: 'While South Africa offers attractive rebate rates (35%), there are documented payment delays and bureaucratic challenges. Budget extra time and working capital. Always consult with local production accountants experienced with the NFVF rebate process.',
        severity: 'high',
      },
    },
  },

  // ========================================
  // SECTION 4: CREW COSTS (Pages 12-13)
  // ========================================
  crewCosts: {
    title: '4. CREW COST ESTIMATES',
    subtitle: 'Territory by Territory Comparison',
    
    departmentBreakdown: [
      {
        department: 'Camera Department',
        roles: [
          { role: 'Director of Photography', bcRate: '$4,200/wk', ukRate: '$5,800/wk', usRate: '$6,500/wk' },
          { role: '1st AC', bcRate: '$2,800/wk', ukRate: '$3,200/wk', usRate: '$3,600/wk' },
          { role: '2nd AC', bcRate: '$2,200/wk', ukRate: '$2,600/wk', usRate: '$2,900/wk' },
        ],
      },
      {
        department: 'Grip & Electric',
        roles: [
          { role: 'Gaffer', bcRate: '$3,200/wk', ukRate: '$3,800/wk', usRate: '$4,200/wk' },
          { role: 'Key Grip', bcRate: '$3,200/wk', ukRate: '$3,800/wk', usRate: '$4,200/wk' },
          { role: 'Best Boy Electric', bcRate: '$2,600/wk', ukRate: '$3,000/wk', usRate: '$3,400/wk' },
        ],
      },
      // ... more departments
    ],
    
    totalCrewCostComparison: {
      chart: 'Bar chart comparing total crew costs across 5 territories',
      data: [
        { territory: 'BC, Canada', totalCost: '$1,240,000', index: 92 },
        { territory: 'UK', totalCost: '$1,580,000', index: 78 },
        { territory: 'Georgia, USA', totalCost: '$1,350,000', index: 85 },
        { territory: 'Malta', totalCost: '$1,420,000', index: 82 },
        { territory: 'South Africa', totalCost: '$980,000', index: 95 },
      ],
    },
    
    notes: [
      'Rates based on industry standard 12 hour days, 6 day weeks',
      'Union vs. non union considerations vary by territory',
      'Rates assume mid budget feature production',
    ],
    
    dataBadge: 'Sources: Production Weekly, KFTV, BECTU, IATSE rate cards | Verified: Jan 2026',
  },

  // ========================================
  // SECTION 5: COMPARABLE PRODUCTIONS (Pages 14-15)
  // ========================================
  comparableProductions: {
    title: '5. COMPARABLE PRODUCTIONS',
    subtitle: 'Similar Projects & Their Production Strategies',
    
    comparables: [
      {
        title: 'Example Film Title',
        year: 2024,
        genre: 'Drama/Thriller',
        budget: '$8.5M to $12M',
        filmingLocation: 'British Columbia, Canada',
        
        similarities: [
          'Similar genre and tone',
          'Comparable budget range',
          'Urban setting requirements',
          'Cast size and scope',
        ],
        
        productionNotes: [
          'Utilized BC Film Incentive (35% + regional bonus)',
          'Shot primarily in Vancouver doubling for Seattle',
          '45 day shooting schedule',
          'Post production completed in Toronto',
        ],
        
        outcome: 'Successfully qualified for $680K in tax credits',
      },
      // ... 4 more comparables
    ],
    
    dataBadge: 'Sources: IMDb Pro, ProductionWeekly, Variety | Verified: Jan 2026',
  },

  // ========================================
  // SECTION 6: FILM FUNDS (Pages 16-17)
  // ========================================
  filmFunds: {
    title: '6. REGIONAL FILM FUND OPPORTUNITIES',
    subtitle: 'Additional Funding Sources by Territory',
    
    fundsByTerritory: [
      {
        territory: 'British Columbia, Canada',
        funds: [
          {
            fundName: 'BC Arts Council Film & Media Arts',
            fundingType: 'Grant',
            maxAmount: 'Up to $100,000',
            deadline: 'Rolling deadlines (quarterly)',
            eligibility: [
              'BC based production company',
              'Canadian content certification',
              'Artistic merit criteria',
            ],
            applicationUrl: 'bcarts council.ca/film',
            syncStatus: '✓ Auto sync enabled',
            lastVerified: 'Jan 15, 2026',
          },
          // ... more funds
        ],
      },
      // ... more territories
    ],
    
    dataBadge: 'Sources: Film Commission websites, regional arts councils | Auto synced: Jan 2026',
  },

  // ========================================
  // SECTION 7: ECONOMICS (Pages 18-19)
  // ========================================
  productionEconomics: {
    title: '7. PRODUCTION ECONOMICS SUMMARY',
    subtitle: 'Financial Comparison Across Territories',
    
    territoryComparison: {
      headers: ['Territory', 'Gross Cost', 'Tax Incentives', 'Net Cost', 'Savings'],
      rows: [
        ['BC, Canada', '$1,850,000', '$650,000', '$1,200,000', '35%'],
        ['UK (England)', '$2,120,000', '$520,000', '$1,600,000', '25%'],
        ['Georgia, USA', '$1,920,000', '$580,000', '$1,340,000', '30%'],
        ['Malta', '$1,780,000', '$480,000', '$1,300,000', '27%'],
        ['South Africa', '$1,560,000', '$420,000', '$1,140,000', '27%'],
      ],
    },
    
    visualization: {
      chart: 'Waterfall chart showing cost breakdown',
      showGrossCost: true,
      showIncentives: true,
      showNetCost: true,
    },
    
    keyTakeaways: [
      'British Columbia offers the best combination of incentives and crew costs',
      'South Africa has lowest gross costs but payment risk considerations',
      'UK provides strong infrastructure despite higher labor costs',
    ],
    
    assumptions: [
      'Based on estimated $2.5M total production budget',
      'Assumes 6 week principal photography',
      'Exchange rates as of January 2026',
      'Incentive calculations based on current program rules',
    ],
    
    dataBadge: 'Calculations based on curated datasets | Verified: Jan 2026',
  },

  // ========================================
  // SECTION 8: NEXT STEPS (Page 20)
  // ========================================
  nextSteps: {
    title: '8. NEXT STEPS & RECOMMENDATIONS',
    
    immediateActions: [
      {
        step: 'Contact Film Commissions',
        description: 'Reach out to top 3 recommended territories to discuss incentive eligibility',
        timeline: 'Week 1 to 2',
      },
      {
        step: 'Engage Tax Advisor',
        description: 'Consult with qualified entertainment tax attorney for incentive structuring',
        timeline: 'Week 2 to 3',
      },
      {
        step: 'Scout Locations',
        description: 'Virtual or in person location scouts in top ranked territories',
        timeline: 'Week 3 to 6',
      },
      {
        step: 'Budget Refinement',
        description: 'Create detailed budgets for top 2 to 3 territory options',
        timeline: 'Week 4 to 6',
      },
      {
        step: 'Apply for Incentives',
        description: 'Submit applications to selected incentive programs',
        timeline: 'Week 6 to 8',
      },
    ],
    
    resources: [
      {
        name: 'British Columbia Film Commission',
        url: 'creativebc.com',
        contact: 'incentives@creativebc.com',
      },
      {
        name: 'UK Film & HETV Production',
        url: 'bfi.org.uk',
        contact: 'certification@bfi.org.uk',
      },
      // ... more resources
    ],
    
    expertConsultation: {
      title: 'Professional Consultation Recommended',
      services: [
        'Entertainment tax attorney (incentive structuring)',
        'Production accountant (local expertise)',
        'Line producer (territory specific experience)',
        'Location scout (on ground knowledge)',
      ],
    },
  },

  // ========================================
  // APPENDIX: DISCLAIMERS (Page 21-22)
  // ========================================
  appendix: {
    title: 'APPENDIX',
    
    dataSources: {
      heading: 'Data Sources',
      sources: [
        'Film commission websites and official incentive program documentation',
        'KFTV (Knowledge for the Visual Media Industry)',
        'ProductionHUB crew rate databases',
        'IMDb Pro production data',
        'Variety, Deadline, Screen International trade publications',
        'Internal curated datasets (updated quarterly)',
        'Third party APIs (exchange rates, location data)',
      ],
      lastUpdated: 'January 2026',
    },
    
    disclaimers: {
      heading: 'Important Disclaimers',
      items: [
        {
          title: 'Data Accuracy',
          content: 'This report uses indicative data from third party APIs and internally curated datasets. All information is current as of January 2026 but is subject to change. Film incentive programs, crew rates, and regulations are updated periodically by governing bodies.',
        },
        {
          title: 'Not Tax or Legal Advice',
          content: 'This report is for informational and preliminary planning purposes only. It does not constitute tax advice, legal advice, or professional services. Always consult with qualified tax advisors, entertainment attorneys, and local film commissions before making final production decisions.',
        },
        {
          title: 'Estimates Only',
          content: 'All cost estimates, incentive calculations, and financial projections are approximations based on industry standards and historical data. Actual costs and incentives may vary significantly based on specific production requirements, negotiated rates, and program eligibility.',
        },
        {
          title: 'No Guarantee of Incentive Approval',
          content: 'Inclusion of a territory or incentive program in this report does not guarantee eligibility or approval. Incentive programs have specific requirements, application processes, and discretionary approval mechanisms.',
        },
        {
          title: 'Currency and Exchange Rates',
          content: 'All financial figures are provided in USD unless otherwise noted. Exchange rates are approximate and subject to market fluctuations.',
        },
      ],
    },
    
    versionInfo: {
      platform: 'Prodculator',
      reportVersion: 'v6.8.0',
      generatedBy: 'Scripteligence AI Analysis Engine + Curated Datasets',
      dataVersion: 'Q1 2026',
    },
    
    footer: {
      text: '© 2026 Prodculator. All rights reserved. | Professional production intelligence for film producers worldwide.',
      contact: 'support@prodculator.com | prodculator.com',
    },
  },
};

/**
 * PDF STYLING GUIDELINES
 */
export const pdfStylingGuidelines = {
  colors: {
    primary: '#000000', // Black
    accent: '#D4AF37', // Gold
    text: '#1a1a1a',
    secondaryText: '#666666',
    border: '#e0e0e0',
    background: '#ffffff',
    highlightBg: '#FFFEF7', // Subtle gold tint
  },
  
  typography: {
    fontFamily: {
      heading: 'Helvetica Bold, Arial Bold',
      body: 'Helvetica, Arial',
      mono: 'Courier, monospace',
    },
    sizes: {
      h1: 32,
      h2: 24,
      h3: 18,
      h4: 16,
      body: 11,
      caption: 9,
    },
  },
  
  spacing: {
    pageMargin: {
      top: 60,
      bottom: 60,
      left: 50,
      right: 50,
    },
    sectionSpacing: 24,
    paragraphSpacing: 12,
  },
  
  elements: {
    dataBadge: {
      backgroundColor: '#f5f5f5',
      borderLeft: '3px solid #D4AF37',
      padding: 8,
      fontSize: 9,
      color: '#666666',
    },
    warningBox: {
      backgroundColor: '#FFF8E1',
      border: '2px solid #FFC107',
      padding: 16,
      fontSize: 10,
    },
    highlightBox: {
      backgroundColor: '#FFFEF7',
      border: '2px solid #D4AF37',
      padding: 20,
      borderRadius: 4,
    },
  },
  
  charts: {
    colorPalette: ['#D4AF37', '#000000', '#666666', '#999999', '#cccccc'],
    gridColor: '#e0e0e0',
  },
};
