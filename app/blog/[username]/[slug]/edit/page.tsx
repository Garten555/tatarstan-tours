import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import BlogEditor from '@/components/blog/BlogEditor';

interface EditBlogPostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { username, slug } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/blog');
  }

  // Находим пользователя по username или id
  const { data: author } = await serviceClient
    .from('profiles')
    .select('id')
    .or(`username.eq.${username},id.eq.${username}`)
    .maybeSingle();

  if (!author) {
    notFound();
  }

  // Получаем пост
  const { data: post, error } = await serviceClient
    .from('travel_blog_posts')
    .select(`
      *,
      user:profiles(id, username),
      category:blog_categories(id, name, slug, icon, color),
      tour:tours(id, title, slug, cover_image)
    `)
    .eq('user_id', author.id)
    .eq('slug', slug)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  // Проверка прав
  if (post.user_id !== user.id) {
    redirect('/blog');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Редактировать пост</h1>
        <BlogEditor post={post} />
      </div>
    </div>
  );
}










