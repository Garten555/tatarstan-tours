'use client';

import { getPasswordStrengthText, getPasswordStrengthColor } from '@/lib/validation/auth';

interface PasswordStrengthIndicatorProps {
  strength: 'weak' | 'medium' | 'strong';
  percentage: number;
  show: boolean;
}

export default function PasswordStrengthIndicator({
  strength,
  percentage,
  show,
}: PasswordStrengthIndicatorProps) {
  if (!show || percentage === 0) return null;

  const colorClass = getPasswordStrengthColor(strength);
  const text = getPasswordStrengthText(strength);

  return (
    <div className="mt-2 space-y-2">
      {/* Прогресс-бар */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Текст и подсказки */}
      <div className="flex items-start justify-between text-xs">
        <span className={`font-medium ${
          strength === 'weak' ? 'text-red-600' :
          strength === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {text}
        </span>
        
        <span className="text-gray-500">
          {percentage}%
        </span>
      </div>

      {/* Подсказки для улучшения */}
      {strength !== 'strong' && (
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-medium">Для надёжного пароля используйте:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            {percentage < 30 && <li>Минимум 8 символов</li>}
            {!/[a-z]/.test('') && <li>Строчные буквы (a-z)</li>}
            {!/[A-Z]/.test('') && <li>Заглавные буквы (A-Z)</li>}
            {!/\d/.test('') && <li>Цифры (0-9)</li>}
            {!/[!@#$%^&*]/.test('') && <li>Специальные символы (!@#$%^&*)</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

