import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { resolveAuthorIdFromPathSegment } from '@/lib/blog/resolveAuthorFromPathSegment';

/**
 * Старый путь /blog/:user/:slug → всегда канонический пост в профиле /users/:user/blog/:slug
 * (одна реализация страницы, без дубля и без .or(username,id) с не-UUID в id).
 */
interface BlogPostPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function BlogPostCanonicalRedirect({ params }: BlogPostPageProps) {
  const { username, slug } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slugDecoded = decodeURIComponent(String(slug).trim());
  const author = await resolveAuthorIdFromPathSegment(serviceClient, String(username));
  if (!author) notFound();

  const { data: post, error } = await serviceClient
    .from('travel_blog_posts')
    .select(`id, user_id, status, visibility, user:profiles(username)`)
    .eq('user_id', author.id)
    .eq('slug', slugDecoded)
    .maybeSingle();

  if (error || !post) notFound();

  const isOwner = user?.id === post.user_id;
  const isPublic = post.status === 'published' && post.visibility === 'public';

  if (!isOwner && !isPublic) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Доступ ограничен</h2>
          <p className="mb-6 text-gray-600">Этот пост недоступен для просмотра.</p>
          <Link
            href="/blog"
            className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700"
          >
            Вернуться к блогу
          </Link>
        </div>
      </div>
    );
  }

  const rowUser = post.user as { username?: string | null } | null;
  const target = rowUser?.username?.trim() || author.id;
  redirect(`/users/${encodeURIComponent(target)}/blog/${encodeURIComponent(slugDecoded)}`);
}
