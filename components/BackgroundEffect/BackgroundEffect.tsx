"use client";

import { useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { BackgroundEffectWrapperProps, EffectComponent } from "./types";
import { getEffectFromStorage, getNextEffect, getPreviousEffect, availableEffects } from "./effects";
import { useReducedMotion } from "@/utils/hooks/useReducedMotion";

export interface BackgroundEffectRef {
  nextEffect: () => void;
  previousEffect: () => void;
}

export const BackgroundEffect = forwardRef<BackgroundEffectRef, BackgroundEffectWrapperProps>(
  function BackgroundEffect({ paused = false, onEffectChange, onEffectUpdate }, ref) {
    const [currentEffect, setCurrentEffect] = useState<EffectComponent | null>(null);
    const prefersReducedMotion = useReducedMotion();

    const updateEffect = useCallback((effect: EffectComponent) => {
      setCurrentEffect(effect);
      onEffectChange?.(effect.name);
      onEffectUpdate?.(effect);
    }, [onEffectChange, onEffectUpdate]);

    useImperativeHandle(ref, () => ({
      nextEffect: () => {
        const nextEffect = getNextEffect();
        updateEffect(nextEffect);
      },
      previousEffect: () => {
        const prevEffect = getPreviousEffect();
        updateEffect(prevEffect);
      },
    }));

    useEffect(() => {
      // Only run on client side
      if (prefersReducedMotion) {
        // Force VectorField when user prefers reduced motion
        const vectorFieldEffect = availableEffects.find(effect => effect.name === "Vector Field");
        if (vectorFieldEffect) {
          updateEffect(vectorFieldEffect);
        }
      } else {
        const effect = getEffectFromStorage();
        updateEffect(effect);
      }
    }, [updateEffect, prefersReducedMotion]);

    // Return null during SSR and initial hydration
    if (!currentEffect) {
      return null;
    }

    const EffectComponent = currentEffect.component;
    return <EffectComponent paused={paused} prefersReducedMotion={prefersReducedMotion} />;
  }
);