import type { TspInput, TspResult, TspNode } from '@/types';

/**
 * TSPソルバー（Nearest Neighbor + 2-opt局所改善）
 * time_slot 制約対応: early_morning → normal/flexible → night の順を保証
 * Edge runtime 完全対応（Node.js モジュール不使用）
 */
export function solveTSP(input: TspInput): TspResult {
  const { nodes, distanceMatrix, maxIterations } = input;
  const n = nodes.length;

  if (n === 0) return { route: [], totalDurationMin: 0 };
  if (n === 1) return { route: [0], totalDurationMin: 0 };

  const iterations = maxIterations ?? (n > 15 ? 300 : 1000);

  const getDistance = (from: number, to: number): number => {
    const d = distanceMatrix[from]?.[to] ?? -1;
    return d < 0 ? 99999 : d;
  };

  // 開始ノードの決定（fixedStartIndex 優先）
  const startNode = input.fixedStartIndex ?? 0;

  // Phase 1: time_slot 制約付き Nearest Neighbor
  const route = nearestNeighborWithTimeSlot(n, nodes, startNode, getDistance);

  // Phase 2: time_slot 順序を維持した 2-opt 局所改善
  const optimizedRoute = twoOptWithTimeSlot(route, nodes, getDistance, iterations);

  const totalDurationMin = calcRouteCost(optimizedRoute, getDistance);

  return { route: optimizedRoute, totalDurationMin };
}

/**
 * time_slot のグループ番号を返す
 *   0: early_morning（最初に訪問）
 *   1: normal / flexible / undefined（通常稼働時間内）
 *   2: night（最後に訪問）
 */
function getTimeSlotGroup(node: TspNode | undefined): number {
  const ts = node?.timeSlot;
  if (ts === 'early_morning') return 0;
  if (ts === 'night') return 2;
  return 1;
}

/**
 * ルート内の time_slot 順序が early_morning → normal → night を維持しているか検証
 */
function isTimeSlotOrderValid(route: number[], nodes: TspNode[]): boolean {
  let maxGroup = -1;
  for (const idx of route) {
    const g = getTimeSlotGroup(nodes[idx]);
    if (g < maxGroup) return false; // 逆方向への遷移は禁止
    if (g > maxGroup) maxGroup = g;
  }
  return true;
}

/**
 * 3フェーズ Nearest Neighbor: early_morning → normal → night の順に貪欲選択
 */
function nearestNeighborWithTimeSlot(
  n: number,
  nodes: TspNode[],
  startNode: number,
  getDistance: (from: number, to: number) => number
): number[] {
  const visited = new Set<number>();
  const route: number[] = [startNode];
  visited.add(startNode);

  /**
   * 指定グループの未訪問ノードを最近傍優先で全て訪問し、最後のノードを返す
   */
  const greedyVisitGroup = (group: number, currentNode: number): number => {
    let cur = currentNode;
    let found = true;
    while (found) {
      found = false;
      let nearest = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;
        if (getTimeSlotGroup(nodes[i]) !== group) continue;
        const d = getDistance(cur, i);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      }
      if (nearest !== -1) {
        route.push(nearest);
        visited.add(nearest);
        cur = nearest;
        found = true;
      }
    }
    return cur;
  };

  let current = startNode;
  current = greedyVisitGroup(0, current); // early_morning
  current = greedyVisitGroup(1, current); // normal / flexible
  greedyVisitGroup(2, current);            // night

  return route;
}

/**
 * time_slot 順序制約を維持した 2-opt 局所改善
 */
function twoOptWithTimeSlot(
  route: number[],
  nodes: TspNode[],
  getDistance: (from: number, to: number) => number,
  maxIterations: number
): number[] {
  const n = route.length;
  let improved = true;
  let iterations = 0;
  let best = [...route];
  let bestCost = calcRouteCost(best, getDistance);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        const newRoute = twoOptSwap(best, i, j);
        const newCost = calcRouteCost(newRoute, getDistance);

        // コスト改善 AND time_slot 順序が維持されている場合のみ採用
        if (newCost < bestCost && isTimeSlotOrderValid(newRoute, nodes)) {
          best = newRoute;
          bestCost = newCost;
          improved = true;
        }
      }
    }
  }

  return best;
}

function twoOptSwap(route: number[], i: number, j: number): number[] {
  return [
    ...route.slice(0, i + 1),
    ...route.slice(i + 1, j + 1).reverse(),
    ...route.slice(j + 1),
  ];
}

function calcRouteCost(
  route: number[],
  getDistance: (from: number, to: number) => number
): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += getDistance(route[i], route[i + 1]);
  }
  return total;
}
