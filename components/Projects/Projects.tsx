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
    title: "Next.js",
    description: "The React Framework for Production",
    url: "https://nextjs.org",
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
        style={style}
        className={cn(
          "m-2",
          "cursor-pointer",
          styles["slide-in-blurred-left"],
          "w-64"
        )}
      >
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>{project.description}</CardDescription>
        </CardHeader>
        <CardContent>
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
