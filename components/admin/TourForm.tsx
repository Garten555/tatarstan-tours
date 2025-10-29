'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from './RichTextEditor';
import { Upload, Loader2, Save } from 'lucide-react';
import Image from 'next/image';

interface TourFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
}

export default function TourForm({ mode, initialData }: TourFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.cover_image || null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    short_desc: initialData?.short_desc || '',
    full_desc: initialData?.full_desc || '',
    tour_type: initialData?.tour_type || 'excursion',
    category: initialData?.category || 'history',
    price_per_person: initialData?.price_per_person || '',
    start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().slice(0, 16) : '',
    end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '',
    max_participants: initialData?.max_participants || 20,
    status: initialData?.status || 'draft',
  });

  // Generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-zа-яё0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim(),
    }));
  };

  // Handle cover image upload
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverImage(URL.createObjectURL(file));
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let coverImageUrl = coverImage;
      let coverImagePath = null;

      // Upload cover image if new file selected
      if (coverImageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', coverImageFile);
        uploadFormData.append('folder', 'tours/covers');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload cover image');
        }

        const uploadData = await uploadResponse.json();
        coverImageUrl = uploadData.url;
        coverImagePath = uploadData.path;
      }

      // Create/update tour
      const tourData = {
        ...formData,
        price_per_person: parseFloat(formData.price_per_person),
        max_participants: parseInt(formData.max_participants.toString()),
        cover_image: coverImageUrl,
        cover_path: coverImagePath || initialData?.cover_path,
      };

      const apiUrl = mode === 'create' 
        ? '/api/admin/tours'
        : `/api/admin/tours/${initialData.id}`;

      const response = await fetch(apiUrl, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tourData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save tour');
      }

      router.push('/admin/tours');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving tour:', error);
      alert(error.message || 'Failed to save tour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tour Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Казанский Кремль и Кул-Шариф"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug (URL) *
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="kazan-kremlin-kul-sharif"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tour Type *
          </label>
          <select
            required
            value={formData.tour_type}
            onChange={(e) => setFormData(prev => ({ ...prev, tour_type: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="excursion">Excursion</option>
            <option value="hiking">Hiking</option>
            <option value="cruise">Cruise</option>
            <option value="bus_tour">Bus Tour</option>
            <option value="walking_tour">Walking Tour</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="history">History</option>
            <option value="nature">Nature</option>
            <option value="culture">Culture</option>
            <option value="architecture">Architecture</option>
            <option value="food">Food & Gastronomy</option>
            <option value="adventure">Adventure</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price per Person (₽) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price_per_person}
            onChange={(e) => setFormData(prev => ({ ...prev, price_per_person: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="1500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Participants *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.max_participants}
            onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 1 }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image
        </label>
        <div className="space-y-4">
          {coverImage && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={coverImage}
                alt="Cover preview"
                fill
                className="object-cover"
              />
            </div>
          )}
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {coverImage ? 'Change Cover Image' : 'Upload Cover Image'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Short Description *
        </label>
        <textarea
          required
          value={formData.short_desc}
          onChange={(e) => setFormData(prev => ({ ...prev, short_desc: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Brief description for tour cards..."
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Detailed description..."
        />
      </div>

      {/* Full Description (Rich Text Editor) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Description (Rich Text)
        </label>
        <RichTextEditor
          content={formData.full_desc}
          onChange={(content) => setFormData(prev => ({ ...prev, full_desc: content }))}
          placeholder="Write detailed tour information with formatting..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {mode === 'create' ? 'Create Tour' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

