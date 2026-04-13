/**
 * Enhanced File Upload Component
 * Provides drag-and-drop upload with progress tracking and preview
 */

import { useState, useRef, useCallback } from 'react';
import { Box, Paper, Typography, LinearProgress, Alert, IconButton } from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Close,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  label?: string;
  disabled?: boolean;
}

export function EnhancedFileUpload({
  onFileSelect,
  onFileRemove,
  acceptedFileTypes = ['.pdf', '.docx', '.txt', '.fdx', '.fountain'],
  maxFileSize = 10,
  label = 'Upload Your Script',
  disabled = false,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return `File size must be under ${maxFileSize}MB`;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        return `File type must be one of: ${acceptedFileTypes.join(', ')}`;
      }

      return null;
    },
    [acceptedFileTypes, maxFileSize]
  );

  // Handle file selection
  const handleFileChange = useCallback(
    (selectedFile: File) => {
      setError(null);

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(selectedFile);
      setUploading(true);

      // Simulate upload progress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgress(currentProgress);

        if (currentProgress >= 100) {
          clearInterval(interval);
          setUploading(false);
          onFileSelect(selectedFile);
        }
      }, 100);
    },
    [validateFile, onFileSelect]
  );

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled]);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileChange(droppedFile);
      }
    },
    [disabled, handleFileChange]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileChange(selectedFile);
      }
    },
    [handleFileChange]
  );

  // Handle file removal
  const handleRemove = useCallback(() => {
    setFile(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  }, [onFileRemove]);

  // Trigger file input click
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
        {label}
      </Typography>

      <Typography variant="body2" sx={{ mb: 2, color: '#a0a0a0' }}>
        Accepted formats: {acceptedFileTypes.join(', ')} • Max size: {maxFileSize}MB
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragActive
            ? '#D4AF37'
            : file
            ? '#4caf50'
            : error
            ? '#f44336'
            : 'rgba(212, 175, 55, 0.3)',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragActive
            ? 'rgba(212, 175, 55, 0.1)'
            : file
            ? 'rgba(76, 175, 80, 0.05)'
            : '#000000',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: disabled ? 0.5 : 1,
          '&:hover': {
            borderColor: disabled ? undefined : '#D4AF37',
            bgcolor: disabled ? undefined : 'rgba(212, 175, 55, 0.05)',
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes.join(',')}
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={disabled}
        />

        {file ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              {uploading ? (
                <InsertDriveFile sx={{ fontSize: 48, color: '#D4AF37' }} />
              ) : (
                <CheckCircle sx={{ fontSize: 48, color: '#4caf50' }} />
              )}
              {!uploading && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  sx={{
                    ml: 2,
                    color: '#ff5555',
                    '&:hover': { bgcolor: 'rgba(255, 85, 85, 0.1)' },
                  }}
                >
                  <Close />
                </IconButton>
              )}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
              {file.name}
            </Typography>

            <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>

            {uploading && (
              <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#D4AF37',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#a0a0a0', mt: 1, display: 'block' }}>
                  Uploading... {progress}%
                </Typography>
              </Box>
            )}

            {!uploading && (
              <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 500 }}>
                ✓ Upload complete
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 64, color: '#D4AF37', mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
              {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
              {acceptedFileTypes.join(', ')} (max {maxFileSize}MB)
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

/**
 * Compact File Upload Button Component
 * For use in forms and toolbars
 */
interface CompactFileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  label?: string;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
}

export function CompactFileUpload({
  onFileSelect,
  acceptedFileTypes = ['.pdf', '.docx', '.txt'],
  maxFileSize = 10,
  label = 'Choose File',
  disabled = false,
  variant = 'contained',
}: CompactFileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return `File size must be under ${maxFileSize}MB`;
      }

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        return `File type must be one of: ${acceptedFileTypes.join(', ')}`;
      }

      return null;
    },
    [acceptedFileTypes, maxFileSize]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const selectedFile = e.target.files?.[0];

      if (!selectedFile) return;

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      onFileSelect(selectedFile);
    },
    [validateFile, onFileSelect]
  );

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />

      <Box
        component="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 3,
          py: 1.5,
          border: variant === 'outlined' ? '1px solid #D4AF37' : 'none',
          borderRadius: 1,
          bgcolor: variant === 'contained' ? '#D4AF37' : 'transparent',
          color: variant === 'contained' ? '#000000' : '#D4AF37',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: variant === 'contained' ? '#D4AF37' : 'rgba(212, 175, 55, 0.1)',
          },
        }}
      >
        <CloudUpload sx={{ fontSize: 20 }} />
        {label}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

/**
 * File Upload with Preview Component
 * Shows thumbnail/icon preview for uploaded files
 */
interface FileUploadWithPreviewProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

export function FileUploadWithPreview({
  onFileSelect,
  onFileRemove,
  acceptedFileTypes = ['.pdf', '.docx', '.txt'],
  maxFileSize = 10,
  multiple = false,
}: FileUploadWithPreviewProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return `${file.name}: File size must be under ${maxFileSize}MB`;
      }

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        return `${file.name}: File type must be one of: ${acceptedFileTypes.join(', ')}`;
      }

      return null;
    },
    [acceptedFileTypes, maxFileSize]
  );

  const handleFilesAdd = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      setError(null);
      const fileArray = Array.from(newFiles);

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      if (multiple) {
        setFiles((prev) => [...prev, ...fileArray]);
        fileArray.forEach(onFileSelect);
      } else {
        setFiles([fileArray[0]]);
        onFileSelect(fileArray[0]);
      }
    },
    [multiple, validateFile, onFileSelect]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      onFileRemove?.();
    },
    [onFileRemove]
  );

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return <InsertDriveFile sx={{ fontSize: 40, color: '#D4AF37' }} />;
  };

  return (
    <Box>
      <EnhancedFileUpload
        onFileSelect={(file) => handleFilesAdd(Object.assign(new DataTransfer(), { files: [file] }).files)}
        onFileRemove={onFileRemove}
        acceptedFileTypes={acceptedFileTypes}
        maxFileSize={maxFileSize}
      />

      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 2 }}>
            Uploaded Files ({files.length})
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {files.map((file, index) => (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  bgcolor: '#0a0a0a',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  width: 150,
                  position: 'relative',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleRemoveFile(index)}
                  sx={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    color: '#ff5555',
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>

                {getFileIcon(file.name)}

                <Typography
                  variant="caption"
                  sx={{
                    mt: 1,
                    color: '#ffffff',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                  }}
                >
                  {file.name}
                </Typography>

                <Typography variant="caption" sx={{ color: '#a0a0a0', mt: 0.5 }}>
                  {(file.size / 1024).toFixed(0)} KB
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
