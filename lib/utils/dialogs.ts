// Утилиты для работы с диалогами
// Используются через React Context или глобальное состояние

// Утилиты для работы с диалогами (deprecated - используйте useDialog hook)
// Этот файл оставлен для обратной совместимости, но не используется в новой реализации

export type ConfirmCallback = (confirmed: boolean) => void;

let confirmCallback: ConfirmCallback | null = null;
let alertCallback: ((message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void) | null = null;

export const dialogUtils = {
  setConfirmHandler: (callback: ConfirmCallback) => {
    confirmCallback = callback;
  },
  setAlertHandler: (callback: (message: string, variant?: 'success' | 'error' | 'warning' | 'info') => void) => {
    alertCallback = callback;
  },
  confirm: (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (confirmCallback) {
        // Вызываем callback напрямую с результатом
        const result = window.confirm(message);
        confirmCallback(result);
        resolve(result);
      } else {
        // Fallback на стандартный confirm
        resolve(window.confirm(message));
      }
    });
  },
  alert: (message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (alertCallback) {
      alertCallback(message, variant);
    } else {
      // Fallback на стандартный alert
      window.alert(message);
    }
  },
};


