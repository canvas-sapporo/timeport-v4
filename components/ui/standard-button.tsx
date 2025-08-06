import React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

type StandardButtonType = 'save' | 'create' | 'cancel' | 'reset' | 'submit';

interface StandardButtonProps extends ButtonProps {
  buttonType: StandardButtonType;
  children: React.ReactNode;
}

const buttonConfig = {
  save: {
    className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    outlineClassName: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200',
    disabledClassName: 'bg-gray-400 text-white border-gray-400 opacity-50 cursor-not-allowed',
  },
  create: {
    className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    outlineClassName: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200',
    disabledClassName: 'bg-gray-400 text-white border-gray-400 opacity-50 cursor-not-allowed',
  },
  cancel: {
    className: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
    outlineClassName: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200',
    disabledClassName: 'bg-gray-400 text-white border-gray-400 opacity-50 cursor-not-allowed',
  },
  reset: {
    className: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
    outlineClassName: 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200',
    disabledClassName: 'bg-gray-400 text-white border-gray-400 opacity-50 cursor-not-allowed',
  },
  submit: {
    className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    outlineClassName: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200',
    disabledClassName: 'bg-gray-400 text-white border-gray-400 opacity-50 cursor-not-allowed',
  },
};

export function StandardButton({
  buttonType,
  className,
  disabled = false,
  variant,
  children,
  ...props
}: StandardButtonProps) {
  const config = buttonConfig[buttonType];

  return (
    <Button
      disabled={disabled}
      variant={variant}
      className={cn(
        disabled
          ? config.disabledClassName
          : variant === 'outline'
            ? config.outlineClassName
            : config.className,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
