'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Eye, 
  X, 
  Upload,
  Loader2,
  Image as ImageIcon,
  FileText,
  MapPin,
  Tag,
  Globe,
  Lock,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';

interface BlogEditorProps {
  post?: any;
  tourId?: string;
  bookingId?: string;
}

export default function BlogEditor({ post, tourId, bookingId }: BlogEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  // Основные поля
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [content, setContent] = useState(post?.content || '');
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || null);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  // Метаданные
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(post?.status || 'draft');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>(post?.visibility || 'public');
  const [featured, setFeatured] = useState(post?.featured || false);
  const [pinned, setPinned] = useState(post?.pinned || false);
  
  // Связи
  const [categoryId, setCategoryId] = useState(post?.category_id || '');
  const [locationTags, setLocationTags] = useState<string[]>(post?.location_tags || []);
  const [newLocationTag, setNewLocationTag] = useState('');
  
  // Данные для выбора
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    if (tourId) {
      loadTourData();
    }
  }, [tourId]);

  // Автогенерация slug из title
  useEffect(() => {
    if (!post && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[абвгдеёжзийклмнопрстуфхцчшщъыьэюя]/g, (char: string) => {
          const map: Record<string, string> = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return map[char] || char;
        })
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
      setSlug(generatedSlug);
    }
  }, [title, post]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/blog/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const loadTourData = async () => {
    const tourIdToLoad = tourId;
    if (!tourIdToLoad) return;
    try {
      const response = await fetch(`/api/tours/${tourIdToLoad}`);
      const data = await response.json();
      if (data.success && data.tour) {
        // Автозаполнение данных из тура
        if (!title) {
          setTitle(`Мое путешествие: ${data.tour.title}`);
        }
        if (data.tour.city?.name && !locationTags.includes(data.tour.city.name)) {
          setLocationTags([...locationTags, data.tour.city.name]);
        }
        // Tour ID уже установлен через пропс
      }
    } catch (error) {
      console.error('Ошибка загрузки данных тура:', error);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5 МБ');
      return;
    }

    try {
      setUploadingCover(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'blog-covers');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCoverImageUrl(data.url);
        toast.success('Обложка загружена');
      } else {
        throw new Error(data.error || 'Ошибка загрузки');
      }
    } catch (error: any) {
      console.error('Ошибка загрузки обложки:', error);
      toast.error(error.message || 'Ошибка загрузки обложки');
    } finally {
      setUploadingCover(false);
    }
  };

  const addLocationTag = () => {
    if (newLocationTag.trim() && !locationTags.includes(newLocationTag.trim())) {
      setLocationTags([...locationTags, newLocationTag.trim()]);
      setNewLocationTag('');
    }
  };

  const removeLocationTag = (tag: string) => {
    setLocationTags(locationTags.filter(t => t !== tag));
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) {
      toast.error('Введите заголовок поста');
      return;
    }

    if (!slug.trim()) {
      toast.error('Введите slug поста');
      return;
    }

    try {
      if (publish) {
        setPublishing(true);
      } else {
        setSaving(true);
      }

      const url = post ? `/api/blog/posts/${post.id}` : '/api/blog/posts';
      const method = post ? 'PATCH' : 'POST';

      const body: any = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim() || null,
        cover_image_url: coverImageUrl,
        status: publish ? 'published' : status,
        visibility,
        featured,
        pinned,
        category_id: categoryId || null,
        location_tags: locationTags,
        tour_id: tourId || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить пост');
      }

      toast.success(publish ? 'Пост опубликован!' : 'Пост сохранен');
      
      if (!post) {
        // После создания перенаправляем на страницу просмотра или редактирования
        const authorUsername = data.post?.user?.username || data.post?.user_id;
        if (publish) {
          router.push(`/users/${authorUsername}/blog/${data.post.slug}`);
        } else {
          router.push(`/users/${authorUsername}/blog/${data.post.slug}/edit`);
        }
      } else {
        if (publish) {
          const authorUsername = data.post?.user?.username || data.post?.user_id;
          router.push(`/users/${authorUsername}/blog/${data.post.slug}`);
        } else {
          router.refresh();
        }
      }
    } catch (error: any) {
      console.error('Ошибка сохранения поста:', error);
      toast.error(error.message || 'Ошибка сохранения поста');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8">
      {/* Заголовок и slug */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Заголовок поста *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Путешествие по Казани"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Slug (URL) *
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="puteshestvie-po-kazani"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Используется в URL поста. Только латинские буквы, цифры и дефисы.
        </p>
      </div>

      {/* Краткое описание */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Краткое описание (excerpt)
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Краткое описание поста (200-300 символов)"
          rows={3}
          maxLength={300}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {excerpt.length}/300 символов
        </p>
      </div>

      {/* Обложка */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Обложка поста
        </label>
        {coverImageUrl ? (
          <div className="relative">
            <img
              src={coverImageUrl}
              alt="Обложка"
              className="w-full h-64 object-cover rounded-xl"
            />
            <button
              onClick={() => setCoverImageUrl(null)}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
              </p>
              <p className="text-xs text-gray-500">PNG, JPG до 5 МБ</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={uploadingCover}
            />
          </label>
        )}
        {uploadingCover && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка...
          </div>
        )}
      </div>

      {/* Содержание */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Содержание поста *
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Расскажите о вашем путешествии..."
          rows={15}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Поддерживается HTML разметка
        </p>
      </div>

      {/* Категория */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Категория
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Локации */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Локации (теги мест)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newLocationTag}
            onChange={(e) => setNewLocationTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocationTag())}
            placeholder="Например: Казань"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addLocationTag}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Добавить
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {locationTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
            >
              <MapPin className="w-4 h-4" />
              {tag}
              <button
                onClick={() => removeLocationTag(tag)}
                className="hover:text-emerald-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Настройки */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки публикации</h3>
        
        <div className="space-y-4">
          {/* Видимость */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Видимость
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setVisibility('public')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                  visibility === 'public'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Globe className="w-5 h-5" />
                Публичный
              </button>
              <button
                onClick={() => setVisibility('friends')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                  visibility === 'friends'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Users className="w-5 h-5" />
                Друзья
              </button>
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                  visibility === 'private'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Lock className="w-5 h-5" />
                Приватный
              </button>
            </div>
          </div>

          {/* Статус */}
          {post && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </select>
            </div>
          )}

          {/* Дополнительные опции */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Избранный пост</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Закрепить</span>
            </label>
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || publishing}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Сохранить как черновик
            </>
          )}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || publishing}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Публикация...
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              Опубликовать
            </>
          )}
        </button>
      </div>
    </div>
  );
}

