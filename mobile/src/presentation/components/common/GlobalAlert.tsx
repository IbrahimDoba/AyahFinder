/**
 * GlobalAlert
 * Mount once at the app root. Subscribes to alertStore and renders
 * the CustomAlert modal — no per-screen setup needed.
 */
import React from 'react';
import CustomAlert from './CustomAlert';
import { useAlertStore } from '@/presentation/store/alertStore';

export default function GlobalAlert() {
  const { visible, title, message, type, buttons, hideAlert } = useAlertStore();

  return (
    <CustomAlert
      visible={visible}
      title={title}
      message={message}
      type={type}
      buttons={buttons}
      onClose={hideAlert}
    />
  );
}
