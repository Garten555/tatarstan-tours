import VideoPlayer from '@/components/tours/VideoPlayer';

type TourVideoSectionProps = {
  videos: { id: string; media_url: string; mime_type?: string | null; file_name?: string | null }[];
};

export default function TourVideoSection({ videos }: TourVideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-6 md:mb-8 pb-4 border-b-2 border-gray-200">Видео о туре</h2>
      <div className="space-y-5 md:space-y-6 w-full">
        {videos.map((video) => (
          <div key={video.id} className="w-full rounded-xl bg-black shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-200">
            <div className="w-full">
              <VideoPlayer
                src={video.media_url}
                mimeType={video.mime_type || undefined}
                title={video.file_name || 'Видео тура'}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

