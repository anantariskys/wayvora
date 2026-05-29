import type { TripPlace } from '../../trips/types/trip.types';

export type OptimizationInput = {
  stops: TripPlace[];
  costMatrix: number[][];
  startIndex: number;
  returnToStart: boolean;
};

export type OptimizationResult = {
  orderedStopIndexes: number[];
  totalCost: number;
  algorithm: 'nearest_neighbor';
  runtimeMs: number;
};
