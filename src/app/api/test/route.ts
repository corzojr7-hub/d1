import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase.from('profiles').select('*');
  return NextResponse.json({ data, error, len: data?.length });
}
