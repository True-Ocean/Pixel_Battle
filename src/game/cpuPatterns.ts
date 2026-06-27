import { createEmptyGrid } from '../canvas';
import { PALETTE_16 } from '../config/balance';
import type { PixelColor, PixelGrid } from '../types';

const REF_SIZE = 16;

export interface CpuPatternBuildOptions {
  canvasSize: number;
  colors: readonly string[];
  random: () => number;
}

export interface CpuPattern {
  id: string;
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

function pickColor(colors: readonly string[], random: () => number): PixelColor {
  if (colors.length === 0) return null;

  if (colors.length <= 3) {
    const white = findUnlocked([0], colors) ?? colors[0]!;
    const black = findUnlocked([1], colors) ?? white;
    const red = findUnlocked([2], colors) ?? white;
    const roll = random();
    if (roll < 0.34) return red;
    if (roll < 0.67) return white;
    return black;
  }

  const idx = Math.min(
    Math.floor(random() * colors.length),
    colors.length - 1,
  );
  return colors[idx]!;
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

function stripesH(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const stripe = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let r = 0; r < size; r++) {
    const color = pickColor(options.colors, random);
    if (Math.floor(r / stripe) % 2 === 0) {
      for (let c = 0; c < size; c++) grid[r]![c] = color;
    }
  }
  return grid;
}

function stripesV(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const stripe = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let c = 0; c < size; c++) {
    const color = pickColor(options.colors, random);
    if (Math.floor(c / stripe) % 2 === 0) {
      for (let r = 0; r < size; r++) grid[r]![c] = color;
    }
  }
  return grid;
}

function checker(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const cell = Math.max(1, scaleLen(2 + Math.floor(random() * 2), size));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((Math.floor(r / cell) + Math.floor(c / cell)) % 2 === 0) {
        grid[r]![c] = pickColor(options.colors, random);
      }
    }
  }
  return grid;
}

function crossShape(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const color = pickColor(options.colors, random);
  const accent = pickColor(options.colors, random);
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

function diamond(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const cx = mid(size);
  const cy = mid(size);
  const radius = scaleLen(5 + Math.floor(random() * 2), size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dist = Math.abs(r - cy) + Math.abs(c - cx);
      if (dist <= radius) {
        grid[r]![c] = pickColor(options.colors, random);
      }
    }
  }
  return grid;
}

function ring(options: CpuPatternBuildOptions): PixelGrid {
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
        grid[r]![c] = pickColor(options.colors, random);
      }
    }
  }
  const block = scaleLen(4, size);
  const blockStart = scalePos(6, size);
  fillRect(
    grid,
    blockStart,
    blockStart,
    block,
    block,
    pickColor(options.colors, random),
  );
  return grid;
}

function cornerBlocks(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const block = scaleLen(5, size);
  fillRect(grid, 0, 0, block, block, pickColor(options.colors, random));
  fillRect(grid, 0, size - block, block, block, pickColor(options.colors, random));
  fillRect(grid, size - block, 0, block, block, pickColor(options.colors, random));
  fillRect(
    grid,
    size - block,
    size - block,
    block,
    block,
    pickColor(options.colors, random),
  );
  return grid;
}

function catFace(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const fur = pickColor(options.colors, random);
  const eye = findUnlocked([1], options.colors) ?? fur;
  fillRect(grid, scalePos(4, size), scalePos(3, size), scaleLen(3, size), scaleLen(3, size), fur);
  fillRect(grid, scalePos(4, size), scalePos(10, size), scaleLen(3, size), scaleLen(3, size), fur);
  fillRect(grid, scalePos(5, size), scalePos(5, size), scaleLen(8, size), scaleLen(6, size), fur);
  grid[scalePos(7, size)]![scalePos(6, size)] = eye;
  grid[scalePos(7, size)]![scalePos(9, size)] = eye;
  grid[scalePos(10, size)]![scalePos(7, size)] = pickColor(options.colors, random);
  grid[scalePos(11, size)]![scalePos(8, size)] = pickColor(options.colors, random);
  return grid;
}

function birdShape(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const body = pickColor(options.colors, random);
  const wing = pickColor(options.colors, random);
  const beak = findUnlocked([2], options.colors) ?? pickColor(options.colors, random);
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
  const body = pickColor(options.colors, random);
  const fin = pickColor(options.colors, random);
  const eye = findUnlocked([1], options.colors) ?? body;
  fillRect(grid, scalePos(6, size), scalePos(3, size), scaleLen(5, size), scaleLen(9, size), body);
  fillRect(grid, scalePos(5, size), scalePos(2, size), scaleLen(3, size), scaleLen(3, size), fin);
  fillRect(grid, scalePos(7, size), scalePos(12, size), scaleLen(2, size), scaleLen(2, size), fin);
  grid[scalePos(8, size)]![scalePos(5, size)] = eye;
  return grid;
}

function shieldShape(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const main = pickColor(options.colors, random);
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
    pickColor(options.colors, random),
  );
  return grid;
}

function arrowUp(options: CpuPatternBuildOptions): PixelGrid {
  const { canvasSize: size, random } = options;
  const grid = createEmptyGrid(size);
  const color = pickColor(options.colors, random);
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
  { id: 'stripes-h', build: stripesH },
  { id: 'stripes-v', build: stripesV },
  { id: 'checker', build: checker },
  { id: 'cross', build: crossShape },
  { id: 'diamond', build: diamond },
  { id: 'ring', build: ring },
  { id: 'corners', build: cornerBlocks },
  { id: 'arrow', build: arrowUp },
  { id: 'shield', build: shieldShape },
  { id: 'cat', build: catFace },
  { id: 'bird', build: birdShape },
  { id: 'fish', build: fishShape },
];

export function pickCpuPattern(
  random: () => number = Math.random,
): CpuPattern {
  const idx = Math.min(
    Math.floor(random() * CPU_PATTERNS.length),
    CPU_PATTERNS.length - 1,
  );
  return CPU_PATTERNS[idx] ?? CPU_PATTERNS[0]!;
}
