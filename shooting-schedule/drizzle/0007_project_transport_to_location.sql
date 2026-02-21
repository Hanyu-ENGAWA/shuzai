-- P1-4: projects テーブルに transport_mode_to_location カラムを追加（現地までの移動手段）

ALTER TABLE projects ADD COLUMN transport_mode_to_location TEXT NOT NULL DEFAULT 'car';
