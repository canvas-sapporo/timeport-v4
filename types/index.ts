// TimePort 型定義

export interface Company {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  level: number;
  path: string;
  createdAt: string;
  updatedAt: string;
}

// 後方互換性のため残す（段階的移行用）
export interface Workplace extends Group {}
export interface Department extends Group {}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'member';
  groupId: string;
  hireDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'datetime-local' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  validationRules: ValidationRules;
  options?: string[];
  order: number;
}

export interface RequestType {
  id: string;
  code: string;
  name: string;
  description?: string;
  formFields: FormField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Request {
  id: string;
  userId: string;
  requestTypeId: string;
  title: string;
  formData: Record<string, any>;
  targetDate?: string;
  startDate?: string;
  endDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  workDate: string;
  clockInTime?: string;
  clockOutTime?: string;
  breakRecords: Array<{start: string, end: string}>;
  actualWorkMinutes?: number;
  overtimeMinutes: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureSetting {
  id: string;
  featureCode: string;
  featureName: string;
  isEnabled: boolean;
  groupType: 'company' | 'workplace' | 'department' | 'user';
  groupId: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'member';
  groupId: string;
}

// フォームビルダー用の型
export interface FormBuilderField extends Omit<FormField, 'id'> {
  id?: string;
  isNew?: boolean;
}

export interface RequestTypeForm {
  name: string;
  description: string;
  code: string;
  formFields: FormBuilderField[];
  isActive: boolean;
}

// API レスポンス型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// フィルター・検索用の型
export interface AttendanceFilter {
  userId?: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface RequestFilter {
  userId?: string;
  requestTypeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserFilter {
  groupId?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
}