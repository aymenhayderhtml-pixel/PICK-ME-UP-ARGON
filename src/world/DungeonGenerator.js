// Mulberry32 seeded random number generator
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDungeon(seed = 12345) {
  const rand = mulberry32(seed);
  const width = 60;
  const height = 60;

  // Initialize 2D grid with 1 = wall
  const grid = Array.from({ length: height }, () => new Array(width).fill(1));

  // Place 8 to 12 non-overlapping rectangular rooms (size 5 to 10 cells)
  const targetRoomCount = Math.floor(rand() * 5) + 8; // 8 to 12 rooms
  const rooms = [];
  const maxAttempts = 300;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < targetRoomCount; attempt++) {
    const w = Math.floor(rand() * 6) + 5; // 5 to 10
    const h = Math.floor(rand() * 6) + 5; // 5 to 10
    const x = Math.floor(rand() * (width - w - 4)) + 2;
    const y = Math.floor(rand() * (height - h - 4)) + 2;

    // Check overlap with existing rooms (including 1-cell margin)
    let overlaps = false;
    for (const r of rooms) {
      if (
        x < r.x + r.w + 1 &&
        x + w + 1 > r.x &&
        y < r.y + r.h + 1 &&
        y + h + 1 > r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      // Carve room floor (0 = floor)
      for (let ry = y; ry < y + h; ry++) {
        for (let rx = x; rx < x + w; rx++) {
          grid[ry][rx] = 0;
        }
      }

      rooms.push({
        x,
        y,
        w,
        h,
        cx: Math.floor(x + w / 2),
        cy: Math.floor(y + h / 2),
      });
    }
  }

  // Connect each room to the next with L-shaped corridors 3 cells wide
  for (let i = 0; i < rooms.length - 1; i++) {
    const rA = rooms[i];
    const rB = rooms[i + 1];

    const startX = rA.cx;
    const startY = rA.cy;
    const endX = rB.cx;
    const endY = rB.cy;

    // Horizontal corridor (3 cells wide)
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    for (let x = minX; x <= maxX; x++) {
      for (let offset = -1; offset <= 1; offset++) {
        const cy = startY + offset;
        if (cy >= 1 && cy < height - 1 && x >= 1 && x < width - 1) {
          grid[cy][x] = 0;
        }
      }
    }

    // Vertical corridor (3 cells wide)
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    for (let y = minY; y <= maxY; y++) {
      for (let offset = -1; offset <= 1; offset++) {
        const cx = endX + offset;
        if (cx >= 1 && cx < width - 1 && y >= 1 && y < height - 1) {
          grid[y][cx] = 0;
        }
      }
    }
  }

  // First room center is spawn position
  const spawn = rooms.length > 0 ? { x: rooms[0].cx, y: rooms[0].cy } : { x: 30, y: 30 };

  return { grid, rooms, width, height, spawn };
}
