"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/types/company';

export async function addCompany(form: CreateCompanyInput) {
  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });
  const { data, error } = await supabase
    .from('companies')
    .insert([form])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id: string, form: UpdateCompanyInput) {
  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });
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
  const cookieStore = await cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });
  const { data, error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
} 