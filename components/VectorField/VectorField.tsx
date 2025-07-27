"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

interface Vector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

interface GridPoint {
  x: number;
  y: number;
  vector: Vector;
}


// Color palette for magnitude gradient (low to high)
const colorPalette = [
  [30, 144, 255],   // Deep blue (low magnitude)
  [0, 191, 255],    // Deep sky blue
  [7, 201, 240],    // Light blue
  [0, 255, 127],    // Spring green
  [154, 205, 50],   // Yellow green
  [255, 215, 0],    // Gold
  [255, 140, 0],    // Dark orange
  [255, 69, 0],     // Red orange (high magnitude)
];
const pointColor = [255, 255, 255, 60];
const gridSpacing = 80;
const maxVectorLength = 50;
const noiseScale = 0.003;

let grid: GridPoint[] = [];
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;
let brightness = 0;
let time = 0;

function createGridPoint(x: number, y: number): GridPoint {
  return {
    x,
    y,
    vector: {
      x: 0,
      y: 0,
      magnitude: 0,
      angle: 0,
    },
  };
}


function initGrid(windowWidth: number, windowHeight: number) {
  grid = [];
  
  const cols = Math.ceil(windowWidth / gridSpacing);
  const rows = Math.ceil(windowHeight / gridSpacing);
  
  // Center the grid
  const offsetX = (windowWidth - (cols - 1) * gridSpacing) / 2;
  const offsetY = (windowHeight - (rows - 1) * gridSpacing) / 2;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * gridSpacing;
      const y = offsetY + row * gridSpacing;
      grid.push(createGridPoint(x, y));
    }
  }
}

function updateVectorField(p5: any) {
  for (const point of grid) {
    // Create cohesive flow using smoother noise
    const noiseValue = p5.noise(point.x * noiseScale, point.y * noiseScale, time * 0.001);
    
    // Use noise to create smooth directional flow (reduced multiplier for smoother transitions)
    const angle = noiseValue * Math.PI * 2;
    const magnitude = (0.7 + noiseValue * 0.3) * maxVectorLength;
    
    point.vector.angle = angle;
    point.vector.magnitude = magnitude;
    point.vector.x = Math.cos(angle) * magnitude;
    point.vector.y = Math.sin(angle) * magnitude;
  }
}

function getVectorAtPosition(x: number, y: number, p5: any): Vector {
  // Sample the vector field at any position using noise (matching updateVectorField)
  const noiseValue = p5.noise(x * noiseScale, y * noiseScale, time * 0.001);
  
  const angle = noiseValue * Math.PI * 2;
  const magnitude = (0.7 + noiseValue * 0.3) * maxVectorLength;
  
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
    magnitude,
    angle,
  };
}


function interpolateColor(magnitude: number): number[] {
  // Normalize magnitude to 0-1 range
  const normalizedMag = Math.min(magnitude / maxVectorLength, 1);
  
  // Shift color scale - stay blue for 80%, then rapid transition in last 20%
  let adjustedMag;
  if (normalizedMag < 0.8) {
    // Stay in blue range (first 3 colors) for 80% of magnitude
    adjustedMag = (normalizedMag / 0.8) * 0.375; // Map 0-0.8 to 0-0.375 (first 3/8 of palette)
  } else {
    // Rapid transition through remaining colors in last 20%
    const remaining = (normalizedMag - 0.8) / 0.2; // 0-1 for the last 20%
    adjustedMag = 0.375 + remaining * 0.625; // Map to remaining 5/8 of palette
  }
  
  // Map to color palette index
  const paletteIndex = adjustedMag * (colorPalette.length - 1);
  const lowerIndex = Math.floor(paletteIndex);
  const upperIndex = Math.min(lowerIndex + 1, colorPalette.length - 1);
  const t = paletteIndex - lowerIndex;
  
  // Interpolate between two colors
  const lowerColor = colorPalette[lowerIndex];
  const upperColor = colorPalette[upperIndex];
  
  return [
    lowerColor[0] + (upperColor[0] - lowerColor[0]) * t,
    lowerColor[1] + (upperColor[1] - lowerColor[1]) * t,
    lowerColor[2] + (upperColor[2] - lowerColor[2]) * t,
  ];
}

function drawVectorField(p5: any) {
  for (const point of grid) {
    // Draw grid point (slightly larger)
    p5.fill(pointColor);
    p5.noStroke();
    p5.circle(point.x, point.y, 4);
    
    // Calculate vector end point
    const endX = point.x + point.vector.x;
    const endY = point.y + point.vector.y;
    
    // Get color based on magnitude
    const color = interpolateColor(point.vector.magnitude);
    const alpha = Math.max(point.vector.magnitude / maxVectorLength * 255, 80);
    
    p5.stroke(...color, alpha);
    p5.strokeWeight(3); // Thicker vectors
    
    // Draw vector line
    p5.line(point.x, point.y, endX, endY);
  }

  if (brightness < 255) {
    p5.fill(0, 0, 0, 255 - brightness);
    p5.rect(0, 0, p5.width, p5.height);
    brightness += 1;
  }
}

function handleWindowResized(p5: any) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  p5.resizeCanvas(windowWidth, windowHeight);
  
  // Recreate grid for new dimensions
  initGrid(windowWidth, windowHeight);
}

export function VectorField({ paused = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(60);

    initGrid(windowWidth, windowHeight);
  };

  const draw = (p5: any) => {
    p5.background(0);

    // Lerp current speed towards target
    const targetSpeedValue = targetPauseState ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;

    // Update time for animation
    time += currentSpeed;

    // Update vector field
    updateVectorField(p5);

    // Draw the field
    drawVectorField(p5);
  };

  return (
    <Sketch
      className="absolute pointer-events-none"
      setup={setup}
      draw={draw}
    />
  );
}