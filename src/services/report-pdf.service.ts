/**
 * Report PDF Generation Service
 * Generates investor-ready PDF reports from script analysis data
 */

import type { ScriptAnalysis } from '@/app/contexts/ScriptContext';
import { apiClient } from '@/services/api';

/**
 * Download a backend-generated PDF report as a file.
 */
export async function downloadReportPDF(reportId: string, filename?: string): Promise<void> {
  const blob = await apiClient.get<Blob>(`/api/reports/${reportId}/pdf`, {
    auth: true,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ? `${filename}.pdf` : `report-${reportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open a backend-generated PDF report in a new browser tab.
 */
export async function viewReportPDF(reportId: string): Promise<void> {
  const blob = await apiClient.get<Blob>(`/api/reports/${reportId}/pdf`, {
    auth: true,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Revoke after a delay to allow the tab to load
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Generate and download a PDF report from analysis data
 * Opens a new window with print-optimized content
 */
export async function generateReportPDF(analysis: ScriptAnalysis): Promise<void> {
  try {
    // Generate HTML content for PDF
    const htmlContent = generatePDFHTML(analysis);
    
    // Try to open new window with print content
    let printWindow: Window | null = null;
    
    try {
      printWindow = window.open('', '_blank');
    } catch (error) {
      console.error('SecurityError: window.open blocked:', error);
      alert('Unable to generate PDF. Please allow pop ups for this site and ensure you are not in a sandboxed environment.');
      throw new Error('Pop up blocked or sandboxed environment detected.');
    }
    
    if (!printWindow) {
      alert('Please allow pop ups to generate PDF reports');
      throw new Error('Could not open print window. Pop ups may be blocked.');
    }

    // Write content to new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load
    printWindow.onload = () => {
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Close window after printing (user can cancel)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 250);
    };

    console.log('✅ PDF print window opened');
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Generate HTML content for PDF printing
 */
function generatePDFHTML(analysis: ScriptAnalysis): string {
  const today = new Date(analysis.generatedAt).toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prodculator Report ${analysis.scriptTitle}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }

    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #000;
      color: #fff;
      page-break-after: always;
      text-align: center;
      padding: 40px;
    }

    .logo {
      font-size: 48px;
      font-weight: 700;
      color: #D4AF37;
      margin-bottom: 20px;
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: 20px;
      color: #fff;
      margin-bottom: 60px;
    }

    .script-title {
      font-size: 36px;
      color: #D4AF37;
      margin-bottom: 20px;
      font-weight: 700;
    }

    .date {
      font-size: 16px;
      color: #a0a0a0;
    }

    .footer-note {
      position: absolute;
      bottom: 40px;
      font-size: 12px;
      color: #666;
    }

    .section {
      page-break-inside: avoid;
      margin-bottom: 30px;
    }

    .page {
      padding: 20px;
      page-break-after: always;
    }

    h1 {
      color: #D4AF37;
      font-size: 28px;
      margin-bottom: 20px;
      border-bottom: 2px solid #D4AF37;
      padding-bottom: 10px;
    }

    h2 {
      color: #000;
      font-size: 20px;
      margin: 20px 0 10px 0;
    }

    h3 {
      color: #333;
      font-size: 16px;
      margin: 15px 0 8px 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      margin-bottom: 30px;
    }

    .summary-label {
      font-weight: 600;
      color: #666;
    }

    .summary-value {
      color: #000;
    }

    .highlight-box {
      background: #D4AF37;
      color: #000;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      text-align: center;
    }

    .highlight-box h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
    }

    .highlight-box .big-text {
      font-size: 24px;
      font-weight: 700;
    }

    .territory-card {
      border: 1px solid #e0e0e0;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    .territory-header {
      color: #D4AF37;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .territory-score {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }

    .territory-metrics {
      font-size: 12px;
      color: #888;
      margin-bottom: 12px;
    }

    .reasoning-list {
      list-style: none;
      padding-left: 0;
    }

    .reasoning-list li {
      padding-left: 20px;
      margin-bottom: 6px;
      position: relative;
      font-size: 13px;
      line-height: 1.5;
    }

    .reasoning-list li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #D4AF37;
      font-weight: 700;
    }

    .incentive-card {
      border-left: 3px solid #D4AF37;
      padding: 15px;
      margin-bottom: 20px;
      background: #f9f9f9;
      page-break-inside: avoid;
    }

    .incentive-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }

    .incentive-program {
      color: #666;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .incentive-rebate {
      color: #4caf50;
      font-size: 18px;
      font-weight: 700;
      margin: 8px 0;
    }

    .incentive-details {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .incentive-requirements {
      font-size: 11px;
      color: #888;
      font-style: italic;
    }

    .disclaimer-section {
      margin-top: 40px;
    }

    .disclaimer-item {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .disclaimer-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .disclaimer-text {
      font-size: 12px;
      color: #444;
      line-height: 1.6;
    }

    .page-footer {
      position: fixed;
      bottom: 10px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="logo">PRODCULATOR</div>
    <div class="subtitle">Production Intelligence Report</div>
    <div class="script-title">${analysis.scriptTitle}</div>
    <div class="date">Generated: ${today}</div>
    <div class="footer-note">
      Professional production intelligence powered by AI<br>
      © 2026 Prodculator | prodculator.com
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="page">
    <h1>EXECUTIVE SUMMARY</h1>
    
    <div class="summary-grid">
      <div class="summary-label">Project:</div>
      <div class="summary-value">${analysis.scriptTitle}</div>
      
      <div class="summary-label">Genre:</div>
      <div class="summary-value">${analysis.genre}</div>
      
      <div class="summary-label">Tone:</div>
      <div class="summary-value">${analysis.tone}</div>
      
      <div class="summary-label">Scale:</div>
      <div class="summary-value">${analysis.scale}</div>
      
      <div class="summary-label">Complexity:</div>
      <div class="summary-value">${analysis.complexity}</div>
    </div>

    ${analysis.locationRankings.length > 0 ? `
    <div class="highlight-box">
      <h2>TOP RECOMMENDATION</h2>
      <div class="big-text">${analysis.locationRankings[0].name}, ${analysis.locationRankings[0].country}</div>
      <div>Overall Score: ${analysis.locationRankings[0].score}/100</div>
    </div>
    ` : ''}
  </div>

  <!-- Territory Rankings -->
  <div class="page">
    <h1>TERRITORY RANKINGS</h1>
    
    ${analysis.locationRankings.slice(0, 5).map((location, index) => `
      <div class="territory-card">
        <div class="territory-header">${index + 1}. ${location.name}, ${location.country}</div>
        <div class="territory-score">Overall Score: ${location.score}/100</div>
        <div class="territory-metrics">
          Cost Efficiency: ${location.costEfficiency}% | 
          Crew Depth: ${location.crewDepth}% | 
          Incentives: ${location.incentiveStrength}%
        </div>
        <h3>Key Intelligence:</h3>
        <ul class="reasoning-list">
          ${location.reasoning.slice(0, 3).map(reason => `<li>${reason}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  </div>

  <!-- Tax Incentives -->
  <div class="page">
    <h1>TAX INCENTIVE ESTIMATES</h1>
    
    ${analysis.incentiveEstimates.map(incentive => `
      <div class="incentive-card">
        <div class="incentive-title">${incentive.territory}</div>
        <div class="incentive-program">${incentive.program}</div>
        <div class="incentive-rebate">Estimated Rebate: ${incentive.estimatedRebate}</div>
        <div class="incentive-details">
          Rate: ${incentive.rate} | Cap: ${incentive.cap}
        </div>
        <div class="incentive-requirements">
          Requirements: ${incentive.requirements.join(', ')}
        </div>
      </div>
    `).join('')}
  </div>

  <!-- Disclaimers -->
  <div class="page disclaimer-section">
    <h1>IMPORTANT DISCLAIMERS</h1>
    
    <div class="disclaimer-item">
      <div class="disclaimer-title">Tax Incentive Estimates</div>
      <div class="disclaimer-text">
        All tax incentive and rebate estimates are indicative only and based on publicly available information. 
        Actual incentive amounts depend on qualifying spend, local content requirements, application timing, and 
        annual budget availability. You must verify eligibility with relevant film commissions and tax professionals 
        before relying on these estimates for production planning or investor presentations.
      </div>
    </div>

    <div class="disclaimer-item">
      <div class="disclaimer-title">Production Cost Data</div>
      <div class="disclaimer-text">
        Location expenses and production budgets are estimated based on industry averages and may
        not reflect current market conditions, currency fluctuations, or specific production requirements. Always
        obtain binding quotes from local vendors.
      </div>
    </div>

    <div class="disclaimer-item">
      <div class="disclaimer-title">AI Generated Analysis</div>
      <div class="disclaimer-text">
        This report is generated using artificial intelligence to analyze script content. While our AI is trained 
        on industry data, its recommendations should be validated by experienced production professionals and local experts.
      </div>
    </div>

    <div class="disclaimer-item">
      <div class="disclaimer-title">Data Sources & Currency</div>
      <div class="disclaimer-text">
        Information is sourced from film commissions, government databases, and industry reports. Data accuracy 
        cannot be guaranteed. We recommend verifying all critical information with official sources before making 
        production decisions.
      </div>
    </div>

    <div class="disclaimer-item">
      <div class="disclaimer-title">No Liability</div>
      <div class="disclaimer-text">
        Prodculator is not liable for financial losses, production delays, or other damages arising from reliance 
        on this report. This is an intelligence tool, not professional advice.
      </div>
    </div>
  </div>

  <div class="page-footer">
    Prodculator Intelligence Report | ${analysis.scriptTitle} | © 2026 Prodculator | support@prodculator.com | prodculator.com
  </div>
</body>
</html>
  `;
}
