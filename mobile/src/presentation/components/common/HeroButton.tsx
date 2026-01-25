/**
 * HeroButton Component
 * Wrapper around HeroUI Native Button with app-specific styling
 */
import React from 'react';
import { Button } from 'heroui-native';
import type { ButtonProps } from 'heroui-native';

interface HeroButtonProps extends Omit<ButtonProps, 'children'> {
  title: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function HeroButton({
  title,
  loading = false,
  icon,
  variant = 'primary',
  size = 'md',
  ...props
}: HeroButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading || props.disabled}
      {...props}
    >
      {icon}
      <Button.Label>{loading ? 'Loading...' : title}</Button.Label>
    </Button>
  );
}
