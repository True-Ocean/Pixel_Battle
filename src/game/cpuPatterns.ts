import { createEmptyGrid } from '../canvas';
import { PALETTE_16 } from '../config/balance';
import type { PixelColor, PixelGrid } from '../types';

const REF_SIZE = 16;

export type PatternBias = 'attack' | 'defense' | 'neutral';

export interface CpuPatternBuildOptions {
  canvasSize: number;
  colors: readonly string[];
  random: () => number;
}

export interface CpuPattern {
  id: string;
  bias: PatternBias;
  build: (options: CpuPatternBuildOptions) => PixelGrid;
}

function scalePos(value: number, size: number): number {
  return Math.min(size - 1, Math.max(0, Math.round((value * size) / REF_SIZE)));
}

function scaleLen(value: number, size: number): number {
  return Math.max(1, Math.round((value * size) / REF_SIZE));
}

function mid(size: number): number {
  return Math.floor(size / 2);
}

function paletteIndex(color: string): number {
  const normalized = color.toLowerCase();
  return PALETTE_16.findIndex((c) => c.toLowerCase() === normalized);
}

function findUnlocked(indices: number[], colors: readonly string[]): string | undefined {
  for (const idx of indices) {
    const candidate = PALETTE_16[idx];
    if (
      candidate &&
      colors.some((color) => color.toLowerCase() === candidate.toLowerCase())
    ) {
      return candidate;
    }
  }
  return undefined;
}

function pickColor(
  bias: PatternBias,
  colors: readonly string[],
  random: () => number,
): PixelColor {
  if (colors.length === 0) return null;

  const white = findUnlocked([0], colors) ?? colors[0]!;
  const black = findUnlocked([1], colors) ?? white;
  const red = findUnlocked([2], colors) ?? white;

  if (colors.length <= 3) {
    if (bias === 'attack') {
      return random() < 0.72 ? red : random() < 0.5 ? black : white;
    }
    if (bias === 'defense') {
      return random() < 0.72 ? white : random() < 0.5 ? black : red;
    }
    const roll = random();
    if (roll < 0.34) return red;
    if (roll < 0.67) return white;
    return black;
  }

  const weights = colors.map((color) => {
    const idx = paletteIndex(color);
    if (bias === 'attack') {
      if (idx === 2) return 4;
      if (idx === 6) return 3;
      if (idx === 1) return 2;
      if (idx === 4) return 2;
      if (idx === 0) return 1;
      if (idx === 3) return 1;
      if (idx === 5) return 1;
      return 1.2;
    }
    if (bias === 'defense') {
      if (idx === 0) return 4;
      if (idx === 5) return 3;
      if (idx === 3) return 2;
      if (idx === 1) return 1.5;
      if (idx === 2) return 0.5;
      return 1;
    }
    return 1;
  });

  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let i = 0; i < colors.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return colors[i]!;
  }
  return colors[colors.length - 1]!;
}

function fillRect(
  grid: PixelGrid,
  r0: number,
  c0: number,
  h: number,
  w: number,
  color: PixelColor,
) {
  const size = grid.length;
  for (let r = r0; r < r0 + h && r < size; r++) {
    for (let c = c0; c < c0 + w && c < size; c++) {
      grid[r]![c] = color;
    }
  }
}

function stripesH(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const stripe = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let r = 0; r < size; r++) {
    const color = pickColor(bias, options.colors, random);
    if (Math.floor(r / stripe) % 2 === 0) {
      for (let c = 0; c < size; c++) grid[r]![c] = color;
    }
  }
  return grid;
}

function stripesV(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const stripe = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let c = 0; c < size; c++) {
    const color = pickColor(bias, options.colors, random);
    if (Math.floor(c / stripe) % 2 === 0) {
      for (let r = 0; r < size; r++) grid[r]![c] = color;
    }
  }
  return grid;
}

function checker(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const cell = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((Math.floor(r / cell) + Math.floor(c / cell)) % 2 === 0) {
        grid[r]![c] = pickColor(bias, options.colors, random);
      }
    }
  }
  return grid;
}

function crossShape(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const color = pickColor(bias, options.colors, random);
  const accent = pickColor(bias, options.colors, random);
  const center = mid(size);
  for (let i = 0; i < size; i++) {
    grid[center]![i] = color;
    grid[i]![center] = color;
  }
  const block = scaleLen(4, size);
  const blockStart = scalePos(6, size);
  fillRect(grid, blockStart, blockStart, block, block, accent);
  return grid;
}

function diamond(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const cx = mid(size);
  const cy = mid(size);
  const radius = scaleLen(5 + Math.floor(random() * 2), size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dist = Math.abs(r - cy) + Math.abs(c - cx);
      if (dist <= radius) {
        grid[r]![c] = pickColor(bias, options.colors, random);
      }
    }
  }
  return grid;
}

function ring(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const inner = scaleLen(4, size);
  const outer = scaleLen(6.5, size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const d = Math.hypot(r - cy, c - cx);
      if (d >= inner && d <= outer) {
        grid[r]![c] = pickColor(bias, options.colors, random);
      }
    }
  }
  const block = scaleLen(4, size);
  const blockStart = scalePos(6, size);
  fillRect(grid, blockStart, blockStart, block, block, pickColor(bias, options.colors, random));
  return grid;
}

function cornerBlocks(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const block = scaleLen(5, size);
  fillRect(grid, 0, 0, block, block, pickColor(bias, options.colors, random));
  fillRect(grid, 0, size - block, block, block, pickColor(bias, options.colors, random));
  fillRect(grid, size - block, 0, block, block, pickColor(bias, options.colors, random));
  fillRect(
    grid,
    size - block,
    size - block,
    block,
    block,
    pickColor(bias, options.colors, random),
  );
  return grid;
}

function catFace(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const fur = random() < 0.5
    ? pickColor('neutral', options.colors, random)
    : pickColor('defense', options.colors, random);
  const eye = findUnlocked([1], options.colors) ?? fur;
  fillRect(grid, scalePos(4, size), scalePos(3, size), scaleLen(3, size), scaleLen(3, size), fur);
  fillRect(grid, scalePos(4, size), scalePos(10, size), scaleLen(3, size), scaleLen(3, size), fur);
  fillRect(grid, scalePos(5, size), scalePos(5, size), scaleLen(8, size), scaleLen(6, size), fur);
  grid[scalePos(7, size)]![scalePos(6, size)] = eye;
  grid[scalePos(7, size)]![scalePos(9, size)] = eye;
  grid[scalePos(10, size)]![scalePos(7, size)] = pickColor('neutral', options.colors, random);
  grid[scalePos(11, size)]![scalePos(8, size)] = pickColor('neutral', options.colors, random);
  return grid;
}

function birdShape(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const body = pickColor('neutral', options.colors, random);
  const wing = pickColor('attack', options.colors, random);
  const beak = findUnlocked([2], options.colors) ?? pickColor('attack', options.colors, random);
  const eye = findUnlocked([1], options.colors) ?? body;
  fillRect(grid, scalePos(6, size), scalePos(4, size), scaleLen(5, size), scaleLen(8, size), body);
  fillRect(grid, scalePos(4, size), scalePos(2, size), scaleLen(3, size), scaleLen(4, size), wing);
  fillRect(grid, scalePos(4, size), scalePos(10, size), scaleLen(3, size), scaleLen(4, size), wing);
  fillRect(grid, scalePos(5, size), scalePos(7, size), scaleLen(2, size), scaleLen(2, size), beak);
  grid[scalePos(8, size)]![scalePos(7, size)] = eye;
  return grid;
}

function fishShape(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const body = pickColor('neutral', options.colors, random);
  const fin = pickColor('attack', options.colors, random);
  const eye = findUnlocked([1], options.colors) ?? body;
  fillRect(grid, scalePos(6, size), scalePos(3, size), scaleLen(5, size), scaleLen(9, size), body);
  fillRect(grid, scalePos(5, size), scalePos(2, size), scaleLen(3, size), scaleLen(3, size), fin);
  fillRect(grid, scalePos(7, size), scalePos(12, size), scaleLen(2, size), scaleLen(2, size), fin);
  grid[scalePos(8, size)]![scalePos(5, size)] = eye;
  return grid;
}

function shieldShape(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const main =
    bias === 'defense'
      ? pickColor('defense', options.colors, random)
      : pickColor(bias, options.colors, random);
  const top = scalePos(3, size);
  const bottom = scalePos(12, size);
  const pivot = scalePos(7, size);
  for (let r = top; r <= bottom && r < size; r++) {
    const width =
      r < pivot ? scaleLen(6 + (r - top), size) : scaleLen(14 - (r - pivot) * 2, size);
    const start = Math.floor((size - width) / 2);
    for (let c = start; c < start + width && c < size; c++) {
      grid[r]![c] = main;
    }
  }
  fillRect(
    grid,
    scalePos(7, size),
    scalePos(6, size),
    scaleLen(3, size),
    scaleLen(4, size),
    pickColor(bias, options.colors, random),
  );
  return grid;
}

function arrowUp(bias: PatternBias, options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const color = pickColor(bias, options.colors, random);
  const center = mid(size);
  for (let i = 0; i < scaleLen(6, size); i++) {
    fillRect(grid, scalePos(2, size) + i, center - i, 1, 1 + i * 2, color);
  }
  fillRect(
    grid,
    scalePos(8, size),
    scalePos(6, size),
    scaleLen(5, size),
    scaleLen(4, size),
    color,
  );
  return grid;
}

export const CPU_PATTERNS: CpuPattern[] = [
  { id: 'stripes-h', bias: 'neutral', build: (o) => stripesH('neutral', o) },
  { id: 'stripes-v', bias: 'neutral', build: (o) => stripesV('neutral', o) },
  { id: 'checker', bias: 'neutral', build: (o) => checker('neutral', o) },
  { id: 'cross', bias: 'neutral', build: (o) => crossShape('neutral', o) },
  { id: 'diamond', bias: 'neutral', build: (o) => diamond('neutral', o) },
  { id: 'ring', bias: 'neutral', build: (o) => ring('neutral', o) },
  { id: 'corners', bias: 'neutral', build: (o) => cornerBlocks('neutral', o) },
  { id: 'stripes-h-atk', bias: 'attack', build: (o) => stripesH('attack', o) },
  { id: 'checker-atk', bias: 'attack', build: (o) => checker('attack', o) },
  { id: 'arrow', bias: 'attack', build: (o) => arrowUp('attack', o) },
  { id: 'stripes-v-def', bias: 'defense', build: (o) => stripesV('defense', o) },
  { id: 'checker-def', bias: 'defense', build: (o) => checker('defense', o) },
  { id: 'shield', bias: 'defense', build: (o) => shieldShape('defense', o) },
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
