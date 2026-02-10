import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEmail, getAppealApprovedEmail, getAppealRejectedEmail } from '@/lib/email/send-email';

const ADMIN_ROLES = ['super_admin', 'support_admin'];

// PATCH - обновление статуса апелляции
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

    // Проверяем права администратора
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const status = body.status;
    const reviewComment = typeof body.review_comment === 'string' ? body.review_comment.trim() : null;

    if (!status || !['approved', 'rejected', 'reviewing'].includes(status)) {
      return NextResponse.json({ error: 'Недопустимый статус' }, { status: 400 });
    }

    interface UpdateData {
      status: string;
      reviewed_by: string;
      reviewed_at: string;
      review_comment?: string | null;
    }

    const updateData: UpdateData = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewComment) {
      updateData.review_comment = reviewComment;
    }

    // Получаем данные апелляции перед обновлением
    const { data: appealData } = await serviceClient
      .from('ban_appeals')
      .select('user_id')
      .eq('id', id)
      .single();
    
    // Получаем данные пользователя
    let userProfile: { first_name?: string; last_name?: string } | null = null;
    if (appealData?.user_id) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', appealData.user_id)
        .single();
      userProfile = profile as { first_name?: string; last_name?: string } | null;
    }

    // Если апелляция одобрена, разбаниваем пользователя
    if (status === 'approved' && appealData) {
      await serviceClient
        .from('profiles')
        .update({
          is_banned: false,
          banned_at: null,
          ban_reason: null,
          ban_until: null,
        })
        .eq('id', appealData.user_id);
    }

    const { data: updated, error } = await serviceClient
      .from('ban_appeals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Ошибка обновления апелляции:', error);
      return NextResponse.json({ error: 'Не удалось обновить апелляцию' }, { status: 500 });
    }

    // Отправляем email уведомление пользователю
    if ((status === 'approved' || status === 'rejected') && appealData) {
      try {
        // Получаем email пользователя из auth
        const { data: authUser } = await serviceClient.auth.admin.getUserById(appealData.user_id);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          const userName = userProfile?.first_name && userProfile?.last_name
            ? `${userProfile.first_name} ${userProfile.last_name}`
            : userEmail.split('@')[0];

          if (status === 'approved') {
            const emailHtml = getAppealApprovedEmail(userName, reviewComment);
            const emailResult = await sendEmail({
              to: userEmail,
              subject: 'Апелляция одобрена - Туры по Татарстану',
              html: emailHtml,
            });
            if (!emailResult.success) {
              console.error('Ошибка отправки email об одобрении апелляции:', emailResult.error);
            }
          } else if (status === 'rejected') {
            const emailHtml = getAppealRejectedEmail(userName, reviewComment);
            const emailResult = await sendEmail({
              to: userEmail,
              subject: 'Апелляция отклонена - Туры по Татарстану',
              html: emailHtml,
            });
            if (!emailResult.success) {
              console.error('Ошибка отправки email об отклонении апелляции:', emailResult.error);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка получения данных пользователя для email:', error);
        // Не прерываем выполнение, если email не отправился
      }
    }

    return NextResponse.json({ success: true, appeal: updated });
  } catch (error) {
    console.error('Ошибка API апелляции:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удаление апелляции
export async function DELETE(
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

    // Проверяем права администратора
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    // Удаляем апелляцию
    const { error } = await serviceClient
      .from('ban_appeals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления апелляции:', error);
      return NextResponse.json({ error: 'Не удалось удалить апелляцию' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Апелляция успешно удалена' });
  } catch (error) {
    console.error('Ошибка API удаления апелляции:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

