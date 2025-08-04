'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface ColumnOption {
  key: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnOption[];
  visibleColumns: string[];
  onApply: (visibleColumns: string[]) => void;
  onReset: () => void;
}

export const ColumnSettingsDialog = ({
  open,
  onOpenChange,
  columns,
  visibleColumns,
  onApply,
  onReset,
}: ColumnSettingsDialogProps) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns((prev) => [...prev, columnKey]);
    } else {
      setSelectedColumns((prev) => prev.filter((key) => key !== columnKey));
    }
  };

  const handleApply = () => {
    onApply(selectedColumns);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultVisibleColumns = columns.filter((col) => col.defaultVisible).map((col) => col.key);
    setSelectedColumns(defaultVisibleColumns);
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            表示項目設定
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>テーブルに表示する項目を選択してください</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {columns.map((column) => (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={column.key}
                checked={selectedColumns.includes(column.key)}
                onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
              />
              <Label
                htmlFor={column.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {column.label}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            初期設定に戻す
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 mr-2" />
            適用
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
