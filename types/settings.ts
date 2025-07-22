export interface Setting {
  id: string;
  role: 'system-admin' | 'admin' | 'member';
  user_id?: string;
  setting_type: string;
  setting_key: string;
  setting_value: CsvExportSetting | AttendanceSetting | NotificationSetting;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CsvExportSetting {
  name: string;
  period: {
    type: 'date_range';
    start_date: string | null;
    end_date: string | null;
  };
  columns: string[];
  format: {
    encoding: 'UTF-8' | 'Shift_JIS';
    delimiter: 'comma' | 'tab';
    date_format: string;
    time_format: string;
    empty_value: 'blank' | '--';
  };
}

export interface AttendanceSetting {
  late_threshold_minutes: number;
  early_leave_threshold_minutes: number;
  work_hours_per_day: number;
  overtime_threshold_minutes: number;
}

export interface NotificationSetting {
  email_notifications: boolean;
  push_notifications: boolean;
  notification_types: string[];
}

export type SettingType = 'csv_export' | 'attendance' | 'notification';

export interface SettingValue {
  csv_export: CsvExportSetting;
  attendance: AttendanceSetting;
  notification: NotificationSetting;
}
