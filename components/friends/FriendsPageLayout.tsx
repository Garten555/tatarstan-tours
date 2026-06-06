import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  badge?: string;
  children: React.ReactNode;
};

export default function FriendsPageLayout({
  title,
  subtitle,
  backHref = '/',
  backLabel = 'На главную',
  badge = 'Друзья',
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-white py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 top-1/4 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl sm:h-96 sm:w-96" />
          <div className="absolute -left-32 bottom-1/4 h-72 w-72 rounded-full bg-purple-100/40 blur-3xl sm:h-96 sm:w-96" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <Link
            href={backHref}
            className="group mb-6 inline-flex items-center gap-2 text-gray-700 transition-all duration-200 hover:text-blue-600 sm:mb-8"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold sm:text-base md:text-lg">{backLabel}</span>
          </Link>

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-100/50 px-3 py-1.5 sm:mb-6 sm:px-4 sm:py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 sm:text-sm">
                {badge}
              </span>
            </div>

            <h1 className="mb-3 text-3xl font-black text-gray-900 sm:mb-5 sm:text-4xl md:text-5xl lg:text-6xl">
              {title}
            </h1>

            <p className="text-base font-medium leading-relaxed text-gray-600 sm:text-lg md:text-xl lg:text-2xl">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-6 sm:py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </section>
    </main>
  );
}
