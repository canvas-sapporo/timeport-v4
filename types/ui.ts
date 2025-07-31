// TimePort UI関連型定義

import type { ReactNode } from 'react';

// UUID型は現在使用されていないため、コメントアウト
// import type { UUID } from './database';

// ================================
// 基本UI型
// ================================

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';
export type Position = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type Alignment = 'start' | 'center' | 'end' | 'stretch';

// ================================
// レイアウト関連型
// ================================

export interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  badge?: string | number;
  icon?: ReactNode;
}

// ================================
// テーブル関連型
// ================================

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  className?: string;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationProps;
  selection?: TableSelectionProps<T>;
  sorting?: TableSortingProps;
  filtering?: TableFilteringProps;
  className?: string;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
}

export interface TableSelectionProps<T = Record<string, unknown>> {
  type: 'checkbox' | 'radio';
  selectedRowKeys: string[];
  onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean };
}

export interface TableSortingProps {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export interface TableFilteringProps {
  filters: Record<string, unknown>;
  onChange: (filters: Record<string, unknown>) => void;
}

// ================================
// ページネーション関連型
// ================================

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  onChange: (page: number, pageSize: number) => void;
  className?: string;
}

// ================================
// フォーム関連型
// ================================

export interface FormItemProps {
  label?: string;
  required?: boolean;
  error?: string;
  help?: string;
  className?: string;
  children: ReactNode;
}

export interface InputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  size?: Size;
  variant?: Variant;
  error?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  value?: string | number | Array<string | number>;
  defaultValue?: string | number | Array<string | number>;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: Size;
  variant?: Variant;
  error?: boolean;
  options: SelectOption[];
  onChange?: (value: string | number | Array<string | number>) => void;
  onSearch?: (search: string) => void;
  className?: string;
}

// ================================
// モーダル・ダイアログ関連型
// ================================

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: Size;
  closable?: boolean;
  maskClosable?: boolean;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  loading?: boolean;
}

// ================================
// 通知関連型
// ================================

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

// ================================
// カード関連型
// ================================

export interface CardProps {
  title?: string;
  subtitle?: string;
  extra?: ReactNode;
  cover?: ReactNode;
  actions?: ReactNode[];
  loading?: boolean;
  hoverable?: boolean;
  className?: string;
  children: ReactNode;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
  className?: string;
}

// ================================
// チャート関連型
// ================================

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  loading?: boolean;
  className?: string;
}

export interface LineChartProps extends ChartProps {
  smooth?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
}

export interface BarChartProps extends ChartProps {
  horizontal?: boolean;
  stacked?: boolean;
}

export interface PieChartProps extends ChartProps {
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
}

// ================================
// ステップ・ウィザード関連型
// ================================

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  status?: 'wait' | 'process' | 'finish' | 'error';
  disabled?: boolean;
}

export interface StepsProps {
  current: number;
  steps: StepItem[];
  direction?: 'horizontal' | 'vertical';
  size?: Size;
  onChange?: (current: number) => void;
  className?: string;
}

export interface WizardProps {
  steps: Array<{
    id: string;
    title: string;
    content: ReactNode;
    canProceed?: boolean;
  }>;
  current: number;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

// ================================
// フィルター関連型
// ================================

export interface FilterItem {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'numberRange';
  options?: SelectOption[];
  placeholder?: string;
  defaultValue?: unknown;
}

export interface FilterBarProps {
  filters: FilterItem[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onReset: () => void;
  className?: string;
}

// ================================
// 検索関連型
// ================================

export interface SearchProps {
  value?: string;
  placeholder?: string;
  size?: Size;
  loading?: boolean;
  onSearch: (value: string) => void;
  onChange?: (value: string) => void;
  className?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResultsProps {
  results: SearchResult[];
  loading?: boolean;
  onSelect: (result: SearchResult) => void;
  className?: string;
}

// ================================
// ドラッグ&ドロップ関連型
// ================================

export interface DragItem {
  id: string;
  type: string;
  data: unknown;
}

export interface DropZoneProps {
  accept?: string[];
  multiple?: boolean;
  disabled?: boolean;
  onDrop: (files: File[]) => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  className?: string;
  children: ReactNode;
}

// ================================
// 時間関連型
// ================================

export interface TimePickerProps {
  value?: string;
  defaultValue?: string;
  format?: string;
  disabled?: boolean;
  size?: Size;
  onChange?: (value: string) => void;
  className?: string;
}

export interface DatePickerProps {
  value?: string;
  defaultValue?: string;
  format?: string;
  disabled?: boolean;
  size?: Size;
  showTime?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export interface DateRangePickerProps {
  value?: [string, string];
  defaultValue?: [string, string];
  format?: string;
  disabled?: boolean;
  size?: Size;
  onChange?: (value: [string, string]) => void;
  className?: string;
}

// ================================
// プログレス関連型
// ================================

export interface ProgressProps {
  percent: number;
  size?: Size;
  status?: 'normal' | 'success' | 'error';
  showInfo?: boolean;
  strokeColor?: string;
  className?: string;
}

export interface LoadingProps {
  spinning?: boolean;
  size?: Size;
  tip?: string;
  className?: string;
  children?: ReactNode;
}

// ================================
// アバター関連型
// ================================

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: Size;
  shape?: 'circle' | 'square';
  fallback?: string;
  className?: string;
}

export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: string;
  }>;
  max?: number;
  size?: Size;
  className?: string;
}

// ================================
// バッジ関連型
// ================================

export interface BadgeProps {
  count?: number;
  text?: string;
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  showZero?: boolean;
  className?: string;
  children?: ReactNode;
}

// ================================
// ツールチップ関連型
// ================================

export interface TooltipProps {
  title: string;
  placement?: Position;
  trigger?: 'hover' | 'click' | 'focus';
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  className?: string;
  children: ReactNode;
}

// ================================
// メニュー関連型
// ================================

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  children?: MenuItem[];
  onClick?: () => void;
}

export interface MenuProps {
  items: MenuItem[];
  selectedKeys?: string[];
  openKeys?: string[];
  mode?: 'horizontal' | 'vertical' | 'inline';
  theme?: 'light' | 'dark';
  onSelect?: (key: string) => void;
  onOpenChange?: (openKeys: string[]) => void;
  className?: string;
}

// ================================
// レスポンシブ関連型
// ================================

export interface Breakpoint {
  xs?: boolean | number;
  sm?: boolean | number;
  md?: boolean | number;
  lg?: boolean | number;
  xl?: boolean | number;
  xxl?: boolean | number;
}

export interface ResponsiveProps {
  breakpoint: Breakpoint;
  children: ReactNode;
}
