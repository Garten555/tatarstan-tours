// Редирект на туристический паспорт
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MyBlogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/my-blog');
  }

  // Редирект на туристический паспорт пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const username = profile?.username || user.id;
  redirect(`/users/${username}`);
}
