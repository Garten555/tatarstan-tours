'use client';

import { Download } from 'lucide-react';
import { isValidIframeUrl } from '@/lib/security/iframe-validator';

interface ExportMapButtonProps {
  tours: Array<{
    tour: {
      title: string;
      yandex_map_url?: string | null;
      start_date: string;
    };
  }>;
  username: string | null;
}

export function ExportMapButton({ tours, username }: ExportMapButtonProps) {
  const handleExport = () => {
    // Фильтруем только валидные карты
    const mapData = tours
      .filter((b) => b.tour?.yandex_map_url && isValidIframeUrl(b.tour.yandex_map_url))
      .map((b) => ({
        title: b.tour.title,
        mapUrl: b.tour.yandex_map_url,
        date: b.tour.start_date,
      }));
    
    if (mapData.length === 0) {
      alert('Нет туров с валидными картами для экспорта');
      return;
    }
    
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tours-map-${username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      <Download className="w-4 h-4" />
      Экспорт карты
    </button>
  );
}

