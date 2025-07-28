"use client";
import dynamic from "next/dynamic";
import { BackgroundEffectProps } from "@/components/BackgroundEffect/types";
import { getSpeedColor } from "@/lib/colorPalette";

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

interface Boid {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
}


const maxSpeed = 3;
const maxForce = 0.03;
const separationRadius = 25;
const alignmentRadius = 50;
const cohesionRadius = 50;

let boids: Boid[] = [];
let targetPauseState = false;
let currentSpeed = 1.0;
const lerpSpeed = 0.05;
let brightness = 0;
let mousePosition = { x: 0, y: 0 };
let isMouseActive = false;

function createBoid(x: number, y: number): Boid {
  return {
    position: { x, y },
    velocity: {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
    },
    acceleration: { x: 0, y: 0 },
  };
}

function initBoids(windowWidth: number, windowHeight: number) {
  boids = [];
  const numBoids = Math.floor((windowWidth * windowHeight) / 15000); // Density based on screen size
  
  for (let i = 0; i < numBoids; i++) {
    boids.push(createBoid(
      Math.random() * windowWidth,
      Math.random() * windowHeight
    ));
  }
}

function limitVector(vector: { x: number; y: number }, max: number) {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude > max) {
    vector.x = (vector.x / magnitude) * max;
    vector.y = (vector.y / magnitude) * max;
  }
}

function setMagnitude(vector: { x: number; y: number }, magnitude: number) {
  const current = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (current > 0) {
    vector.x = (vector.x / current) * magnitude;
    vector.y = (vector.y / current) * magnitude;
  }
}



function separation(boid: Boid): { x: number; y: number } {
  const steer = { x: 0, y: 0 };
  let count = 0;

  for (const other of boids) {
    const distance = Math.sqrt(
      (boid.position.x - other.position.x) ** 2 +
      (boid.position.y - other.position.y) ** 2
    );

    if (distance > 0 && distance < separationRadius) {
      const diff = {
        x: boid.position.x - other.position.x,
        y: boid.position.y - other.position.y,
      };
      setMagnitude(diff, 1 / distance); // Weight by distance
      steer.x += diff.x;
      steer.y += diff.y;
      count++;
    }
  }

  if (count > 0) {
    steer.x /= count;
    steer.y /= count;
    setMagnitude(steer, maxSpeed);
    steer.x -= boid.velocity.x;
    steer.y -= boid.velocity.y;
    limitVector(steer, maxForce);
  }

  return steer;
}

function alignment(boid: Boid): { x: number; y: number } {
  const average = { x: 0, y: 0 };
  let count = 0;

  for (const other of boids) {
    const distance = Math.sqrt(
      (boid.position.x - other.position.x) ** 2 +
      (boid.position.y - other.position.y) ** 2
    );

    if (distance > 0 && distance < alignmentRadius) {
      average.x += other.velocity.x;
      average.y += other.velocity.y;
      count++;
    }
  }

  if (count > 0) {
    average.x /= count;
    average.y /= count;
    setMagnitude(average, maxSpeed);
    const steer = {
      x: average.x - boid.velocity.x,
      y: average.y - boid.velocity.y,
    };
    limitVector(steer, maxForce);
    return steer;
  }

  return { x: 0, y: 0 };
}

function cohesion(boid: Boid): { x: number; y: number } {
  const average = { x: 0, y: 0 };
  let count = 0;

  for (const other of boids) {
    const distance = Math.sqrt(
      (boid.position.x - other.position.x) ** 2 +
      (boid.position.y - other.position.y) ** 2
    );

    if (distance > 0 && distance < cohesionRadius) {
      average.x += other.position.x;
      average.y += other.position.y;
      count++;
    }
  }

  if (count > 0) {
    average.x /= count;
    average.y /= count;
    const seek = {
      x: average.x - boid.position.x,
      y: average.y - boid.position.y,
    };
    setMagnitude(seek, maxSpeed);
    const steer = {
      x: seek.x - boid.velocity.x,
      y: seek.y - boid.velocity.y,
    };
    limitVector(steer, maxForce);
    return steer;
  }

  return { x: 0, y: 0 };
}

function seekMouse(boid: Boid): { x: number; y: number } {
  if (!isMouseActive) return { x: 0, y: 0 };

  const seek = {
    x: mousePosition.x - boid.position.x,
    y: mousePosition.y - boid.position.y,
  };
  
  const distance = Math.sqrt(seek.x * seek.x + seek.y * seek.y);
  
  // Only seek if mouse is reasonably close (within 200px)
  if (distance < 200 && distance > 0) {
    setMagnitude(seek, maxSpeed);
    const steer = {
      x: seek.x - boid.velocity.x,
      y: seek.y - boid.velocity.y,
    };
    limitVector(steer, maxForce * 2); // Stronger force for mouse attraction
    return steer;
  }
  
  return { x: 0, y: 0 };
}

function updateBoid(boid: Boid, windowWidth: number, windowHeight: number) {
  const sep = separation(boid);
  const ali = alignment(boid);
  const coh = cohesion(boid);
  const mouse = seekMouse(boid);

  // Apply forces (mouse seeking gets priority)
  boid.acceleration.x = sep.x + ali.x + coh.x + mouse.x;
  boid.acceleration.y = sep.y + ali.y + coh.y + mouse.y;

  // Update velocity and position
  boid.velocity.x += boid.acceleration.x * currentSpeed;
  boid.velocity.y += boid.acceleration.y * currentSpeed;
  limitVector(boid.velocity, maxSpeed);

  boid.position.x += boid.velocity.x * currentSpeed;
  boid.position.y += boid.velocity.y * currentSpeed;

  // Wrap around screen edges
  if (boid.position.x < 0) boid.position.x = windowWidth;
  if (boid.position.x > windowWidth) boid.position.x = 0;
  if (boid.position.y < 0) boid.position.y = windowHeight;
  if (boid.position.y > windowHeight) boid.position.y = 0;

  // Reset acceleration
  boid.acceleration.x = 0;
  boid.acceleration.y = 0;
}

function drawBoids(p5: any) {
  p5.noStroke();

  for (const boid of boids) {
    // Get color based on speed using shared utility
    const color = getSpeedColor(boid.velocity.x, boid.velocity.y, maxSpeed);
    
    p5.fill(...color);
    
    p5.push();
    p5.translate(boid.position.x, boid.position.y);
    
    // Rotate to face direction of movement
    const angle = Math.atan2(boid.velocity.y, boid.velocity.x);
    p5.rotate(angle);
    
    // Draw triangle-shaped boid
    p5.triangle(-8, -3, -8, 3, 5, 0);
    p5.pop();
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
  
  // Adjust boid count based on new screen size
  const targetBoids = Math.floor((windowWidth * windowHeight) / 15000);
  while (boids.length < targetBoids) {
    boids.push(createBoid(Math.random() * windowWidth, Math.random() * windowHeight));
  }
  while (boids.length > targetBoids) {
    boids.pop();
  }
}

function handleMouseMoved(p5: any) {
  // Check if mouse is within canvas bounds
  if (p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
    mousePosition.x = p5.mouseX;
    mousePosition.y = p5.mouseY;
    isMouseActive = true;
  } else {
    isMouseActive = false;
  }
}



export function Boids({ paused = false, prefersReducedMotion = false }: BackgroundEffectProps) {
  targetPauseState = paused;

  const setup = (p5: any, canvasParentRef: Element) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    p5.createCanvas(windowWidth, windowHeight).parent(canvasParentRef);

    p5.windowResized = () => handleWindowResized(p5);
    p5.frameRate(120);

    initBoids(windowWidth, windowHeight);
  };

  const draw = (p5: any) => {
    p5.background(0);

    // Lerp current speed towards target
    const targetSpeedValue = (targetPauseState || prefersReducedMotion) ? 0.0 : 1.0;
    currentSpeed += (targetSpeedValue - currentSpeed) * lerpSpeed;

    // Update boids
    for (const boid of boids) {
      updateBoid(boid, p5.width, p5.height);
    }

    drawBoids(p5);
  };

  return (
    <Sketch
      className="absolute"
      setup={setup}
      draw={draw}
      mouseMoved={handleMouseMoved}
    />
  );
}