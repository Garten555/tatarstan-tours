import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const serviceClient = await createServiceClient();

    const { data: setting, error } = await serviceClient
      .from('site_settings')
      .select('value_json')
      .eq('key', 'maintenance_mode')
      .single();

    if (error) {
      console.error('Ошибка получения режима обслуживания:', error);
      return NextResponse.json(
        { enabled: false },
        { status: 200 }
      );
    }

    const enabled = Boolean((setting as any)?.value_json?.enabled);
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Ошибка получения режима обслуживания:', error);
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}


















