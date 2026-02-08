import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Сброс пароля',
  description: 'Восстановление доступа к аккаунту',
};

export default function ResetPasswordPage() {
  // Не делаем редирект на сервере, т.к. recovery токен в hash фрагменте (не доступен на сервере)
  // Проверка выполняется в компоненте ResetPasswordForm СРАЗУ при монтировании
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl animate-float-slow" />
      <div className="absolute top-40 -right-20 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl animate-float" />
      <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl animate-float-slower" />

      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_1px_1px,_rgb(16,185,129)_1px,_transparent_0)] bg-[length:28px_28px]" />

      <div className="relative z-10">
        <ResetPasswordForm />
      </div>
    </div>
  );
}


