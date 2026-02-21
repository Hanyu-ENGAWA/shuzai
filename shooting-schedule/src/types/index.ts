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
  transportModeToLocation?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 撮影地
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type TimeSlot = 'normal' | 'early_morning' | 'night' | 'flexible';
export type LocationPriority = 'required' | 'high' | 'medium' | 'low';

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
  mealDuration: number;
  timeSlot: TimeSlot;
  timeSlotStart?: string | null;
  timeSlotEnd?: string | null;
  preferredTimeStart?: string | null;
  preferredTimeEnd?: string | null;
  priority: LocationPriority;
  notes?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// 宿泊地
export interface Accommodation {
  id: string;
  projectId: string;
  name?: string | null;  // nullable（空欄時は自動提案）
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
  name?: string | null;  // nullable（店舗未指定可）
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
// 仕様書統一: shooting / accommodation / meal / rest / transport / buffer / auto_meal
export type ScheduleItemType =
  | 'shooting'
  | 'accommodation'
  | 'meal'
  | 'rest'
  | 'transport'
  | 'buffer'
  | 'auto_meal';

export interface ScheduleItem {
  id: string;
  scheduleId: string;
  day: number;
  date?: string | null;
  startTime: string;
  endTime: string;
  type: ScheduleItemType;
  timeSlot?: TimeSlot | null;
  refId?: string | null;
  name: string;
  address?: string | null;
  notes?: string | null;
  order: number;
}

export interface Schedule {
  id: string;
  projectId: string;
  version: number;
  scheduleMode: DurationMode;
  generatedAt: Date;
  totalDays: number;
  notes?: string | null;
  createdAt: Date;
  items: ScheduleItem[];
  excludedLocations?: ExcludedLocation[];
}

// 除外撮影地
export interface ExcludedLocation {
  id: string;
  scheduleId: string;
  locationId: string;
  date: string;
  reason?: string | null;
  priority?: string | null;
}

// 最適化入力
export interface OptimizeInput {
  project: Project;
  locations: Location[];
  accommodations: Accommodation[];
  meals: Meal[];
  restStops: RestStop[];
  transports: Transport[];
}

// API レスポンス
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
