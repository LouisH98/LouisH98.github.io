"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";
import { getColorFromPalette } from "@/lib/colorPalette";

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  amplitude: number;
  speed: number;
  life: number;
  maxLife: number;
}



const ripples: Ripple[] = [];
const maxRipples = 25;
const rippleSpeed = 2;
const baseAmplitude = 60;
let time = 0;
let brightness = 0;
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;

function createRipple(x: number, y: number): Ripple {
  return {
    x,
    y,
    radius: 0,
    maxRadius: Math.random() * 400 + 300,
    amplitude: baseAmplitude * (1.2 + Math.random() * 0.8),
    speed: rippleSpeed * (0.6 + Math.random() * 0.4),
    life: 0,
    maxLife: 1.0,
  };
}

function addRandomRipple(p5: any) {
  if (ripples.length < maxRipples) {
    const x = Math.random() * p5.width;
    const y = Math.random() * p5.height;
    ripples.push(createRipple(x, y));
  }
}

function updateRipples() {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];
    
    ripple.radius += ripple.speed * currentSpeed;
    ripple.life = ripple.radius / ripple.maxRadius;
    
    if (ripple.life >= ripple.maxLife) {
      ripples.splice(i, 1);
    }
  }
}

function getHeightAtPosition(x: number, y: number): number {
  let height = 0;
  
  for (const ripple of ripples) {
    const distance = Math.sqrt((x - ripple.x) ** 2 + (y - ripple.y) ** 2);
    
    if (distance < ripple.radius + 100) {
      const normalizedDistance = distance / ripple.radius;
      const fadeOut = 1 - Math.min(ripple.life, 1);
      
      if (normalizedDistance <= 1.5) {
        const wave = Math.sin(normalizedDistance * Math.PI * 3 - time * 0.1);
        const envelope = Math.exp(-normalizedDistance * 1.5);
        height += wave * envelope * ripple.amplitude * fadeOut;
      }
    }
  }
  
  return height;
}



function drawRippleField(p5: any) {
  const gridSize = 40;
  const cols = Math.ceil(p5.width / gridSize);
  const rows = Math.ceil(p5.height / gridSize);
  
  p5.noFill();
  
  // Draw horizontal lines with wave distortion
  for (let row = 0; row <= rows; row++) {
    p5.beginShape();
    p5.noFill();
    
    let avgMagnitude = 0;
    const positions = [];
    
    for (let col = 0; col <= cols; col++) {
      const x = col * gridSize;
      const y = row * gridSize;
      const height = getHeightAtPosition(x, y);
      avgMagnitude += Math.abs(height);
      positions.push({ x, y: y + height * 0.3, magnitude: Math.abs(height) });
    }
    
    avgMagnitude /= (cols + 1);
    
    // Set color based on average magnitude for this line
    const normalizedMag = Math.min(avgMagnitude / 30, 1);
    const color = getColorFromPalette(normalizedMag * 50, { maxValue: 25, blueRange: 0.4 });
    const alpha = Math.max(80, normalizedMag * 180);
    
    p5.stroke(...color, alpha);
    p5.strokeWeight(2);
    
    for (const pos of positions) {
      p5.vertex(pos.x, pos.y);
    }
    p5.endShape();
  }
  
  // Draw vertical lines with wave distortion
  for (let col = 0; col <= cols; col++) {
    p5.beginShape();
    p5.noFill();
    
    let avgMagnitude = 0;
    const positions = [];
    
    for (let row = 0; row <= rows; row++) {
      const x = col * gridSize;
      const y = row * gridSize;
      const height = getHeightAtPosition(x, y);
      avgMagnitude += Math.abs(height);
      positions.push({ x: x + height * 0.2, y, magnitude: Math.abs(height) });
    }
    
    avgMagnitude /= (rows + 1);
    
    // Set color based on average magnitude for this line
    const normalizedMag = Math.min(avgMagnitude / 30, 1);
    const color = getColorFromPalette(normalizedMag * 50, { maxValue: 25, blueRange: 0.4 });
    const alpha = Math.max(80, normalizedMag * 180);
    
    p5.stroke(...color, alpha);
    p5.strokeWeight(2);
    
    for (const pos of positions) {
      p5.vertex(pos.x, pos.y);
    }
    p5.endShape();
  }
  
  
  // Fade in effect
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
}

export function RippleField({ paused = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(60);
    
    // Add click handler for interactive ripples
    p5.mousePressed = () => {
      if (p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
        ripples.push(createRipple(p5.mouseX, p5.mouseY));
        return false; // Prevent default behavior
      }
    };
    
    // Initialize with a few ripples
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addRandomRipple(p5), i * 500);
    }
  };

  const draw = (p5: any) => {
    p5.background(0, 0, 0, 50);

    // Lerp current speed towards target
    const targetSpeedValue = targetPauseState ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;

    // Update time for animation
    time += currentSpeed;

    // Occasionally add new ripples
    if (Math.random() < 0.005 * currentSpeed && ripples.length < maxRipples) {
      addRandomRipple(p5);
    }

    // Update ripple physics
    updateRipples();

    // Draw the ripple field
    drawRippleField(p5);
  };

  return (
    <Sketch
      className="absolute"
      setup={setup}
      draw={draw}
    />
  );
}