-- P2-3: schedule_items に time_slot カラムを追加（早朝/夜間撮影の色分け対応）
ALTER TABLE schedule_items ADD COLUMN time_slot TEXT;
