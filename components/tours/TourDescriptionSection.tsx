type TourDescriptionSectionProps = {
  html: string;
};

export default function TourDescriptionSection({ html }: TourDescriptionSectionProps) {
  return (
    <section className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-5 md:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-5 md:mb-6 lg:mb-8 pb-3 sm:pb-4 border-b-2 border-gray-200">Описание тура</h2>
      <div
        className="max-w-none text-gray-700 break-words [overflow-wrap:anywhere] w-full prose prose-lg prose-emerald"
        style={{ 
          fontSize: 'clamp(14px, 1.5vw, 1.25rem)', 
          lineHeight: '1.8',
          fontWeight: '500'
        }}
        dangerouslySetInnerHTML={{ 
          __html: html
            .replace(/<p>/g, '<p style="font-size: clamp(14px, 1.5vw, 1.25rem); line-height: 1.8; margin-bottom: 1rem; font-weight: 500; color: rgb(55 65 81);">')
            .replace(/<ul>/g, '<ul style="font-size: clamp(14px, 1.5vw, 1.25rem); line-height: 1.8; margin-bottom: 1rem; padding-left: 1.5rem; font-weight: 500; color: rgb(55 65 81);">')
            .replace(/<ol>/g, '<ol style="font-size: clamp(14px, 1.5vw, 1.25rem); line-height: 1.8; margin-bottom: 1rem; padding-left: 1.5rem; font-weight: 500; color: rgb(55 65 81);">')
            .replace(/<li>/g, '<li style="font-size: clamp(14px, 1.5vw, 1.25rem); line-height: 1.8; margin-bottom: 0.5rem; font-weight: 500; color: rgb(55 65 81);">')
            .replace(/<h1>/g, '<h1 style="font-size: clamp(20px, 4vw, 2.5rem); line-height: 1.3; margin-bottom: 1rem; margin-top: 1.5rem; font-weight: 900; color: rgb(17 24 39);">')
            .replace(/<h2>/g, '<h2 style="font-size: clamp(18px, 3.5vw, 2rem); line-height: 1.3; margin-bottom: 0.875rem; margin-top: 1.25rem; font-weight: 900; color: rgb(17 24 39);">')
            .replace(/<h3>/g, '<h3 style="font-size: clamp(16px, 3vw, 1.75rem); line-height: 1.3; margin-bottom: 0.625rem; margin-top: 1rem; font-weight: 900; color: rgb(17 24 39);">')
        }}
      />
    </section>
  );
}

