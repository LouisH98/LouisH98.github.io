import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import Image from "next/image";
import styles from "./Projects.module.css";
import React from "react";

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
    title: "Vercel",
    description: "Develop. Preview. Ship.",
    image: "https://vercel.com/twitter-card.png",
    url: "https://vercel.com",
  },
  {
    title: "Vercel2",
    description: "Develop. Preview. Ship.",
    image: "https://vercel.com/twitter-card.png",
    url: "https://vercel.com",
  },
];

function ProjectCard({
  project,
  style,
}: {
  project: Project;
  style: React.CSSProperties;
}) {
  return (
    <>
      <Card
        style={{ ...style, backdropFilter: "blur(40px)" }}
        className={cn(
          "m-2",
          "cursor-pointer",
          styles["slide-in-blurred-left"],
          "w-80"
        )}
        onClick={() => window.open(project.url, "_blank")}
      >
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>{project.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 m-0">
          {project.image && (
            <Image
              unoptimized
              alt={`Preview of ${project.title}`}
              src={project.image}
              width={300}
              height={150}
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
            "w-full",
            "flex",
            "flex-row",
            "justify-center",
            "flex-wrap"
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
