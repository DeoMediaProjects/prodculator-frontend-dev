import { useState } from 'react';
import { Box, Tooltip } from '@mui/material';

/**
 * InfoTip Component
 * 
 * Reusable information tooltip component for the Prodculator platform.
 * Displays contextual help for first-time producers unfamiliar with industry terms.
 * 
 * @component
 * @example
 * <Typography variant="body2">
 *   Budget Range
 *   <InfoTip text="Your estimated total production budget..." />
 * </Typography>
 * 
 * DESIGN SPEC:
 * - Trigger: Small gold outlined circle with "i" inside (14-16px)
 * - Position: Inline after label text with 6px left margin
 * - Interaction: Hover (desktop) or tap (mobile) reveals tooltip
 * - Tooltip panel: Dark background (#1A1A1A), white text, max-width 260px, gold border
 * - Placement: Above or below trigger depending on available space
 * - Dismiss: Click/tap away
 */

interface InfoTipProps {
  /**
   * The tooltip text to display
   */
  text: string;
  /**
   * Optional placement override
   * @default "top"
   */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTip({ text, placement = 'top' }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      title={text}
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      placement={placement}
      arrow
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: '#1A1A1A',
            color: '#ffffff',
            border: '1px solid #D4AF37',
            borderRadius: '8px',
            maxWidth: 260,
            fontSize: '0.875rem',
            lineHeight: 1.5,
            p: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          },
        },
        arrow: {
          sx: {
            color: '#1A1A1A',
            '&::before': {
              border: '1px solid #D4AF37',
            },
          },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid #D4AF37',
          color: '#D4AF37',
          fontSize: '0.7rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          ml: 0.75,
          cursor: 'help',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'rgba(212, 175, 55, 0.1)',
            transform: 'scale(1.1)',
          },
        }}
      >
        i
      </Box>
    </Tooltip>
  );
}

/**
 * USAGE EXAMPLES:
 * 
 * Upload Form:
 * <TextField 
 *   label={
 *     <>
 *       Budget Range
 *       <InfoTip text="Your estimated total production budget — what you expect to spend..." />
 *     </>
 *   } 
 * />
 * 
 * Or with Typography:
 * <Typography variant="body2">
 *   Filming Duration (Weeks)
 *   <InfoTip text="The number of weeks your principal photography is planned to take..." />
 * </Typography>
 */

/**
 * TOOLTIP TEXT MAP
 * 
 * Import this constant in your components to maintain consistency:
 */
export const TOOLTIP_TEXTS = {
  // Upload Form
  budgetAmount: "The actual total production budget figure — what you expect to spend making the film or series from first day of pre-production to picture lock. Not the distribution or marketing budget.",
  format: "The final format your project will be delivered in. This affects which incentive programmes you qualify for — some are film-only, some include series.",
  filmingDuration: "The number of weeks your principal photography (actual shooting) is planned to take. Not including pre-production or post-production.",
  crewSize: "The total number of people on your production crew — camera, sound, art department, lighting, etc. Does not include cast.",
  principalCast: "Your named, contracted lead actors. The number you enter affects visa and accommodation cost estimates for each territory.",
  supportingCast: "Named supporting actors with speaking roles — not background/extras. Affects talent cost estimates.",
  locationStrategy: "How open you are about where you shoot. Open to international: all territories ranked — some script locations may need to be substituted. For investor sharing, Full picture or Maximise incentive priority is recommended. Location first prioritises crew/infrastructure over financial return.",
  territoriesConsidering: "The countries or regions you're already thinking about. If you're open to all options, select 'Open to all' and we'll rank every territory we have data for.",
  productionPriority: "Controls how territory scores are weighted. Full picture (default): Incentive Strength 30%, Incentive Reliability 15%, Cost Efficiency 20%, Currency Advantage 15%, Crew Depth 10%, Infrastructure 10%. Maximise incentive return: Incentive Strength 45%, Reliability 15%, Cost Efficiency & Currency Advantage 15% each, Crew/Infrastructure 5% each. Location first: Crew Depth 25%, Infrastructure 20%, Cost Efficiency 20%, Incentive Strength 15%, Reliability 10%, Currency Advantage 10%. For investor-facing reports, use Full picture or Maximise incentive return.",
  cameraEquipment: "The camera system(s) you intend to shoot with. This affects equipment rental cost estimates per territory, and flags specific considerations — for example, IMAX-certified facilities, film lab availability, or drone permit requirements.",
  
  // Report Viewer
  taxIncentive: "Money returned to you by the territory's government after you spend on qualifying production costs there. A 40% rebate means you get back 40p for every £1 of qualifying spend. This is real money — not a tax deduction.",
  qualifyingSpend: "The portion of your budget that the territory counts toward the incentive calculation. Some costs (e.g. financing fees, music rights) may not qualify. The percentage shown is applied to your qualifying spend, not your total budget.",
  investorSafety: "Whether this incentive is considered reliable enough to include in projections shown to investors or gap financiers. Some programmes have experienced funding delays — we flag these so you know to verify before committing.",
  reliabilityScore: "Our assessment of how consistently and predictably this territory's incentive programme pays out. Based on published payment records, industry reports, and producer feedback. Score of 1.0 = fully reliable. Below 0.5 = verify current status.",
  currencyAdvantage: "Because your budget is in GBP, shooting in a country with a weaker currency means your money buys more locally. This figure shows the GBP equivalent of what you save on all local costs — crew, locations, catering, transport — due to the exchange rate. This advantage is independent of any incentive programme.",
  crewCostDifferential: "The saving from paying local crew rates rather than UK rates. Calculated using BECTU minimum rates as the UK baseline vs published local rate guides for each territory. Both figures are for comparable role equivalents.",
  investorSummary: "A structured summary you can use when presenting this territory analysis to investors, co-production partners or gap financiers. Figures marked as 'Safe for investor documents' have been verified as reliable enough for inclusion in financial projections.",
  intExtRatio: "The proportion of your scenes that take place indoors (interior) vs outdoors (exterior). A high INT ratio means location matters less visually — your production is more 'studio-flexible', and the financial case for an overseas territory becomes stronger.",
  studioFlexible: "A production where 65%+ of scenes are interior. These productions can physically be made anywhere with adequate studio facilities — location becomes primarily a financial decision rather than a creative one.",
  section481: "Ireland's film and TV tax relief programme, named after Section 481 of the Irish Taxes Consolidation Act. Provides 32% relief on qualifying Irish spend.",
  avecIftc: "The UK's Audio-Visual Expenditure Credit (AVEC) replaced the old film tax credit system in 2024. IFTC (Independent Film Tax Credit) offers an enhanced 39.75% rate for qualifying independent films under £15M.",
  trip: "France's Tax Rebate for International Production — a 30% rebate on qualifying French spend, rising to 40% for productions with significant VFX content.",
  whatIfCalculator: "Compare financial returns across all available territories. Crew Depth and Infrastructure use the Prodculator territory tier ratings (Established/Growing/Emerging). Upload your script for a production-specific analysis.",
  comparables: "Comparable productions — real films or series with similar genre, format, budget range, and INT/EXT profile that were produced in a given territory. Provided as production precedent and to illustrate how other producers have used the same incentives.",
  weatherAdvisory: "Based on your filming start date, duration, and the percentage of exterior scenes in your script. Data sourced from Open-Meteo historical climate records for each territory. This is a planning indicator — always verify with a local production service company.",
} as const;
