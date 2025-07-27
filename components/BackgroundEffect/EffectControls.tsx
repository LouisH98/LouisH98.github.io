"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { EffectComponent } from "./types";

interface EffectControlsProps {
  currentEffect: EffectComponent | null;
  onNext: () => void;
  onPrevious: () => void;
}

export function EffectControls({ currentEffect, onNext, onPrevious }: EffectControlsProps) {
  if (!currentEffect) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-white/80 text-sm">
      <button
        onClick={onPrevious}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Previous effect"
      >
        <ChevronLeft size={16} />
      </button>
      
      <span className="px-2 font-mono font-medium">
        {currentEffect.name}
      </span>
      
      <button
        onClick={onNext}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Next effect"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}