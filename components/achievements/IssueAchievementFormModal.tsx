'use client';

import { createPortal } from 'react-dom';
import { Award, X } from 'lucide-react';
import AchievementAwardPicker from '@/components/achievements/AchievementAwardPicker';
import type { GuideIssueAchievement } from '@/lib/achievements/guide-issue-metadata';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

export type IssueAchievementFormModalProps = {
  open: boolean;
  onClose: () => void;
  achievements: GuideIssueAchievement[];
  awarding: boolean;
  onSelect: (achievement: GuideIssueAchievement) => void;
  embedded?: boolean;
  listMaxHeightClass?: string;
  title?: string;
  overlay?: 'standard' | 'tourRoomOverlay';
};

/**
 * Единая форма выдачи достижения: модалка + AchievementAwardPicker.
 */
export default function IssueAchievementFormModal({
  open,
  onClose,
  achievements,
  awarding,
  onSelect,
  embedded = false,
  listMaxHeightClass = 'max-h-[min(58vh,560px)]',
  title = 'Выдать достижение',
  overlay = 'standard',
}: IssueAchievementFormModalProps) {
  useBodyScrollLock(open);

  if (!open || typeof document === 'undefined') return null;

  const titleId = 'issue-achievement-form-modal-title';
  const highZ = overlay === 'tourRoomOverlay';

  const card = (
    <div
      className={`relative w-full max-h-[min(92vh,880px)] overflow-y-auto rounded-3xl p-6 shadow-2xl ring-1 sm:p-8 ${
        embedded
          ? 'border border-white/10 bg-[#141c19] text-stone-100 ring-white/10'
          : 'bg-white shadow-2xl ring-black/5'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4 sm:mb-6">
        <h3
          id={titleId}
          className={`flex items-center gap-2 sm:gap-3 ${
            embedded ? 'text-xl font-bold text-white sm:text-2xl' : 'text-2xl font-black text-gray-900 md:text-3xl'
          }`}
        >
          <Award className={`h-7 w-7 shrink-0 ${embedded ? 'text-amber-400' : 'text-amber-600'}`} />
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded-full p-2 transition ${
            embedded
              ? 'text-stone-500 hover:bg-white/10 hover:text-white'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
          }`}
          aria-label="Закрыть"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <AchievementAwardPicker
        achievements={achievements}
        awarding={awarding}
        onSelect={onSelect}
        embedded={embedded}
        listMaxHeightClass={listMaxHeightClass}
      />
    </div>
  );

  const modal =
    overlay === 'tourRoomOverlay' ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 isolate overflow-y-auto overscroll-contain"
        style={{ zIndex: 2147483646 }}
      >
        <button
          type="button"
          className="fixed inset-0 z-0 bg-black/70 backdrop-blur-sm"
          aria-label="Закрыть"
          onClick={onClose}
        />
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative w-full max-w-xl sm:max-w-2xl">{card}</div>
        </div>
      </div>
    ) : (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      >
        <div className="relative w-full max-w-xl sm:max-w-2xl md:max-w-3xl">{card}</div>
      </div>
    );

  return createPortal(modal, document.body);
}
