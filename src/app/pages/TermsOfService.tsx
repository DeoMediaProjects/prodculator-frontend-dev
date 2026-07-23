import { Box, Container, Typography, Link } from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';

export function TermsOfService() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      <PageHeader />
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: t.gold }}>
          Terms of Service
        </Typography>
        <Typography variant="body2" sx={{ color: t.textSecondary, mb: 6 }}>
          Last Updated: January 24, 2026
        </Typography>

        <Box sx={{ '& h4': { color: t.gold, fontWeight: 700, mt: 4, mb: 2 }, '& p': { color: t.textPrimary, mb: 2, lineHeight: 1.8 }, '& ul': { color: t.textPrimary, mb: 2, pl: 3 }, '& li': { mb: 1 } }}>

          <Typography variant="h4">1. Acceptance of Terms</Typography>
          <Typography>
            By accessing or using Prodculator ("the Platform", "Service", or "we"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this Platform.
          </Typography>

          <Typography variant="h4">2. Service Description</Typography>
          <Typography>
            Prodculator is a professional platform for film producers that provides:
          </Typography>
          <ul>
            <li><strong>Individual Subscriptions:</strong> Script analysis, production location strategy, tax incentive calculations, comparable productions intelligence, territory comparison tools, and interactive what if calculators for individual producers, directors, and studios.</li>
            <li><strong>Comparison Tools:</strong> Side by side territory comparison tool and interactive what if calculator for scenario planning, available to all tiers with usage limits based on subscription level.</li>
            <li><strong>Enterprise Solutions (B2B):</strong> Territory intelligence reports, production APIs, aggregate market data, and custom reporting for film commissions, government agencies, streamers, studios, equipment rental companies, and production service providers.</li>
          </ul>

          <Typography variant="h4">3. Data Accuracy & Limitations</Typography>
          <Typography>
            <strong>3.1 Indicative Data:</strong> All production data, tax incentive rates, cost data, and market intelligence provided through the Platform are indicative estimates based on cached datasets, third party APIs, and internally curated sources. Data is versioned and includes "last verified" dates.
          </Typography>
          <Typography>
            <strong>3.2 Not Real Time:</strong> Data is NOT real time and should not be relied upon as the sole basis for financial, legal, or production decisions. Users must independently verify all data with official government sources, legal counsel, tax advisors, and industry professionals.
          </Typography>
          <Typography>
            <strong>3.3 No Guarantee:</strong> We do not guarantee the accuracy, completeness, or timeliness of any data. Tax incentive rates, production costs, and location availability are subject to change without notice by external authorities.
          </Typography>
          <Typography>
            <strong>3.4 User Responsibility:</strong> Users are solely responsible for verifying all information before making production, financial, or legal commitments.
          </Typography>

          <Typography variant="h4">4. Subscription Plans (Individual Users)</Typography>
          <Typography>
            <strong>4.1 Available Plans:</strong>
          </Typography>
          <ul>
            <li><strong>Free Tier:</strong> 1 free intelligence report with watermarked output, 3 territory comparisons/month (max 2 territories), 5 what if calculator uses/month, watermarked exports</li>
            <li><strong>Pro Monthly:</strong> $1/month 5 reports/month, unlimited territory comparisons (up to 4 territories), unlimited what if calculator, PDF/Excel exports, 7 day shareable links</li>
            <li><strong>Producer Annual:</strong> $12/year ($1/month) 15 reports/month, unlimited comparison tools, save up to 10 scenarios, advanced features, priority support</li>
            <li><strong>Studio Tier:</strong> $1/month Unlimited reports, unlimited comparison tools with custom branding, permanent shareable links, API access, white label reports, dedicated support</li>
          </ul>
          <Typography>
            <strong>4.2 Billing:</strong> Subscriptions are billed in advance on a monthly or annual basis in USD or GBP (based on payment currency, not user location). All fees are non refundable except as required by law.
          </Typography>
          <Typography>
            <strong>4.3 Currency Tracking:</strong> Your account is tracked in the currency you paid in (USD or GBP). All future invoices will be in the same currency unless you manually change your payment method.
          </Typography>
          <Typography>
            <strong>4.4 Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date. You may cancel at any time from your account dashboard.
          </Typography>
          <Typography>
            <strong>4.5 Plan Changes:</strong> You may upgrade or downgrade your plan at any time. Upgrades are prorated; downgrades take effect at the next billing cycle.
          </Typography>
          <Typography>
            <strong>4.6 Usage Limits:</strong> Free tier users are subject to monthly usage limits for comparison tools (3 territory comparisons, 5 calculator uses). Limits reset on the 1st of each month. Paid tier users have unlimited access within reasonable fair use parameters. We reserve the right to throttle or temporarily suspend access for abusive usage patterns (e.g., automated scraping, excessive API calls).
          </Typography>

          <Typography variant="h4">5. Enterprise Solutions (B2B)</Typography>
          <Typography>
            <strong>5.1 Custom Contracts:</strong> Enterprise clients (film commissions, streamers, studios, equipment rental companies, and production service providers) enter into separate written agreements with custom pricing, service levels, and deliverables.
          </Typography>
          <Typography>
            <strong>5.2 Products & Services:</strong>
          </Typography>
          <ul>
            <li><strong>Territory Intelligence Reports:</strong> Market analysis for film commissions (monthly, quarterly, or annual delivery)</li>
            <li><strong>Production API Access:</strong> RESTful API for real time production location data and incentive tracking</li>
            <li><strong>Market Demand Forecasting:</strong> Production pipeline forecasts for equipment rental and service providers</li>
            <li><strong>Custom Report Builder:</strong> White label report generation with custom branding</li>
            <li><strong>Aggregate Data Licensing:</strong> Anonymized production trend data for commercial use</li>
          </ul>
          <Typography>
            <strong>5.3 Service Level Agreements (SLAs):</strong> Enterprise clients receive guaranteed uptime SLAs (typically 99.5% or higher) and priority support as outlined in their individual contracts.
          </Typography>
          <Typography>
            <strong>5.4 Data Licensing & Commercial Use:</strong> Enterprise clients may use licensed data internally for decision making, policy development, and operational planning. Data may NOT be resold, redistributed, or published publicly without explicit written permission.
          </Typography>
          <Typography>
            <strong>5.5 API Terms:</strong> API access is subject to rate limits, usage monitoring, and security requirements as specified in individual enterprise agreements. API keys are confidential and must not be shared publicly.
          </Typography>
          <Typography>
            <strong>5.6 Automated Report Delivery:</strong> Enterprise clients with automated report delivery receive reports via email on scheduled dates. Delivery failures due to email filters or incorrect recipient addresses are not considered service failures.
          </Typography>
          <Typography>
            <strong>5.7 Termination:</strong> Either party may terminate an enterprise agreement with 30 days written notice unless otherwise specified in the contract. Unused prepaid amounts are non refundable.
          </Typography>

          <Typography variant="h4">6. Intellectual Property</Typography>
          <Typography>
            <strong>6.1 Platform Ownership:</strong> The Platform, including all software, algorithms, designs, trademarks, and content (excluding user uploaded scripts), is the exclusive property of Prodculator and protected by copyright, trademark, and intellectual property laws.
          </Typography>
          <Typography>
            <strong>6.2 User Scripts:</strong> You retain all rights to scripts you upload. By uploading, you grant us a limited, non exclusive license to process your script solely for the purpose of generating intelligence reports.
          </Typography>
          <Typography id="section-6-3" sx={{ scrollMarginTop: '96px' }}>
            <strong>6.3 Anonymized Metadata for Production Intelligence:</strong> When you upload a script, we automatically extract anonymized metadata (crew size estimates, equipment requirements, cast scale indicators, production complexity) to power our Production Intelligence Dashboard. This data is aggregated with data from other users to show industry trends (e.g., "Average crew size for action productions: 85 people"). Your script's specific content, title, character names, dialogue, and plot are NEVER used or shared. Only non identifiable production logistics metadata is extracted. This aggregated data may be shared with enterprise clients (film commissions, studios, equipment rental companies) as part of market intelligence reports.
          </Typography>
          <Typography>
            <strong>6.4 Generated Reports:</strong> Intelligence reports generated by the Platform are licensed to you for internal use only. You may share reports with collaborators, investors, and production teams but may not resell, redistribute, or publish reports commercially without written permission.
          </Typography>
          <Typography>
            <strong>6.5 Enterprise Deliverables:</strong> Reports, data, and analyses delivered to enterprise clients under B2B contracts are licensed for internal organizational use as specified in individual agreements.
          </Typography>

          <Typography variant="h4">7. Prohibited Uses</Typography>
          <Typography>
            You may not:
          </Typography>
          <ul>
            <li>Use the Platform to collect personally identifiable information (PII) or sensitive personal data</li>
            <li>Reverse engineer, decompile, or attempt to extract source code</li>
            <li>Resell, redistribute, or sublicense access to the Platform</li>
            <li>Use automated scripts or bots to scrape data</li>
            <li>Upload scripts containing illegal content, hate speech, or copyrighted material you don't own</li>
            <li>Share API keys publicly or use API access beyond contracted rate limits</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>

          <Typography variant="h4">8. Privacy & Data Protection</Typography>
          <Typography>
            Your use of the Platform is also governed by our <Link href="/privacy" sx={{ color: t.gold }}>Privacy Policy</Link>. We are committed to GDPR compliance and do not collect or store PII beyond what is necessary for account management and billing.
          </Typography>
          <Typography>
            <strong>8.1 Script Confidentiality:</strong> We treat all uploaded scripts as confidential. Scripts are processed securely and are not shared with third parties.
          </Typography>
          <Typography>
            <strong>8.2 Enterprise Data Security:</strong> Enterprise clients with API access receive encrypted connections (HTTPS/TLS) and may request data processing agreements (DPAs) upon request.
          </Typography>

          <Typography variant="h4">9. Disclaimers & Limitation of Liability</Typography>
          <Typography>
            <strong>9.1 "AS IS" Service:</strong> The Platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non infringement.
          </Typography>
          <Typography>
            <strong>9.2 No Professional Advice:</strong> The Platform does not provide legal, tax, financial, or professional advice. Consult qualified professionals before making production, financial, or legal decisions.
          </Typography>
          <Typography>
            <strong>9.3 Limitation of Liability:</strong> To the maximum extent permitted by law, Prodculator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to lost profits, lost revenue, or lost productions, arising from your use of the Platform.
          </Typography>
          <Typography>
            <strong>9.4 Maximum Liability:</strong> Our total liability to you for any claims arising from use of the Platform shall not exceed the amount you paid us in the 12 months preceding the claim (or $100, whichever is greater).
          </Typography>
          <Typography>
            <strong>9.5 Third Party Data Errors:</strong> We rely on third party APIs and government databases. We are not liable for errors, omissions, or changes in third party data sources.
          </Typography>

          <Typography variant="h4">10. South Africa Payment Issues Warning</Typography>
          <Typography>
            <strong>10.1 Payment Processing Challenges:</strong> Users accessing rebate calculations for South Africa productions are advised that South Africa has a history of delayed incentive payments and administrative challenges. We provide this warning to ensure informed decision making.
          </Typography>
          <Typography>
            <strong>10.2 No Endorsement:</strong> Inclusion of South Africa in our territory database does not constitute an endorsement or recommendation to film there. Users must conduct independent due diligence.
          </Typography>

          <Typography variant="h4">11. Termination</Typography>
          <Typography>
            <strong>11.1 By You:</strong> You may cancel your subscription at any time from your account dashboard. Cancellation takes effect at the end of your current billing period.
          </Typography>
          <Typography>
            <strong>11.2 By Us:</strong> We reserve the right to suspend or terminate accounts that violate these Terms, engage in prohibited uses, or pose security risks.
          </Typography>
          <Typography>
            <strong>11.3 Effect of Termination:</strong> Upon termination, you lose access to the Platform and all associated data. We may delete your account data after 30 days.
          </Typography>

          <Typography variant="h4">12. Modifications to Terms</Typography>
          <Typography>
            We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in app notification at least 30 days before taking effect. Continued use of the Platform after changes constitutes acceptance.
          </Typography>

          <Typography variant="h4">13. Governing Law & Dispute Resolution</Typography>
          <Typography>
            <strong>13.1 Governing Law:</strong> These Terms are governed by the laws of England and Wales (for GBP customers) or California, USA (for USD customers), without regard to conflict of law principles.
          </Typography>
          <Typography>
            <strong>13.2 Dispute Resolution:</strong> Any disputes shall first be subject to good faith negotiation. If unresolved, disputes shall be resolved through binding arbitration in accordance with the rules of the London Court of International Arbitration (for GBP customers) or JAMS (for USD customers).
          </Typography>
          <Typography>
            <strong>13.3 Class Action Waiver:</strong> You agree to resolve disputes individually and waive any right to participate in class actions or collective proceedings.
          </Typography>

          <Typography variant="h4">14. Enterprise Specific Provisions</Typography>
          <Typography>
            <strong>14.1 Government Procurement:</strong> Film commissions and government agencies may be subject to additional procurement regulations. Custom addendums can be provided upon request.
          </Typography>
          <Typography>
            <strong>14.2 Data Processing Agreements:</strong> Enterprise clients may request Data Processing Agreements (DPAs) for GDPR compliance, provided at no additional cost.
          </Typography>
          <Typography>
            <strong>14.3 Export Compliance:</strong> Enterprise clients using our API or data exports agree to comply with all applicable export control laws and regulations.
          </Typography>

          <Typography variant="h4">15. Contact Information</Typography>
          <Typography>
            For questions about these Terms or to request enterprise contracts, contact us at:
          </Typography>
          <Typography>
            <strong>Email:</strong> legal@prodculator.com<br />
            <strong>Enterprise Sales:</strong> enterprise@prodculator.com<br />
            <strong>Support:</strong> support@prodculator.com
          </Typography>

          <Typography variant="h4">16. Severability</Typography>
          <Typography>
            If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
          </Typography>

          <Typography variant="h4">17. Entire Agreement</Typography>
          <Typography>
            These Terms, together with our Privacy Policy and any enterprise contracts, constitute the entire agreement between you and Prodculator regarding use of the Platform.
          </Typography>

          <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${t.border}` }}>
            <Typography variant="body2" sx={{ color: t.textSecondary }}>
              <strong>Version:</strong> 2.0 (B2B Updated)<br />
              <strong>Effective Date:</strong> January 24, 2026<br />
              <strong>Previous Version:</strong> 1.0 (Individual Users Only)
            </Typography>
          </Box>
        </Box>
      </Container>

      <SiteFooter />
    </Box>
  );
}
