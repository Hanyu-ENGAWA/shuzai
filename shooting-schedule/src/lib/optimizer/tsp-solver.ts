import type { Location } from '@/types';

/**
 * TSP Solver: Nearest Neighbor + 2-opt 改善法
 * Phase 1: Nearest Neighbor で初期解を構築
 * Phase 2: 2-opt で局所改善
 * Phase 3: time_slot 制約ガード（early_morning / night は専用キューに分離）
 *
 * MEMORY.md: tsp-solver: getTimeSlotGroup()=0/1/2 で3フェーズ選択、
 *            2-opt は isTimeSlotOrderValid() でガード
 */

/** 座標ペアの距離（ヘウリスティック用: Haversine km） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * time_slot のグループ番号を返す
 *   0 = early_morning（早朝: 最初に配置）
 *   1 = normal / flexible（通常稼働）
 *   2 = night（夜間: 最後に配置）
 */
export function getTimeSlotGroup(slot: string | null | undefined): 0 | 1 | 2 {
  if (slot === 'early_morning') return 0;
  if (slot === 'night') return 2;
  return 1; // normal / flexible / undefined
}

/**
 * 2-opt の辺入れ替えが time_slot 順序制約を破らないか確認する
 * グループ0 → グループ1 → グループ2 の順序が維持されること
 */
export function isTimeSlotOrderValid(route: Location[]): boolean {
  let maxGroupSeen = 0;
  for (const loc of route) {
    const g = getTimeSlotGroup(loc.timeSlot);
    if (g < maxGroupSeen) return false;
    maxGroupSeen = g;
  }
  return true;
}

/**
 * 2地点間の距離（座標がない場合は定数を返す）
 */
function dist(a: Location, b: Location): number {
  if (
    a.lat != null && a.lng != null &&
    b.lat != null && b.lng != null
  ) {
    return haversineKm(a.lat, a.lng, b.lat, b.lng);
  }
  return 999; // 座標不明は大きな距離
}

/**
 * Nearest Neighbor 法で初期ルートを構築
 * time_slot グループ順（0→1→2）を維持しつつ、グループ内で近傍を選択
 */
function nearestNeighbor(locations: Location[]): Location[] {
  if (locations.length === 0) return [];
  if (locations.length === 1) return [...locations];

  // グループ別に分類
  const groups: [Location[], Location[], Location[]] = [[], [], []];
  for (const loc of locations) {
    groups[getTimeSlotGroup(loc.timeSlot)].push(loc);
  }

  const result: Location[] = [];

  for (const group of groups) {
    if (group.length === 0) continue;
    const remaining = [...group];

    // 最初の地点: グループ内最初の地点 or 前グループの末尾に最も近い地点
    let current: Location;
    if (result.length === 0) {
      current = remaining.shift()!;
    } else {
      const prev = result[result.length - 1];
      let minD = Infinity;
      let minIdx = 0;
      remaining.forEach((loc, i) => {
        const d = dist(prev, loc);
        if (d < minD) { minD = d; minIdx = i; }
      });
      current = remaining.splice(minIdx, 1)[0];
    }
    result.push(current);

    // グループ内を near neighbor で巡回
    while (remaining.length > 0) {
      let minD = Infinity;
      let minIdx = 0;
      remaining.forEach((loc, i) => {
        const d = dist(current, loc);
        if (d < minD) { minD = d; minIdx = i; }
      });
      current = remaining.splice(minIdx, 1)[0];
      result.push(current);
    }
  }

  return result;
}

/**
 * 2-opt 改善法
 * time_slot 順序制約を isTimeSlotOrderValid() でガード
 * 最大 1000 回反復
 */
function twoOpt(route: Location[], maxIter = 1000): Location[] {
  let improved = true;
  let iter = 0;
  let best = [...route];
  let bestDist = totalDistance(best);

  while (improved && iter < maxIter) {
    improved = false;
    iter++;

    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        // i+1 〜 j の区間を逆順にした新ルートを生成
        const newRoute = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ];

        // time_slot 制約チェック
        if (!isTimeSlotOrderValid(newRoute)) continue;

        const newDist = totalDistance(newRoute);
        if (newDist < bestDist - 0.001) {
          best = newRoute;
          bestDist = newDist;
          improved = true;
        }
      }
    }
  }

  return best;
}

/** ルート全体の総距離 */
function totalDistance(route: Location[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += dist(route[i], route[i + 1]);
  }
  return total;
}

/**
 * TSP を解いて最適化されたロケーション順序を返す
 * Phase 1: Nearest Neighbor
 * Phase 2: 2-opt
 * Phase 3: time_slot グループ順保証（NN + 2-opt ガードで自動保証）
 */
export function solveTsp(locations: Location[]): Location[] {
  if (locations.length <= 1) return [...locations];

  const initial = nearestNeighbor(locations);
  const optimized = twoOpt(initial);
  return optimized;
}
