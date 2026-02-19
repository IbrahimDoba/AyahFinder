/**
 * Global Alert Store
 * Call showAlert() from anywhere — screens, stores, services.
 * A single <GlobalAlert /> at the root renders it.
 */
import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  buttons?: AlertButton[];
}

interface AlertState extends AlertOptions {
  visible: boolean;
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>(set => ({
  visible: false,
  title: '',
  message: undefined,
  type: 'info',
  buttons: [{ text: 'OK' }],

  showAlert: (options: AlertOptions) =>
    set({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type ?? 'info',
      buttons: options.buttons ?? [{ text: 'OK' }],
    }),

  hideAlert: () => set({ visible: false }),
}));

/** Convenience helper — callable outside React (e.g. from stores/services) */
export const showAlert = (options: AlertOptions) =>
  useAlertStore.getState().showAlert(options);
