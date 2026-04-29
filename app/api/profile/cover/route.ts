import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3, generateUniqueFileName, deleteFileFromS3 } from '@/lib/s3/upload';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const MAX_COVER_SIZE = 8 * 1024 * 1024;
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 });
    }

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Неподдерживаемый тип файла. Разрешены: ${ALLOWED_COVER_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_COVER_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой. Максимум 8MB' }, { status: 400 });
    }

    const settingKey = `profile_cover:${user.id}`;
    const { data: currentSetting } = await serviceClient
      .from('site_settings')
      .select('value_json')
      .eq('key', settingKey)
      .maybeSingle();

    const uniqueFileName = generateUniqueFileName(file.name);
    const s3Path = `users/covers/${user.id}/${uniqueFileName}`;
    const fileUrl = await uploadFileToS3(file, s3Path);

    const { error: updateError } = await serviceClient
      .from('site_settings')
      .upsert({
        key: settingKey,
        value_json: {
          user_id: user.id,
          url: fileUrl,
          path: s3Path,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      await deleteFileFromS3(s3Path).catch(() => null);
      return NextResponse.json(
        {
          error: 'Не удалось сохранить шапку профиля',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    const previousPath =
      currentSetting?.value_json &&
      typeof currentSetting.value_json === 'object' &&
      'path' in currentSetting.value_json &&
      typeof currentSetting.value_json.path === 'string'
        ? currentSetting.value_json.path
        : null;

    if (previousPath) {
      await deleteFileFromS3(previousPath).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      path: s3Path,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Не удалось загрузить шапку профиля' },
      { status: 500 }
    );
  }
}
