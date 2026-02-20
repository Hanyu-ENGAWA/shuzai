-- A-1: schedule_items.type の値を仕様書 v1.2 に合わせて統一

-- location → shooting
UPDATE schedule_items SET type = 'shooting' WHERE type = 'location';

-- rest_stop → rest
UPDATE schedule_items SET type = 'rest' WHERE type = 'rest_stop';
