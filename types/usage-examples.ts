/**
 * 新しい型定義の使用例
 *
 * any型を具体的な型に置き換える例を示します
 */

import type {
  FormConfigItem,
  ApprovalFlowItem,
  ErrorData,
  DynamicFormData,
  SettingsData,
} from '@/types/dynamic-data';

// ================================
// 使用例1: フォームデータ
// ================================

// Before: any型
// const formData: any = {
//   name: "田中太郎",
//   age: 30,
//   isActive: true,
//   hobbies: ["読書", "旅行"]
// };

// After: 具体的な型
const formData: DynamicFormData = {
  name: '田中太郎',
  age: 30,
  isActive: true,
  hobbies: ['読書', '旅行'],
};

// ================================
// 使用例2: 設定データ
// ================================

// Before: any型
// const settings: any = {
//   theme: "dark",
//   language: "ja",
//   notifications: true,
//   features: ["attendance", "requests"]
// };

// After: 具体的な型
const settings: SettingsData = {
  name: '田中太郎',
  age: 30,
  isActive: true,
  hobbies: ['読書', '旅行'],
};

// ================================
// 使用例3: フォーム設定
// ================================

// Before: any型
// const formConfig: any[] = [
//   {
//     field_name: "name",
//     field_type: "text",
//     required: true
//   }
// ];

// After: 具体的な型
const formConfig: FormConfigItem[] = [
  {
    field_name: 'name',
    field_type: 'text',
    required: true,
    default_value: '',
    validation_rules: [{ type: 'required', message: '名前は必須です' }],
  },
];

// ================================
// 使用例4: 承認フロー
// ================================

// Before: any型
// const approvalFlow: any[] = [
//   {
//     step: 1,
//     name: "直属上司承認",
//     required: true
//   }
// ];

// After: 具体的な型
const approvalFlow: ApprovalFlowItem[] = [
  {
    step: 1,
    name: '直属上司承認',
    approver_role: 'manager',
    required: true,
    conditions: [{ field: 'amount', operator: 'greater_than', value: 10000 }],
  },
];

// ================================
// 使用例5: エラーデータ
// ================================

// Before: any型
// const error: any = {
//   message: "バリデーションエラー",
//   field: "email"
// };

// After: 具体的な型
const error: ErrorData = {
  message: 'バリデーションエラー',
  code: 'VALIDATION_ERROR',
  field: 'email',
  details: {
    expected: 'email format',
    received: 'invalid-email',
  },
};

// ================================
// 使用例6: データベース行
// ================================

// Before: any型
// const userRow: any = {
//   id: "123",
//   name: "田中太郎",
//   created_at: "2024-01-01"
// };

// After: 具体的な型
const userRow: FormConfigItem = {
  field_name: 'name',
  field_type: 'text',
  required: true,
  default_value: '',
  validation_rules: [{ type: 'required', message: '名前は必須です' }],
};

// ================================
// 使用例7: 統計データ
// ================================

// Before: any型
// const stats: any[] = [
//   {
//     name: "月次勤怠時間",
//     value: 160
//   }
// ];

// After: 具体的な型
const stats: SettingsData[] = [
  {
    name: '月次勤怠時間',
    value: 160,
    unit: '時間',
    period: '2024-01',
    previous_value: 158,
    change_rate: 1.27,
  },
];

// ================================
// 関数の例
// ================================

// Before: any型
// function processFormData(data: any): any {
//   return {
//     success: true,
//     data: data
//   };
// }

// After: 具体的な型
function processFormData(data: DynamicFormData): { success: boolean; data: DynamicFormData } {
  return {
    success: true,
    data: data,
  };
}

// Before: any型
// function validateSettings(settings: any): any {
//   const errors: any[] = [];
//   if (!settings.theme) {
//     errors.push({ field: "theme", message: "テーマは必須です" });
//   }
//   return errors;
// }

// After: 具体的な型
function validateSettings(settings: SettingsData): ErrorData[] {
  const errors: ErrorData[] = [];
  if (!settings.theme) {
    errors.push({
      message: 'テーマは必須です',
      field: 'theme',
      code: 'REQUIRED_FIELD',
    });
  }
  return errors;
}
