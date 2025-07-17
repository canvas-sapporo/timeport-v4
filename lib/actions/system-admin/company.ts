"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/types/company';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user_profiles';
import { Group } from '@/types/groups';
import { UserGroup } from '@/types/user_groups';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function addCompany(form: any) {
  // 1. 企業作成
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert([
      {
        name: form.name,
        code: form.code,
        address: form.address,
        phone: form.phone,
        is_active: form.is_active,
      },
    ])
    .select()
    .single();
  if (companyError) throw companyError;

  // 2. グループ作成
  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert([
      {
        company_id: company.id,
        name: form.group_name,
      },
    ])
    .select()
    .single();
  if (groupError) {
    // 企業ロールバック
    await supabaseAdmin.from('companies').delete().eq('id', company.id);
    throw groupError;
  }

  // 3. 管理者ユーザー作成（auth.users）
  const adminUserRes = await supabaseAdmin.auth.admin.createUser({
    email: form.admin_email,
    password: form.admin_password,
    email_confirm: false,
  });
  if (adminUserRes.error || !adminUserRes.data?.user) {
    // グループ・企業ロールバック
    await supabaseAdmin.from('groups').delete().eq('id', group.id);
    await supabaseAdmin.from('companies').delete().eq('id', company.id);
    throw adminUserRes.error || new Error('管理者ユーザー作成に失敗しました');
  }
  const adminUserId = adminUserRes.data.user.id;

  // 4. user_profiles作成
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert([
      {
        id: adminUserId,
        family_name: form.admin_family_name,
        first_name: form.admin_first_name,
        family_name_kana: form.admin_family_name_kana,
        first_name_kana: form.admin_first_name_kana,
        email: form.admin_email,
        role: 'admin',
        is_active: true,
      },
    ]);
  if (profileError) {
    // ユーザー・グループ・企業ロールバック
    await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    await supabaseAdmin.from('groups').delete().eq('id', group.id);
    await supabaseAdmin.from('companies').delete().eq('id', company.id);
    throw profileError;
  }

  // 5. user_groups作成
  const { error: userGroupError } = await supabaseAdmin
    .from('user_groups')
    .insert([
      {
        user_id: adminUserId,
        group_id: group.id,
      },
    ]);
  if (userGroupError) {
    // user_profiles・ユーザー・グループ・企業ロールバック
    await supabaseAdmin.from('user_profiles').delete().eq('id', adminUserId);
    await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    await supabaseAdmin.from('groups').delete().eq('id', group.id);
    await supabaseAdmin.from('companies').delete().eq('id', company.id);
    throw userGroupError;
  }

  return company;
}

export async function updateCompany(id: string, form: UpdateCompanyInput) {
  const supabase = createServerActionClient({ cookies });
  const { data, error } = await supabase
    .from('companies')
    .update(form)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string) {
  const supabase = createServerActionClient({ cookies });
  const { data, error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
} 