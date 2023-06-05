import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import styles from "./Projects.module.css";
import React, { useEffect, useState } from "react";

type Project = {
  title: string;
  description: string;
  image?: string;
  url: string;
};

const projects: Project[] = [
  {
    title: "The Screen",
    description:
      "A framework for building digital art for the Pimoroni Unicorn Hat HD.",
    url: "https://github.com/LouisH98/the-screen",
    image:
      "https://raw.githubusercontent.com/LouisH98/the-screen/master/images/pong.GIF?raw=true",
  },
  {
    title: "LovePrint",
    description:
      "A WiFi connected reciept printer. Write messages and draw images from anywhere!",
    image: "./project-images/loveprint.png",
    url: "https://github.com/LouisH98/loveprint-web-client",
  },
  {
    title: "Make Me a Game (alpha)",
    description:
      "Harness the power of generative AI to create the game of your dreams! (as long as it's pong or something like that)",
    image: "./project-images/make-me-a-game.png",
    url: "https://make-me-a-game.vercel.app/",
  },
];

function ProjectCard({
  project,
  style,
}: {
  project: Project;
  style: React.CSSProperties;
}) {
  const [animationComplete, setAnimationComplete] = useState(false);

  // TODO: This isn't scalable - find a way to get if the animations are complete, or just a different way of removing the class
  useEffect(() => {
    setTimeout(() => {
      setAnimationComplete(true);
    }, 1000);
  }, []);

  return (
    <>
      <Card
        style={{
          ...style,
          backdropFilter: "blur(40px)",
        }}
        className={cn(
          "m-2 cursor-pointer w-80 will-change-transform",
          !animationComplete && styles["slide-in-blurred-left"],
          "motion-safe:hover:scale-105 transition-transform	 transform-gpu"
        )}
        onClick={() => window.open(project.url, "_blank")}
      >
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>{project.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-1">
          {project.image && (
            <img
              alt={`Preview image for ${project.title}`}
              src={project.image}
              className="p-3"
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function Projects({ ...props }) {
  return (
    <>
      <div {...props}>
        <section
          className={cn(
            "w-full flex flex-row justify-center flex-wrap items-start"
          )}
        >
          {projects.map((project, index) => (
            <ProjectCard
              key={project.title}
              project={project}
              style={{ animationDelay: `${250 * index}ms` }}
            />
          ))}
        </section>
      </div>
    </>
  );
}
