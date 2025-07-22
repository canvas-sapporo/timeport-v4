'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoComplete?: string;
}

export const PasswordInput = ({
  id,
  label,
  placeholder,
  required,
  className,
  autoComplete,
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('Passw0rd!');

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete || 'current-password'}
          className={`bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 focus:ring-blue-400/20 backdrop-blur-sm pr-12 ${className || ''}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
