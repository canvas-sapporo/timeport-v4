-- TimePort 勤怠管理システム サンプルデータ

-- 会社データ
INSERT INTO companies (id, name, code) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '株式会社TimePort', 'TP001');

-- 勤務地データ
INSERT INTO workplaces (id, company_id, name, address) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '本社', '東京都渋谷区1-1-1'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '大阪支社', '大阪府大阪市北区2-2-2');

-- 部署データ
INSERT INTO departments (id, workplace_id, name, code) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '開発部', 'DEV'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '営業部', 'SALES'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '管理部', 'ADMIN'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '開発部', 'DEV'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '営業部', 'SALES');

-- ユーザーデータ
INSERT INTO users (id, employee_id, name, email, role, department_id, hire_date, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440008', 'A001', '管理者太郎', 'admin@timeport.com', 'admin', '550e8400-e29b-41d4-a716-446655440005', '2020-04-01', true),
('550e8400-e29b-41d4-a716-446655440009', 'B001', '田中花子', 'tanaka@timeport.com', 'user', '550e8400-e29b-41d4-a716-446655440003', '2021-04-01', true),
('550e8400-e29b-41d4-a716-44665544000a', 'B002', '佐藤次郎', 'sato@timeport.com', 'user', '550e8400-e29b-41d4-a716-446655440004', '2021-06-01', true),
('550e8400-e29b-41d4-a716-44665544000b', 'B003', '山田三郎', 'yamada@timeport.com', 'user', '550e8400-e29b-41d4-a716-446655440006', '2022-01-01', true),
('550e8400-e29b-41d4-a716-44665544000c', 'B004', '鈴木四郎', 'suzuki@timeport.com', 'user', '550e8400-e29b-41d4-a716-446655440007', '2022-04-01', true);

-- 申請種別データ（動的フォーム設定）
INSERT INTO application_types (id, code, name, description, form_fields, is_active) VALUES 
('550e8400-e29b-41d4-a716-44665544000d', 'vacation', '休暇申請', '年次有給休暇や特別休暇の申請', 
'[
  {
    "id": "vacation_type",
    "name": "vacation_type",
    "type": "select",
    "label": "休暇種別",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "休暇種別を選択してください"
    },
    "options": ["年次有給休暇", "病気休暇", "特別休暇", "慶弔休暇"],
    "order": 1
  },
  {
    "id": "start_date",
    "name": "start_date",
    "type": "date",
    "label": "開始日",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "開始日を入力してください"
    },
    "options": [],
    "order": 2
  },
  {
    "id": "end_date",
    "name": "end_date",
    "type": "date",
    "label": "終了日",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "終了日を入力してください"
    },
    "options": [],
    "order": 3
  },
  {
    "id": "reason",
    "name": "reason",
    "type": "textarea",
    "label": "理由",
    "placeholder": "休暇の理由を入力してください",
    "required": true,
    "validation_rules": {
      "min_length": 10,
      "max_length": 500,
      "custom_message": "理由は10文字以上500文字以内で入力してください"
    },
    "options": [],
    "order": 4
  },
  {
    "id": "emergency_contact",
    "name": "emergency_contact",
    "type": "tel",
    "label": "緊急連絡先",
    "placeholder": "090-1234-5678",
    "required": false,
    "validation_rules": {
      "pattern": "^[0-9-]+$",
      "custom_message": "正しい電話番号を入力してください"
    },
    "options": [],
    "order": 5
  }
]', true),

('550e8400-e29b-41d4-a716-44665544000e', 'overtime', '残業申請', '時間外労働の事前申請', 
'[
  {
    "id": "target_date",
    "name": "target_date",
    "type": "date",
    "label": "対象日",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "対象日を入力してください"
    },
    "options": [],
    "order": 1
  },
  {
    "id": "start_time",
    "name": "start_time",
    "type": "time",
    "label": "開始時刻",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "開始時刻を入力してください"
    },
    "options": [],
    "order": 2
  },
  {
    "id": "end_time",
    "name": "end_time",
    "type": "time",
    "label": "終了時刻",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "終了時刻を入力してください"
    },
    "options": [],
    "order": 3
  },
  {
    "id": "work_content",
    "name": "work_content",
    "type": "textarea",
    "label": "作業内容",
    "placeholder": "残業で行う作業内容を詳しく入力してください",
    "required": true,
    "validation_rules": {
      "min_length": 20,
      "max_length": 1000,
      "custom_message": "作業内容は20文字以上1000文字以内で入力してください"
    },
    "options": [],
    "order": 4
  },
  {
    "id": "urgency_level",
    "name": "urgency_level",
    "type": "radio",
    "label": "緊急度",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "緊急度を選択してください"
    },
    "options": ["低", "中", "高", "緊急"],
    "order": 5
  }
]', true),

('550e8400-e29b-41d4-a716-44665544000f', 'time_correction', '時刻修正申請', '出退勤時刻の修正申請', 
'[
  {
    "id": "target_date",
    "name": "target_date",
    "type": "date",
    "label": "対象日",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "対象日を入力してください"
    },
    "options": [],
    "order": 1
  },
  {
    "id": "correction_type",
    "name": "correction_type",
    "type": "select",
    "label": "修正種別",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "修正種別を選択してください"
    },
    "options": ["出勤時刻", "退勤時刻", "休憩時間"],
    "order": 2
  },
  {
    "id": "original_time",
    "name": "original_time",
    "type": "time",
    "label": "修正前時刻",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "修正前時刻を入力してください"
    },
    "options": [],
    "order": 3
  },
  {
    "id": "corrected_time",
    "name": "corrected_time",
    "type": "time",
    "label": "修正後時刻",
    "placeholder": "",
    "required": true,
    "validation_rules": {
      "custom_message": "修正後時刻を入力してください"
    },
    "options": [],
    "order": 4
  },
  {
    "id": "reason",
    "name": "reason",
    "type": "textarea",
    "label": "修正理由",
    "placeholder": "時刻修正が必要な理由を入力してください",
    "required": true,
    "validation_rules": {
      "min_length": 10,
      "max_length": 300,
      "custom_message": "修正理由は10文字以上300文字以内で入力してください"
    },
    "options": [],
    "order": 5
  }
]', true);

-- 機能設定データ
INSERT INTO feature_settings (feature_code, feature_name, is_enabled, organization_type, organization_id) VALUES 
('attendance', '勤怠管理', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('applications', '申請機能', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('user_management', 'ユーザー管理', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('organization_management', '組織管理', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('vacation', '休暇申請', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('overtime', '残業申請', true, 'company', '550e8400-e29b-41d4-a716-446655440000'),
('time_correction', '時刻修正申請', true, 'company', '550e8400-e29b-41d4-a716-446655440000');

-- サンプル申請データ
INSERT INTO applications (id, user_id, application_type_id, title, form_data, target_date, start_date, end_date, status, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-44665544000d', '休暇申請', 
'{"vacation_type": "年次有給休暇", "start_date": "2024-02-01", "end_date": "2024-02-02", "reason": "家族旅行のため", "emergency_contact": "090-1234-5678"}', 
null, '2024-02-01', '2024-02-02', 'pending', '2024-01-20T10:00:00Z'),

('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-44665544000a', '550e8400-e29b-41d4-a716-44665544000e', '残業申請', 
'{"target_date": "2024-01-25", "start_time": "18:00", "end_time": "20:00", "work_content": "プロジェクト締切対応のためのシステム修正作業", "urgency_level": "高"}', 
'2024-01-25', null, null, 'approved', '2024-01-24T15:00:00Z'),

('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-44665544000b', '550e8400-e29b-41d4-a716-44665544000f', '時刻修正申請', 
'{"target_date": "2024-01-23", "correction_type": "出勤時刻", "original_time": "09:30", "corrected_time": "09:00", "reason": "電車遅延のため遅刻しましたが、実際の業務開始は定刻通りでした"}', 
'2024-01-23', null, null, 'rejected', '2024-01-24T09:00:00Z');

-- サンプル勤怠データ（過去30日分）
DO $$
DECLARE
  user_record RECORD;
  date_record DATE;
  clock_in_time TIME;
  clock_out_time TIME;
  work_minutes INTEGER;
  overtime_minutes INTEGER;
  status_val TEXT;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE role = 'user' LOOP
    FOR i IN 0..29 LOOP
      date_record := CURRENT_DATE - i;
      
      -- 土日をスキップ
      IF EXTRACT(DOW FROM date_record) NOT IN (0, 6) THEN
        -- 出勤時刻（9:00 ± 30分のランダム）
        clock_in_time := TIME '09:00:00' + (RANDOM() * 60 - 30) * INTERVAL '1 minute';
        
        -- 退勤時刻（18:00 + 0-120分のランダム）
        clock_out_time := TIME '18:00:00' + (RANDOM() * 120) * INTERVAL '1 minute';
        
        -- 勤務時間計算（昼休み1時間を除く）
        work_minutes := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 60 - 60;
        
        -- 残業時間計算（8時間 = 480分を超えた分）
        overtime_minutes := GREATEST(0, work_minutes - 480);
        
        -- ステータス決定
        IF clock_in_time > TIME '09:00:00' THEN
          status_val := 'late';
        ELSE
          status_val := 'normal';
        END IF;
        
        INSERT INTO attendance_records (
          user_id, 
          work_date, 
          clock_in_time, 
          clock_out_time, 
          break_records, 
          actual_work_minutes, 
          overtime_minutes, 
          status
        ) VALUES (
          user_record.id,
          date_record,
          clock_in_time,
          clock_out_time,
          '[{"start": "12:00", "end": "13:00"}]',
          work_minutes,
          overtime_minutes,
          status_val
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- サンプル通知データ
INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440008', '新規申請', '田中花子さんから休暇申請が提出されました', 'info', false, '2024-01-20T10:00:00Z'),
('550e8400-e29b-41d4-a716-446655440009', '申請承認', 'あなたの休暇申請が承認されました', 'success', true, '2024-01-19T14:30:00Z'),
('550e8400-e29b-41d4-a716-44665544000a', '申請承認', 'あなたの残業申請が承認されました', 'success', false, '2024-01-24T16:00:00Z'),
('550e8400-e29b-41d4-a716-44665544000b', '申請却下', 'あなたの時刻修正申請が却下されました', 'error', false, '2024-01-24T17:00:00Z');