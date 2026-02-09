'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  title?: string;
}

type PlyrInstance = {
  destroy: () => void;
  [key: string]: unknown;
};

export default function VideoPlayer({ src, mimeType }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<PlyrInstance | null>(null);
  const [isClient, setIsClient] = useState(false);

  const resolveMimeType = () => {
    if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
    const cleanSrc = src.split('?')[0].toLowerCase();
    if (cleanSrc.endsWith('.mp4')) return 'video/mp4';
    if (cleanSrc.endsWith('.webm')) return 'video/webm';
    if (cleanSrc.endsWith('.ogg') || cleanSrc.endsWith('.ogv')) return 'video/ogg';
    if (cleanSrc.endsWith('.mov')) return 'video/quicktime';
    return undefined;
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !videoRef.current || typeof window === 'undefined') return;

    // Уничтожаем старый плеер если есть
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // Динамический импорт Plyr только на клиенте
    import('plyr').then((PlyrModule) => {
      const Plyr = PlyrModule.default;
      
      if (!videoRef.current) return;

      // Перезагружаем источник перед инициализацией
      videoRef.current.load();

      // Инициализируем Plyr
      const player = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'pip',
        'airplay',
        'fullscreen',
      ],
      settings: ['quality', 'speed'],
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      },
      keyboard: {
        focused: true,
        global: false,
      },
      tooltips: {
        controls: true,
        seek: true,
      },
      i18n: {
        restart: 'Перезапустить',
        rewind: 'Перемотать назад',
        play: 'Воспроизвести',
        pause: 'Пауза',
        fastForward: 'Перемотать вперед',
        seek: 'Перейти',
        seekLabel: '{currentTime} из {duration}',
        played: 'Воспроизведено',
        buffered: 'Буферизовано',
        currentTime: 'Текущее время',
        duration: 'Длительность',
        volume: 'Громкость',
        mute: 'Отключить звук',
        unmute: 'Включить звук',
        enableCaptions: 'Включить субтитры',
        disableCaptions: 'Выключить субтитры',
        download: 'Скачать',
        enterFullscreen: 'Полноэкранный режим',
        exitFullscreen: 'Выйти из полноэкранного режима',
        frameTitle: 'Плеер для {title}',
        captions: 'Субтитры',
        settings: 'Настройки',
        pip: 'Картинка в картинке',
        menu: 'Меню',
        quality: 'Качество',
        loop: 'Зациклить',
        start: 'Начать',
        end: 'Конец',
        all: 'Все',
        reset: 'Сбросить',
        disabled: 'Отключено',
        enabled: 'Включено',
        advertisement: 'Реклама',
        qualityBadge: {
          2160: '4K',
          1440: 'HD',
          1080: 'HD',
          720: 'HD',
          576: 'SD',
          480: 'SD',
        },
      },
      });

      playerRef.current = player as unknown as PlyrInstance;
    }).catch((err) => {
      console.error('Plyr init error:', err);
    });

    // Очистка при размонтировании
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src, isClient]);

  return (
    <div className="plyr-container w-full">
      <video
        key={src}
        ref={videoRef}
        className="plyr w-full"
        playsInline
        controls
        preload="metadata"
      >
        {resolveMimeType() ? (
          <source src={src} type={resolveMimeType()} />
        ) : (
          <source src={src} />
        )}
        Ваш браузер не поддерживает видео.
      </video>
    </div>
  );
}

