"use client";

import { ChevronLeft, ChevronRight, Eye, EyeOff, Shield } from "lucide-react";
import { EffectComponent } from "./types";
import { useReducedMotion } from "@/utils/hooks/useReducedMotion";

interface EffectControlsProps {
  currentEffect: EffectComponent | null;
  onNext: () => void;
  onPrevious: () => void;
  isZenMode: boolean;
  onZenModeToggle: () => void;
}

export function EffectControls({ 
  currentEffect, 
  onNext, 
  onPrevious, 
  isZenMode, 
  onZenModeToggle 
}: EffectControlsProps) {
  const prefersReducedMotion = useReducedMotion();
  
  if (!currentEffect) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-white/80 text-sm">
      <span className="px-2 font-mono font-medium">
        {currentEffect.name}
      </span>

      <div className="w-px h-4 bg-white/20 mx-1" />
      
      {/* Navigation buttons */}
      <button
        onClick={onPrevious}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Previous effect"
      >
        <ChevronLeft size={16} />
      </button>
      
      <button
        onClick={onNext}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Next effect"
      >
        <ChevronRight size={16} />
      </button>

      <div className="w-px h-4 bg-white/20 mx-1" />
      
      <button
        onClick={onZenModeToggle}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label={isZenMode ? "Exit zen mode" : "Enter zen mode"}
        title={isZenMode ? "Exit zen mode" : "Enter zen mode"}
      >
        {isZenMode ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>

      {prefersReducedMotion && (
        <>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <div
            className="p-1 text-blue-300"
            title="Reduced motion mode active - respecting your system's accessibility preference"
            aria-label="Reduced motion mode active"
          >
            <Shield size={16} />
          </div>
        </>
      )}
    </div>
  );
}