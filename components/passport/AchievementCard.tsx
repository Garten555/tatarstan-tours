'use client';

import { useState } from 'react';
import Image from 'next/image';
import { escapeHtml } from '@/lib/utils/sanitize';
import AchievementModal from './AchievementModal';

type AchievementCardProps = {
  achievement: {
    id: string;
    badge_type: string;
    badge_name: string;
    badge_description: string | null;
    badge_icon_url: string | null;
    tour_id: string | null;
    diary_id: string | null;
    unlock_date: string;
    verification_data: any;
    tour?: {
      id: string;
      title: string;
      slug: string;
      cover_image?: string | null;
    } | null;
    diary?: {
      id: string;
      title: string;
    } | null;
  };
  achievementStyle: {
    icon: string;
    bg: string;
    border: string;
  };
};

export default function AchievementCard({ achievement, achievementStyle }: AchievementCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`text-center p-5 bg-gradient-to-br ${achievementStyle.bg} rounded-2xl border-2 ${achievementStyle.border} hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer w-full`}
        title="Нажмите, чтобы узнать больше"
      >
        {achievement.badge_icon_url ? (
          <Image
            src={achievement.badge_icon_url}
            alt={escapeHtml(achievement.badge_name)}
            width={72}
            height={72}
            className="mx-auto mb-3"
          />
        ) : (
          <div className="w-18 h-18 bg-white/90 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border-2 border-white shadow-md">
            {achievementStyle.icon}
          </div>
        )}
        <div className="text-base font-bold text-gray-900">
          {escapeHtml(achievement.badge_name)}
        </div>
      </button>

      <AchievementModal
        isOpen={isModalOpen}
        achievement={achievement}
        achievementStyle={achievementStyle}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}






