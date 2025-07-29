-- 正常ステータスのcolorをoutlineに変更
UPDATE attendance_statuses 
SET color = 'outline' 
WHERE name = 'normal'; 