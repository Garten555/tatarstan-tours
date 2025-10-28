import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

export default function TourNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <MapPinOff className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Тур не найден
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          К сожалению, тур с таким названием не существует или был удален.
        </p>
        <Link href="/tours">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
            Посмотреть все туры
          </button>
        </Link>
      </div>
    </div>
  );
}

