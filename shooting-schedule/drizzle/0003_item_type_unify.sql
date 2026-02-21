-- item_type 値を仕様書に統一（location→shooting, rest_stop→rest）
UPDATE `schedule_items` SET `type` = 'shooting' WHERE `type` = 'location';
UPDATE `schedule_items` SET `type` = 'rest' WHERE `type` = 'rest_stop';
