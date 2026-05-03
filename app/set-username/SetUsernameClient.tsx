'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Check, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  sanitizeUsernameInput,
  validateUsernameFormat,
  safeInternalRedirect,
} from '@/lib/profile/username';

export default function SetUsernameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalRedirect(searchParams.get('redirect'));

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);

  const usernameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            router.replace(`/auth/login?redirect=${encodeURIComponent('/set-username?redirect=' + encodeURIComponent(redirectTo))}`);
            return;
          }
          throw new Error(data.error || 'Не удалось загрузить профиль');
        }
        const uname = data.profile?.username?.trim();
        if (uname && !cancelled) {
          router.replace(redirectTo);
          return;
        }
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [redirectTo, router]);

  useEffect(() => {
    return () => {
      if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
    };
  }, []);

  const checkUsername = async (value: string) => {
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameError(formatError);
      setUsernameAvailable(false);
      return;
    }

    setUsernameError(null);
    setCheckingUsername(true);
    try {
      const response = await fetch(
        `/api/profile/check-username?username=${encodeURIComponent(value)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка проверки ника');
      }
      if (data.available) {
        setUsernameAvailable(true);
        setUsernameError(null);
      } else {
        setUsernameAvailable(false);
        setUsernameError(data.reason || 'Этот ник уже занят');
      }
    } catch (e: unknown) {
      setUsernameAvailable(null);
      setUsernameError(e instanceof Error ? e.message : 'Ошибка проверки');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);

    const cleanValue = sanitizeUsernameInput(value);
    setUsername(cleanValue);
    setUsernameAvailable(null);
    setUsernameError(null);

    if (cleanValue.length >= 3) {
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsername(cleanValue);
      }, 450);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatError = validateUsernameFormat(username);
    if (formatError) {
      toast.error(formatError);
      setUsernameError(formatError);
      return;
    }
    if (usernameAvailable === false || usernameAvailable === null) {
      toast.error(usernameError || 'Проверьте доступность ника');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          public_profile_enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось сохранить');
      }
      toast.success('Ник сохранён!');
      router.refresh();
      router.replace(redirectTo);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-gray-600 font-medium">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/60">
      <div className="w-full max-w-lg">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-xl shadow-emerald-900/10">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-[0.12]" />
          <div className="relative p-8 md:p-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700/90 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Туристический дневник
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                  Придумайте ник
                </h1>
              </div>
            </div>
            <p className="text-gray-600 mt-3 mb-8 leading-relaxed">
              Чтобы открыть ленту дневника и паспорт для друзей, нужен уникальный адрес профиля —
              латиницей, как в соцсетях. Его можно сменить позже в{' '}
              <Link href="/profile/settings" className="text-emerald-700 font-semibold hover:underline">
                настройках
              </Link>
              .
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-bold text-gray-800 mb-2">
                  Никнейм <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold select-none">
                    @
                  </span>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="например, maria-travel"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    disabled={saving}
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition font-semibold text-gray-900 placeholder:text-gray-400 disabled:opacity-60"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    ) : usernameAvailable === true && username.length >= 3 ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : null}
                  </div>
                </div>
                {usernameError && (
                  <p className="mt-2 text-sm font-medium text-red-600">{usernameError}</p>
                )}
                {usernameAvailable === true && !usernameError && username.length >= 3 && (
                  <p className="mt-2 text-sm font-medium text-emerald-700">Этот ник свободен</p>
                )}
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  3–30 символов: латиница, цифры, «-» и «_». Без пробелов и кириллицы — проверка как в
                  настройках профиля.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  checkingUsername ||
                  usernameAvailable !== true ||
                  username.length < 3
                }
                className="w-full py-4 rounded-xl font-black text-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-[1.01] active:scale-[0.99]"
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Сохраняем...
                  </span>
                ) : (
                  'Продолжить'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
