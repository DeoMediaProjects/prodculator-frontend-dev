import { ReactNode } from 'react';
import { useSnackbar, SnackbarKey } from 'notistack';

type ToastAction = ReactNode | ((key: SnackbarKey) => ReactNode);

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

export function useToast() {
  const { enqueueSnackbar } = useSnackbar();

  const showError = (message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: 'error',
      autoHideDuration: options?.duration ?? 6000,
      ...(options?.action ? { action: options.action } : {}),
    });
  };

  const showSuccess = (message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: 'success',
      autoHideDuration: options?.duration ?? 4000,
      ...(options?.action ? { action: options.action } : {}),
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: 'info',
      autoHideDuration: options?.duration ?? 5000,
      ...(options?.action ? { action: options.action } : {}),
    });
  };

  return { showError, showSuccess, showInfo };
}
