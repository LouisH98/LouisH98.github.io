"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";
import { getSpeedColor, getColorFromPalette } from "@/lib/colorPalette";

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

interface Particle {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  history: { x: number; y: number }[];
  maxHistory: number;
  alpha: number;
}

const maxSpeed = 2;
const noiseScale = 0.005;
const forceMultiplier = 0.5;
const mouseAttractionStrength = 0.8; // Strength of mouse attraction
const mouseAttractionRadius = 200; // Radius of influence for mouse attraction
const maxTurnAngle = Math.PI / 30; // Maximum angle of turn per frame (6 degrees)
const particleRepulsionRadius = 20; // Radius for particle repulsion
const particleRepulsionStrength = 0.3; // Strength of particle repulsion

let particles: Particle[] = [];
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;
let brightness = 0;
let time = 0;
let mouseX = 0;
let mouseY = 0;
let mouseIsActive = false;

function createParticle(x: number, y: number): Particle {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    history: [],
    maxHistory: 30,
    alpha: Math.random() * 255 + 50,
  };
}

function initParticles(windowWidth: number, windowHeight: number) {
  particles = [];
  const numParticles = Math.floor((windowWidth * windowHeight) / 8000);
  
  for (let i = 0; i < numParticles; i++) {
    particles.push(createParticle(
      Math.random() * windowWidth,
      Math.random() * windowHeight
    ));
  }
}

function getFlowVector(x: number, y: number, p5: any): { x: number; y: number } {
  // Create flowing noise-based vector field
  const angle = p5.noise(x * noiseScale, y * noiseScale, time * 0.0008) * Math.PI * 4;
  
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

function getMouseAttractionForce(particleX: number, particleY: number): { x: number; y: number } {
  if (!mouseIsActive) {
    return { x: 0, y: 0 };
  }

  // Calculate distance to mouse
  const dx = mouseX - particleX;
  const dy = mouseY - particleY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If particle is outside attraction radius, no force
  if (distance > mouseAttractionRadius) {
    return { x: 0, y: 0 };
  }
  
  // Calculate force strength based on distance (linear falloff)
  const normalizedDistance = distance / mouseAttractionRadius;
  const forceStrength = mouseAttractionStrength * (1 - normalizedDistance);
  
  // Normalize direction and apply force
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  return {
    x: normalizedDx * forceStrength,
    y: normalizedDy * forceStrength,
  };
}

function getParticleRepulsionForce(particle: Particle, allParticles: Particle[]): { x: number; y: number } {
  let totalRepulsionX = 0;
  let totalRepulsionY = 0;
  
  for (const otherParticle of allParticles) {
    if (otherParticle === particle) continue;
    
    const dx = particle.position.x - otherParticle.position.x;
    const dy = particle.position.y - otherParticle.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only apply repulsion if particles are close
    if (distance < particleRepulsionRadius && distance > 0) {
      const normalizedDistance = distance / particleRepulsionRadius;
      const repulsionStrength = particleRepulsionStrength * (1 - normalizedDistance);
      
      // Normalize direction and apply repulsion
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      totalRepulsionX += normalizedDx * repulsionStrength;
      totalRepulsionY += normalizedDy * repulsionStrength;
    }
  }
  
  return { x: totalRepulsionX, y: totalRepulsionY };
}

function updateParticle(particle: Particle, windowWidth: number, windowHeight: number, p5: any) {
  // Get force from flow field
  const flowForce = getFlowVector(particle.position.x, particle.position.y, p5);
  
  // Get mouse attraction force
  const mouseForce = getMouseAttractionForce(particle.position.x, particle.position.y);
  
  // Get particle repulsion force
  const repulsionForce = getParticleRepulsionForce(particle, particles);
  
  // Combine all forces
  const totalForceX = flowForce.x * forceMultiplier + mouseForce.x + repulsionForce.x;
  const totalForceY = flowForce.y * forceMultiplier + mouseForce.y + repulsionForce.y;
  
  // Calculate current velocity direction
  const particleSpeed = Math.sqrt(particle.velocity.x ** 2 + particle.velocity.y ** 2);
  let currentAngle = 0;
  if (particleSpeed > 0.1) {
    currentAngle = Math.atan2(particle.velocity.y, particle.velocity.x);
  }
  
  // Calculate desired velocity direction
  const desiredAngle = Math.atan2(totalForceY, totalForceX);
  
  // Calculate angle difference
  let angleDiff = desiredAngle - currentAngle;
  
  // Normalize angle difference to [-π, π]
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  
  // Limit the angle change
  const clampedAngleDiff = Math.max(-maxTurnAngle, Math.min(maxTurnAngle, angleDiff));
  
  // Calculate new velocity with limited turn
  const newAngle = currentAngle + clampedAngleDiff;
  const newSpeed = Math.min(particleSpeed + 0.1, maxSpeed); // Gradual speed increase
  
  particle.velocity.x = Math.cos(newAngle) * newSpeed;
  particle.velocity.y = Math.sin(newAngle) * newSpeed;
  
  // Add current position to history
  particle.history.push({ x: particle.position.x, y: particle.position.y });
  if (particle.history.length > particle.maxHistory) {
    particle.history.shift();
  }
  
  // Update position
  particle.position.x += particle.velocity.x * currentSpeed;
  particle.position.y += particle.velocity.y * currentSpeed;
  
  // Wrap around edges
  if (particle.position.x < 0) {
    particle.position.x = windowWidth;
    particle.history = []; // Clear trail when wrapping
  }
  if (particle.position.x > windowWidth) {
    particle.position.x = 0;
    particle.history = [];
  }
  if (particle.position.y < 0) {
    particle.position.y = windowHeight;
    particle.history = [];
  }
  if (particle.position.y > windowHeight) {
    particle.position.y = 0;
    particle.history = [];
  }
}

function drawParticles(p5: any) {
  p5.strokeWeight(1);
  p5.noFill();
  
  for (const particle of particles) {
    // Get base color based on particle speed
    const baseColor = getSpeedColor(particle.velocity.x, particle.velocity.y, maxSpeed, { reverse: true });
    
    if (particle.history.length > 1) {
      // Draw flowing trail with gradient
      for (let i = 0; i < particle.history.length - 1; i++) {
        const point1 = particle.history[i];
        const point2 = particle.history[i + 1];
        
        // Calculate gradient position (0 = oldest, 1 = newest)
        const gradientPos = i / (particle.history.length - 1);
        
        // Create gradient colors - start with cool blues, transition to warm oranges
        const startColor = getColorFromPalette(0.2, { reverse: true }); // Cool blue
        const endColor = getColorFromPalette(0.8, { reverse: true });   // Warm orange
        
        // Interpolate between start and end colors based on gradient position
        const r = startColor[0] + (endColor[0] - startColor[0]) * gradientPos;
        const g = startColor[1] + (endColor[1] - startColor[1]) * gradientPos;
        const b = startColor[2] + (endColor[2] - startColor[2]) * gradientPos;
        
        // Fade alpha based on trail position
        const alpha = (i / particle.history.length) * particle.alpha * 0.8;
        
        p5.stroke(r, g, b, alpha);
        p5.line(point1.x, point1.y, point2.x, point2.y);
      }
      
      // Draw connection to current position with brightest color
      const lastPoint = particle.history[particle.history.length - 1];
      const brightestColor = getColorFromPalette(1.0, { reverse: true });
      p5.stroke(...brightestColor, particle.alpha);
      p5.line(lastPoint.x, lastPoint.y, particle.position.x, particle.position.y);
    }
    
    // Draw current particle as a small dot with brightest color
    const brightestColor = getColorFromPalette(1.0, { reverse: true });
    p5.fill(...brightestColor, particle.alpha);
    p5.noStroke();
    p5.circle(particle.position.x, particle.position.y, 2);
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
  
  // Adjust particle count based on new screen size
  const targetParticles = Math.floor((windowWidth * windowHeight) / 8000);
  while (particles.length < targetParticles) {
    particles.push(createParticle(Math.random() * windowWidth, Math.random() * windowHeight));
  }
  while (particles.length > targetParticles) {
    particles.pop();
  }
}

export function FlowField({ paused = false, prefersReducedMotion = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(120);

    // Add mouse event handlers
    p5.mouseMoved = () => {
      mouseX = p5.mouseX;
      mouseY = p5.mouseY;
      mouseIsActive = true;
    };

    p5.mousePressed = () => {
      mouseX = p5.mouseX;
      mouseY = p5.mouseY;
      mouseIsActive = true;
    };

    p5.mouseReleased = () => {
      mouseIsActive = false;
    };

    p5.mouseOut = () => {
      mouseIsActive = false;
    };

    initParticles(windowWidth, windowHeight);
  };

  const draw = (p5: any) => {
    p5.background(0, 20); // Slight trail effect

    // Lerp current speed towards target
    const targetSpeedValue = (targetPauseState || prefersReducedMotion) ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;

    // Update time for noise animation
    time += currentSpeed;

    // Update particles
    for (const particle of particles) {
      updateParticle(particle, p5.width, p5.height, p5);
    }

    drawParticles(p5);
  };

  return (
    <Sketch
      className="absolute pointer-events-none"
      setup={setup}
      draw={draw}
    />
  );
}