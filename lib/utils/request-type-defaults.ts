/**
 * 申請種別のデフォルト設定ユーティリティ
 */

import type { FormFieldConfig, ApprovalStep } from '@/types/request';

/**
 * カテゴリ別のデフォルトフォーム設定を取得
 */
export const getDefaultFormConfig = (category: string): FormFieldConfig[] => {
  const baseFields: FormFieldConfig[] = [
    {
      id: 'field_1',
      name: 'title',
      type: 'text',
      label: '件名',
      description: '申請の件名を入力してください',
      required: true,
      validation_rules: [],
      order: 1,
      width: 'full',
    },
    {
      id: 'field_2',
      name: 'description',
      type: 'textarea',
      label: '詳細',
      description: '申請の詳細を入力してください',
      required: false,
      validation_rules: [],
      order: 2,
      width: 'full',
    },
  ];

  switch (category) {
    case 'vacation':
      return [
        ...baseFields,
        {
          id: 'field_3',
          name: 'start_date',
          type: 'date',
          label: '開始日',
          description: '休暇の開始日を選択してください',
          required: true,
          validation_rules: [],
          order: 3,
          width: 'half',
        },
        {
          id: 'field_4',
          name: 'end_date',
          type: 'date',
          label: '終了日',
          description: '休暇の終了日を選択してください',
          required: true,
          validation_rules: [],
          order: 4,
          width: 'half',
        },
        {
          id: 'field_5',
          name: 'vacation_type',
          type: 'select',
          label: '休暇種別',
          description: '休暇の種類を選択してください',
          required: true,
          validation_rules: [],
          order: 5,
          width: 'full',
          options: ['有給休暇', '特別休暇', '慶弔休暇', 'その他'],
        },
      ];

    case 'overtime':
      return [
        ...baseFields,
        {
          id: 'field_3',
          name: 'work_date',
          type: 'date',
          label: '勤務日',
          description: '残業を行った日を選択してください',
          required: true,
          validation_rules: [],
          order: 3,
          width: 'half',
        },
        {
          id: 'field_4',
          name: 'start_time',
          type: 'time',
          label: '開始時刻',
          description: '残業の開始時刻を入力してください',
          required: true,
          validation_rules: [],
          order: 4,
          width: 'half',
        },
        {
          id: 'field_5',
          name: 'end_time',
          type: 'time',
          label: '終了時刻',
          description: '残業の終了時刻を入力してください',
          required: true,
          validation_rules: [],
          order: 5,
          width: 'half',
        },
        {
          id: 'field_6',
          name: 'overtime_reason',
          type: 'textarea',
          label: '残業理由',
          description: '残業が必要な理由を入力してください',
          required: true,
          validation_rules: [],
          order: 6,
          width: 'full',
        },
      ];

    case 'expense':
      return [
        ...baseFields,
        {
          id: 'field_3',
          name: 'expense_date',
          type: 'date',
          label: '経費発生日',
          description: '経費が発生した日を選択してください',
          required: true,
          validation_rules: [],
          order: 3,
          width: 'half',
        },
        {
          id: 'field_4',
          name: 'amount',
          type: 'number',
          label: '金額',
          description: '経費の金額を入力してください',
          required: true,
          validation_rules: [
            {
              type: 'min',
              value: '1',
              message: '金額は1円以上で入力してください',
            },
          ],
          order: 4,
          width: 'half',
        },
        {
          id: 'field_5',
          name: 'expense_category',
          type: 'select',
          label: '経費種別',
          description: '経費の種類を選択してください',
          required: true,
          validation_rules: [],
          order: 5,
          width: 'full',
          options: ['交通費', '会議費', '接待費', '消耗品費', 'その他'],
        },
        {
          id: 'field_6',
          name: 'receipt',
          type: 'file',
          label: '領収書',
          description: '領収書をアップロードしてください',
          required: false,
          validation_rules: [],
          order: 6,
          width: 'full',
        },
      ];

    case 'business_trip':
      return [
        ...baseFields,
        {
          id: 'field_3',
          name: 'destination',
          type: 'text',
          label: '出張先',
          description: '出張先を入力してください',
          required: true,
          validation_rules: [],
          order: 3,
          width: 'full',
        },
        {
          id: 'field_4',
          name: 'start_date',
          type: 'date',
          label: '開始日',
          description: '出張の開始日を選択してください',
          required: true,
          validation_rules: [],
          order: 4,
          width: 'half',
        },
        {
          id: 'field_5',
          name: 'end_date',
          type: 'date',
          label: '終了日',
          description: '出張の終了日を選択してください',
          required: true,
          validation_rules: [],
          order: 5,
          width: 'half',
        },
        {
          id: 'field_6',
          name: 'purpose',
          type: 'textarea',
          label: '出張目的',
          description: '出張の目的を入力してください',
          required: true,
          validation_rules: [],
          order: 6,
          width: 'full',
        },
      ];

    default:
      return baseFields;
  }
};

/**
 * デフォルトの承認フローを取得
 */
export const getDefaultApprovalFlow = (category: string): ApprovalStep[] => {
  const baseFlow: ApprovalStep[] = [
    {
      step: 1,
      name: '直属上司承認',
      description: '直属上司による承認',
      approver_role: 'direct_manager',
      required: true,
      auto_approve: false,
    },
  ];

  switch (category) {
    case 'vacation':
      return [
        ...baseFlow,
        {
          step: 2,
          name: '人事部承認',
          description: '人事部による承認',
          approver_role: 'hr_manager',
          required: true,
          auto_approve: false,
        },
      ];

    case 'overtime':
      return [
        ...baseFlow,
        {
          step: 2,
          name: '部門長承認',
          description: '部門長による承認',
          approver_role: 'department_manager',
          required: true,
          auto_approve: false,
        },
      ];

    case 'expense':
      return [
        ...baseFlow,
        {
          step: 2,
          name: '経理部承認',
          description: '経理部による承認',
          approver_role: 'accounting_manager',
          required: true,
          auto_approve: false,
        },
      ];

    case 'business_trip':
      return [
        ...baseFlow,
        {
          step: 2,
          name: '部門長承認',
          description: '部門長による承認',
          approver_role: 'department_manager',
          required: true,
          auto_approve: false,
        },
        {
          step: 3,
          name: '経営陣承認',
          description: '経営陣による承認',
          approver_role: 'executive',
          required: false,
          auto_approve: false,
        },
      ];

    default:
      return baseFlow;
  }
};
