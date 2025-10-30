import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import TourForm from '@/components/admin/TourForm';

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

  if (profile?.role !== 'tour_admin' && profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Загружаем данные тура
  const { data: tour, error } = await serviceClient
    .from('tours')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !tour) {
    notFound();
  }

  // Загружаем медиа
  const { data: media } = await serviceClient
    .from('tour_media')
    .select('*')
    .eq('tour_id', id)
    .order('created_at', { ascending: true });

  const gallery = media?.filter((m) => m.media_type === 'photo') || [];
  const videos = media?.filter((m) => m.media_type === 'video') || [];

  // Подготавливаем данные для формы
  const tourData = {
    ...tour,
    gallery_photos: gallery.map((g) => g.media_url),
    video_urls: videos.map((v) => v.media_url),
  };

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Редактировать тур</h1>
        <p className="mt-2 text-gray-600">
          Обновите информацию о туре &quot;{tour.title}&quot;
        </p>
      </div>

      {/* Форма */}
      <TourForm mode="edit" initialData={tourData} />
    </div>
  );
}

