'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { RequestForm } from '@/types/request';

interface RequestFormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestForm: RequestForm | null;
}

export default function RequestFormPreviewDialog({
  open,
  onOpenChange,
  requestForm,
}: RequestFormPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');

  if (!requestForm) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>申請フォームプレビュー: {requestForm.name}</DialogTitle>
          <DialogDescription>
            申請フォームの基本情報、フォーム項目、承認フローをプレビューできます。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="form">フォームプレビュー</TabsTrigger>
            <TabsTrigger value="approval">承認フロー</TabsTrigger>
          </TabsList>

          {/* 基本情報タブ */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">申請フォーム名</label>
                    <p className="mt-1 font-medium">{requestForm.name}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">説明</label>
                  <p className="mt-1 text-gray-700">{requestForm.description || '説明なし'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">カテゴリ</label>
                    <div className="mt-1">
                      <Badge variant="secondary">{requestForm.category}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">表示順序</label>
                    <p className="mt-1">{requestForm.display_order}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">ステータス</label>
                  <div className="mt-1">
                    <Badge variant={requestForm.is_active ? 'default' : 'secondary'}>
                      {requestForm.is_active ? '有効' : '無効'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-600">作成日</label>
                    <p className="mt-1">
                      {requestForm.created_at
                        ? new Date(requestForm.created_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-600">更新日</label>
                    <p className="mt-1">
                      {requestForm.updated_at
                        ? new Date(requestForm.updated_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* フォームプレビュータブ */}
          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>フォーム項目 ({requestForm.form_config.length}項目)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requestForm.form_config.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      フォーム項目が設定されていません
                    </p>
                  ) : (
                    requestForm.form_config
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div key={field.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{field.type}</Badge>
                              <span className="font-medium">{field.label}</span>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">
                                  必須
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {field.width === 'full' ? '全幅' : '半幅'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                          {field.options && field.options.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">選択肢: </span>
                              {field.options.join(', ')}
                            </div>
                          )}
                          {field.validation_rules && field.validation_rules.length > 0 && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">バリデーション: </span>
                              {field.validation_rules.map((rule, index) => (
                                <span key={index}>
                                  {rule.type} {rule.value}
                                  {index < field.validation_rules.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 承認フロータブ */}
          <TabsContent value="approval" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>承認フロー ({requestForm.approval_flow.length}ステップ)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requestForm.approval_flow.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">承認フローが設定されていません</p>
                  ) : (
                    requestForm.approval_flow
                      .sort((a, b) => a.step - b.step)
                      .map((step) => (
                        <div key={step.step} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">ステップ{step.step}</Badge>
                              <span className="font-medium">{step.name}</span>
                              {step.required && (
                                <Badge variant="destructive" className="text-xs">
                                  必須
                                </Badge>
                              )}
                              {!step.required && (
                                <Badge variant="secondary" className="text-xs">
                                  任意
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {step.approver_role}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                          {step.auto_approve && (
                            <Badge variant="outline" className="text-xs">
                              自動承認
                            </Badge>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
