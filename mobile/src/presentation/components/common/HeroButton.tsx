import React from 'react';
import { Button } from './Button';

interface HeroButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
  icon?: React.ReactNode;
}

export function HeroButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  icon,
}: HeroButtonProps) {
  // Map 'secondary' to our outline/secondary style if needed
  // In our Button.tsx, 'secondary' is green outline.

  return (
    <Button
      title={title}
      onPress={onPress}
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled}
      style={style}
      icon={icon}
    />
  );
}
