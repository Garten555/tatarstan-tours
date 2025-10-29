import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Подтвердите email | Туры по Татарстану',
  description: 'Проверьте вашу почту для подтверждения регистрации',
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-xl rounded-2xl p-8 text-center">
          {/* Иконка */}
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>

          {/* Заголовок */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Проверьте почту
          </h1>

          {/* Описание */}
          <p className="text-gray-600 mb-6">
            Мы отправили письмо с подтверждением на вашу почту.
            Пожалуйста, перейдите по ссылке в письме для активации аккаунта.
          </p>

          {/* Дополнительная информация */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Не получили письмо? Проверьте папку "Спам" или подождите несколько минут.
            </p>
          </div>

          {/* Кнопка назад */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

