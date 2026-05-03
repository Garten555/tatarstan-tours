'use client';

// Компонент галереи в комнате тура
import { useState, useEffect, useMemo } from 'react';
import { TourRoomMedia } from '@/types';
import { Upload, Download, Trash2, Image as ImageIcon, Video, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import VideoPlayer from '@/components/tours/VideoPlayer';
import ImageViewerModal from '@/components/common/ImageViewerModal';
import UploadProgressBar from '@/components/common/UploadProgressBar';
import { uploadFormDataWithProgress } from '@/lib/http/upload-form-progress';

interface TourRoomGalleryProps {
  roomId: string;
  tourEndDate: string | null;
  variant?: 'default' | 'embedded';
  /** Текущий пользователь — чтобы показывать «Удалить» только при праве */
  viewerUserId?: string;
  /** Гид или админ — может удалять любые медиа в комнате */
  canModerateGallery?: boolean;
}

function sanitizeDownloadFilename(name: string, fallback: string): string {
  const base = name.trim().slice(0, 180) || fallback;
  return base.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim() || fallback;
}

function photoExtensionFromMime(mime: string | null | undefined): string {
  if (mime?.includes('png')) return '.png';
  if (mime?.includes('webp')) return '.webp';
  if (mime?.includes('gif')) return '.gif';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return '.jpg';
  return '.jpg';
}

function defaultPhotoFilename(item: TourRoomMedia): string {
  const fromUrl = (() => {
    try {
      const path = new URL(item.media_url).pathname.split('/').pop();
      if (path && /\.[a-z0-9]{2,5}$/i.test(path)) return path;
    } catch {
      /* ignore */
    }
    return '';
  })();
  const ext = photoExtensionFromMime(item.mime_type);
  const stem = `photo-${item.id.slice(0, 8)}`;
  if (fromUrl) return sanitizeDownloadFilename(fromUrl, `${stem}${ext}`);
  return `${stem}${ext}`;
}

function resolvePhotoDownloadFilename(item: TourRoomMedia): string {
  const fallback = defaultPhotoFilename(item);
  const raw = item.file_name?.trim();
  if (!raw) return fallback;
  const safe = sanitizeDownloadFilename(raw, fallback);
  if (/\.[a-z0-9]{2,5}$/i.test(safe)) return safe;
  return `${safe}${photoExtensionFromMime(item.mime_type)}`;
}

function videoExtensionFromMime(mime: string | null | undefined): string {
  if (!mime) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('quicktime')) return '.mov';
  if (mime.includes('avi')) return '.avi';
  return '.mp4';
}

/** Имя файла внутри ZIP (фото или видео комнаты тура). */
function resolveZipEntryName(item: TourRoomMedia, index: number): string {
  const prefix = `${String(index + 1).padStart(3, '0')}_`;
  if (item.media_type === 'video') {
    const raw = item.file_name?.trim();
    const fallback = `video-${item.id.slice(0, 8)}`;
    let base = raw ? sanitizeDownloadFilename(raw, fallback) : fallback;
    if (!/\.[a-z0-9]{2,5}$/i.test(base)) base = `${base}${videoExtensionFromMime(item.mime_type)}`;
    return `${prefix}${base}`;
  }
  return `${prefix}${resolvePhotoDownloadFilename(item)}`;
}

async function fetchRoomMediaFile(roomId: string, mediaId: string): Promise<Blob> {
  const res = await fetch(`/api/tour-rooms/${roomId}/media/${mediaId}/file`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.blob();
}

function saveBlobAsDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function TourRoomGallery({
  roomId,
  tourEndDate,
  variant = 'default',
  viewerUserId,
  canModerateGallery = false,
}: TourRoomGalleryProps) {
  const embedded = variant === 'embedded';
  const [media, setMedia] = useState<TourRoomMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  /** null — не загрузка; sending — уходит по сети; server — тело запроса отправлено, ждём ответ API */
  const [uploadPhase, setUploadPhase] = useState<'sending' | 'server' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'temporary' | 'archived'>('all');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [videoViewerMedia, setVideoViewerMedia] = useState<TourRoomMedia | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [zippingAll, setZippingAll] = useState(false);
  const [zipPackProgress, setZipPackProgress] = useState<{ done: number; total: number } | null>(null);
  const [zipCompressing, setZipCompressing] = useState(false);
  /** Что именно упаковываем — подпись прогресса */
  const [zipPackKind, setZipPackKind] = useState<'photos' | 'archive' | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);

  const imageUrls = useMemo(
    () => media.filter((m) => m.media_type === 'image').map((m) => m.media_url).filter(Boolean),
    [media]
  );

  const isTourEnded = tourEndDate ? new Date(tourEndDate) < new Date() : false;

  const canDeleteMediaItem = (item: TourRoomMedia) => {
    if (canModerateGallery) return true;
    if (viewerUserId == null) return true;
    return item.user_id === viewerUserId;
  };

  useEffect(() => {
    loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, filter]);

  useEffect(() => {
    if (!videoViewerMedia) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVideoViewerMedia(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoViewerMedia]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tour-rooms/${roomId}/media?filter=${filter}&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast.error('Разрешены только изображения и видео');
      return;
    }

    // Проверка размера
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Файл слишком большой. Максимум ${isVideo ? '100MB' : '10MB'}`);
      return;
    }

    try {
      setUploading(true);
      setUploadPhase('sending');
      setUploadProgress(null);
      setUploadingFileName(file.name.length > 40 ? `${file.name.slice(0, 37)}…` : file.name);
      const formData = new FormData();
      formData.append('file', file);

      const { ok, data } = await uploadFormDataWithProgress(
        `/api/tour-rooms/${roomId}/media`,
        formData,
        (p) => setUploadProgress(p),
        { onRequestBodySent: () => setUploadPhase('server') }
      );

      if (ok && data.success === true && data.media != null) {
        setMedia((prev) => [data.media as TourRoomMedia, ...prev]);
        toast.success('Медиа успешно загружено!');
      } else {
        toast.error((data.error as string) || 'Не удалось загрузить медиа');
      }
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
      toast.error('Ошибка загрузки медиа');
    } finally {
      setUploading(false);
      setUploadPhase(null);
      setUploadProgress(null);
      setUploadingFileName(null);
      e.target.value = '';
    }
  };

  const deleteMedia = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/media/${mediaId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        const deleted = media.find((m) => m.id === mediaId);
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
        if (deleted?.media_type === 'image' && imageViewerOpen) setImageViewerOpen(false);
        if (videoViewerMedia?.id === mediaId) setVideoViewerMedia(null);
        toast.success('Медиа удалено');
      } else {
        toast.error(data.error || 'Не удалось удалить медиа');
      }
    } catch (error) {
      console.error('Ошибка удаления медиа:', error);
      toast.error('Ошибка удаления медиа');
    }
  };

  const downloadArchive = async () => {
    if (zippingAll) return;
    setZippingAll(true);
    setZipPackKind('archive');
    setZipPackProgress(null);
    setZipCompressing(false);
    try {
      const res = await fetch(`/api/tour-rooms/${roomId}/media?filter=archived&limit=500`);
      const json = await res.json();
      if (!json.success) {
        toast.error((json.error as string) || 'Не удалось получить архивные медиа');
        return;
      }
      const items = ((json.media as TourRoomMedia[]) || []).filter(
        (m) =>
          (m.media_type === 'image' || m.media_type === 'video') && Boolean(m.media_url)
      );
      if (items.length === 0) {
        toast.error('В архиве комнаты пока нет фото и видео');
        return;
      }

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usedNames = new Set<string>();
      setZipPackProgress({ done: 0, total: items.length });

      let added = 0;
      let skipped = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const r = await fetch(`/api/tour-rooms/${roomId}/media/${item.id}/file`);
          if (!r.ok) {
            skipped++;
            continue;
          }
          const blob = await r.blob();
          let name = resolveZipEntryName(item, i);
          if (usedNames.has(name)) {
            name = `${String(i + 1).padStart(3, '0')}_${item.id.slice(0, 8)}_${resolveZipEntryName(item, i).replace(/^\d{3}_/, '')}`;
          }
          usedNames.add(name);
          zip.file(name, blob);
          added++;
        } catch {
          skipped++;
        }
        setZipPackProgress({ done: i + 1, total: items.length });
      }

      if (added === 0) {
        toast.error('Не удалось загрузить файлы архива');
        return;
      }

      setZipPackProgress(null);
      setZipCompressing(true);
      toast.loading('Создаём архив комнаты…', { id: 'zip-archive-room' });
      const out = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      toast.dismiss('zip-archive-room');
      setZipCompressing(false);

      const objectUrl = URL.createObjectURL(out);
      try {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `tour-room-${roomId.slice(0, 8)}-archive.zip`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      if (skipped > 0) {
        toast.success(`Архив готов (${skipped} из ${items.length} не вошли)`);
      } else {
        toast.success(`Скачано файлов в архиве: ${added}`);
      }
    } catch (e) {
      console.error(e);
      toast.dismiss('zip-archive-room');
      toast.error('Не удалось собрать архив комнаты');
    } finally {
      setZippingAll(false);
      setZipPackProgress(null);
      setZipCompressing(false);
      setZipPackKind(null);
    }
  };

  const downloadPhoto = async (item: TourRoomMedia, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (item.media_type !== 'image' || !item.media_url) return;
    const filename = resolvePhotoDownloadFilename(item);

    try {
      setDownloadingId(item.id);
      const blob = await fetchRoomMediaFile(roomId, item.id);
      saveBlobAsDownload(blob, filename);
      toast.success('Фото сохранено');
    } catch {
      try {
        window.open(item.media_url, '_blank', 'noopener,noreferrer');
        toast('Открыто в новой вкладке — сохраните файл через браузер', { icon: 'ℹ️' });
      } catch {
        toast.error('Не удалось скачать фото');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAllPhotosAsZip = async () => {
    if (zippingAll) return;
    setZippingAll(true);
    setZipPackKind('photos');
    setZipPackProgress(null);
    setZipCompressing(false);
    try {
      const res = await fetch(`/api/tour-rooms/${roomId}/media?filter=all&limit=500`);
      const json = await res.json();
      if (!json.success) {
        toast.error((json.error as string) || 'Не удалось получить список фото');
        return;
      }
      const images = ((json.media as TourRoomMedia[]) || []).filter(
        (m) => m.media_type === 'image' && Boolean(m.media_url)
      );
      if (images.length === 0) {
        toast.error('В комнате пока нет фото');
        return;
      }

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usedNames = new Set<string>();
      setZipPackProgress({ done: 0, total: images.length });

      let added = 0;
      let skipped = 0;
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        try {
          const r = await fetch(`/api/tour-rooms/${roomId}/media/${item.id}/file`);
          if (!r.ok) {
            skipped++;
            continue;
          }
          const blob = await r.blob();
          let name = resolveZipEntryName(item, i);
          if (usedNames.has(name)) {
            name = `${String(i + 1).padStart(3, '0')}_${item.id.slice(0, 8)}_${resolvePhotoDownloadFilename(item)}`;
          }
          usedNames.add(name);
          zip.file(name, blob);
          added++;
        } catch {
          skipped++;
        }
        setZipPackProgress({ done: i + 1, total: images.length });
      }

      if (added === 0) {
        toast.error('Не удалось загрузить файлы (проверьте сеть или CORS)');
        return;
      }

      setZipPackProgress(null);
      setZipCompressing(true);
      toast.loading('Создаём архив…', { id: 'zip-gallery' });
      const out = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      toast.dismiss('zip-gallery');
      setZipCompressing(false);

      const objectUrl = URL.createObjectURL(out);
      try {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `tour-room-${roomId.slice(0, 8)}-photos.zip`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      if (skipped > 0) {
        toast.success(`Архив готов (${skipped} из ${images.length} не вошли)`);
      } else {
        toast.success(`Скачано фото: ${added}`);
      }
    } catch (e) {
      console.error(e);
      toast.dismiss('zip-gallery');
      toast.error('Не удалось собрать архив');
    } finally {
      setZippingAll(false);
      setZipPackProgress(null);
      setZipCompressing(false);
      setZipPackKind(null);
    }
  };

  const pillInactive = embedded
    ? 'bg-white/[0.06] text-stone-300 ring-1 ring-white/10 hover:bg-white/10'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  const pillActive = embedded
    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-white/20'
    : 'bg-emerald-600 text-white';

  let uploadBarLabel = '';
  let uploadBarPercent: number | null = null;
  if (uploading && uploadPhase != null) {
    const nameSuffix = uploadingFileName ? ` · ${uploadingFileName}` : '';
    if (uploadPhase === 'server') {
      uploadBarLabel = `Сохраняем на сервере${nameSuffix}…`;
      uploadBarPercent = null;
    } else if (uploadProgress !== null) {
      uploadBarLabel = `Загрузка${nameSuffix}`;
      uploadBarPercent = uploadProgress;
    } else {
      uploadBarLabel = `Отправляем файл${nameSuffix}`;
      uploadBarPercent = null;
    }
  }

  return (
    <div className={embedded ? 'text-stone-100' : ''}>
      {(uploading || zippingAll) && (
        <div
          className={`sticky top-0 z-[100] mb-4 space-y-2 ${
            embedded
              ? 'rounded-xl bg-stone-950/90 p-2 ring-2 ring-emerald-500/35 backdrop-blur-md'
              : 'rounded-xl bg-white/95 p-2 shadow-lg ring-2 ring-emerald-500/45 backdrop-blur-md'
          }`}
        >
          {uploading && (
            <UploadProgressBar
              label={uploadBarLabel}
              percent={uploadBarPercent}
              variant="emerald"
              tone={embedded ? 'embedded' : 'light'}
              sticky={false}
            />
          )}
          {zippingAll && zipPackProgress && !zipCompressing && (
            <UploadProgressBar
              label={`${
                zipPackKind === 'archive'
                  ? 'Скачиваем файлы архива комнаты'
                  : 'Скачиваем фото для архива'
              }: ${zipPackProgress.done} / ${zipPackProgress.total}`}
              percent={
                zipPackProgress.total
                  ? Math.round((100 * zipPackProgress.done) / zipPackProgress.total)
                  : 0
              }
              variant="amber"
              tone={embedded ? 'embedded' : 'light'}
            />
          )}
          {zippingAll && zipCompressing && (
            <UploadProgressBar
              label="Упаковка ZIP (почти готово)…"
              percent={null}
              variant="amber"
              tone={embedded ? 'embedded' : 'light'}
              indeterminateStyle="shuttle"
            />
          )}
        </div>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              filter === 'all' ? pillActive : pillInactive
            }`}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setFilter('temporary')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              filter === 'temporary' ? pillActive : pillInactive
            }`}
          >
            Временные
          </button>
          <button
            type="button"
            onClick={() => setFilter('archived')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              filter === 'archived' ? pillActive : pillInactive
            }`}
          >
            Архив
          </button>
        </div>

        {/* Отдельная полоса действий — всегда на всю ширину, чтобы «Скачать всё» не терялось при переносе строк */}
        <div
          className={`flex w-full min-w-0 flex-wrap items-stretch gap-2 border-t pt-3 sm:items-center sm:justify-between ${
            embedded ? 'border-white/10' : 'border-gray-200'
          }`}
          role="toolbar"
          aria-label="Загрузка и скачивание"
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-initial sm:justify-end">
            <button
              type="button"
              onClick={() => void downloadAllPhotosAsZip()}
              disabled={zippingAll || uploading}
              title="Скачать все фото комнаты одним ZIP-архивом"
              className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                embedded
                  ? 'bg-emerald-600 text-white ring-1 ring-emerald-400/35 hover:bg-emerald-500'
                  : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
              }`}
            >
              {zippingAll ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Download className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              )}
              <span className="whitespace-normal text-left leading-snug sm:whitespace-nowrap">
                Скачать все фото
              </span>
              <span
                className={`hidden rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline ${
                  embedded ? 'bg-white/15 text-emerald-50' : 'bg-emerald-500/90 text-white'
                }`}
              >
                ZIP
              </span>
            </button>
            {isTourEnded && filter === 'archived' && (
              <button
                type="button"
                onClick={downloadArchive}
                className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                  embedded
                    ? 'bg-white/[0.08] text-stone-100 ring-1 ring-white/15 hover:bg-white/12'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Скачать архив</span>
              </button>
            )}
          </div>
          {!isTourEnded && (
            <label
              className={`flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white sm:ml-auto ${
                embedded
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 ring-1 ring-white/20 hover:from-emerald-500 hover:to-teal-500'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span>{uploading ? 'Загрузка...' : 'Загрузить'}</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {loading ? (
        <div className={`py-16 text-center text-sm ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
          Загрузка галереи...
        </div>
      ) : media.length === 0 ? (
        <div
          className={`rounded-2xl border py-16 text-center text-sm ${
            embedded ? 'border-white/10 bg-white/[0.03] text-stone-400' : 'text-gray-500'
          }`}
        >
          {filter === 'temporary' && !isTourEnded
            ? 'Пока нет временных медиа. Загрузите фото или видео!'
            : filter === 'archived'
              ? 'Архив пуст'
              : 'Галерея пуста'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
            <div
              key={item.id}
              className={`group relative cursor-pointer overflow-hidden ${
                embedded
                  ? 'rounded-2xl ring-1 ring-white/10 transition hover:ring-emerald-500/40'
                  : 'rounded-xl'
              }`}
              onClick={() => {
                if (item.media_type === 'image') {
                  const idx = media.filter((m) => m.media_type === 'image').findIndex((m) => m.id === item.id);
                  if (idx >= 0) {
                    setImageViewerIndex(idx);
                    setImageViewerOpen(true);
                  }
                } else {
                  setVideoViewerMedia(item);
                }
              }}
            >
              {item.media_type === 'image' ? (
                <img
                  src={item.media_url}
                  alt={item.file_name || 'Изображение'}
                  className={`h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-48 ${
                    embedded ? 'rounded-2xl' : 'rounded-lg'
                  }`}
                />
              ) : (
                <div
                  className={`relative flex h-44 w-full items-center justify-center bg-gray-900 sm:h-48 ${
                    embedded ? 'rounded-2xl' : 'rounded-lg'
                  }`}
                >
                  <Video className="h-12 w-12 text-white/90" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {(item.media_type === 'image' || canDeleteMediaItem(item)) && (
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between gap-2">
                  {item.media_type === 'image' ? (
                    <button
                      type="button"
                      onClick={(e) => downloadPhoto(item, e)}
                      disabled={downloadingId === item.id}
                      title="Скачать фото на устройство"
                      aria-label="Скачать фото"
                      className={`pointer-events-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold shadow-lg ring-2 transition hover:scale-[1.02] disabled:opacity-55 sm:text-sm ${
                        embedded
                          ? 'bg-emerald-600 text-white ring-white/30 hover:bg-emerald-500'
                          : 'bg-white text-emerald-800 ring-gray-200 hover:bg-emerald-50'
                      }`}
                    >
                      <Download className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" strokeWidth={2.25} />
                      <span className="max-[380px]:sr-only">Скачать</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  {canDeleteMediaItem(item) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMedia(item.id);
                      }}
                      title="Удалить"
                      aria-label="Удалить"
                      className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-2 ring-white/30 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              )}

              <div className="absolute left-2 top-2">
                {item.media_type === 'image' ? (
                  <div className="rounded-lg bg-emerald-600/90 px-2 py-1 text-xs text-white backdrop-blur-sm">
                    <ImageIcon className="mr-1 inline h-3 w-3" />
                    Фото
                  </div>
                ) : (
                  <div className="rounded-lg bg-sky-600/90 px-2 py-1 text-xs text-white backdrop-blur-sm">
                    <Video className="mr-1 inline h-3 w-3" />
                    Видео
                  </div>
                )}
              </div>

              {item.is_temporary ? (
                <div className="absolute right-2 top-2 rounded-lg bg-amber-500/95 px-2 py-1 text-xs text-white backdrop-blur-sm">
                  Временное
                </div>
              ) : (
                <div className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white backdrop-blur-sm ring-1 ring-white/10">
                  Архив
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ImageViewerModal
        isOpen={imageViewerOpen}
        images={imageUrls}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerOpen(false)}
        onDownloadCurrent={(idx) => {
          const imgs = media.filter((m) => m.media_type === 'image');
          const item = imgs[idx];
          if (item) void downloadPhoto(item);
        }}
        downloadBusy={downloadingId !== null}
      />

      {videoViewerMedia && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4"
          role="presentation"
          onClick={() => setVideoViewerMedia(null)}
        >
          <button
            type="button"
            onClick={() => setVideoViewerMedia(null)}
            className="absolute top-4 right-4 z-[160] rounded-full p-3 md:p-4 transition-all duration-300 hover:scale-110 min-w-[52px] min-h-[52px] flex items-center justify-center"
            aria-label="Закрыть"
            style={{
              background: 'linear-gradient(to bottom right, #ffffff, #f3f4f6)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.8)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
            }}
          >
            <X className="w-6 h-6 md:w-7 md:h-7" strokeWidth={3.5} style={{ color: '#111827' }} />
          </button>
          <div className="relative max-h-[90vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <VideoPlayer
              src={videoViewerMedia.media_url}
              mimeType={videoViewerMedia.mime_type || undefined}
              title={videoViewerMedia.file_name || 'Видео'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

