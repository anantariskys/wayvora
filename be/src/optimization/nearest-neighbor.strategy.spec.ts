import { BadRequestException } from '@nestjs/common';
import { NearestNeighborStrategy } from './nearest-neighbor.strategy';

describe('NearestNeighborStrategy', () => {
  const strategy = new NearestNeighborStrategy();
  const stops = [
    { tripPlaceId: 'a' },
    { tripPlaceId: 'b' },
    { tripPlaceId: 'c' },
  ] as never;

  it('selects the nearest unvisited stop at each step', () => {
    const result = strategy.optimize({
      stops,
      costMatrix: [
        [0, 5, 2],
        [5, 0, 1],
        [2, 1, 0],
      ],
      startIndex: 0,
      returnToStart: false,
    });

    expect(result.orderedStopIndexes).toEqual([0, 2, 1]);
    expect(result.totalCost).toBe(3);
  });

  it('can append a return-to-start leg', () => {
    const result = strategy.optimize({
      stops,
      costMatrix: [
        [0, 5, 2],
        [5, 0, 1],
        [2, 1, 0],
      ],
      startIndex: 0,
      returnToStart: true,
    });

    expect(result.orderedStopIndexes).toEqual([0, 2, 1, 0]);
    expect(result.totalCost).toBe(8);
  });

  it('rejects unreachable stops', () => {
    expect(() =>
      strategy.optimize({
        stops,
        costMatrix: [
          [0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
          [1, 0, 1],
          [1, 1, 0],
        ],
        startIndex: 0,
        returnToStart: false,
      }),
    ).toThrow(BadRequestException);
  });
});
