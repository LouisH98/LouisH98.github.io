"use client";

import { GameOfLife } from "@/components/GameOfLife";
import { Greeting } from "@/components/Greeting";
import { Projects } from "@/components/Projects";
import { cn } from "@/lib/utils";
import { useSessionStorage } from "@/utils/hooks/useSessionStorage";

export default function Home() {
  const [showProjects, setShowProjects] = useSessionStorage(
    "showProjects",
    false
  );

  return (
    <main className={cn("h-screen", "select-none")}>
      <div
        className="absolute blur-lg pointer-events-none"
        style={{ zIndex: -1 }}
      >
        <GameOfLife />
      </div>
      <Greeting onGreetingFinished={() => setShowProjects(true)} />

      {showProjects && (
        <Projects
          className={cn("w-screen", "flex", "flex-col", "justify-around")}
        />
      )}
    </main>
  );
}
