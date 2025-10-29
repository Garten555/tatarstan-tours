'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Edit, Trash2, Calendar, Users, DollarSign } from 'lucide-react';
import { useState } from 'react';

interface Tour {
  id: string;
  title: string;
  slug: string;
  price_per_person: number;
  tour_type: string;
  category: string;
  start_date: string;
  end_date: string;
  status: string;
  current_participants: number;
  max_participants: number;
  cover_image: string | null;
  created_at: string;
}

interface TourAdminListProps {
  tours: Tour[];
}

export default function TourAdminList({ tours }: TourAdminListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (tourId: string) => {
    if (!confirm('Are you sure you want to delete this tour?')) {
      return;
    }

    setDeletingId(tourId);

    try {
      const response = await fetch(`/api/admin/tours/${tourId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tour');
      }

      window.location.reload();
    } catch (error) {
      console.error('Error deleting tour:', error);
      alert('Failed to delete tour');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (tours.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600 text-lg">No tours yet. Create your first tour!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => (
        <div
          key={tour.id}
          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
        >
          {/* Cover Image */}
          <div className="relative h-48 bg-gray-200">
            {tour.cover_image ? (
              <Image
                src={tour.cover_image}
                alt={tour.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
            <span
              className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                tour.status
              )}`}
            >
              {tour.status}
            </span>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {tour.title}
            </h3>

            {/* Stats */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{tour.price_per_person} ₽ / person</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>
                  {tour.current_participants} / {tour.max_participants} participants
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(tour.start_date).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link
                href={`/admin/tours/${tour.id}/edit`}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => handleDelete(tour.id)}
                disabled={deletingId === tour.id}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deletingId === tour.id ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

