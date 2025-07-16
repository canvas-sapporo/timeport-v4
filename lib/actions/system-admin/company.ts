"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { CreateCompanyInput } from '@/types/company';

export async function addCompany(form: CreateCompanyInput) {
  const supabase = createServerActionClient({ cookies });
  const { data, error } = await supabase
    .from('companies')
    .insert([form])
    .select()
    .single();
  if (error) throw error;
  return data;
} 