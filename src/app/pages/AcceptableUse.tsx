import { Box, Container, Typography } from '@mui/material';

export function AcceptableUse() {
  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100dvh', color: '#ffffff', py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: '#D4AF37' }}>
          Acceptable Use Policy
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 6 }}>
          Last Updated: January 24, 2026
        </Typography>

        <Box sx={{ '& h4': { color: '#D4AF37', fontWeight: 700, mt: 4, mb: 2 }, '& p': { color: '#ffffff', mb: 2, lineHeight: 1.8 }, '& ul': { color: '#ffffff', mb: 2, pl: 3 }, '& li': { mb: 1 } }}>
          
          <Typography variant="h4">1. Purpose</Typography>
          <Typography>
            This Acceptable Use Policy ("AUP") governs your use of Prodculator and defines prohibited activities for both individual subscribers and enterprise (B2B) clients.
          </Typography>

          <Typography variant="h4">2. Permitted Uses</Typography>
          <Typography>
            You may use the Platform for:
          </Typography>
          <ul>
            <li><strong>Individual Users:</strong> Professional film production planning, location scouting, budget estimation, and investor ready intelligence reports</li>
            <li><strong>Film Commissions:</strong> Territory marketing, competitive analysis, policy development, and ROI reporting to government stakeholders</li>
            <li><strong>Streamers & Studios:</strong> Location scouting, financial planning, production pipeline analysis, and competitive intelligence</li>
            <li><strong>Equipment Rental & Service Providers:</strong> Demand forecasting, equipment deployment planning, and market trend analysis</li>
          </ul>

          <Typography variant="h4">3. Prohibited Uses</Typography>
          
          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.1 Illegal Activities
          </Typography>
          <ul>
            <li>Uploading scripts containing illegal content, child exploitation material, or content that violates criminal laws</li>
            <li>Using the Platform to facilitate money laundering, fraud, or tax evasion</li>
            <li>Violating export control laws or economic sanctions</li>
            <li>Infringing copyright, trademark, or intellectual property rights of third parties</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.2 Harmful Content
          </Typography>
          <ul>
            <li>Uploading scripts containing hate speech, incitement to violence, or discriminatory content</li>
            <li>Using the Platform to harass, threaten, or abuse others</li>
            <li>Spreading malware, viruses, or malicious code</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.3 Unauthorized Access & Security Violations
          </Typography>
          <ul>
            <li>Attempting to gain unauthorized access to the Platform, other users' accounts, or our systems</li>
            <li>Reverse engineering, decompiling, or extracting source code</li>
            <li>Using automated bots, scrapers, or scripts to extract data (except via authorized API access)</li>
            <li>Sharing API keys publicly or with unauthorized third parties</li>
            <li>Circumventing rate limits, usage caps, or security measures</li>
            <li>Launching denial of service (DoS) attacks or attempting to overload our infrastructure</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.4 Data Misuse
          </Typography>
          <ul>
            <li><strong>Collecting PII:</strong> Using the Platform to collect personally identifiable information (PII) or sensitive personal data (the Platform is NOT designed for this purpose)</li>
            <li><strong>Data Resale:</strong> Reselling, redistributing, or sublicensing Platform data or reports to third parties (except as authorized in enterprise contracts)</li>
            <li><strong>Competitive Intelligence Abuse:</strong> Using data to create competing products or services</li>
            <li><strong>Public Redistribution:</strong> Publishing reports, API data, or analyses publicly without written permission</li>
          </ul>

          <Typography sx={{ fontWeight: 700, color: '#D4AF37', mt: 3, mb: 1 }}>
            3.5 Enterprise Specific Prohibitions
          </Typography>
          <ul>
            <li><strong>API Abuse:</strong> Exceeding contracted API rate limits or using API access for purposes not specified in your contract</li>
            <li><strong>Report Redistribution:</strong> Forwarding automated B2B reports to individuals or organizations not listed in your contract</li>
            <li><strong>Benchmark Gaming:</strong> Using territory intelligence data to artificially inflate or deflate reported production activity</li>
            <li><strong>White Label Misuse:</strong> Using white label reports to misrepresent data as your own proprietary research (appropriate attribution required)</li>
          </ul>

          <Typography variant="h4">4. Account Integrity</Typography>
          <Typography>
            <strong>4.1 Credential Security:</strong> You are responsible for maintaining the confidentiality of your login credentials and API keys. Do not share credentials with unauthorized parties.
          </Typography>
          <Typography>
            <strong>4.2 Account Sharing:</strong> Individual subscriptions are for single users only. Do not share your account with multiple people (upgrade to Studio tier for team access).
          </Typography>
          <Typography>
            <strong>4.3 Multiple Accounts:</strong> Do not create multiple free accounts to circumvent usage limits.
          </Typography>

          <Typography variant="h4">5. Fair Use & Resource Limits</Typography>
          <Typography>
            <strong>5.1 Individual Subscriptions:</strong> Report generation is subject to plan limits (1 free, 5/month Pro, 15/month Producer, unlimited Studio). Excessive usage that degrades service performance may be throttled or restricted.
          </Typography>
          <Typography>
            <strong>5.2 API Rate Limits:</strong> Enterprise API clients are subject to rate limits specified in their contracts (e.g., 1,000 requests/minute). Exceeding limits may result in temporary throttling or suspension.
          </Typography>
          <Typography>
            <strong>5.3 Fair Use Principle:</strong> Use of the Platform should be reasonable and not interfere with other users' access or system performance.
          </Typography>

          <Typography variant="h4">6. Copyright & Intellectual Property</Typography>
          <Typography>
            <strong>6.1 Script Ownership:</strong> You represent and warrant that you own or have the legal right to upload scripts. Do not upload scripts you do not own or lack permission to analyze.
          </Typography>
          <Typography>
            <strong>6.2 Platform Content:</strong> All Platform content (software, algorithms, UI designs, reports, data) is protected by copyright and trademark laws. Do not copy, reproduce, or create derivative works without permission.
          </Typography>
          <Typography>
            <strong>6.3 Trademark Use:</strong> Do not use "Prodculator" or our trademarks in a way that suggests endorsement or affiliation without written permission.
          </Typography>

          <Typography variant="h4">7. Enterprise Data Licensing Terms</Typography>
          <Typography>
            <strong>7.1 Internal Use Only:</strong> Licensed data (territory intelligence, API data, reports) is for internal organizational use only unless your contract explicitly permits external distribution.
          </Typography>
          <Typography>
            <strong>7.2 Attribution Requirements:</strong> When presenting data externally (e.g., to government stakeholders, investors), you must attribute data to "Prodculator" unless using white label services.
          </Typography>
          <Typography>
            <strong>7.3 No Competitive Use:</strong> Enterprise clients may not use licensed data to create competing production intelligence platforms or services.
          </Typography>
          <Typography>
            <strong>7.4 Aggregated Data Sharing:</strong> We may share anonymized, aggregated data with multiple clients (e.g., "UK production activity increased 15% in Q1 2026"). This does NOT include client specific or identifiable data.
          </Typography>

          <Typography variant="h4">8. Reporting Violations</Typography>
          <Typography>
            If you become aware of any violations of this AUP, please report them immediately to:
          </Typography>
          <Typography>
            <strong>Security Issues:</strong> security@prodculator.com<br />
            <strong>Copyright/IP Violations:</strong> legal@prodculator.com<br />
            <strong>Abuse Reports:</strong> abuse@prodculator.com
          </Typography>

          <Typography variant="h4">9. Enforcement & Consequences</Typography>
          <Typography>
            <strong>9.1 Investigation:</strong> We reserve the right to investigate suspected violations of this AUP.
          </Typography>
          <Typography>
            <strong>9.2 Suspension:</strong> We may immediately suspend accounts or API access if we detect security threats, abuse, or violations.
          </Typography>
          <Typography>
            <strong>9.3 Termination:</strong> Serious or repeated violations may result in permanent account termination without refund.
          </Typography>
          <Typography>
            <strong>9.4 Legal Action:</strong> We reserve the right to pursue legal action for violations that cause harm, involve illegal activities, or result in financial losses.
          </Typography>
          <Typography>
            <strong>9.5 Law Enforcement Cooperation:</strong> We will cooperate with law enforcement investigations and may disclose user information when legally required.
          </Typography>

          <Typography variant="h4">10. Changes to This Policy</Typography>
          <Typography>
            We may update this AUP to address new security threats or abuse patterns. Material changes will be communicated via email or in app notification.
          </Typography>

          <Typography variant="h4">11. Questions</Typography>
          <Typography>
            If you have questions about what constitutes acceptable use, contact us at support@prodculator.com before proceeding.
          </Typography>

          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
              <strong>Version:</strong> 2.0 (B2B Updated)<br />
              <strong>Effective Date:</strong> January 24, 2026
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
