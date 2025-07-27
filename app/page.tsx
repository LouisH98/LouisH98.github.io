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
  const backgroundEffectRef = useRef<BackgroundEffectRef>(null);

  const handleClick = useCallback(() => {
    setShowProjects(true);
  }, [setShowProjects]);

  const handleNextEffect = useCallback(() => {
    backgroundEffectRef.current?.nextEffect();
  }, []);

  const handlePreviousEffect = useCallback(() => {
    backgroundEffectRef.current?.previousEffect();
  }, []);

  return (
    <main 
      className={cn("h-screen", "select-none")}
      onClick={handleClick}
    >
      <div
        suppressHydrationWarning
        className={cn(
          "absolute pointer-events-none",
          currentEffect === "Boids" ? "blur-sm" : 
          currentEffect === "Flow Field" ? "blur-sm" :
          currentEffect === "Vector Field" ? "blur-sm" : "blur-lg"
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
      <Greeting
        onGreetingFinished={useCallback(
          () => setShowProjects(true),
          [setShowProjects]
        )}
      />

      {showProjects && (
        <Projects
          className={cn("w-screen", "flex", "flex-col", "justify-around")}
          onModalStateChange={setIsModalOpen}
        />
      )}

      <EffectControls
        currentEffect={currentEffectComponent}
        onNext={handleNextEffect}
        onPrevious={handlePreviousEffect}
      />
    </main>
  );
}
