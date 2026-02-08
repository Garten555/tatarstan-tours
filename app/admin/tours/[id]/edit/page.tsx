import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';

// Динамический импорт для уменьшения начального бандла
const TourForm = dynamic(() => import('@/components/admin/TourForm'), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>,
});

export const metadata = {
  title: 'Редактировать тур - Админ панель',
  description: 'Редактирование существующего тура',
};

interface EditTourPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTourPage({ params }: EditTourPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем права (tour_admin или super_admin)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const typedProfile = (profile ?? null) as { role?: string | null } | null;

  if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Загружаем данные тура
  const { data: tour, error } = await serviceClient
    .from('tours')
    .select('id,title,slug,short_desc,full_desc,tour_type,category,price_per_person,start_date,end_date,max_participants,status,yandex_map_url,cover_image,description,city_id')
    .eq('id', id)
    .single();

  if (error || !tour) {
    notFound();
  }

  // Загружаем медиа
  const { data: media } = await serviceClient
    .from('tour_media')
    .select('id,media_type,media_url,created_at')
    .eq('tour_id', id)
    .order('created_at', { ascending: true });

  const mediaTyped = (media ?? []) as any[];
  const gallery = mediaTyped.filter((m) => m.media_type === 'image' || m.media_type === 'photo');
  const videos = mediaTyped.filter((m) => m.media_type === 'video');

  // Подготавливаем данные для формы
  const tourData = {
    ...(tour as any),
    gallery_photos: gallery.map((g) => g.media_url),
    video_urls: videos.map((v) => v.media_url),
  };

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Редактировать тур</h1>
        <p className="mt-2 text-gray-600">
          Обновите информацию о туре &quot;{(tour as any)?.title}&quot;
        </p>
      </div>

      {/* Форма */}
      <TourForm mode="edit" initialData={tourData} existingMedia={mediaTyped} />
    </div>
  );
}

