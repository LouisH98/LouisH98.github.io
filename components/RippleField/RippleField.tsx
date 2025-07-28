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
const rippleSpeed = 2;
const baseAmplitude = 60;
let time = 0;
let brightness = 0;
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;
let isDragging = false;
let lastDragTime = 0;
let lastRandomRippleTime = 0;
const randomRippleInterval = 4000; // Random ripples every 4 seconds (ms)

// Continuous distortion field for dragging
let distortionField: { x: number; y: number; strength: number; life: number; maxLife: number }[] = [];
const maxDistortionPoints = 300;
const distortionDecay = 0.98;
const distortionStrength = 60; // Reduced strength for more subtle effect

function createRipple(x: number, y: number, isDragRipple = false): Ripple {
  const amplitudeMultiplier = isDragRipple ? 0.2 : 0.4; // Reduced click/droplet strength
  return {
    x,
    y,
    radius: 0,
    maxRadius: Math.random() * 400 + 300,
    amplitude: baseAmplitude * (1.2 + Math.random() * 0.8) * amplitudeMultiplier,
    speed: rippleSpeed * (0.6 + Math.random() * 0.4),
    life: 0,
    maxLife: 1.0,
  };
}

function addRandomRipple(p5: any) {
  const x = Math.random() * p5.width;
  const y = Math.random() * p5.height;
  ripples.push(createRipple(x, y));
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

function updateDistortionField() {
  for (let i = distortionField.length - 1; i >= 0; i--) {
    const point = distortionField[i];
    point.life += 0.02 * currentSpeed;
    point.strength *= distortionDecay;
    
    if (point.life >= point.maxLife || point.strength < 0.1) {
      distortionField.splice(i, 1);
    }
  }
}

function getHeightAtPosition(x: number, y: number): number {
  let height = 0;
  
  // Add ripple effects
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
  
  // Add continuous distortion field effects
  for (const point of distortionField) {
    const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
    const maxDistance = 150; // Increased area of effect
    
    if (distance < maxDistance) {
      const normalizedDistance = distance / maxDistance;
      const fadeOut = 1 - point.life;
      const envelope = Math.exp(-normalizedDistance * 6); // Much faster dropoff (was 2)
      const wave = Math.sin(normalizedDistance * Math.PI * 2 - time * 0.2);
      height += wave * envelope * point.strength * fadeOut * 0.6;
    }
  }
  
  return height;
}



function drawRippleField(p5: any) {
  const gridSize = 20;
  const cols = Math.ceil(p5.width / gridSize);
  const rows = Math.ceil(p5.height / gridSize);
  
  p5.noFill();
  
  // Draw horizontal lines with wave distortion
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x1 = col * gridSize;
      const x2 = (col + 1) * gridSize;
      const y = row * gridSize;
      
      // Get heights for both endpoints of this line segment
      const height1 = getHeightAtPosition(x1, y);
      const height2 = getHeightAtPosition(x2, y);
      
      // Calculate local magnitude for this segment
      const localMagnitude = (Math.abs(height1) + Math.abs(height2)) / 2;
      
      // Set color based on local magnitude for this segment
      const normalizedMag = Math.min(localMagnitude / 30, 1);
      const color = getColorFromPalette(normalizedMag * 50, { maxValue: 25, blueRange: 0.4 });
      const alpha = Math.max(80, normalizedMag * 180);
      
      p5.stroke(...color, alpha);
      p5.strokeWeight(2);
      
      // Draw this line segment
      p5.line(
        x1, y + height1 * 0.3,
        x2, y + height2 * 0.3
      );
    }
  }
  
  // Draw vertical lines with wave distortion
  for (let col = 0; col <= cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * gridSize;
      const y1 = row * gridSize;
      const y2 = (row + 1) * gridSize;
      
      // Get heights for both endpoints of this line segment
      const height1 = getHeightAtPosition(x, y1);
      const height2 = getHeightAtPosition(x, y2);
      
      // Calculate local magnitude for this segment
      const localMagnitude = (Math.abs(height1) + Math.abs(height2)) / 2;
      
      // Set color based on local magnitude for this segment
      const normalizedMag = Math.min(localMagnitude / 30, 1);
      const color = getColorFromPalette(normalizedMag * 50, { maxValue: 25, blueRange: 0.4 });
      const alpha = Math.max(80, normalizedMag * 180);
      
      p5.stroke(...color, alpha);
      p5.strokeWeight(2);
      
      // Draw this line segment
      p5.line(
        x + height1 * 0.2, y1,
        x + height2 * 0.2, y2
      );
    }
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

export function RippleField({ paused = false, prefersReducedMotion = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(120);
    
    // Add click and drag handlers for interactive ripples
    p5.mousePressed = () => {
      if (p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
        isDragging = true;
        ripples.push(createRipple(p5.mouseX, p5.mouseY));
        lastDragTime = Date.now();
      }
    };

    p5.mouseDragged = () => {
      if (isDragging && p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
        // Add continuous distortion point
        distortionField.push({
          x: p5.mouseX,
          y: p5.mouseY,
          strength: distortionStrength,
          life: 0,
          maxLife: 1.0
        });
        
        // Limit distortion field size
        if (distortionField.length > maxDistortionPoints) {
          distortionField.shift();
        }
      }
    };

    p5.mouseReleased = () => {
      isDragging = false;
    };

    // Touch support for mobile devices
    p5.touchStarted = () => {
      if (p5.touches.length > 0) {
        const touch = p5.touches[0];
        if (touch.x >= 0 && touch.x <= p5.width && touch.y >= 0 && touch.y <= p5.height) {
          isDragging = true;
          ripples.push(createRipple(touch.x, touch.y));
          lastDragTime = Date.now();
        }
      }
    };

    p5.touchMoved = () => {
      if (isDragging && p5.touches.length > 0) {
        const touch = p5.touches[0];
        if (touch.x >= 0 && touch.x <= p5.width && touch.y >= 0 && touch.y <= p5.height) {
          // Add continuous distortion point
          distortionField.push({
            x: touch.x,
            y: touch.y,
            strength: distortionStrength,
            life: 0,
            maxLife: 1.0
          });
          
          // Limit distortion field size
          if (distortionField.length > maxDistortionPoints) {
            distortionField.shift();
          }
        }
      }
    };

    p5.touchEnded = () => {
      isDragging = false;
    };
    
    // Initialize with a few ripples
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addRandomRipple(p5), i * 500);
    }
  };

  const draw = (p5: any) => {
    p5.background(0, 0, 0, 50);

    // Lerp current speed towards target
    const targetSpeedValue = (targetPauseState || prefersReducedMotion) ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;

    // Update time for animation
    time += currentSpeed;

    // Add random ripples every 4 seconds
    const currentTime = Date.now();
    if (currentTime - lastRandomRippleTime > randomRippleInterval * currentSpeed) {
      addRandomRipple(p5);
      lastRandomRippleTime = currentTime;
    }

    // Update ripple physics
    updateRipples();
    
    // Update distortion field
    updateDistortionField();

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