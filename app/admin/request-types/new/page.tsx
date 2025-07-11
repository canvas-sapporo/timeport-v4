'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import FormBuilder from '@/components/forms/form-builder';
import { RequestTypeForm } from '@/types';

export default function NewRequestTypePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  const handleSave = async (data: RequestTypeForm) => {
    setIsLoading(true);
    try {
      // In a real app, this would save to backend
      console.log('Creating new request type:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to request types list
      router.push('/admin/request-types');
    } catch (error) {
      console.error('Error creating request type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/request-types');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新規申請フォーム作成</h1>
        <p className="text-gray-600">新しい申請フォームを作成します</p>
      </div>

      <FormBuilder
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}