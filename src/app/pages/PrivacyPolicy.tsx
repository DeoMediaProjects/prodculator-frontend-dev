import { Box, Container, Typography, Link } from '@mui/material';

export function PrivacyPolicy() {
  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh', color: '#ffffff', py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#D4AF37' }}>
          Privacy Policy
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 6 }}>
          Last Updated: January 24, 2026
        </Typography>

        <Box sx={{ '& h4': { color: '#D4AF37', fontWeight: 700, mt: 4, mb: 2 }, '& p': { color: '#ffffff', mb: 2, lineHeight: 1.8 }, '& ul': { color: '#ffffff', mb: 2, pl: 3 }, '& li': { mb: 1 } }}>
          
          <Typography variant="h4">1. Introduction</Typography>
          <Typography>
            Prodculator (operated by Deo Media Limited) (\"we\", \"us\", \"our\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Platform, including both individual subscriptions and enterprise (B2B) solutions.
          </Typography>
          <Typography>
            <strong>Important:</strong> Prodculator is NOT designed for collecting personally identifiable information (PII) or securing highly sensitive personal data. This Platform is intended for professional film production intelligence only.
          </Typography>

          <Typography variant="h4">2. Information We Collect</Typography>
          
          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            2.1 Individual Users (B2C)
          </Typography>
          <Typography>
            <strong>Account Information:</strong>
          </Typography>
          <ul>
            <li>Name, email address, password (hashed)</li>
            <li>Job role (Producer, Director, Studio Executive, etc.)</li>
            <li>Payment information (processed by Stripe; we do not store full credit card numbers)</li>
            <li>Billing currency (USD or GBP)</li>
            <li>Subscription plan and billing history</li>
          </ul>
          <Typography>
            <strong>Usage Data:</strong>
          </Typography>
          <ul>
            <li>Scripts uploaded (stored securely and confidentially)</li>
            <li>Reports generated (metadata: date, territories analyzed, report type)</li>
            <li>Feature usage (which tools you use, frequency)</li>
            <li>Comparison tool usage (territories selected, parameters used, number of comparisons)</li>
            <li>What if calculator usage (budget ranges, scenario parameters, saved calculations)</li>
            <li>Session data (login times, IP addresses, browser type)</li>
            <li>Engagement features (Territory Watchlist, Alert preferences, Festival tracking)</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            2.2 Enterprise Clients (B2B)
          </Typography>
          <Typography>
            <strong>Organization Information:</strong>
          </Typography>
          <ul>
            <li>Organization name and type (Film Commission, Streamer, Equipment Rental, etc.)</li>
            <li>Contact person details (name, email, phone)</li>
            <li>Billing contact information</li>
            <li>Contract terms (MRR, currency, subscription frequency)</li>
            <li>Report recipients (email addresses for automated delivery)</li>
          </ul>
          <Typography>
            <strong>API Access Data:</strong>
          </Typography>
          <ul>
            <li>API keys (generated and encrypted)</li>
            <li>API usage logs (endpoint accessed, timestamp, response time, query parameters)</li>
            <li>Rate limit monitoring data</li>
            <li>System performance metrics (for SLA compliance)</li>
          </ul>
          <Typography>
            <strong>Report Delivery Data:</strong>
          </Typography>
          <ul>
            <li>Automated report generation timestamps</li>
            <li>Email delivery logs (sent/failed status, recipient list)</li>
            <li>Custom report templates and branding preferences</li>
          </ul>

          <Typography variant="h4">3. How We Use Your Information</Typography>
          
          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.1 Individual Users
          </Typography>
          <ul>
            <li><strong>Service Delivery:</strong> Process scripts, generate intelligence reports, provide location analysis</li>
            <li><strong>Account Management:</strong> Manage your subscription, billing, and account settings</li>
            <li><strong>Communication:</strong> Send transactional emails (password resets, billing confirmations, report ready notifications)</li>
            <li><strong>Feature Delivery:</strong> Enable Territory Watchlist, Incentive Rate Alerts, Festival Deadline Reminders, Grant Notifications</li>
            <li><strong>Product Improvement:</strong> Analyze usage patterns to improve features (anonymized data only)</li>
            <li><strong>Compliance:</strong> Comply with legal obligations, fraud prevention, and dispute resolution</li>
            <li><strong>Aggregate Production Intelligence:</strong> Extract anonymized metadata from script uploads (crew size estimates, equipment requirements, production scale indicators) to create aggregate industry trend reports shown in our Production Intelligence Dashboard and shared with enterprise clients. Individual scripts are NEVER identifiable in these reports.</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.2 Enterprise Clients
          </Typography>
          <ul>
            <li><strong>Contract Fulfillment:</strong> Generate and deliver contracted reports on scheduled dates</li>
            <li><strong>API Access:</strong> Provide authenticated API access with usage monitoring</li>
            <li><strong>SLA Compliance:</strong> Monitor uptime, response times, and service quality</li>
            <li><strong>Billing & Invoicing:</strong> Generate invoices and track payments</li>
            <li><strong>Support & Communication:</strong> Provide enterprise support, contract management, and service updates</li>
            <li><strong>Aggregate Analytics:</strong> Create anonymized aggregate market reports (e.g., "Production trends across UK territories")</li>
          </ul>

          <Typography variant="h4">4. Data Storage & Security</Typography>
          <Typography>
            <strong>4.1 Encryption:</strong> All data is encrypted in transit (HTTPS/TLS 1.3) and at rest (AES 256).
          </Typography>
          <Typography>
            <strong>4.2 Access Controls:</strong> Strict role based access controls limit who can view your data internally.
          </Typography>
          <Typography>
            <strong>4.3 Script Confidentiality:</strong> Uploaded scripts are treated as confidential trade secrets and are never shared with third parties or used for training AI models.
          </Typography>
          <Typography>
            <strong>4.4 API Security:</strong> API keys are hashed and encrypted. Enterprise clients receive unique keys with rate limiting and IP whitelisting (optional).
          </Typography>
          <Typography>
            <strong>4.5 Data Retention:</strong>
          </Typography>
          <ul>
            <li>Active user data: Retained for the duration of your subscription</li>
            <li>Cancelled accounts: Data deleted after 30 days (unless required for legal/tax purposes)</li>
            <li>Enterprise contracts: Data retained for the contract term + 7 years (for tax/legal compliance)</li>
            <li>API logs: Retained for 90 days for security and performance monitoring</li>
          </ul>
          <Typography>
            <strong>4.6 Production Intelligence Dashboard Anonymized Metadata:</strong> When you upload a script, we automatically extract anonymized metadata (estimated crew size, camera equipment requirements, cast size indicators, production scale) to power our Production Intelligence Dashboard. This dashboard shows aggregate industry trends (e.g., "Average crew size for action films: 85 people") and is shared with enterprise clients. Your specific script content, project title, character names, dialogue, and plot details are NEVER included in this analysis. Only non identifiable production logistics metadata is extracted and aggregated across hundreds of scripts.
          </Typography>

          <Typography variant="h4">5. Data Sharing & Third Parties</Typography>
          <Typography>
            We do NOT sell your personal data. We share data only in the following limited circumstances:
          </Typography>
          <ul>
            <li><strong>Payment Processors:</strong> Stripe (for payment processing)</li>
            <li><strong>Email Service:</strong> SendGrid/AWS SES (for transactional emails and automated B2B report delivery)</li>
            <li><strong>Cloud Infrastructure:</strong> AWS/Google Cloud (for hosting and data storage)</li>
            <li><strong>Analytics:</strong> Google Analytics (anonymized usage data only; no PII)</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights</li>
          </ul>
          <Typography>
            <strong>Third Party Data Sources:</strong> We integrate with government APIs and film commission databases to provide incentive data. These integrations do NOT share your personal information or uploaded scripts.
          </Typography>

          <Typography variant="h4">6. Enterprise Specific Privacy Terms</Typography>
          <Typography>
            <strong>6.1 Data Processing Agreements (DPAs):</strong> Enterprise clients may request a DPA for GDPR compliance at no additional cost.
          </Typography>
          <Typography>
            <strong>6.2 Data Ownership:</strong> Enterprise clients retain ownership of any proprietary data they provide. We license production data to enterprise clients under individual contracts.
          </Typography>
          <Typography>
            <strong>6.3 Aggregate Data:</strong> We may create anonymized, aggregate reports (e.g., "50% of productions in Q1 2026 filmed in Canada") for distribution to multiple enterprise clients. These reports contain NO identifiable information about individual productions or clients.
          </Typography>
          <Typography>
            <strong>6.4 API Data Usage:</strong> API query data (e.g., "Which territories did Client X query?") is logged for performance monitoring and security but is NOT shared with other clients.
          </Typography>
          <Typography>
            <strong>6.5 Report Recipient Privacy:</strong> Email addresses on enterprise report distribution lists are used solely for delivering contracted reports. We do not use these addresses for marketing.
          </Typography>

          <Typography variant="h4">7. Your Privacy Rights (GDPR & CCPA)</Typography>
          <Typography>
            If you are in the EU/UK (GDPR) or California (CCPA), you have the following rights:
          </Typography>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
            <li><strong>Portability:</strong> Receive your data in a machine readable format</li>
            <li><strong>Objection:</strong> Object to certain processing activities (e.g., marketing emails)</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time (does not affect prior processing)</li>
          </ul>
          <Typography>
            To exercise these rights, email us at <strong>privacyprod@deomedia.net</strong> with your request. We will respond within 30 days.
          </Typography>

          <Typography variant="h4">8. Cookies & Tracking</Typography>
          <Typography>
            We use essential cookies for authentication and session management. We do NOT use invasive tracking or advertising cookies.
          </Typography>
          <ul>
            <li><strong>Essential Cookies:</strong> Session tokens, authentication (required for service functionality)</li>
            <li><strong>Analytics Cookies:</strong> Google Analytics (anonymized, no PII) you can opt out via browser settings</li>
            <li><strong>No Third Party Ads:</strong> We do not serve third party advertising or use advertising trackers</li>
          </ul>

          <Typography variant="h4">9. International Data Transfers</Typography>
          <Typography>
            <strong>9.1 Data Hosting:</strong> Data is hosted on secure servers in the EU (for European customers) and US (for North American customers).
          </Typography>
          <Typography>
            <strong>9.2 Cross Border Transfers:</strong> If you are outside these regions, your data may be transferred to and processed in the EU or US under Standard Contractual Clauses (SCCs) approved by the European Commission.
          </Typography>
          <Typography>
            <strong>9.3 Enterprise Clients:</strong> We can accommodate data residency requirements (e.g., "Data must stay in UK") for enterprise contracts upon request.
          </Typography>

          <Typography variant="h4">10. Children's Privacy</Typography>
          <Typography>
            The Platform is not intended for individuals under 18 years old. We do not knowingly collect data from minors. If we discover we have collected data from a minor, we will delete it immediately.
          </Typography>

          <Typography variant="h4">11. Marketing Communications</Typography>
          <Typography>
            <strong>11.1 Transactional Emails:</strong> We send transactional emails (password resets, billing confirmations, report delivery) as necessary for service delivery. You cannot opt out of these.
          </Typography>
          <Typography>
            <strong>11.2 Product Updates:</strong> We may occasionally send product updates or new feature announcements. You can opt out via the "Unsubscribe" link in any email.
          </Typography>
          <Typography>
            <strong>11.3 Enterprise Communication:</strong> Enterprise sales inquiries (RFP submissions) will receive follow up emails from our sales team. You can request removal from our sales list at any time.
          </Typography>

          <Typography variant="h4">12. Data Breach Notification</Typography>
          <Typography>
            In the unlikely event of a data breach affecting your personal information, we will:
          </Typography>
          <ul>
            <li>Notify affected users within 72 hours (GDPR requirement)</li>
            <li>Provide details of what data was compromised</li>
            <li>Outline steps we are taking to resolve the breach</li>
            <li>Recommend actions you should take (e.g., change password)</li>
          </ul>

          <Typography variant="h4">13. Changes to This Privacy Policy</Typography>
          <Typography>
            We may update this Privacy Policy to reflect changes in our practices or legal requirements. Material changes will be communicated via email or in app notification at least 30 days before taking effect.
          </Typography>
          <Typography>
            <strong>Version History:</strong>
          </Typography>
          <ul>
            <li>Version 2.0 (January 24, 2026): Added B2B/enterprise provisions, API data handling, automated report delivery</li>
            <li>Version 1.0 (Initial): Individual user privacy policy</li>
          </ul>

          <Typography variant="h4">14. Contact Us</Typography>
          <Typography>
            For privacy questions, data subject requests, or to report a concern, contact us at:
          </Typography>
          <Typography>
            <strong>Data Controller:</strong> Deo Media Limited (trading as Prodculator)<br />
            <strong>Registered Address:</strong> Springhead Road, Northfleet, Kent, DA11 8HN, United Kingdom<br />
            <strong>Privacy Contact:</strong> privacyprod@deomedia.net<br />
            <strong>General Support:</strong> support@prodculator.com
          </Typography>

          <Typography variant="h4">15. Supervisory Authority</Typography>
          <Typography>
            If you are in the EU/UK and believe we have not addressed your privacy concerns adequately, you have the right to lodge a complaint with your local data protection authority:
          </Typography>
          <ul>
            <li><strong>UK:</strong> Information Commissioner's Office (ICO) <Link href="https://ico.org.uk" target="_blank" sx={{ color: '#D4AF37' }}>ico.org.uk</Link></li>
            <li><strong>EU:</strong> Your national data protection authority</li>
          </ul>

          <Typography variant="h4">16. Legal Basis for Processing (GDPR)</Typography>
          <Typography>
            We process your personal data under the following legal bases:
          </Typography>
          <ul>
            <li><strong>Contract:</strong> Processing is necessary to fulfill our contract with you (service delivery, billing)</li>
            <li><strong>Legitimate Interest:</strong> Fraud prevention, security monitoring, product improvement (anonymized data)</li>
            <li><strong>Consent:</strong> Marketing communications (you can withdraw consent at any time)</li>
            <li><strong>Legal Obligation:</strong> Compliance with tax laws, court orders, regulatory requirements</li>
          </ul>

          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
              <strong>Version:</strong> 2.0 (B2B Updated)<br />
              <strong>Effective Date:</strong> January 24, 2026<br />
              <strong>GDPR Compliant:</strong> Yes<br />
              <strong>CCPA Compliant:</strong> Yes<br />
              <strong>Last Reviewed:</strong> January 24, 2026
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
