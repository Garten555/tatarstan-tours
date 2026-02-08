'use client';

import { useState, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';
import PromptDialog from '@/components/ui/PromptDialog';

export function useDialog() {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onClose: () => {},
  });

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    placeholder: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((
    message: string,
    title: string = 'Подтвердите действие',
    variant: 'danger' | 'warning' | 'info' = 'danger',
    confirmText: string = 'OK',
    cancelText: string = 'Отмена'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        variant,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const alert = useCallback((
    message: string,
    title: string = 'Уведомление',
    variant: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        variant,
        onClose: () => {
          setAlertState((prev) => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  }, []);

  const prompt = useCallback((
    message: string,
    title: string = 'Ввод',
    placeholder: string = 'Введите значение...',
    defaultValue: string = ''
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        message,
        placeholder,
        defaultValue,
        onConfirm: (value) => {
          setPromptState((prev) => ({ ...prev, isOpen: false }));
          resolve(value);
        },
        onCancel: () => {
          setPromptState((prev) => ({ ...prev, isOpen: false }));
          resolve(null);
        },
      });
    });
  }, []);

  const DialogComponents = (
    <>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
      <AlertDialog
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
        onClose={alertState.onClose}
      />
      <PromptDialog
        isOpen={promptState.isOpen}
        title={promptState.title}
        message={promptState.message}
        placeholder={promptState.placeholder}
        defaultValue={promptState.defaultValue}
        onConfirm={promptState.onConfirm}
        onCancel={promptState.onCancel}
      />
    </>
  );

  return { confirm, alert, prompt, DialogComponents };
}

