import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ユーザー
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// プロジェクト
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'optimized', 'archived'] }).notNull().default('draft'),
  // 撮影期間モード: 'fixed'(日程固定) | 'auto'(自動算出)
  durationMode: text('duration_mode', { enum: ['fixed', 'auto'] }).notNull().default('fixed'),
  // 固定モード用
  startDate: text('start_date'), // YYYY-MM-DD
  endDate: text('end_date'),     // YYYY-MM-DD
  // 稼働時間設定
  workStartTime: text('work_start_time').notNull().default('09:00'), // HH:mm
  workEndTime: text('work_end_time').notNull().default('18:00'),
  // 早朝/夜間撮影対応
  allowEarlyMorning: integer('allow_early_morning', { mode: 'boolean' }).notNull().default(false),
  earlyMorningStart: text('early_morning_start').default('05:00'),
  allowNightShooting: integer('allow_night_shooting', { mode: 'boolean' }).notNull().default(false),
  nightShootingEnd: text('night_shooting_end').default('22:00'),
  // 出発地・解散場所
  departureLocation: text('departure_location'),
  departureLat: real('departure_lat'),
  departureLng: real('departure_lng'),
  departurePlaceId: text('departure_place_id'),
  returnLocation: text('return_location'),
  returnLat: real('return_lat'),
  returnLng: real('return_lng'),
  returnPlaceId: text('return_place_id'),
  returnSameAsDeparture: integer('return_same_as_departure', { mode: 'boolean' }).notNull().default(true),
  // デフォルト移動手段 (driving / transit / walking / bicycling)
  defaultTransportMode: text('default_transport_mode', {
    enum: ['driving', 'transit', 'walking', 'bicycling'],
  }).notNull().default('driving'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 撮影地
export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  placeId: text('place_id'), // Google Places ID
  lat: real('lat'),
  lng: real('lng'),
  shootingDuration: integer('shooting_duration').notNull().default(60), // 分
  bufferBefore: integer('buffer_before').notNull().default(0),   // 分
  bufferAfter: integer('buffer_after').notNull().default(0),    // 分
  hasMeal: integer('has_meal', { mode: 'boolean' }).notNull().default(false),
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner'] }),
  mealDurationMin: integer('meal_duration_min').notNull().default(60), // 食事時間(分)
  priority: text('priority', { enum: ['required', 'high', 'medium', 'low'] }).notNull().default('medium'),
  timeSlot: text('time_slot', { enum: ['normal', 'early_morning', 'night', 'flexible'] }).notNull().default('normal'),
  timeSlotStart: text('time_slot_start'), // HH:mm (early_morning/night 時のみ)
  timeSlotEnd: text('time_slot_end'),     // HH:mm
  notes: text('notes'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 宿泊地
export const accommodations = sqliteTable('accommodations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  placeId: text('place_id'),
  lat: real('lat'),
  lng: real('lng'),
  checkInDate: text('check_in_date'),  // YYYY-MM-DD
  checkOutDate: text('check_out_date'), // YYYY-MM-DD
  checkInTime: text('check_in_time').default('15:00'),
  checkOutTime: text('check_out_time').default('10:00'),
  nights: integer('nights'),
  budgetPerNight: integer('budget_per_night'),
  isAutoSuggested: integer('is_auto_suggested', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 食事場所
export const meals = sqliteTable('meals', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  placeId: text('place_id'),
  lat: real('lat'),
  lng: real('lng'),
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner'] }).notNull(),
  scheduledDate: text('scheduled_date'), // YYYY-MM-DD
  scheduledTime: text('scheduled_time'), // HH:mm
  duration: integer('duration').notNull().default(60), // 分
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 休憩地点
export const restStops = sqliteTable('rest_stops', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address'),
  placeId: text('place_id'),
  lat: real('lat'),
  lng: real('lng'),
  duration: integer('duration').notNull().default(15), // 分
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 移動手段
export const transports = sqliteTable('transports', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  // 仕様書準拠: transportType = to_location(現地まで) / local(現地内)
  transportType: text('transport_type', { enum: ['to_location', 'local'] }).notNull().default('local'),
  // mode = driving / transit / walking / bicycling
  mode: text('mode', { enum: ['driving', 'transit', 'walking', 'bicycling'] }).notNull().default('driving'),
  description: text('description'), // 例: 新幹線, レンタカー
  notes: text('notes'),
  defaultTravelBuffer: integer('default_travel_buffer').notNull().default(10), // 分（後方互換）
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 工程表
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  totalDays: integer('total_days').notNull(),
  notes: text('notes'),
  optimizationType: text('optimization_type', { enum: ['none', 'shortest_time', 'shortest_distance', 'balanced'] }),
  totalDistanceKm: real('total_distance_km'),
  totalDurationMin: integer('total_duration_min'),
  hasOvertimeWarning: integer('has_overtime_warning', { mode: 'boolean' }).notNull().default(false),
  calculatedDays: integer('calculated_days'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 工程表アイテム
export const scheduleItems = sqliteTable('schedule_items', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  day: integer('day').notNull(), // 1始まり
  date: text('date'),            // YYYY-MM-DD
  startTime: text('start_time').notNull(), // HH:mm
  endTime: text('end_time').notNull(),     // HH:mm
  type: text('type', {
    enum: ['shooting', 'accommodation', 'meal', 'rest', 'transport', 'auto_meal', 'buffer']
  }).notNull(),
  refId: text('ref_id'),   // 参照元ID (locations.id, meals.id など)
  name: text('name').notNull(),
  address: text('address'),
  notes: text('notes'),
  order: integer('order').notNull().default(0),
  // Phase 2: 移動メタデータ
  travelFromPreviousMin: integer('travel_from_previous_min'),
  travelFromPreviousKm: real('travel_from_previous_km'),
  transportMode: text('transport_mode'),
  bufferBeforeMin: integer('buffer_before_min'),
  bufferAfterMin: integer('buffer_after_min'),
  includesMeal: integer('includes_meal', { mode: 'boolean' }).notNull().default(false),
  mealDurationMin: integer('meal_duration_min'),
  isOutsideWorkHours: integer('is_outside_work_hours', { mode: 'boolean' }).notNull().default(false),
  isAutoInserted: integer('is_auto_inserted', { mode: 'boolean' }).notNull().default(false),
});

// 除外撮影地（最適化で除外された地点）
export const excludedLocations = sqliteTable('excluded_locations', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  locationId: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  date: text('date'), // YYYY-MM-DD (nullable in Phase 2)
  reason: text('reason'), // 除外理由
  priority: text('priority'), // 当時の優先度
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  locations: many(locations),
  accommodations: many(accommodations),
  meals: many(meals),
  restStops: many(restStops),
  transports: many(transports),
  schedules: many(schedules),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  project: one(projects, { fields: [locations.projectId], references: [projects.id] }),
}));

export const accommodationsRelations = relations(accommodations, ({ one }) => ({
  project: one(projects, { fields: [accommodations.projectId], references: [projects.id] }),
}));

export const mealsRelations = relations(meals, ({ one }) => ({
  project: one(projects, { fields: [meals.projectId], references: [projects.id] }),
}));

export const restStopsRelations = relations(restStops, ({ one }) => ({
  project: one(projects, { fields: [restStops.projectId], references: [projects.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  project: one(projects, { fields: [schedules.projectId], references: [projects.id] }),
  items: many(scheduleItems),
  excludedLocations: many(excludedLocations),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  schedule: one(schedules, { fields: [scheduleItems.scheduleId], references: [schedules.id] }),
}));
