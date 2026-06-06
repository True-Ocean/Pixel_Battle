import { createEmptyGrid } from '../canvas';
import { CANVAS_SIZE, PALETTE_LV0 } from '../config/balance';
import type { PixelColor, PixelGrid } from '../types';

const WHITE = PALETTE_LV0[0];
const BLACK = PALETTE_LV0[1];
const RED = PALETTE_LV0[2];

export type PatternBias = 'attack' | 'defense' | 'neutral';

export interface CpuPattern {
  id: string;
  bias: PatternBias;
  build: (random: () => number) => PixelGrid;
}

function pickColor(bias: PatternBias, random: () => number): PixelColor {
  if (bias === 'attack') {
    return random() < 0.72 ? RED : random() < 0.5 ? BLACK : WHITE;
  }
  if (bias === 'defense') {
    return random() < 0.72 ? WHITE : random() < 0.5 ? BLACK : RED;
  }
  const roll = random();
  if (roll < 0.34) return RED;
  if (roll < 0.67) return WHITE;
  return BLACK;
}

function fillRect(
  grid: PixelGrid,
  r0: number,
  c0: number,
  h: number,
  w: number,
  color: PixelColor,
) {
  for (let r = r0; r < r0 + h && r < CANVAS_SIZE; r++) {
    for (let c = c0; c < c0 + w && c < CANVAS_SIZE; c++) {
      grid[r]![c] = color;
    }
  }
}

function stripesH(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const stripe = 2 + Math.floor(random() * 2);
  for (let r = 0; r < CANVAS_SIZE; r++) {
    const color = pickColor(bias, random);
    if (Math.floor(r / stripe) % 2 === 0) {
      for (let c = 0; c < CANVAS_SIZE; c++) grid[r]![c] = color;
    }
  }
  return grid;
}

function stripesV(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const stripe = 2 + Math.floor(random() * 2);
  for (let c = 0; c < CANVAS_SIZE; c++) {
    const color = pickColor(bias, random);
    if (Math.floor(c / stripe) % 2 === 0) {
      for (let r = 0; r < CANVAS_SIZE; r++) grid[r]![c] = color;
    }
  }
  return grid;
}

function checker(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const size = 2 + Math.floor(random() * 2);
  for (let r = 0; r < CANVAS_SIZE; r++) {
    for (let c = 0; c < CANVAS_SIZE; c++) {
      if ((Math.floor(r / size) + Math.floor(c / size)) % 2 === 0) {
        grid[r]![c] = pickColor(bias, random);
      }
    }
  }
  return grid;
}

function crossShape(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const color = pickColor(bias, random);
  const accent = pickColor(bias, random);
  for (let i = 0; i < CANVAS_SIZE; i++) {
    grid[7]![i] = color;
    grid[i]![7] = color;
  }
  fillRect(grid, 6, 6, 4, 4, accent);
  return grid;
}

function diamond(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const cx = 7;
  const cy = 7;
  for (let r = 0; r < CANVAS_SIZE; r++) {
    for (let c = 0; c < CANVAS_SIZE; c++) {
      const dist = Math.abs(r - cy) + Math.abs(c - cx);
      if (dist <= 5 + Math.floor(random() * 2)) {
        grid[r]![c] = pickColor(bias, random);
      }
    }
  }
  return grid;
}

function ring(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const cx = 7.5;
  const cy = 7.5;
  for (let r = 0; r < CANVAS_SIZE; r++) {
    for (let c = 0; c < CANVAS_SIZE; c++) {
      const d = Math.hypot(r - cy, c - cx);
      if (d >= 4 && d <= 6.5) grid[r]![c] = pickColor(bias, random);
    }
  }
  fillRect(grid, 6, 6, 4, 4, pickColor(bias, random));
  return grid;
}

function cornerBlocks(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const s = 5;
  fillRect(grid, 0, 0, s, s, pickColor(bias, random));
  fillRect(grid, 0, CANVAS_SIZE - s, s, s, pickColor(bias, random));
  fillRect(grid, CANVAS_SIZE - s, 0, s, s, pickColor(bias, random));
  fillRect(grid, CANVAS_SIZE - s, CANVAS_SIZE - s, s, s, pickColor(bias, random));
  return grid;
}

function catFace(random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const fur = random() < 0.5 ? RED : WHITE;
  const eye = BLACK;
  fillRect(grid, 4, 3, 3, 3, fur);
  fillRect(grid, 4, 10, 3, 3, fur);
  fillRect(grid, 5, 5, 8, 6, fur);
  grid[7]![6] = eye;
  grid[7]![9] = eye;
  grid[10]![7] = pickColor('neutral', random);
  grid[11]![8] = pickColor('neutral', random);
  return grid;
}

function birdShape(random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const body = pickColor('neutral', random);
  const wing = pickColor('attack', random);
  fillRect(grid, 6, 4, 5, 8, body);
  fillRect(grid, 4, 2, 3, 4, wing);
  fillRect(grid, 4, 10, 3, 4, wing);
  fillRect(grid, 5, 7, 2, 2, RED);
  grid[8]![7] = BLACK;
  return grid;
}

function fishShape(random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const body = pickColor('neutral', random);
  fillRect(grid, 6, 3, 5, 9, body);
  fillRect(grid, 5, 2, 3, 3, pickColor('attack', random));
  fillRect(grid, 7, 12, 2, 2, pickColor('attack', random));
  grid[8]![5] = BLACK;
  return grid;
}

function shieldShape(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const main = bias === 'defense' ? WHITE : pickColor(bias, random);
  for (let r = 3; r <= 12; r++) {
    const width = r < 7 ? 6 + (r - 3) : 14 - (r - 7) * 2;
    const start = Math.floor((CANVAS_SIZE - width) / 2);
    for (let c = start; c < start + width; c++) {
      grid[r]![c] = main;
    }
  }
  fillRect(grid, 7, 6, 3, 4, pickColor(bias, random));
  return grid;
}

function arrowUp(bias: PatternBias, random: () => number): PixelGrid {
  const grid = createEmptyGrid();
  const color = pickColor(bias, random);
  for (let i = 0; i < 6; i++) {
    fillRect(grid, 2 + i, 7 - i, 1, 1 + i * 2, color);
  }
  fillRect(grid, 8, 6, 5, 4, color);
  return grid;
}

export const CPU_PATTERNS: CpuPattern[] = [
  { id: 'stripes-h', bias: 'neutral', build: (r) => stripesH('neutral', r) },
  { id: 'stripes-v', bias: 'neutral', build: (r) => stripesV('neutral', r) },
  { id: 'checker', bias: 'neutral', build: (r) => checker('neutral', r) },
  { id: 'cross', bias: 'neutral', build: (r) => crossShape('neutral', r) },
  { id: 'diamond', bias: 'neutral', build: (r) => diamond('neutral', r) },
  { id: 'ring', bias: 'neutral', build: (r) => ring('neutral', r) },
  { id: 'corners', bias: 'neutral', build: (r) => cornerBlocks('neutral', r) },
  { id: 'stripes-h-atk', bias: 'attack', build: (r) => stripesH('attack', r) },
  { id: 'checker-atk', bias: 'attack', build: (r) => checker('attack', r) },
  { id: 'arrow', bias: 'attack', build: (r) => arrowUp('attack', r) },
  { id: 'stripes-v-def', bias: 'defense', build: (r) => stripesV('defense', r) },
  { id: 'checker-def', bias: 'defense', build: (r) => checker('defense', r) },
  { id: 'shield', bias: 'defense', build: (r) => shieldShape('defense', r) },
  { id: 'cat', bias: 'neutral', build: catFace },
  { id: 'bird', bias: 'attack', build: birdShape },
  { id: 'fish', bias: 'neutral', build: fishShape },
];

export function pickCpuPattern(
  prefer: PatternBias,
  random: () => number = Math.random,
): CpuPattern {
  const pool = CPU_PATTERNS.filter(
    (p) => p.bias === prefer || (prefer !== 'neutral' && p.bias === 'neutral'),
  );
  const idx = Math.min(
    Math.floor(random() * pool.length),
    pool.length - 1,
  );
  return pool[idx] ?? CPU_PATTERNS[0]!;
}
