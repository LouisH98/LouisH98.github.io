"use client";

import { GameOfLife } from "@/components/GameOfLife";
import { Greeting } from "@/components/Greeting";
import { Projects } from "@/components/Projects";
import { cn } from "@/lib/utils";
import { useSessionStorage } from "@/utils/hooks/useSessionStorage";
import { useCallback, useState } from "react";

export default function Home() {
  const [showProjects, setShowProjects] = useSessionStorage(
    "showProjects",
    false
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback(() => {
    setShowProjects(true);
  }, [setShowProjects]);

  return (
    <main 
      className={cn("h-screen", "select-none")}
      onClick={handleClick}
    >
      <div
        suppressHydrationWarning
        className="absolute blur-lg pointer-events-none"
        style={{ zIndex: -1 }}
      >
        <GameOfLife paused={isModalOpen} />
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
    </main>
  );
}
