// プロジェクト
export type DurationMode = 'fixed' | 'auto';
export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: ProjectStatus;
  durationMode: DurationMode;
  startDate?: string | null;
  endDate?: string | null;
  workStartTime: string;
  workEndTime: string;
  allowEarlyMorning: boolean;
  earlyMorningStart?: string | null;
  allowNightShooting: boolean;
  nightShootingEnd?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 撮影地
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type LocationPriority = 'required' | 'high' | 'medium' | 'low';
export type TimeSlot = 'normal' | 'early_morning' | 'night' | 'flexible';

export interface Location {
  id: string;
  projectId: string;
  name: string;
  address?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  shootingDuration: number;
  bufferBefore: number;
  bufferAfter: number;
  hasMeal: boolean;
  mealType?: MealType | null;
  mealDurationMin: number;
  priority: LocationPriority;
  timeSlot: TimeSlot;
  timeSlotStart?: string | null;
  timeSlotEnd?: string | null;
  notes?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// 宿泊地
export interface Accommodation {
  id: string;
  projectId: string;
  name: string;
  address?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 食事
export interface Meal {
  id: string;
  projectId: string;
  name: string;
  address?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  mealType: MealType;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  duration: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 休憩
export interface RestStop {
  id: string;
  projectId: string;
  name: string;
  address?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  duration: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 移動手段
export type TransportType = 'car' | 'train' | 'bus' | 'walk' | 'other';

export interface Transport {
  id: string;
  projectId: string;
  type: TransportType;
  notes?: string | null;
  defaultTravelBuffer: number;
  createdAt: Date;
  updatedAt: Date;
}

// 工程表
export type ScheduleItemType = 'location' | 'accommodation' | 'meal' | 'rest_stop' | 'transport' | 'buffer';
export type OptimizationType = 'none' | 'shortest_time' | 'shortest_distance' | 'balanced';

export interface ScheduleItem {
  id: string;
  scheduleId: string;
  day: number;
  date?: string | null;
  startTime: string;
  endTime: string;
  type: ScheduleItemType;
  refId?: string | null;
  name: string;
  address?: string | null;
  notes?: string | null;
  order: number;
  // Phase 2: 移動メタデータ
  travelFromPreviousMin?: number | null;
  travelFromPreviousKm?: number | null;
  transportMode?: string | null;
  bufferBeforeMin?: number | null;
  bufferAfterMin?: number | null;
  includesMeal?: boolean;
  mealDurationMin?: number | null;
  isOutsideWorkHours?: boolean;
  isAutoInserted?: boolean;
}

export interface ExcludedLocation {
  locationId: string;
  name: string;
  reason?: string | null;
  priority?: string | null;
}

export interface Schedule {
  id: string;
  projectId: string;
  generatedAt: Date;
  totalDays: number;
  notes?: string | null;
  optimizationType?: OptimizationType | null;
  totalDistanceKm?: number | null;
  totalDurationMin?: number | null;
  hasOvertimeWarning?: boolean;
  calculatedDays?: number | null;
  createdAt: Date;
  items: ScheduleItem[];
  excludedLocations?: ExcludedLocation[];
}

// 最適化入力
export interface OptimizeInput {
  project: Project;
  locations: Location[];
  accommodations: Accommodation[];
  meals: Meal[];
  restStops: RestStop[];
  transports: Transport[];
  optimizationType?: OptimizationType;
  distanceMatrix?: DistanceMatrix;
}

// Distance Matrix
export interface DistanceMatrix {
  durationMin: number[][];
  distanceKm: number[][];
}

// ホテル提案
export interface HotelSuggestion {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  distanceKm: number;
}

// TSP
export interface TspInput {
  nodes: { id: string; lat?: number | null; lng?: number | null }[];
  distanceMatrix: number[][];
  maxIterations?: number;
}

export interface TspResult {
  route: number[];
  totalDurationMin: number;
}

// API レスポンス
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
