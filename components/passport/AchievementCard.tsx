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
  viewerIsOwner?: boolean;
  profileUsername?: string | null;
};

export default function AchievementCard({
  achievement,
  achievementStyle,
  viewerIsOwner = true,
  profileUsername = null,
}: AchievementCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`text-center p-5 bg-gradient-to-br ${achievementStyle.bg} rounded-2xl border-2 ${achievementStyle.border} hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer w-full`}
        title="Открыть достижение"
      >
        {achievement.badge_icon_url ? (
          <Image
            src={achievement.badge_icon_url}
            alt={escapeHtml(achievement.badge_name)}
            width={72}
            height={72}
            className="mx-auto mb-3 h-[4.5rem] w-[4.5rem] object-contain"
          />
        ) : (
          <div className="mx-auto mb-3 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-md">
            <span className="select-none text-[2.75rem] leading-none" role="img" aria-hidden>
              {achievementStyle.icon}
            </span>
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
        viewerIsOwner={viewerIsOwner}
        profileUsername={profileUsername}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}






