'use client';

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RequestForm = {
  id: string;
  name: string;
  form_config: Array<{
    id: string;
    name: string;
    label: string;
    required?: boolean;
    order: number;
  }>;
};

export const CreateRequestDialog = memo(function CreateRequestDialog({
  isOpen,
  onOpenChange,
  activeRequestForms,
  selectedRequestType,
  setSelectedRequestType,
  formFields,
  renderFormField,
  onDraft,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeRequestForms: RequestForm[];
  selectedRequestType: string;
  setSelectedRequestType: (val: string) => void;
  formFields: RequestForm | undefined;
  renderFormField: (field: any) => JSX.Element;
  onDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="timeport-primary">
          <Plus className="w-4 h-4 mr-2" />
          新規申請
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>新規申請作成</DialogTitle>
          <DialogDescription>
            申請種別を選択し、必要な情報を入力して申請を作成してください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="requestType">申請種別</Label>
            <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="申請種別を選択してください" />
              </SelectTrigger>
              <SelectContent key="request-type-select-content">
                {activeRequestForms.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formFields && (
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
              <h3 className="font-medium text-blue-800 mb-4">{formFields.name}</h3>
              <div className="space-y-4">
                {formFields.form_config
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderFormField(field)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button variant="outline" onClick={onDraft} disabled={!selectedRequestType}>
              下書き
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!selectedRequestType}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              申請する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default CreateRequestDialog;
