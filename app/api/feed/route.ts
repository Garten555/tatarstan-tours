import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type FeedType = 'post' | 'review' | 'achievement';

type FeedItem = {
  id: string;
  type: FeedType;
  created_at: string;
  actor: {
    id: string;
    username: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  payload: Record<string, unknown>;
};

function parseTypes(raw: string | null): FeedType[] {
  if (!raw) return ['post', 'review', 'achievement'];
  const allowed: FeedType[] = ['post', 'review', 'achievement'];
  const selected = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is FeedType => allowed.includes(v as FeedType));
  return selected.length ? selected : allowed;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const types = parseTypes(searchParams.get('types'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
    const cursor = searchParams.get('cursor');

    const [followingResult, friendsResult] = await Promise.all([
      serviceClient.from('user_follows').select('followed_id').eq('follower_id', user.id),
      serviceClient
        .from('user_friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted'),
    ]);

    const actorIds = new Set<string>();
    for (const row of followingResult.data || []) {
      const id = (row as { followed_id?: string }).followed_id;
      if (id) actorIds.add(id);
    }
    for (const row of friendsResult.data || []) {
      const friendRow = row as { user_id: string; friend_id: string };
      const friendId = friendRow.user_id === user.id ? friendRow.friend_id : friendRow.user_id;
      if (friendId) actorIds.add(friendId);
    }

    if (actorIds.size === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        next_cursor: null,
      });
    }

    const ids = Array.from(actorIds);
    const feedItems: FeedItem[] = [];

    if (types.includes('post')) {
      let query = serviceClient
        .from('travel_blog_posts')
        .select(
          `
          id,
          title,
          slug,
          excerpt,
          content,
          cover_image_url,
          user_id,
          created_at,
          published_at,
          views_count,
          likes_count,
          comments_count,
          user:profiles!travel_blog_posts_user_id_fkey(id, username, first_name, last_name, avatar_url)
        `
        )
        .in('user_id', ids)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cursor) query = query.lt('created_at', cursor);
      const { data } = await query;
      for (const row of data || []) {
        const post = row as any;
        feedItems.push({
          id: `post:${post.id}`,
          type: 'post',
          created_at: post.created_at,
          actor: post.user || { id: post.user_id, username: null },
          payload: {
            post_id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content ?? null,
            cover_image_url: post.cover_image_url,
            published_at: post.published_at,
            views_count: post.views_count ?? 0,
            likes_count: post.likes_count ?? 0,
            comments_count: post.comments_count ?? 0,
          },
        });
      }
    }

    if (types.includes('review')) {
      let query = serviceClient
        .from('reviews')
        .select(
          `
          id,
          user_id,
          tour_id,
          rating,
          text,
          created_at,
          user:profiles!reviews_user_id_fkey(id, username, first_name, last_name, avatar_url),
          tour:tours!reviews_tour_id_fkey(id, title, slug, cover_image)
        `
        )
        .in('user_id', ids)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cursor) query = query.lt('created_at', cursor);
      const { data } = await query;
      for (const row of data || []) {
        const review = row as any;
        feedItems.push({
          id: `review:${review.id}`,
          type: 'review',
          created_at: review.created_at,
          actor: review.user || { id: review.user_id, username: null },
          payload: {
            review_id: review.id,
            rating: review.rating,
            text: review.text,
            tour: review.tour || null,
          },
        });
      }
    }

    if (types.includes('achievement')) {
      let query = serviceClient
        .from('achievements')
        .select(
          `
          id,
          user_id,
          badge_type,
          badge_name,
          badge_description,
          badge_icon_url,
          unlock_date,
          created_at,
          user:profiles!achievements_user_id_fkey(id, username, first_name, last_name, avatar_url)
        `
        )
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cursor) query = query.lt('created_at', cursor);
      const { data } = await query;
      for (const row of data || []) {
        const ach = row as any;
        feedItems.push({
          id: `achievement:${ach.id}`,
          type: 'achievement',
          created_at: ach.created_at,
          actor: ach.user || { id: ach.user_id, username: null },
          payload: {
            achievement_id: ach.id,
            badge_type: ach.badge_type,
            badge_name: ach.badge_name,
            badge_description: ach.badge_description,
            badge_icon_url: ach.badge_icon_url,
            unlock_date: ach.unlock_date,
          },
        });
      }
    }

    const sorted = feedItems.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const sliced = sorted.slice(0, limit);

    const postIds = sliced
      .filter((i) => i.type === 'post')
      .map((i) => (i.payload as { post_id?: string }).post_id)
      .filter((id): id is string => Boolean(id));
    if (postIds.length > 0) {
      const { data: viewerLikes } = await serviceClient
        .from('blog_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      const liked = new Set((viewerLikes || []).map((r) => (r as { post_id: string }).post_id));
      for (const item of sliced) {
        if (item.type !== 'post') continue;
        const p = item.payload as { post_id: string; liked_by_viewer?: boolean };
        p.liked_by_viewer = liked.has(p.post_id);
      }
    }

    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].created_at : null;

    return NextResponse.json({
      success: true,
      items: sliced,
      next_cursor: nextCursor,
    });
  } catch (error: any) {
    console.error('[feed] error', error);
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

