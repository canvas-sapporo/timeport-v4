'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import FormBuilder from '@/components/forms/form-builder';
import { FormFieldConfig, RequestForm } from '@/schemas/request';

export default function EditRequestTypePage() {
  const { user } = useAuth();
  const { requestForms } = useData();
  const params = useParams();
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);

  const requestTypeId = params.id as string;

  useEffect(() => {
    const type = requestForms.find((t) => t.id === requestTypeId);
    if (type) {
      setRequestType(type);
      setFormConfig(
        type.form_config.map((field: FormFieldConfig) => ({
          ...field,
          isNew: false,
        }))
      );
    } else {
      router.push('/admin/request-forms');
    }
  }, [requestTypeId, requestForms, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!requestType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      // In a real app, this would update the backend
      console.log('Updating request type:', requestTypeId, {
        ...requestType,
        form_config: formConfig,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect to request form detail
      router.push(`/admin/request-forms/${requestTypeId}`);
    } catch (error) {
      console.error('Error updating request type:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    router.push(`/admin/request-forms/${requestTypeId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">申請フォーム編集</h1>
        <p className="text-gray-600">「{requestType.name}」を編集します</p>
      </div>

      <FormBuilder formConfig={formConfig} onFormConfigChangeAction={setFormConfig} />

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
