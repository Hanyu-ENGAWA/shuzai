import type { TspInput, TspResult } from '@/types';

/**
 * TSPソルバー（Nearest Neighbor + 2-opt局所改善）
 * Edge runtime 完全対応（Node.js モジュール不使用）
 */
export function solveTSP(input: TspInput): TspResult {
  const { nodes, distanceMatrix, maxIterations } = input;
  const n = nodes.length;

  if (n === 0) return { route: [], totalDurationMin: 0 };
  if (n === 1) return { route: [0], totalDurationMin: 0 };

  // CPU 制限対策: 地点数 > 15 は maxIterations を削減
  const iterations = maxIterations ?? (n > 15 ? 300 : 1000);

  // 有効な距離行列かチェック（-1は無効値）
  const getDistance = (from: number, to: number): number => {
    const d = distanceMatrix[from]?.[to] ?? -1;
    return d < 0 ? 99999 : d; // 無効値は大きなコストとして扱う
  };

  // Phase 1: Nearest Neighbor 法
  // 早朝撮影地があればそこから開始
  let startNode = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ('timeSlot' in node && (node as { timeSlot?: string }).timeSlot === 'early_morning') {
      startNode = i;
      break;
    }
  }

  const route = nearestNeighbor(n, startNode, getDistance);

  // Phase 2: 2-opt 局所改善
  const optimizedRoute = twoOpt(route, getDistance, iterations);

  const totalDurationMin = calcRouteCost(optimizedRoute, getDistance);

  return { route: optimizedRoute, totalDurationMin };
}

function nearestNeighbor(
  n: number,
  startNode: number,
  getDistance: (from: number, to: number) => number
): number[] {
  const visited = new Set<number>();
  const route: number[] = [startNode];
  visited.add(startNode);

  while (route.length < n) {
    const current = route[route.length - 1];
    let nearest = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const d = getDistance(current, i);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }

    if (nearest === -1) break;
    route.push(nearest);
    visited.add(nearest);
  }

  return route;
}

function twoOpt(
  route: number[],
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
        // エッジ (i, i+1) と (j, j+1) を入れ替え
        const newRoute = twoOptSwap(best, i, j);
        const newCost = calcRouteCost(newRoute, getDistance);

        if (newCost < bestCost) {
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
  const newRoute = [
    ...route.slice(0, i + 1),
    ...route.slice(i + 1, j + 1).reverse(),
    ...route.slice(j + 1),
  ];
  return newRoute;
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
