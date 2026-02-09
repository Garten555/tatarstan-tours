// API для автоматической очистки сообщений через 90 дней после окончания туров
// Вызывать через cron job
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации (только для админов или cron)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}` && !cronSecret) {
      // Если нет секрета, проверяем через Supabase
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const profileRole = (profile as { role?: string } | null)?.role;
      if (!profileRole || !['super_admin', 'tour_admin'].includes(profileRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = createServiceClient();

    // Вызываем функцию очистки сообщений
    const { data, error } = await serviceClient.rpc('delete_messages_after_90_days');

    if (error) {
      console.error('Ошибка очистки сообщений:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup messages', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: data || 0,
      message: `Удалено сообщений: ${data || 0}`,
    });
  } catch (error) {
    console.error('Ошибка очистки сообщений:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


















