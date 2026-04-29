'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';

interface PassportHeaderEditorProps {
  fullName: string;
  initialAvatarUrl: string | null;
  initialCoverUrl: string | null;
  achievementsCount: number;
  completedToursCount: number;
  locationsCount: number;
  reputationScore: number;
}

export default function PassportHeaderEditor({
  fullName,
  initialAvatarUrl,
  initialCoverUrl,
  achievementsCount,
  completedToursCount,
  locationsCount,
  reputationScore,
}: PassportHeaderEditorProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const finalAvatar = useMemo(() => avatarPreview || avatarUrl, [avatarPreview, avatarUrl]);
  const finalCover = useMemo(() => coverPreview || coverUrl, [coverPreview, coverUrl]);

  const resetModalState = () => {
    setAvatarFile(null);
    setCoverFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setAvatarPreview(null);
    setCoverPreview(null);
    setError(null);
  };

  const onSelectImage = (
    event: ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'cover'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Разрешены только JPG, PNG и WEBP');
      return;
    }

    const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(type === 'avatar' ? 'Аватар: максимум 5MB' : 'Шапка: максимум 8MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'avatar') {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(previewUrl);
      setCoverFile(file);
    }
  };

  const saveChanges = async () => {
    if (!avatarFile && !coverFile) {
      setError('Выберите аватар и/или шапку для изменения');
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Не удалось обновить аватар');
        setAvatarUrl(data.url || null);
      }

      if (coverFile) {
        const fd = new FormData();
        fd.append('file', coverFile);
        const res = await fetch('/api/profile/cover', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Не удалось обновить шапку');
        setCoverUrl(data.url || null);
      }

      resetModalState();
      setIsModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обновления');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="relative h-64 md:h-80">
          {finalCover ? (
            <>
              <Image src={finalCover} alt="Шапка паспорта" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/20" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600" />
              <div className="absolute inset-0 bg-[url('/hero-tatarstan.jpg')] bg-cover bg-center opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/30 to-emerald-900/50" />
            </>
          )}

          <div className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={() => {
                resetModalState();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-50/95 hover:bg-emerald-100 text-emerald-950 px-3.5 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Настроить шапку и аватар
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-20 pb-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                {finalAvatar ? (
                  <Image src={finalAvatar} alt={fullName} width={160} height={160} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black">
                    {fullName[0]?.toUpperCase() || 'П'}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{fullName}</h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <span className="font-semibold">Туристический паспорт</span>
              </div>

              <div className="flex flex-wrap gap-4 md:gap-6 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Достижения</div>
                    <div className="text-lg font-black text-gray-900">{achievementsCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Туры</div>
                    <div className="text-lg font-black text-gray-900">{completedToursCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Места</div>
                    <div className="text-lg font-black text-gray-900">{locationsCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Очки опыта</div>
                    <div className="text-lg font-black text-emerald-700">{reputationScore || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-black text-gray-900">Сменить шапку и аватар</h3>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  resetModalState();
                  setIsModalOpen(false);
                }}
                disabled={isSaving}
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div className="relative h-44">
                  {finalCover ? (
                    <Image src={finalCover} alt="Превью шапки" fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600" />
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-white">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <Upload className="w-4 h-4" />
                    Выбрать шапку
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow overflow-hidden bg-gray-100">
                  {finalAvatar ? (
                    <Image src={finalAvatar} alt="Превью аватара" width={96} height={96} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-black">
                      {fullName[0]?.toUpperCase() || 'П'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Upload className="w-4 h-4" />
                  Выбрать аватар
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-white"
                onClick={() => {
                  resetModalState();
                  setIsModalOpen(false);
                }}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => onSelectImage(e, 'cover')}
              className="hidden"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => onSelectImage(e, 'avatar')}
              className="hidden"
            />
          </div>
        </div>
      )}
    </>
  );
}
