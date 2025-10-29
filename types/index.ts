// ==========================================
// Database Types
// ==========================================

export type UserRole = 'user' | 'tour_admin' | 'support_admin' | 'super_admin';
export type TourStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type TourType = 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour';
export type TourCategory = 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure';
export type MediaType = 'image' | 'video';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// ==========================================
// Profile
// ==========================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Tour
// ==========================================

export interface YandexMapData {
  center: [number, number]; // [latitude, longitude]
  zoom: number;
  routes: TourRoute[];
  markers: TourMarker[];
}

export interface TourRoute {
  name: string;
  coordinates: Array<[number, number]>;
  description: string;
  color?: string;
}

export interface TourMarker {
  coordinates: [number, number];
  title: string;
  description: string;
  icon?: string;
}

export interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_desc: string | null;
  full_desc: string | null;
  cover_image: string | null;
  cover_path: string | null;
  price_per_person: number;
  tour_type: TourType;
  category: TourCategory;
  start_date: string;
  end_date: string | null;
  max_participants: number;
  current_participants: number;
  is_available: boolean;
  yandex_map_data: YandexMapData | null;
  status: TourStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  media?: TourMedia[];
  average_rating?: number;
  total_reviews?: number;
}

export interface TourMedia {
  id: string;
  tour_id: string;
  media_type: MediaType;
  media_url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string;
}

// ==========================================
// Booking
// ==========================================

export interface Booking {
  id: string;
  user_id: string;
  tour_id: string;
  booking_date: string;
  num_people: number;
  total_price: number;
  status: BookingStatus;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
  tour?: Tour;
  user?: Profile;
  attendees?: BookingAttendee[];
}

export interface BookingAttendee {
  id: string;
  booking_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  passport_data: string | null;
  created_at: string;
}

// ==========================================
// Chat
// ==========================================

export interface ChatMessage {
  id: string;
  user_id: string | null;
  session_id: string;
  message: string;
  is_ai: boolean;
  is_support: boolean;
  support_admin_id: string | null;
  created_at: string;
}

// ==========================================
// Review
// ==========================================

export interface Review {
  id: string;
  user_id: string;
  tour_id: string;
  booking_id: string;
  rating: number;
  text: string | null;
  video_url: string | null;
  video_path: string | null;
  is_approved: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  user?: Profile;
  tour?: Tour;
}

export interface CreateReviewRequest {
  tour_id: string;
  booking_id: string;
  rating: number;
  text?: string;
  video?: File;
}

export interface ReviewCanSubmit {
  can_review: boolean;
  booking_id: string | null;
  reason: string;
}

// ==========================================
// API Request/Response Types
// ==========================================

// Tours
export interface ToursListParams {
  status?: TourStatus;
  tour_type?: TourType;
  category?: TourCategory;
  limit?: number;
  offset?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  price_min?: number;
  price_max?: number;
  available_only?: boolean;
}

export interface ToursListResponse {
  tours: Tour[];
  total: number;
  page: number;
  limit: number;
}

export interface TourAvailabilityResponse {
  available: boolean;
  available_spots: number;
  reason?: string;
}

// Bookings
export interface CreateBookingRequest {
  tour_id: string;
  num_people: number;
  attendees: Array<{
    full_name: string;
    email?: string;
    phone?: string;
    passport_data?: string;
  }>;
}

export interface CreateBookingResponse {
  booking: Booking;
  ticket_url: string;
}

// Chat
export interface SendChatMessageRequest {
  session_id: string;
  message: string;
  tour_context?: {
    id: string;
    title: string;
    price: number;
    start_date: string;
    available_spots: number;
  };
}

export interface SendChatMessageResponse {
  message: ChatMessage;
  ai_response?: ChatMessage;
}

// Admin
export interface CreateTourRequest {
  title: string;
  slug: string;
  description: string;
  short_desc?: string;
  full_desc?: string;
  cover_image?: string;
  price_per_person: number;
  start_date: string;
  end_date: string;
  max_participants: number;
  yandex_map_data?: YandexMapData;
  status?: TourStatus;
}

export interface UpdateTourRequest extends Partial<CreateTourRequest> {
  id: string;
}

// ==========================================
// Form Types
// ==========================================

export interface BookingFormData {
  tour_id: string;
  num_people: number;
  attendees: Array<{
    full_name: string;
    email: string;
    phone: string;
    passport_data?: string;
  }>;
}

export interface TourFormData {
  title: string;
  slug: string;
  description: string;
  short_desc: string;
  full_desc: string;
  cover_image: File | null;
  price_per_person: string;
  start_date: string;
  end_date: string;
  max_participants: string;
  status: TourStatus;
}

export interface ProfileFormData {
  full_name: string;
  phone: string;
  avatar: File | null;
}

// ==========================================
// UI Types
// ==========================================

export interface TourCardProps {
  tour: Tour;
  onClick?: () => void;
  showActions?: boolean;
}

export interface ChatWidgetProps {
  initialOpen?: boolean;
  tourContext?: {
    id: string;
    title: string;
    price: number;
    start_date: string;
    available_spots: number;
  };
}

// ==========================================
// Utility Types
// ==========================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

// API Error
export interface APIError {
  error: string;
  details?: any;
  code?: string;
}

// Success Response
export interface APISuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

// ==========================================
// Zustand Store Types
// ==========================================

export interface ChatStore {
  messages: ChatMessage[];
  isTyping: boolean;
  isOpen: boolean;
  sessionId: string | null;
  addMessage: (message: ChatMessage) => void;
  setTyping: (isTyping: boolean) => void;
  setOpen: (isOpen: boolean) => void;
  setSessionId: (sessionId: string) => void;
  clearMessages: () => void;
}

export interface AuthStore {
  user: Profile | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export interface BookingStore {
  currentBooking: Booking | null;
  bookings: Booking[];
  setCurrentBooking: (booking: Booking | null) => void;
  addBooking: (booking: Booking) => void;
  setBookings: (bookings: Booking[]) => void;
}

// ==========================================
// WebSocket Events
// ==========================================

export interface SocketEvents {
  // Client → Server
  register: {
    userId?: string;
    sessionId: string;
    role?: UserRole;
  };
  message: {
    sessionId: string;
    message: string;
    tourContext?: any;
  };
  request_support: {
    sessionId: string;
    userId?: string;
  };
  join_support_chat: {
    sessionId: string;
    adminId: string;
  };

  // Server → Client
  ai_response: {
    id: string;
    message: string;
    timestamp: string;
  };
  ai_typing: boolean;
  support_pending: {
    message: string;
  };
  support_joined: {
    admin_name: string;
  };
  new_support_request: {
    sessionId: string;
    userId?: string;
  };
  error: {
    message: string;
  };
}

