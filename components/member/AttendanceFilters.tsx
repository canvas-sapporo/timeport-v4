'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AttendanceFilters, AttendanceStatus } from '@/types/attendance';

interface WorkType {
  id: string;
  name: string;
}

interface AttendanceFiltersProps {
  filters: AttendanceFilters;
  onFiltersChange: (filters: AttendanceFilters) => void;
  workTypes: WorkType[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  isLoading?: boolean;
}

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'bg-green-100 text-green-800' },
  { value: 'late', label: '遅刻', color: 'bg-red-100 text-red-800' },
  { value: 'early_leave', label: '早退', color: 'bg-orange-100 text-orange-800' },
  { value: 'absent', label: '欠勤', color: 'bg-gray-100 text-gray-800' },
];

export default function AttendanceFilters({
  filters,
  onFiltersChange,
  workTypes,
  selectedMonth,
  onMonthChange,
  isLoading = false,
}: AttendanceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value || null,
      },
    });
  };

  const handleStatusChange = (status: AttendanceStatus, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);

    onFiltersChange({
      ...filters,
      status: newStatus,
    });
  };

  const handleOvertimeChange = (value: string) => {
    const hasOvertime =
      value === 'true' ? true : value === 'false' ? false : value === 'all' ? null : null;
    onFiltersChange({
      ...filters,
      hasOvertime,
    });
  };

  const handleWorkTypeChange = (workTypeId: string) => {
    onFiltersChange({
      ...filters,
      workTypeId: workTypeId === 'all' ? null : workTypeId,
    });
  };

  const handleApprovalStatusChange = (status: string) => {
    const approvalStatus =
      status === 'all' ? null : (status as 'pending' | 'approved' | 'rejected');
    onFiltersChange({
      ...filters,
      approvalStatus,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateRange: { startDate: null, endDate: null },
      status: [],
      hasOvertime: null,
      workTypeId: null,
      approvalStatus: null,
    });
  };

  const hasActiveFilters =
    filters.dateRange.startDate ||
    filters.dateRange.endDate ||
    filters.status.length > 0 ||
    filters.hasOvertime !== null ||
    filters.workTypeId ||
    filters.approvalStatus;

  const getFilterSummary = () => {
    const parts = [];

    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const start = filters.dateRange.startDate || '';
      const end = filters.dateRange.endDate || '';
      parts.push(`${start}${start && end ? '〜' : ''}${end}`);
    }

    if (filters.status.length > 0) {
      const statusLabels = filters.status
        .map((s) => statusOptions.find((opt) => opt.value === s)?.label)
        .filter(Boolean);
      parts.push(statusLabels.join(', '));
    }

    if (filters.hasOvertime === true) parts.push('残業あり');
    if (filters.hasOvertime === false) parts.push('残業なし');

    if (filters.workTypeId) {
      const workType = workTypes.find((wt) => wt.id === filters.workTypeId);
      if (workType) parts.push(workType.name);
    }

    if (filters.approvalStatus) {
      const approvalLabels = {
        pending: '承認待ち',
        approved: '承認済み',
        rejected: '却下',
      };
      parts.push(approvalLabels[filters.approvalStatus]);
    }

    return parts.join(' | ');
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">フィルター</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filters.status.length +
                  (filters.hasOvertime !== null ? 1 : 0) +
                  (filters.workTypeId ? 1 : 0) +
                  (filters.approvalStatus ? 1 : 0)}
                件適用中
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
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

        {hasActiveFilters && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">適用中フィルター:</span> {getFilterSummary()}
            </div>
          </div>
        )}

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
                  onChange={(e) => onMonthChange(e.target.value)}
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
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
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
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* ステータスフィルター */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">ステータス</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleStatusChange(option.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={`status-${option.value}`} className="text-sm cursor-pointer">
                      {option.label}
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
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="true">残業あり</SelectItem>
                  <SelectItem value="false">残業なし</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 勤務タイプフィルター */}
            <div>
              <Label htmlFor="work-type-filter" className="text-sm font-medium text-gray-700">
                勤務タイプ
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
              <Label htmlFor="approval-status-filter" className="text-sm font-medium text-gray-700">
                承認状態
              </Label>
              <Select
                value={filters.approvalStatus || 'all'}
                onValueChange={handleApprovalStatusChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">承認待ち</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="rejected">却下</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
