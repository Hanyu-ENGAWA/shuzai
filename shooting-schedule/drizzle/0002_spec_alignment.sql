-- 仕様書 v1.2 への軌道修正マイグレーション

-- ① projects: 出発地・解散場所・移動手段を追加
ALTER TABLE projects ADD COLUMN departure_location TEXT;
ALTER TABLE projects ADD COLUMN departure_lat REAL;
ALTER TABLE projects ADD COLUMN departure_lng REAL;
ALTER TABLE projects ADD COLUMN departure_place_id TEXT;
ALTER TABLE projects ADD COLUMN return_location TEXT;
ALTER TABLE projects ADD COLUMN return_lat REAL;
ALTER TABLE projects ADD COLUMN return_lng REAL;
ALTER TABLE projects ADD COLUMN return_place_id TEXT;
ALTER TABLE projects ADD COLUMN return_same_as_departure INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN default_transport_mode TEXT NOT NULL DEFAULT 'driving';

-- ② status を draft/optimized/archived に変更 (active→draft へデータ移行)
UPDATE projects SET status = 'draft' WHERE status = 'active';

-- ③ accommodations: 泊数・予算・自動提案フラグを追加
ALTER TABLE accommodations ADD COLUMN nights INTEGER;
ALTER TABLE accommodations ADD COLUMN budget_per_night INTEGER;
ALTER TABLE accommodations ADD COLUMN is_auto_suggested INTEGER NOT NULL DEFAULT 0;

-- ④ transports: 仕様通りの type/mode/description を追加
ALTER TABLE transports ADD COLUMN transport_type TEXT NOT NULL DEFAULT 'local';
ALTER TABLE transports ADD COLUMN mode TEXT NOT NULL DEFAULT 'driving';
ALTER TABLE transports ADD COLUMN description TEXT;
