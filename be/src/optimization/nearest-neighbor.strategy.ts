import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  OptimizationInput,
  OptimizationResult,
} from './types/optimization.types';

@Injectable()
export class NearestNeighborStrategy {
  optimize(input: OptimizationInput): OptimizationResult {
    const startedAt = performance.now();

    if (input.stops.length < 1) {
      throw new BadRequestException('At least one stop is required.');
    }

    if (input.startIndex < 0 || input.startIndex >= input.stops.length) {
      throw new BadRequestException('Invalid optimization start index.');
    }

    const visited = new Set<number>([input.startIndex]);
    const orderedStopIndexes = [input.startIndex];
    let current = input.startIndex;
    let totalCost = 0;

    while (visited.size < input.stops.length) {
      let bestNext: number | null = null;
      let bestCost = Number.POSITIVE_INFINITY;

      for (let candidate = 0; candidate < input.stops.length; candidate += 1) {
        if (visited.has(candidate)) {
          continue;
        }

        const cost = input.costMatrix[current]?.[candidate];

        if (Number.isFinite(cost) && cost < bestCost) {
          bestCost = cost;
          bestNext = candidate;
        }
      }

      if (bestNext === null) {
        throw new BadRequestException('No reachable unvisited stop.');
      }

      orderedStopIndexes.push(bestNext);
      visited.add(bestNext);
      totalCost += bestCost;
      current = bestNext;
    }

    if (input.returnToStart && orderedStopIndexes.length > 1) {
      totalCost += input.costMatrix[current][input.startIndex];
      orderedStopIndexes.push(input.startIndex);
    }

    return {
      orderedStopIndexes,
      totalCost,
      algorithm: 'nearest_neighbor',
      runtimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }
}
