'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, CheckCircle, XCircle, Copy, Download, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    backupCodesCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  
  // Состояние настройки
  const [setupData, setSetupData] = useState<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableCode, setShowDisableCode] = useState(false);
  const [disableCode, setDisableCode] = useState(['', '', '', '', '', '']);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status');
      const data = await response.json();
      if (data.success) {
        setStatus({
          enabled: data.enabled,
          backupCodesCount: data.backupCodesCount,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setSettingUp(true);
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setSetupData({
          qrCode: data.qrCode,
          secret: data.manualEntryKey,
          backupCodes: data.backupCodes,
        });
        toast.success('QR-код сгенерирован. Отсканируйте его в приложении-аутентификаторе.');
      } else {
        toast.error(data.error || 'Ошибка при настройке 2FA');
      }
    } catch (error) {
      toast.error('Ошибка при настройке 2FA');
    } finally {
      setSettingUp(false);
    }
  };

  const handleEnable = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    setEnabling(true);
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Двухфакторная аутентификация включена!');
        setSetupData(null);
        setVerificationCode(['', '', '', '', '', '']);
        await loadStatus();
      } else {
        toast.error(data.error || 'Неверный код');
        setVerificationCode(['', '', '', '', '', '']);
      }
    } catch (error) {
      toast.error('Ошибка при включении 2FA');
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    const code = disableCode.join('');
    if (code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    setDisabling(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Двухфакторная аутентификация отключена');
        setShowDisableCode(false);
        setDisableCode(['', '', '', '', '', '']);
        await loadStatus();
      } else {
        toast.error(data.error || 'Неверный код');
        setDisableCode(['', '', '', '', '', '']);
      }
    } catch (error) {
      toast.error('Ошибка при отключении 2FA');
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      toast.success('Секретный ключ скопирован');
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const content = `Резервные коды для двухфакторной аутентификации\n\n` +
      `Сохраните эти коды в безопасном месте. Каждый код можно использовать только один раз.\n\n` +
      setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n') +
      `\n\nЕсли вы потеряете доступ к приложению-аутентификатору, используйте эти коды для входа.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Резервные коды скачаны');
  };

  const handleCodeChange = (index: number, value: string, currentCode: string[], setCode: React.Dispatch<React.SetStateAction<string[]>>, prefix: string = 'code') => {
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...currentCode];
    newCode[index] = value;
    setCode(newCode);
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-900">Двухфакторная аутентификация</h2>
      </div>

      {/* Статус 2FA */}
      {status && (
        <div className={`p-5 rounded-xl border-2 ${
          status.enabled 
            ? 'bg-emerald-50 border-emerald-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.enabled ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-900">2FA включена</p>
                    <p className="text-sm text-emerald-700">
                      Резервных кодов: {status.backupCodesCount}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-gray-400" />
                  <div>
                    <p className="font-bold text-gray-700">2FA отключена</p>
                    <p className="text-sm text-gray-500">
                      Включите для дополнительной защиты аккаунта
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Настройка 2FA */}
      {!status?.enabled && !setupData && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium">
              Двухфакторная аутентификация добавляет дополнительный уровень безопасности. 
              После включения при каждом входе потребуется код из приложения-аутентификатора 
              (Google Authenticator, Authy и т.д.).
            </p>
          </div>
          <button
            onClick={handleSetup}
            disabled={settingUp}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 !text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {settingUp ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Настройка...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Настроить 2FA
              </>
            )}
          </button>
        </div>
      )}

      {/* QR-код и настройка */}
      {setupData && !status?.enabled && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-emerald-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Шаг 1: Отсканируйте QR-код
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Откройте приложение-аутентификатор (Google Authenticator, Authy и т.д.) 
              и отсканируйте этот QR-код:
            </p>
            <div className="flex justify-center mb-4">
              <img 
                src={setupData.qrCode} 
                alt="QR Code for 2FA" 
                className="border-2 border-gray-200 rounded-lg p-2 bg-white"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Или введите ключ вручную:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200">
                  {setupData.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Копировать"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Резервные коды */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-yellow-900">
                Шаг 2: Сохраните резервные коды
              </h3>
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="p-2 text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                {showBackupCodes ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-sm text-yellow-800 mb-4">
              Сохраните эти коды в безопасном месте. Каждый код можно использовать только один раз, 
              если вы потеряете доступ к приложению-аутентификатору.
            </p>
            {showBackupCodes && (
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="bg-white px-3 py-2 rounded border border-yellow-200 font-mono text-sm text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                <button
                  onClick={downloadBackupCodes}
                  className="w-full mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Скачать коды
                </button>
              </div>
            )}
          </div>

          {/* Подтверждение кода */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Шаг 3: Подтвердите код
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Введите 6-значный код из приложения-аутентификатора для активации 2FA:
            </p>
            <div className="flex justify-center gap-3 mb-4">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value, verificationCode, setVerificationCode, 'code')}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white shadow-sm text-gray-900"
                />
              ))}
            </div>
            <button
              onClick={handleEnable}
              disabled={enabling || verificationCode.join('').length !== 6}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 !text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {enabling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Активация...
                </>
              ) : (
                'Включить 2FA'
              )}
            </button>
            <button
              onClick={() => {
                setSetupData(null);
                setVerificationCode(['', '', '', '', '', '']);
              }}
              className="w-full mt-3 px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Отключение 2FA */}
      {status?.enabled && (
        <div className="space-y-4">
          {!showDisableCode ? (
            <button
              onClick={() => setShowDisableCode(true)}
              className="w-full bg-red-600 hover:bg-red-700 !text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl"
            >
              <XCircle className="w-5 h-5" />
              Отключить 2FA
            </button>
          ) : (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4">
                Отключение двухфакторной аутентификации
              </h3>
              <p className="text-sm text-red-800 mb-4">
                Для отключения 2FA введите код из приложения-аутентификатора или резервный код:
              </p>
              <div className="flex justify-center gap-3 mb-4">
                {disableCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`disable-code-${index}`}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value, disableCode, setDisableCode, 'disable-code')}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white shadow-sm text-gray-900"
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDisable}
                  disabled={disabling || disableCode.join('').length !== 6}
                  className="flex-1 bg-red-600 hover:bg-red-700 !text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {disabling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Отключение...
                    </>
                  ) : (
                    'Отключить 2FA'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowDisableCode(false);
                    setDisableCode(['', '', '', '', '', '']);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

