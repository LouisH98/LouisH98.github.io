import { GameOfLife } from "@/components/GameOfLife";
import { Boids } from "@/components/Boids";
import { FlowField } from "@/components/FlowField";
import { VectorField } from "@/components/VectorField";
import { RippleField } from "@/components/RippleField";
import { EffectComponent } from "./types";

export const availableEffects: EffectComponent[] = [
  {
    name: "Game of Life",
    component: GameOfLife,
  },
  {
    name: "Boids",
    component: Boids,
  },
  {
    name: "Flow Field",
    component: FlowField,
  },
  {
    name: "Vector Field",
    component: VectorField,
  },
  {
    name: "Ripple Field",
    component: RippleField,
  },
];

export function getRandomEffect(): EffectComponent {
  const randomIndex = Math.floor(Math.random() * availableEffects.length);
  return availableEffects[randomIndex];
}

export function getCurrentEffectIndex(): number {
  if (typeof window === "undefined") return 0;
  
  const storedIndex = localStorage.getItem("currentBackgroundEffectIndex");
  if (storedIndex) {
    const index = parseInt(storedIndex, 10);
    if (!isNaN(index) && index < availableEffects.length) {
      return index;
    }
  }
  return 0;
}

export function setEffectIndex(index: number): EffectComponent {
  if (typeof window === "undefined") return availableEffects[0];
  
  const validIndex = Math.max(0, Math.min(index, availableEffects.length - 1));
  localStorage.setItem("currentBackgroundEffectIndex", validIndex.toString());
  return availableEffects[validIndex];
}

export function getNextEffect(): EffectComponent {
  const currentIndex = getCurrentEffectIndex();
  const nextIndex = (currentIndex + 1) % availableEffects.length;
  return setEffectIndex(nextIndex);
}

export function getPreviousEffect(): EffectComponent {
  const currentIndex = getCurrentEffectIndex();
  const prevIndex = (currentIndex - 1 + availableEffects.length) % availableEffects.length;
  return setEffectIndex(prevIndex);
}

export function getEffectFromStorage(): EffectComponent {
  if (typeof window === "undefined") return availableEffects[0];
  
  const storedIndex = localStorage.getItem("currentBackgroundEffectIndex");
  
  // If no stored index exists, this is the user's first visit
  if (!storedIndex) {
    const randomIndex = Math.floor(Math.random() * availableEffects.length);
    localStorage.setItem("currentBackgroundEffectIndex", randomIndex.toString());
    return availableEffects[randomIndex];
  }
  
  const currentIndex = parseInt(storedIndex, 10);
  if (isNaN(currentIndex) || currentIndex >= availableEffects.length) {
    // Invalid stored index, generate random starting point
    const randomIndex = Math.floor(Math.random() * availableEffects.length);
    localStorage.setItem("currentBackgroundEffectIndex", randomIndex.toString());
    return availableEffects[randomIndex];
  }
  
  const currentEffect = availableEffects[currentIndex];
  
  // Auto-advance to next effect for the next page reload
  const nextIndex = (currentIndex + 1) % availableEffects.length;
  localStorage.setItem("currentBackgroundEffectIndex", nextIndex.toString());
  
  return currentEffect;
}