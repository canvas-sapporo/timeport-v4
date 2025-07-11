'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import FormBuilder from '@/components/forms/form-builder';
import { RequestType } from '@/types';

export default function EditRequestTypePage() {
  const { user } = useAuth();
  const { requestTypes } = useData();
  const params = useParams();
  const router = useRouter();
  const [requestType, setRequestType] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestTypeId = params.id as string;

  useEffect(() => {
    const type = requestTypes.find(t => t.id === requestTypeId);
    if (type) {
      setRequestType(type);
    } else {
      router.push('/admin/request-types');
    }
  }, [requestTypeId, requestTypes, router]);

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  if (!requestType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const initialData: RequestType = {
    id: requestType.id,
    name: requestType.name,
    description: requestType.description || '',
    code: requestType.code,
    formFields: requestType.formFields.map((field: any) => ({
      ...field,
      isNew: false
    })),
    isActive: requestType.isActive,
    createdAt: requestType.createdAt,
    updatedAt: requestType.updatedAt
  };

  const handleSave = async (data: RequestType) => {
    setIsLoading(true);
    try {
      // In a real app, this would update the backend
      console.log('Updating request type:', requestTypeId, data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to request type detail
      router.push(`/admin/request-types/${requestTypeId}`);
    } catch (error) {
      console.error('Error updating request type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/request-types/${requestTypeId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">申請フォーム編集</h1>
        <p className="text-gray-600">「{requestType.name}」を編集します</p>
      </div>

      <FormBuilder
        initialData={initialData}
        onSaveAction={handleSave}
        onCancelAction={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}