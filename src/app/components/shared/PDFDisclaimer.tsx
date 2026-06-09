import { Box, Typography, Divider, Alert } from '@mui/material';
import { Warning, Info, Gavel } from '@mui/icons-material';

interface PDFDisclaimerProps {
  reportType?: 'script' | 'territory' | 'general';
  includedSections?: string[];
}

/**
 * Comprehensive legal disclaimer component for PDF reports
 * Auto-included in all generated reports for legal indemnity
 */
export function PDFDisclaimer({ reportType = 'general', includedSections = [] }: PDFDisclaimerProps) {
  return (
    <Box sx={{ p: 3, bgcolor: '#0a0a0a', color: '#ffffff' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Gavel sx={{ fontSize: 24, color: '#ffffff' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
          Important Legal Disclaimers & Limitations
        </Typography>
      </Box>

      <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Critical Warnings */}
      <Alert 
        severity="warning" 
        icon={<Warning sx={{ fontSize: '1rem' }} />}
        sx={{ 
          mb: 2, 
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          '& .MuiAlert-icon': { color: '#ffffff' },
          py: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
          READ BEFORE RELYING ON THIS REPORT
        </Typography>
        <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.65rem' }}>
          This report is provided for preliminary planning and informational purposes only. 
          It is NOT a substitute for professional legal, tax, accounting, or financial advice. 
          Do not make binding production, financial, or legal commitments based solely on this report.
        </Typography>
      </Alert>

      {/* Main Disclaimers */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        {/* 1. Not Professional Advice */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            1. NOT PROFESSIONAL ADVICE
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Not Legal Advice:</strong> Nothing in this report constitutes legal advice. We are not a law firm and do not provide legal services. 
            Consult qualified entertainment attorneys licensed in your jurisdiction before entering contracts, negotiating deals, or making legal commitments.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Not Tax or Financial Advice:</strong> This report does not constitute tax, accounting, or financial advisory services. 
            Tax incentive calculations are estimates only. Consult certified tax professionals, CPAs, and financial advisors before making tax or financial decisions.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Not Production Advice:</strong> Location recommendations, crew cost estimates, and production strategies are informational only. 
            Consult experienced line producers, production managers, and location scouts before committing to production plans.
          </Typography>
        </Box>

        {/* 2. Data Accuracy & Limitations */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            2. DATA ACCURACY & LIMITATIONS
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Indicative Estimates Only:</strong> All tax incentive rates, crew costs, production costs, and rebate calculations are 
            <strong> indicative estimates</strong> based on cached datasets, third party APIs, and curated industry sources.
            Data is NOT real time and may be outdated or inaccurate.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>No Guarantee of Accuracy:</strong> We make reasonable efforts to maintain data accuracy but do not warrant or guarantee 
            the accuracy, completeness, timeliness, or reliability of any data. Tax incentives, regulations, and market conditions change frequently.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Last Verified Dates:</strong> All data includes "last verified" timestamps. Users must independently verify all data 
            with official government sources, film commissions, and regulatory authorities before making decisions.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Third Party Data:</strong> We rely on third party APIs, government databases, and public sources.
            We are not responsible for errors, omissions, or changes in third party data.
          </Typography>
        </Box>

        {/* 3. Tax Incentive Disclaimers */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            3. TAX INCENTIVE DISCLAIMERS
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Eligibility Not Guaranteed:</strong> Estimated tax incentives and rebates do not guarantee eligibility or approval. 
            Actual qualification depends on meeting all program requirements, passing cultural tests, obtaining certifications, 
            and receiving government approval.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Subject to Audit & Certification:</strong> All tax incentives are subject to government audit, final certification, 
            and compliance verification. Actual rebates may differ significantly from estimates.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Program Changes:</strong> Tax incentive programs change frequently due to budget allocations, legislative changes, 
            and policy updates. Rates, caps, and requirements listed in this report may be outdated or incorrect.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Transferable Credits:</strong> Where applicable (e.g., Georgia, Louisiana), transferable tax credits 
            typically sell at discounts (85 to 90 cents on the dollar). Estimated values assume face value unless otherwise stated.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Known Payment Issues:</strong> Some territories (notably South Africa) have documented delays or issues 
            with rebate payments despite legally active programs. Always verify current payment status with recent productions.
          </Typography>
        </Box>

        {/* 4. Intellectual Property */}
        {(reportType === 'script' || includedSections.includes('ip')) && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
              4. INTELLECTUAL PROPERTY & SCRIPT ANALYSIS
            </Typography>
            <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
              <strong>Limited License Only:</strong> By uploading scripts to Prodculator, you grant us only a limited, 
              non exclusive, temporary license to analyze your script for the sole purpose of generating this intelligence report.
            </Typography>
            <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
              <strong>No Ownership Claims:</strong> We do NOT claim any ownership rights, production rights, distribution rights, 
              or exploitation rights to your screenplay. You retain all intellectual property rights to your work.
            </Typography>
            <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
              <strong>User Responsibility:</strong> You warrant that you own or have rights to upload the script. 
              Do not upload copyrighted material you don't own, illegal content, or material violating third party rights.
            </Typography>
            <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
              <strong>AI Analysis Limitations:</strong> Script analysis is performed by AI (Scripteligence™) and may contain 
              errors, omissions, or misinterpretations. AI generated recommendations are not human expert opinions.
            </Typography>
          </Box>
        )}

        {/* 5. Crew Costs & Production Economics */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            5. CREW COSTS & PRODUCTION ECONOMICS
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Indicative Rates Only:</strong> All crew rates, department costs, and production budgets are indicative estimates 
            based on industry averages. Actual costs vary significantly based on experience, availability, union status, and negotiation.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Union vs. Non Union:</strong> Crew rates shown assume experienced, non union crew unless specified.
            Union rates (SAG AFTRA, DGA, WGA, IATSE, Equity) may be significantly higher and subject to strict contracts.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Currency Fluctuations:</strong> All currency conversions use cached exchange rates. 
            Actual exchange rates fluctuate and may differ significantly, especially over multi month productions.
          </Typography>
        </Box>

        {/* 6. Limitation of Liability */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            6. LIMITATION OF LIABILITY
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>"AS IS" Service:</strong> This report is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, 
            express or implied, including merchantability, fitness for a particular purpose, or non infringement.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>No Liability for Decisions:</strong> Prodculator is not liable for any production, financial, or legal decisions 
            made based on this report. Users assume all risk for decisions made using this information.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Maximum Liability:</strong> To the maximum extent permitted by law, Prodculator's total liability for any claims 
            arising from this report shall not exceed the amount you paid for this report (or $100, whichever is greater).
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>No Consequential Damages:</strong> We are not liable for indirect, incidental, special, consequential, 
            or punitive damages including lost profits, lost revenue, failed productions, or business opportunities.
          </Typography>
        </Box>

        {/* 7. User Responsibilities */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            7. YOUR RESPONSIBILITIES
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            <strong>Independent Verification Required:</strong> You MUST independently verify all data with:
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0, color: '#cccccc', '& li': { mb: 0.25, fontSize: '0.65rem' } }}>
            <li>Official government film commissions and tax authorities</li>
            <li>Qualified entertainment attorneys licensed in relevant jurisdictions</li>
            <li>Certified tax professionals (CPAs, tax advisors) specializing in entertainment</li>
            <li>Experienced line producers and production accountants</li>
            <li>Local fixers, location scouts, and production service companies</li>
          </Box>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 1, display: 'block', fontSize: '0.65rem' }}>
            <strong>Professional Consultation:</strong> Before making ANY binding commitment (contracts, location agreements, 
            crew hires, financial commitments), consult qualified professionals in legal, tax, and production domains.
          </Typography>
        </Box>

        {/* 8. Data Sources & Attribution */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            8. DATA SOURCES & ATTRIBUTION
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            This report aggregates data from multiple sources including but not limited to:
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 0, color: '#cccccc', '& li': { mb: 0.25, fontSize: '0.65rem' } }}>
            <li>Government film commissions and tax authorities (BFI, Creative BC, Georgia DED, etc.)</li>
            <li>Public regulatory databases (HMRC, CRA, IRS)</li>
            <li>Third party APIs and industry databases</li>
            <li>Curated industry surveys and production reports</li>
            <li>Film festival databases and grant programs</li>
          </Box>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            All data includes "last verified" dates. We are not responsible for changes made by external sources after verification dates.
          </Typography>
        </Box>

        {/* 9. Governing Law */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            9. GOVERNING LAW & DISPUTES
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            This report and your use of Prodculator are governed by our Terms of Service available at 
            <strong> www.prodculator.com/terms</strong>. For enterprise clients with custom contracts, 
            the signed enterprise agreement governs.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            Disputes are subject to binding arbitration as specified in our Terms of Service. 
            Governing law is England and Wales for UK users, applicable state law for US users per Terms.
          </Typography>
        </Box>

        {/* 10. Contact & Support */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5, fontSize: '0.75rem' }}>
            10. QUESTIONS & SUPPORT
          </Typography>
          <Typography variant="caption" sx={{ color: '#cccccc', lineHeight: 1.5, display: 'block', fontSize: '0.65rem' }}>
            For questions about this report or data accuracy issues:
          </Typography>
          <Box sx={{ mt: 0.5, color: '#cccccc' }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>Support: support@prodculator.com</Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>Legal: legal@prodculator.com</Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block' }}>Enterprise: enterprise@prodculator.com</Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Footer */}
      <Alert 
        severity="info" 
        icon={<Info sx={{ fontSize: '1rem' }} />}
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          '& .MuiAlert-icon': { color: '#ffffff' },
          py: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
          Report Generated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </Typography>
        <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '0.6rem' }}>
          Prodculator Platform v2.0 | © 2026 Prodculator | All Rights Reserved
        </Typography>
      </Alert>

      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
        <Typography variant="caption" sx={{ color: '#999999', fontStyle: 'italic', display: 'block', textAlign: 'center', fontSize: '0.6rem' }}>
          This disclaimer is an integral part of this report and cannot be separated or removed. 
          By using this report, you acknowledge reading and understanding all disclaimers and limitations herein.
        </Typography>
      </Box>
    </Box>
  );
}
