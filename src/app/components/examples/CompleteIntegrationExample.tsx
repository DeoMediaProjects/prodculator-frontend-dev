/**
 * Complete Integration Example
 * Shows how PDF, Email, Webhooks, and File Upload work together
 */

import { useState } from 'react';
import { Box, Container, Paper, Typography, Button, Stepper, Step, StepLabel } from '@mui/material';
import { EnhancedFileUpload } from '@/app/components/shared/FileUpload';
import { apiClient } from '@/services/api';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/services/database.service';
import { toast } from 'sonner';

export function CompleteIntegrationExample() {
  const [file, setFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const steps = [
    'Create Report',
    'Process in Background',
    'Complete',
  ];

  /**
   * Complete workflow: Upload -> Analyze -> Report -> PDF -> Email
   */
  const handleCompleteWorkflow = async () => {
    if (!file) {
      toast.error('Please upload a script file');
      return;
    }

    setProcessing(true);

    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // STEP 1: Create report with script file + metadata in one request
      setActiveStep(0);
      const metadata = {
        script_title: file.name,
        report_type: 'paid',
      };
      const created = await databaseService.createReport(user.id, file, metadata);
      if (created.error || !created.reportId) {
        throw new Error(created.error || 'Failed to create report');
      }
      setReportId(created.reportId);
      toast.success('Report processing started.');

      // STEP 2: Poll status until terminal
      setActiveStep(1);
      const status = await waitForReportCompletion(created.reportId);
      if (status !== 'completed') {
        throw new Error('Report processing failed');
      }

      // STEP 3: Complete
      setActiveStep(2);
      toast.success('Report complete.');

      // Navigate to report
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = `/reports/${created.reportId}`;
        }, 2000);
      }

    } catch (error) {
      console.error('Workflow error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setProcessing(false);
    }
  };

  const waitForReportCompletion = async (
    createdReportId: string
  ): Promise<'processing' | 'completed' | 'failed'> => {
    const maxAttempts = 40;
    const delayMs = 3000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await apiClient.get<{ status: 'processing' | 'completed' | 'failed' }>(
        `/api/reports/${createdReportId}/status`,
        { auth: true }
      );
      if (status.status === 'completed' || status.status === 'failed') {
        return status.status;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return 'failed';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#ffffff' }}>
          Complete Integration Example
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
          This demonstrates the full workflow: Upload → AI Analysis → Report → PDF → Email
        </Typography>

        {/* Progress Stepper */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': { color: '#a0a0a0' },
                    '& .MuiStepLabel-label.Mui-active': { color: '#D4AF37' },
                    '& .MuiStepLabel-label.Mui-completed': { color: '#4caf50' },
                    '& .MuiStepIcon-root': { color: '#333333' },
                    '& .MuiStepIcon-root.Mui-active': { color: '#D4AF37' },
                    '& .MuiStepIcon-root.Mui-completed': { color: '#4caf50' },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* File Upload */}
        <Box sx={{ mb: 4 }}>
          <EnhancedFileUpload
            onFileSelect={setFile}
            onFileRemove={() => setFile(null)}
            acceptedFileTypes={['.pdf', '.docx', '.txt']}
            maxFileSize={10}
            label="Upload Your Script"
            disabled={processing}
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleCompleteWorkflow}
            disabled={!file || processing}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              px: 4,
              py: 1.5,
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
              '&:disabled': {
                bgcolor: '#666666',
                color: '#a0a0a0',
              },
            }}
          >
            {processing ? `Processing (Step ${activeStep + 1}/4)...` : 'Start Complete Workflow'}
          </Button>

          {reportId && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = `/reports/${reportId}`;
                }
              }}
              sx={{
                borderColor: '#D4AF37',
                color: '#D4AF37',
                px: 4,
                py: 1.5,
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#D4AF37',
                  bgcolor: 'rgba(212, 175, 55, 0.1)',
                },
              }}
            >
              View Report
            </Button>
          )}
        </Box>

        {/* Information Panel */}
        <Paper sx={{ mt: 4, p: 3, bgcolor: '#000000', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#D4AF37' }}>
            What This Demonstrates:
          </Typography>
          <Box component="ul" sx={{ color: '#a0a0a0', lineHeight: 2 }}>
            <li>Enhanced file upload with drag and drop</li>
            <li>Script upload through backend API</li>
            <li>Background script analysis and report orchestration</li>
            <li>Status polling through backend report endpoints</li>
            <li>Automatic report/PDF completion handled server side</li>
            <li>Stripe webhook handling (when payment occurs)</li>
          </Box>
        </Paper>

        {/* Technical Details */}
        <Paper sx={{ mt: 3, p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#D4AF37' }}>
            Technical Stack:
          </Typography>
          <Box sx={{ color: '#a0a0a0' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong style={{ color: '#D4AF37' }}>API:</strong> FastAPI backend endpoints
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong style={{ color: '#D4AF37' }}>Webhooks:</strong> Stripe API v11+
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong style={{ color: '#D4AF37' }}>Storage:</strong> Backend managed object storage
            </Typography>
            <Typography variant="body2">
              <strong style={{ color: '#D4AF37' }}>File Upload:</strong> Native HTML5 drag and drop
            </Typography>
          </Box>
        </Paper>
      </Paper>
    </Container>
  );
}

/**
 * USAGE IN YOUR APP:
 * 
 * Add to your router:
 * 
 * import { CompleteIntegrationExample } from '@/app/components/examples/CompleteIntegrationExample';
 * 
 * <Route path="/integration-example" element={<CompleteIntegrationExample />} />
 */
