/**
 * useCustomAlert Hook
 * Provides a custom alert that replaces React Native's Alert.alert()
 *
 * Usage:
 * const { showAlert, AlertComponent } = useCustomAlert();
 *
 * // Show alert
 * showAlert({
 *   title: 'Success',
 *   message: 'Operation completed!',
 *   type: 'success',
 *   buttons: [{ text: 'OK' }]
 * });
 *
 * // Add AlertComponent to your screen's return
 * return (
 *   <View>
 *     {/* your content *\/}
 *     <AlertComponent />
 *   </View>
 * );
 */
import React, { useState, useCallback } from 'react';
import CustomAlert from '../components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'info' | 'success' | 'error' | 'warning';
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<AlertOptions & { visible: boolean }>({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
    type: 'info',
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      buttons: options.buttons || [{ text: 'OK' }],
      type: options.type || 'info',
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(() => (
    <CustomAlert
      visible={alertState.visible}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons}
      type={alertState.type}
      onClose={hideAlert}
    />
  ), [alertState, hideAlert]);

  return {
    showAlert,
    hideAlert,
    AlertComponent,
  };
}
