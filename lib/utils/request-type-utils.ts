/**
 * 申請種別関連のユーティリティ関数
 */

import type { FormFieldConfig, ApprovalStep } from '@/types/request';

// ================================
// フォーム設定関連
// ================================

/**
 * フォーム設定を検証
 */
export const validateFormConfig = (
  formConfig: FormFieldConfig[]
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // フィールドIDの重複チェック
  const fieldIds = formConfig.map((field) => field.id);
  const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push('重複するフィールドIDがあります: ' + duplicateIds.join(', '));
  }

  // 必須フィールドのチェック
  formConfig.forEach((field, index) => {
    if (!field.id || !field.name || !field.label) {
      errors.push('フィールド' + (index + 1) + ': ID、名前、ラベルは必須です');
    }

    if (field.order === undefined || field.order < 0) {
      errors.push('フィールド' + (index + 1) + ': 表示順序は0以上の数値である必要があります');
    }
  });

  // 計算設定の検証
  formConfig.forEach((field, index) => {
    if (field.calculation_config) {
      const calc = field.calculation_config;

      if (!calc.target_fields || calc.target_fields.length === 0) {
        errors.push('フィールド' + (index + 1) + ': 計算設定の対象フィールドが指定されていません');
      }

      if (!calc.result_field) {
        errors.push('フィールド' + (index + 1) + ': 計算設定の結果フィールドが指定されていません');
      }

      if (calc.type === 'custom' && !calc.formula) {
        errors.push('フィールド' + (index + 1) + ': カスタム計算の場合は計算式が必要です');
      }
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * 承認フローを検証
 */
export const validateApprovalFlow = (
  approvalFlow: ApprovalStep[]
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (approvalFlow.length === 0) {
    errors.push('承認フローは少なくとも1つのステップが必要です');
    return { valid: false, errors };
  }

  // ステップ番号の重複チェック
  const stepNumbers = approvalFlow.map((step) => step.step);
  const duplicateSteps = stepNumbers.filter((step, index) => stepNumbers.indexOf(step) !== index);
  if (duplicateSteps.length > 0) {
    errors.push('重複するステップ番号があります: ' + duplicateSteps.join(', '));
  }

  // ステップ番号の連続性チェック
  const sortedSteps = [...stepNumbers].sort((a, b) => a - b);
  for (let i = 0; i < sortedSteps.length; i++) {
    if (sortedSteps[i] !== i + 1) {
      errors.push('ステップ番号は連続している必要があります（1, 2, 3...）');
      break;
    }
  }

  // 各ステップの検証
  approvalFlow.forEach((step, index) => {
    if (!step.name) {
      errors.push('ステップ' + (index + 1) + ': ステップ名は必須です');
    }

    if (!step.approver_role && !step.approver_id) {
      errors.push('ステップ' + (index + 1) + ': 承認者ロールまたは承認者IDのいずれかが必要です');
    }
  });

  return { valid: errors.length === 0, errors };
};

// ================================
// デフォルトフォーム設定
// ================================

/**
 * 申請種別カテゴリ別のデフォルトフォーム設定を取得
 */
export const getDefaultFormConfig = (category: string): FormFieldConfig[] => {
  const defaults: Record<string, FormFieldConfig[]> = {
    leave: [
      {
        id: 'leave_type',
        name: 'leave_type',
        type: 'select',
        label: '休暇種別',
        required: true,
        validation_rules: [{ type: 'required', message: '休暇種別を選択してください' }],
        options: ['年次有給休暇', '特別休暇', '病気休暇', 'その他'],
        order: 1,
        width: 'full',
      },
      {
        id: 'start_date',
        name: 'start_date',
        type: 'date',
        label: '開始日',
        required: true,
        validation_rules: [{ type: 'required', message: '開始日を入力してください' }],
        order: 2,
        width: 'half',
      },
      {
        id: 'end_date',
        name: 'end_date',
        type: 'date',
        label: '終了日',
        required: true,
        validation_rules: [{ type: 'required', message: '終了日を入力してください' }],
        order: 3,
        width: 'half',
      },
      {
        id: 'reason',
        name: 'reason',
        type: 'textarea',
        label: '理由',
        required: false,
        validation_rules: [],
        order: 4,
        width: 'full',
      },
    ],
    overtime: [
      {
        id: 'overtime_date',
        name: 'overtime_date',
        type: 'date',
        label: '残業日',
        required: true,
        validation_rules: [{ type: 'required', message: '残業日を入力してください' }],
        order: 1,
        width: 'full',
      },
      {
        id: 'start_time',
        name: 'start_time',
        type: 'time',
        label: '開始時刻',
        required: true,
        validation_rules: [{ type: 'required', message: '開始時刻を入力してください' }],
        order: 2,
        width: 'half',
      },
      {
        id: 'end_time',
        name: 'end_time',
        type: 'time',
        label: '終了時刻',
        required: true,
        validation_rules: [{ type: 'required', message: '終了時刻を入力してください' }],
        order: 3,
        width: 'half',
      },
      {
        id: 'reason',
        name: 'reason',
        type: 'textarea',
        label: '理由',
        required: true,
        validation_rules: [{ type: 'required', message: '理由を入力してください' }],
        order: 4,
        width: 'full',
      },
    ],
    attendance_correction: [
      {
        id: 'correction_date',
        name: 'correction_date',
        type: 'date',
        label: '修正対象日',
        required: true,
        validation_rules: [{ type: 'required', message: '修正対象日を入力してください' }],
        order: 1,
        width: 'full',
      },
      {
        id: 'correction_type',
        name: 'correction_type',
        type: 'select',
        label: '修正種別',
        required: true,
        validation_rules: [{ type: 'required', message: '修正種別を選択してください' }],
        options: ['出勤時刻', '退勤時刻', '休憩時間', 'その他'],
        order: 2,
        width: 'full',
      },
      {
        id: 'corrected_time',
        name: 'corrected_time',
        type: 'time',
        label: '修正時刻',
        required: true,
        validation_rules: [{ type: 'required', message: '修正時刻を入力してください' }],
        order: 3,
        width: 'half',
      },
      {
        id: 'reason',
        name: 'reason',
        type: 'textarea',
        label: '修正理由',
        required: true,
        validation_rules: [{ type: 'required', message: '修正理由を入力してください' }],
        order: 4,
        width: 'full',
      },
    ],
  };

  return defaults[category] || [];
};

/**
 * デフォルト承認フローを取得
 */
export const getDefaultApprovalFlow = (category: string): ApprovalStep[] => {
  const defaults: Record<string, ApprovalStep[]> = {
    leave: [
      {
        step: 1,
        name: '直属上司承認',
        description: '直属上司による承認',
        approver_role: 'manager',
        required: true,
        auto_approve: false,
      },
    ],
    overtime: [
      {
        step: 1,
        name: '直属上司承認',
        description: '直属上司による承認',
        approver_role: 'manager',
        required: true,
        auto_approve: false,
      },
    ],
    attendance_correction: [
      {
        step: 1,
        name: '直属上司承認',
        description: '直属上司による承認',
        approver_role: 'manager',
        required: true,
        auto_approve: false,
      },
    ],
  };

  return (
    defaults[category] || [
      {
        step: 1,
        name: '承認',
        description: '承認者の承認',
        approver_role: 'admin',
        required: true,
        auto_approve: false,
      },
    ]
  );
};
