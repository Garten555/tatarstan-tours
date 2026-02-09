import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { data: mfaData, error: mfaError } = await supabase
      .from('user_mfa')
      .select('enabled, backup_codes')
      .eq('user_id', user.id)
      .single();

    if (mfaError && mfaError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching MFA status:', mfaError);
      return NextResponse.json(
        { error: 'Ошибка при получении статуса 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        enabled: mfaData?.enabled || false,
        backupCodesCount: mfaData?.backup_codes?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in 2FA status:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении статуса 2FA' },
      { status: 500 }
    );
  }
}

