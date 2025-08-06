import React from 'react';
import { Button, ButtonProps } from './button';
import { Eye, Edit, Send, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionType = 'view' | 'edit' | 'submit' | 'delete' | 'approve' | 'reject';

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  action: ActionType;
  disabled?: boolean;
  children?: React.ReactNode;
}

const actionConfig = {
  view: {
    icon: Eye,
    className: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: 'プレビュー',
  },
  edit: {
    icon: Edit,
    className: 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: '編集',
  },
  submit: {
    icon: Send,
    className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: '申請',
  },
  delete: {
    icon: Trash2,
    className: 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: '削除',
  },
  approve: {
    icon: Check,
    className: 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: '承認',
  },
  reject: {
    icon: X,
    className: 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200',
    disabledClassName: 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed',
    tooltip: '却下',
  },
};

export function ActionButton({
  action,
  disabled = false,
  className,
  children,
  ...props
}: ActionButtonProps) {
  const config = actionConfig[action];
  const IconComponent = config.icon;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(disabled ? config.disabledClassName : config.className, className)}
      {...props}
    >
      {children || <IconComponent className="w-4 h-4" />}
    </Button>
  );
}
