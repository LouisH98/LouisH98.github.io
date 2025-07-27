"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";

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

const particleColor = [7, 201, 240];
const maxSpeed = 2;
const noiseScale = 0.005;
const forceMultiplier = 0.5;

let particles: Particle[] = [];
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;
let brightness = 0;
let time = 0;

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

function updateParticle(particle: Particle, windowWidth: number, windowHeight: number, p5: any) {
  // Get force from flow field
  const force = getFlowVector(particle.position.x, particle.position.y, p5);
  
  // Apply force to velocity
  particle.velocity.x += force.x * forceMultiplier * currentSpeed;
  particle.velocity.y += force.y * forceMultiplier * currentSpeed;
  
  // Limit speed
  const speed = Math.sqrt(particle.velocity.x ** 2 + particle.velocity.y ** 2);
  if (speed > maxSpeed) {
    particle.velocity.x = (particle.velocity.x / speed) * maxSpeed;
    particle.velocity.y = (particle.velocity.y / speed) * maxSpeed;
  }
  
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
    if (particle.history.length > 1) {
      // Draw flowing trail
      p5.beginShape();
      p5.noFill();
      
      for (let i = 0; i < particle.history.length; i++) {
        const point = particle.history[i];
        const alpha = (i / particle.history.length) * particle.alpha * 0.6;
        p5.stroke(...particleColor, alpha);
        
        if (i === 0) {
          p5.vertex(point.x, point.y);
        } else {
          p5.vertex(point.x, point.y);
        }
      }
      
      // Draw current position brighter
      p5.stroke(...particleColor, particle.alpha);
      p5.vertex(particle.position.x, particle.position.y);
      p5.endShape();
    }
    
    // Draw current particle as a small dot
    p5.fill(...particleColor, particle.alpha);
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

export function FlowField({ paused = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(60);

    initParticles(windowWidth, windowHeight);
  };

  const draw = (p5: any) => {
    p5.background(0, 20); // Slight trail effect

    // Lerp current speed towards target
    const targetSpeedValue = targetPauseState ? 0.0 : 1.0;
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