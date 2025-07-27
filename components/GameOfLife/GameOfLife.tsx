"use client";
import dynamic from "next/dynamic";

// Will only import `react-p5` on client-side
const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

import p5Types from "p5";

const aliveCellColor = [7, 201, 240];

const targetSpeed = 60;
let grid: boolean[][] = [];
let targetPauseState = false;
let currentSpeed = 1.0;
let frameCounter = 0;
const lerpSpeed = 0.05;

let brightness = 0;

function initGrid(windowWidth: number, windowHeight: number, cellSize: number) {
  const numCols = Math.floor(windowWidth / cellSize);
  const numRows = Math.floor(windowHeight / cellSize);
  grid = [];
  for (let i = 0; i < numRows; i++) {
    grid[i] = [];
    for (let j = 0; j < numCols; j++) {
      grid[i][j] = false;
    }
  }
}
function seedGrid(grid: boolean[][]) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      grid[i][j] = Math.random() < 0.5;
    }
  }
}

function countNeighbours(grid: boolean[][], x: number, y: number) {
  let sum = 0;
  for (let i = -1; i < 2; i++) {
    const row = (x + i + grid.length) % grid.length;
    for (let j = -1; j < 2; j++) {
      const col = (y + j + grid[row].length) % grid[row].length;
      sum += grid[row][col] ? 1 : 0;
    }
  }
  sum -= grid[x][y] ? 1 : 0;
  return sum;
}

function iterateGrid(grid: boolean[][]) {
  const newGrid: boolean[][] = [];
  for (let i = 0; i < grid.length; i++) {
    newGrid[i] = [];
    for (let j = 0; j < grid[i].length; j++) {
      const cell = grid[i][j];
      const neighbours = countNeighbours(grid, i, j);
      if (cell) {
        if (neighbours < 2 || neighbours > 3) {
          newGrid[i][j] = false;
        } else {
          newGrid[i][j] = true;
        }
      }
      if (!cell) {
        if (neighbours === 3) {
          newGrid[i][j] = true;
        } else {
          newGrid[i][j] = false;
        }
      }
    }
  }
  return newGrid;
}

function drawGrid(p5: any, grid: boolean[][]) {
  const width = p5.width;
  const height = p5.height;

  const cellWidth = width / grid[0].length;
  const cellHeight = height / grid.length;

  for (let i = 0; i < grid.length; i++) {
    const y = i * cellHeight;
    for (let j = 0; j < grid[i].length; j++) {
      const x = j * cellWidth;
      if (grid[i][j]) {
        p5.fill(aliveCellColor);
        p5.rect(x, y, cellWidth, cellHeight);
      }
    }
  }

  if (brightness < 255) {
    // add an overlay that fades out over time
    p5.fill(0, 0, 0, 255 - brightness);
    p5.rect(0, 0, width, height);

    brightness += 1;
  }
}

function handleTouchMoved(p5: any) {
  const x = Math.floor(p5.mouseX / (p5.width / grid[0].length));
  const y = Math.floor(p5.mouseY / (p5.height / grid.length));

  const radius = 5;

  for (let i = -radius; i < radius; i++) {
    for (let j = -radius; j < radius; j++) {
      const x2 = x + i;
      const y2 = y + j;
      if (x2 < 0 || x2 >= grid[0].length || y2 < 0 || y2 >= grid.length) {
        continue;
      }
      grid[y2][x2] = true;
    }
  }
}

function handleWindowResized(p5: any) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  p5.resizeCanvas(windowWidth, windowHeight);

  // create new cells on the right and bottom if needed
  const numCols = Math.floor(windowWidth / 10);
  const numRows = Math.floor(windowHeight / 10);
  for (let i = 0; i < grid.length; i++) {
    for (let j = grid[i].length; j < numCols; j++) {
      grid[i][j] = false;
    }
  }
  for (let i = grid.length; i < numRows; i++) {
    grid[i] = [];
    for (let j = 0; j < numCols; j++) {
      grid[i][j] = false;
    }
  }
}

export function GameOfLife({ paused = false }: { paused?: boolean }) {
  targetPauseState = paused;
  
  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);

    p5.frameRate(targetSpeed);

    setInterval(() => {
      if (currentSpeed > 0.1) {
        seedGrid(grid);
      }
    }, 30000);

    initGrid(windowWidth, windowHeight, 10);
    seedGrid(grid);
  };

  const draw = (p5: any) => {
    p5.background(0);
    
    // Lerp current speed towards target
    const targetSpeedValue = targetPauseState ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;
    
    // Only iterate grid based on lerped speed
    frameCounter += currentSpeed;
    if (frameCounter >= 1.0) {
      grid = iterateGrid(grid);
      frameCounter = 0;
    }
    
    drawGrid(p5, grid);
  };

  return (
    <Sketch
      className="absolute pointer-events-none"
      setup={setup}
      draw={draw}
      touchMoved={handleTouchMoved}
    />
  );
}
