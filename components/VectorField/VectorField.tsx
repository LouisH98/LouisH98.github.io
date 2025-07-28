"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";
import { getMagnitudeColor } from "@/lib/colorPalette";

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



const pointColor = [255, 255, 255, 100];
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




function drawVectorField(p5: any) {
  for (const point of grid) {
    // Draw grid point (slightly larger)
    p5.fill(pointColor);
    p5.noStroke();
    p5.circle(point.x, point.y, 4);
    
    // Calculate vector end point
    const endX = point.x + point.vector.x;
    const endY = point.y + point.vector.y;
    
    // Get color based on magnitude using shared utility
    const color = getMagnitudeColor(point.vector.x, point.vector.y, maxVectorLength);
    const alpha = Math.max(point.vector.magnitude / maxVectorLength * 255, 120);
    
    p5.stroke(...color, alpha);
    p5.strokeWeight(4); // Thicker vectors
    
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

export function VectorField({ paused = false, prefersReducedMotion = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(120);

    initGrid(windowWidth, windowHeight);
  };

  const draw = (p5: any) => {
    p5.background(0);

    // Lerp current speed towards target
    const targetSpeedValue = (targetPauseState || prefersReducedMotion) ? 0.0 : 1.0;
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