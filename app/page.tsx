"use client";

import { Greeting } from "@/components/Greeting";
import { Projects } from "@/components/Projects";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Home() {
  const [showProjects, setShowProjects] = useState(false);
  return (
    <main className={cn("h-screen")}>
      <Greeting onGreetingFinished={() => setShowProjects(true)} />

      {showProjects && (
        <Projects
          className={cn("w-screen", "flex", "flex-col", "justify-around")}
        />
      )}
    </main>
  );
}
