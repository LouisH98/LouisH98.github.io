"use client";

import { BackgroundEffect, BackgroundEffectRef, EffectComponent } from "@/components/BackgroundEffect";
import { EffectControls } from "@/components/BackgroundEffect/EffectControls";
import { Greeting } from "@/components/Greeting";
import { Projects } from "@/components/Projects";
import { cn } from "@/lib/utils";
import { useSessionStorage } from "@/utils/hooks/useSessionStorage";
import { useCallback, useState, useRef } from "react";

export default function Home() {
  const [showProjects, setShowProjects] = useSessionStorage(
    "showProjects",
    false
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<string>("GameOfLife");
  const [currentEffectComponent, setCurrentEffectComponent] = useState<EffectComponent | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const backgroundEffectRef = useRef<BackgroundEffectRef>(null);

  const handleClick = useCallback(() => {
    if (!isZenMode) {
      setShowProjects(true);
    }
  }, [setShowProjects, isZenMode]);

  const handleNextEffect = useCallback(() => {
    backgroundEffectRef.current?.nextEffect();
  }, []);

  const handlePreviousEffect = useCallback(() => {
    backgroundEffectRef.current?.previousEffect();
  }, []);

  const handleZenModeToggle = useCallback(() => {
    setIsZenMode(prev => !prev);
  }, []);

  return (
    <main 
      className={cn("min-h-screen", "select-none")}
      onClick={handleClick}
    >
      <div
        suppressHydrationWarning
        className={cn(
          "fixed inset-0 pointer-events-none transition-all duration-500 ease-in-out",
          currentEffect === "Boids" ? (isZenMode ? "blur-none" : "blur-sm") : 
          currentEffect === "Flow Field" ? (isZenMode ? "blur-none" : "blur-sm") :
          currentEffect === "Vector Field" ? (isZenMode ? "blur-none" : "blur-sm") :
          currentEffect === "Ripple Field" ? (isZenMode ? "blur-none" : "blur-sm") : 
          (isZenMode ? "blur-sm" : "blur-lg")
        )}
        style={{ zIndex: -1 }}
      >
        <BackgroundEffect 
          ref={backgroundEffectRef}
          paused={isModalOpen} 
          onEffectChange={setCurrentEffect}
          onEffectUpdate={setCurrentEffectComponent}
        />
      </div>
      
      <div 
        className={cn(
          "transition-opacity duration-500 ease-in-out",
          isZenMode ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <Greeting
          onGreetingFinished={useCallback(
            () => setShowProjects(true),
            [setShowProjects]
          )}
        />
      </div>

      <div 
        className={cn(
          "transition-opacity duration-500 ease-in-out",
          !isZenMode && showProjects ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {showProjects && (
          <Projects
            className={cn("w-screen", "flex", "flex-col", "justify-around")}
            onModalStateChange={setIsModalOpen}
          />
        )}
      </div>

      <EffectControls
        currentEffect={currentEffectComponent}
        onNext={handleNextEffect}
        onPrevious={handlePreviousEffect}
        isZenMode={isZenMode}
        onZenModeToggle={handleZenModeToggle}
      />
    </main>
  );
}
