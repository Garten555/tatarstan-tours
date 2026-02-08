import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEmail, getBanNotificationEmail } from '@/lib/email/send-email';

const ADMIN_ROLES = ['super_admin', 'support_admin', 'tour_admin'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    // Проверяем, что админ не пытается забанить самого себя
    if (id === user.id) {
      return NextResponse.json({ error: 'Нельзя забанить самого себя' }, { status: 400 });
    }

    // Получаем данные пользователя, которого баним
    const { data: targetUser } = await serviceClient
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', id)
      .single();

    const targetUserRole = (targetUser as { role?: string; first_name?: string; last_name?: string } | null)?.role;
    
    // Получаем email пользователя из auth
    let userEmail: string | null = null;
    try {
      const { data: authUser } = await serviceClient.auth.admin.getUserById(id);
      userEmail = authUser?.user?.email || null;
    } catch (error) {
      console.error('Ошибка получения email пользователя:', error);
    }
    const ADMIN_ROLES_TO_REMOVE = ['tour_admin', 'support_admin', 'guide'];

    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'ban';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
    const permanent = body?.permanent === true;
    const durationHours = Number(body?.duration_hours || 0);
    const durationDays = Number(body?.duration_days || 0);
    const banUntilInput = typeof body?.ban_until === 'string' ? body.ban_until : null;

    let updateData: Record<string, any> = {};
    if (action === 'ban') {
      let banUntil: string | null = null;
      if (!permanent) {
        if (banUntilInput) {
          banUntil = banUntilInput;
        } else if (durationDays || durationHours) {
          const hours = durationHours + durationDays * 24;
          banUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        }
      }

      updateData = {
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: reason,
        ban_until: banUntil,
      };

      // Если пользователь был администратором (но не super_admin), снимаем с него роль
      if (targetUserRole && ADMIN_ROLES_TO_REMOVE.includes(targetUserRole)) {
        updateData.role = 'user';
      }
    } else if (action === 'unban') {
      updateData = {
        is_banned: false,
        banned_at: null,
        ban_reason: null,
        ban_until: null,
      };
    } else {
      return NextResponse.json({ error: 'Недопустимое действие' }, { status: 400 });
    }

    const { data: updated, error } = await (serviceClient as any)
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select('id, is_banned, banned_at, ban_reason, ban_until, role')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Не удалось обновить статус' }, { status: 500 });
    }

    // Отправляем email уведомление при бане
    if (action === 'ban' && userEmail) {
      const userName = targetUser?.first_name && targetUser?.last_name 
        ? `${targetUser.first_name} ${targetUser.last_name}`
        : userEmail.split('@')[0];
      
      const emailHtml = getBanNotificationEmail(
        userName,
        reason,
        updateData.ban_until || null
      );
      
      await sendEmail({
        to: userEmail,
        subject: 'Ваш аккаунт заблокирован - Туры по Татарстану',
        html: emailHtml,
      }).catch((error) => {
        console.error('Ошибка отправки email о бане:', error);
        // Не прерываем выполнение, если email не отправился
      });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Ошибка API бана:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

