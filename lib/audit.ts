import { getAdminSupabase } from '@/lib/leave/supabase-admin';

type AuditParams = {
  userId?: string;
  companyId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeData?: any;
  afterData?: any;
  details?: Record<string, any>;
};

export async function writeAudit(p: AuditParams) {
  const sb = getAdminSupabase();
  await sb.from('audit_logs').insert({
    user_id: p.userId ?? null,
    company_id: p.companyId ?? null,
    action: p.action,
    target_type: p.targetType ?? null,
    target_id: p.targetId ?? null,
    before_data: p.beforeData ?? null,
    after_data: p.afterData ?? null,
    details: p.details ?? {},
    created_date: new Date().toISOString().slice(0, 10),
  });
}


