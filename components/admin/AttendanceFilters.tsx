'use client';

import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import type { AttendanceStatusData, AttendanceFilters } from '@/schemas/attendance';

interface AdminAttendanceFiltersProps {
  filters: AttendanceFilters;
  onFiltersChangeAction: (filters: AttendanceFilters) => void;
  selectedMonth: string;
  onMonthChangeAction: (month: string) => void;
  users: { id: string; name: string; code?: string }[];
  groups: { id: string; name: string; code?: string }[];
  workTypes: { id: string; name: string }[];
  isLoading?: boolean;
  onResetFilters?: () => void;
}

export default function AdminAttendanceFilters({
  filters,
  onFiltersChangeAction,
  selectedMonth,
  onMonthChangeAction,
  users,
  groups,
  workTypes,
  isLoading = false,
  onResetFilters,
}: AdminAttendanceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string | null) => {
    onFiltersChangeAction({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };

  const handleStatusChange = (status: AttendanceStatusData, checked: boolean) => {
    const statusId = status.id;
    const newStatuses = checked
      ? [...filters.status, statusId]
      : filters.status.filter((s) => s !== statusId);
    onFiltersChangeAction({
      ...filters,
      status: newStatuses,
    });
  };

  const handleOvertimeChange = (value: string) => {
    const hasOvertime = value === 'all' ? null : value === 'true';
    onFiltersChangeAction({
      ...filters,
      hasOvertime,
    });
  };

  const handleWorkTypeChange = (value: string) => {
    const workTypeId = value === 'all' ? null : value;
    onFiltersChangeAction({
      ...filters,
      workTypeId,
    });
  };

  const handleApprovalStatusChange = (value: string) => {
    const approvalStatus = value === 'all' ? null : (value as 'pending' | 'approved' | 'rejected');
    onFiltersChangeAction({
      ...filters,
      approvalStatus,
    });
  };

  const handleUserChange = (value: string) => {
    const userId = value === 'all' ? null : value;
    onFiltersChangeAction({
      ...filters,
      userId,
    });
  };

  const handleGroupChange = (value: string) => {
    const groupId = value === 'all' ? null : value;
    onFiltersChangeAction({
      ...filters,
      groupId,
    });
  };

  const clearFilters = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      onFiltersChangeAction({
        dateRange: { startDate: null, endDate: null },
        status: [],
        hasOvertime: null,
        workTypeId: null,
        approvalStatus: null,
        userId: null,
        groupId: null,
      });
    }
  };

  // アクティブなフィルター数を計算
  const activeFiltersCount =
    (filters.dateRange.startDate ? 1 : 0) +
    (filters.dateRange.endDate ? 1 : 0) +
    filters.status.length +
    (filters.hasOvertime !== null ? 1 : 0) +
    (filters.workTypeId ? 1 : 0) +
    (filters.approvalStatus ? 1 : 0) +
    (filters.userId ? 1 : 0) +
    (filters.groupId ? 1 : 0);

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">フィルター</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}件適用中
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                クリア
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  折りたたむ
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  展開
                </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* 月選択フィルター */}
            <div>
              <Label htmlFor="month-selector" className="text-sm font-medium text-gray-700">
                月選択
              </Label>
              <div className="flex items-center space-x-2 mt-1">
                <Filter className="w-4 h-4 text-gray-500" />
                <Input
                  id="month-selector"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => onMonthChangeAction(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>

            {/* 日付範囲フィルター */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">
                  開始日
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.dateRange.startDate || ''}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium text-gray-700">
                  終了日
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.dateRange.endDate || ''}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value || null)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* メンバーフィルター */}
            <div>
              <Label htmlFor="user-filter" className="text-sm font-medium text-gray-700">
                メンバー
              </Label>
              <Combobox
                options={[
                  { value: 'all', label: '全メンバー' },
                  ...users.map((user) => ({
                    value: user.id,
                    label: user.name,
                    code: user.code,
                  })),
                ]}
                value={filters.userId || 'all'}
                onValueChange={handleUserChange}
                placeholder="メンバーを選択"
                emptyText="該当するメンバーがありません"
                className="mt-1"
              />
            </div>

            {/* グループフィルター */}
            <div>
              <Label htmlFor="group-filter" className="text-sm font-medium text-gray-700">
                グループ
              </Label>
              <Combobox
                options={[
                  { value: 'all', label: '全グループ' },
                  ...groups.map((group) => ({
                    value: group.id,
                    label: group.name,
                    code: group.code,
                  })),
                ]}
                value={filters.groupId || 'all'}
                onValueChange={handleGroupChange}
                placeholder="グループを選択"
                emptyText="該当するグループがありません"
                className="mt-1"
              />
            </div>

            {/* ステータスフィルター */}
            <div>
              <Label className="text-sm font-medium text-gray-700">ステータス</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value: 'normal', label: '正常' },
                  { value: 'late', label: '遅刻' },
                  { value: 'early_leave', label: '早退' },
                  { value: 'absent', label: '欠勤' },
                ].map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={filters.status.includes(status.value)}
                      onCheckedChange={(checked) =>
                        handleStatusChange(
                          { id: status.value, name: status.value } as AttendanceStatusData,
                          checked as boolean
                        )
                      }
                    />
                    <Label
                      htmlFor={`status-${status.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 残業フィルター */}
            <div>
              <Label htmlFor="overtime-filter" className="text-sm font-medium text-gray-700">
                残業
              </Label>
              <Select
                value={filters.hasOvertime === null ? 'all' : filters.hasOvertime.toString()}
                onValueChange={handleOvertimeChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="残業を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="true">残業あり</SelectItem>
                  <SelectItem value="false">残業なし</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 勤務形態フィルター */}
            <div>
              <Label htmlFor="work-type-filter" className="text-sm font-medium text-gray-700">
                勤務形態
              </Label>
              <Select value={filters.workTypeId || 'all'} onValueChange={handleWorkTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {workTypes.map((workType) => (
                    <SelectItem key={workType.id} value={workType.id}>
                      {workType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 承認状態フィルター */}
            <div>
              <Label htmlFor="approval-filter" className="text-sm font-medium text-gray-700">
                承認状態
              </Label>
              <Select
                value={filters.approvalStatus || 'all'}
                onValueChange={handleApprovalStatusChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="承認状態を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="pending">承認待ち</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
