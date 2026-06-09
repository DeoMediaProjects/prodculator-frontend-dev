/**
 * Email Delivery Service
 * Integrates with SendGrid to send transactional emails
 * Note: SendGrid API calls must be made server-side due to API key security
 */

import { API_CONFIG } from '@/config/api.config';
import { apiClient } from './api';

// Email template types
export enum EmailTemplate {
  REPORT_READY = 'report_ready',
  WELCOME = 'welcome',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PROCESSING_STARTED = 'processing_started',
  GRANT_ALERT = 'grant_alert',
  FESTIVAL_DEADLINE = 'festival_deadline',
}

// Email data interfaces
export interface ReportReadyEmailData {
  userName: string;
  scriptTitle: string;
  reportUrl: string;
  pdfUrl?: string;
  processingTime: string;
  topRecommendation: string;
  estimatedIncentive: string;
}

export interface WelcomeEmailData {
  userName: string;
  freeCredits: number;
  dashboardUrl: string;
}

export interface PaymentConfirmationEmailData {
  userName: string;
  planName: string;
  /** Amount as a decimal string (e.g. "99.00") or integer cents (e.g. 9900) */
  amount: string | number;
  /** ISO currency code, e.g. "USD" or "GBP" */
  currency: string;
  scriptsIncluded: number;
  receiptUrl: string;
  dashboardUrl: string;
  billingDate: string;
}

export interface ProcessingStartedEmailData {
  userName: string;
  scriptTitle: string;
  estimatedTime: string;
  dashboardUrl: string;
}

export interface GrantAlertEmailData {
  userName: string;
  grantName: string;
  amount: string;
  deadline: string;
  eligibility: string;
  applyUrl: string;
}

export interface FestivalDeadlineEmailData {
  userName: string;
  festivalName: string;
  deadline: string;
  category: string;
  fee: string;
  festivalUrl: string;
}

type EmailData =
  | ReportReadyEmailData
  | WelcomeEmailData
  | PaymentConfirmationEmailData
  | ProcessingStartedEmailData
  | GrantAlertEmailData
  | FestivalDeadlineEmailData;

/**
 * Email service class - client-side interface
 * Actual API calls should be made through backend functions or backend API
 */
export class EmailService {
  /**
   * Send email through backend API
   */
  private async sendEmail(
    template: EmailTemplate,
    to: string,
    data: EmailData,
    attachments?: Array<{ filename: string; content: string | Buffer; type: string }>
  ): Promise<void> {
    try {
      const result = await apiClient.post('/api/emails', {
        template,
        to,
        data,
        attachments,
      });
      console.log('Email sent successfully:', result);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Render transactional email HTML on backend (without sending).
   * Ensures frontend previews match server-side email templates exactly.
   */
  async previewTransactionalEmail(
    template: EmailTemplate,
    data: EmailData
  ): Promise<{ subject: string; html: string }> {
    try {
      return await apiClient.post('/api/emails/preview', {
        template,
        data,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // Backward-compatibility fallback for older backend instances.
        return apiClient.post('/api/admin/email/preview', {
          template_name: template,
          context: data,
        });
      }
      throw error;
    }
  }

  /**
   * Send report ready notification
   */
  async sendReportReadyEmail(to: string, data: ReportReadyEmailData): Promise<void> {
    await this.sendEmail(EmailTemplate.REPORT_READY, to, data);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<void> {
    await this.sendEmail(EmailTemplate.WELCOME, to, data);
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    to: string,
    data: PaymentConfirmationEmailData
  ): Promise<void> {
    await this.sendEmail(EmailTemplate.PAYMENT_CONFIRMATION, to, data);
  }

  /**
   * Send processing started notification
   */
  async sendProcessingStartedEmail(to: string, data: ProcessingStartedEmailData): Promise<void> {
    await this.sendEmail(EmailTemplate.PROCESSING_STARTED, to, data);
  }

  /**
   * Send grant alert notification
   */
  async sendGrantAlert(to: string, data: GrantAlertEmailData): Promise<void> {
    await this.sendEmail(EmailTemplate.GRANT_ALERT, to, data);
  }

  /**
   * Send festival deadline reminder
   */
  async sendFestivalDeadlineReminder(to: string, data: FestivalDeadlineEmailData): Promise<void> {
    await this.sendEmail(EmailTemplate.FESTIVAL_DEADLINE, to, data);
  }

  /**
   * Send all four core email templates to a given address (for testing/preview purposes)
   */
  async sendAllTestEmails(to: string): Promise<{ template: string; success: boolean; error?: string }[]> {
    const APP_URL = API_CONFIG.app.url.replace(/\/$/, '');

    const jobs: Array<{ label: string; fn: () => Promise<void> }> = [
      {
        label: EmailTemplate.REPORT_READY,
        fn: () =>
          this.sendReportReadyEmail(to, {
            userName: 'Test User',
            scriptTitle: 'THE LAST FRONTIER',
            reportUrl: `${APP_URL}/reports/rpt-test-001`,
            pdfUrl: `${APP_URL}/downloads/rpt-test-001.pdf`,
            processingTime: '2 minutes 34 seconds',
            topRecommendation: 'British Columbia, Canada',
            estimatedIncentive: '$450,000 to $650,000',
          }),
      },
      {
        label: EmailTemplate.WELCOME,
        fn: () =>
          this.sendWelcomeEmail(to, {
            userName: 'Test User',
            freeCredits: 1,
            dashboardUrl: `${APP_URL}/dashboard`,
          }),
      },
      {
        label: EmailTemplate.PAYMENT_CONFIRMATION,
        fn: () =>
          this.sendPaymentConfirmation(to, {
            userName: 'Test User',
            planName: 'Professional Plan',
            amount: '99.00',
            currency: 'USD',
            scriptsIncluded: 5,
            receiptUrl: `${APP_URL}/receipts/inv-test-001`,
            dashboardUrl: `${APP_URL}/dashboard`,
            billingDate: new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          }),
      },
      {
        label: EmailTemplate.PROCESSING_STARTED,
        fn: () =>
          this.sendProcessingStartedEmail(to, {
            userName: 'Test User',
            scriptTitle: 'THE LAST FRONTIER',
            estimatedTime: '3 to 5 minutes',
            dashboardUrl: `${APP_URL}/dashboard`,
          }),
      },
    ];

    const results: { template: string; success: boolean; error?: string }[] = [];

    for (const job of jobs) {
      try {
        await job.fn();
        results.push({ template: job.label, success: true });
      } catch (err) {
        results.push({
          template: job.label,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}

// Export singleton instance
export const emailService = new EmailService();
