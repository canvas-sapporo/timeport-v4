'use client';

import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, Trash2, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApprovalStep } from '@/types/request';
import { getApprovers } from '@/lib/actions/admin/users';

interface ApprovalFlowBuilderProps {
  approvalFlow: ApprovalStep[];
  onApprovalFlowChange: (flow: ApprovalStep[]) => void;
}

interface Approver {
  id: string;
  first_name: string;
  family_name: string;
  email: string;
  role: string;
}

export default function ApprovalFlowBuilder({
  approvalFlow,
  onApprovalFlowChange,
}: ApprovalFlowBuilderProps) {
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const [stepSettingsOpen, setStepSettingsOpen] = useState(false);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);

  // 承認者一覧を取得
  useEffect(() => {
    const fetchApprovers = async () => {
      setIsLoadingApprovers(true);
      try {
        const result = await getApprovers();
        if (result.success && result.data) {
          setApprovers(result.data as Approver[]);
        }
      } catch (error) {
        console.error('承認者取得エラー:', error);
      } finally {
        setIsLoadingApprovers(false);
      }
    };

    fetchApprovers();
  }, []);

  // ステップを追加
  const addStep = useCallback(() => {
    const newStep: ApprovalStep = {
      step: approvalFlow.length + 1,
      name: '',
      description: '',
      approver_role: '',
      approver_id: '',
      required: true,
      auto_approve: false,
    };

    const newFlow = [...approvalFlow, newStep];
    onApprovalFlowChange(newFlow);
    setSelectedStep(newStep);
    setStepSettingsOpen(true);
  }, [approvalFlow, onApprovalFlowChange]);

  // ステップを削除
  const removeStep = useCallback(
    (stepNumber: number) => {
      const newFlow = approvalFlow
        .filter((step) => step.step !== stepNumber)
        .map((step, index) => ({
          ...step,
          step: index + 1,
        }));
      onApprovalFlowChange(newFlow);
    },
    [approvalFlow, onApprovalFlowChange]
  );

  // ステップを編集
  const editStep = useCallback((step: ApprovalStep, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedStep(step);
    setStepSettingsOpen(true);
  }, []);

  // ステップ設定を保存
  const saveStepSettings = useCallback(
    (updatedStep: ApprovalStep) => {
      const newFlow = approvalFlow.map((step) =>
        step.step === updatedStep.step ? updatedStep : step
      );
      onApprovalFlowChange(newFlow);
      setStepSettingsOpen(false);
      setSelectedStep(null);
    },
    [approvalFlow, onApprovalFlowChange]
  );

  // ドラッグ&ドロップ処理
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(approvalFlow);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // ステップ番号を更新
      const newFlow = items.map((item, index) => ({
        ...item,
        step: index + 1,
      }));

      onApprovalFlowChange(newFlow);
    },
    [approvalFlow, onApprovalFlowChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">承認フロー設定</h4>
        <Button onClick={addStep} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          ステップ追加
        </Button>
      </div>

      {approvalFlow.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">承認フローが設定されていません</p>
          <Button onClick={addStep}>最初のステップを追加</Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="approval-flow">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {approvalFlow.map((step, index) => (
                  <Draggable key={step.step} draggableId={step.step.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <Badge variant="outline">ステップ{step.step}</Badge>
                            <span className="font-medium">{step.name || '未設定'}</span>
                            <Badge variant="secondary" className="text-xs">
                              {step.approver_role || '承認者未設定'}
                            </Badge>
                            {step.required ? (
                              <Badge variant="destructive" className="text-xs">
                                必須
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                任意
                              </Badge>
                            )}
                            {step.auto_approve && (
                              <Badge variant="outline" className="text-xs">
                                自動承認
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={(e) => editStep(step, e)}>
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStep(step.step);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* ステップ設定ダイアログ */}
      <Dialog open={stepSettingsOpen} onOpenChange={setStepSettingsOpen}>
        <DialogContent
          className="max-w-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>ステップ設定</DialogTitle>
            <DialogDescription>承認ステップの詳細設定を行います。</DialogDescription>
          </DialogHeader>
          {selectedStep && (
            <StepSettingsForm
              step={selectedStep}
              approvers={approvers}
              isLoadingApprovers={isLoadingApprovers}
              onSave={saveStepSettings}
              onCancel={() => setStepSettingsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StepSettingsFormProps {
  step: ApprovalStep;
  approvers: Approver[];
  isLoadingApprovers: boolean;
  onSave: (step: ApprovalStep) => void;
  onCancel: () => void;
}

const StepSettingsForm = ({
  step,
  approvers,
  isLoadingApprovers,
  onSave,
  onCancel,
}: StepSettingsFormProps) => {
  const [formData, setFormData] = useState<ApprovalStep>(step);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div>
        <Label htmlFor="step-name">ステップ名 *</Label>
        <Input
          id="step-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例: 直属上司承認"
          required
        />
      </div>

      <div>
        <Label htmlFor="step-description">説明</Label>
        <Textarea
          id="step-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="ステップの説明を入力してください"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="approver">承認者 *</Label>
        <Select
          value={formData.approver_id || ''}
          onValueChange={(value) => {
            const selectedApprover = approvers.find((a) => a.id === value);
            setFormData({
              ...formData,
              approver_id: value,
              approver_role: selectedApprover
                ? `${selectedApprover.family_name} ${selectedApprover.first_name}`
                : '',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="承認者を選択" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingApprovers ? (
              <SelectItem value="" disabled>
                読み込み中...
              </SelectItem>
            ) : approvers.length === 0 ? (
              <SelectItem value="" disabled>
                承認者が見つかりません
              </SelectItem>
            ) : (
              approvers.map((approver) => (
                <SelectItem key={approver.id} value={approver.id}>
                  {approver.family_name} {approver.first_name} ({approver.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={formData.required}
          onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
        />
        <Label htmlFor="required">必須ステップ</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="auto-approve"
          checked={formData.auto_approve}
          onCheckedChange={(checked) => setFormData({ ...formData, auto_approve: checked })}
        />
        <Label htmlFor="auto-approve">自動承認</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="button" onClick={handleSubmit}>
          保存
        </Button>
      </div>
    </form>
  );
};
