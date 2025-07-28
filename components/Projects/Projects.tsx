import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Modal } from "../ui/modal";
import styles from "./Projects.module.css";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Project = {
  title: string;
  description: string;
  image?: string;
  url: string;
  contentFile?: string;
};

const projects: Project[] = [
  {
    title: "Print Scheduler",
    description:
      "A next-based web app for optimally scheduling 3D printer jobs.",
    url: "https://print-scheduler.vercel.app",
    image: "./project-images/print-scheduler/lane.png",
    contentFile: "print-scheduler.md",
  },
  {
    title: "The Screen",
    description:
      "A framework for building digital art for the Pimoroni Unicorn Hat HD.",
    url: "https://github.com/LouisH98/the-screen",
    image:
      "https://raw.githubusercontent.com/LouisH98/the-screen/master/images/pong.GIF?raw=true",
    contentFile: "the-screen.md",
  },
  {
    title: "LovePrint",
    description:
      "A WiFi connected reciept printer. Write messages and draw images from anywhere!",
    image: "./project-images/loveprint.png",
    url: "https://github.com/LouisH98/loveprint-web-client",
    contentFile: "loveprint.md",
  },
];

function ProjectCard({
  project,
  style,
  onCardClick,
}: {
  project: Project;
  style: React.CSSProperties;
  onCardClick: (project: Project, cardElement: HTMLElement) => void;
}) {
  const [animationComplete, setAnimationComplete] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // TODO: This isn't scalable - find a way to get if the animations are complete, or just a different way of removing the class
  useEffect(() => {
    setTimeout(() => {
      setAnimationComplete(true);
    }, 1000);
  }, []);

  const handleClick = () => {
    if (cardRef.current) {
      onCardClick(project, cardRef.current);
    }
  };

  return (
    <>
      <motion.div
        layoutId={`project-${project.title}`}
        onClick={handleClick}
      >
        <Card
          ref={cardRef}
          style={{
            ...style,
            backdropFilter: "blur(40px)",
          }}
          className={cn(
            "m-2 cursor-pointer w-80 h-96 will-change-transform flex flex-col",
            !animationComplete && styles["slide-in-blurred-left"],
            "motion-safe:hover:scale-105 transition-transform transform-gpu"
          )}
        >
          <CardHeader>
            <motion.div layoutId={`project-title-${project.title}`}>
              <CardTitle>{project.title}</CardTitle>
            </motion.div>
            <CardDescription>{project.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-1 flex-1 flex items-center justify-center overflow-hidden">
            {project.image && (
              <img
                alt={`Preview image for ${project.title}`}
                src={project.image}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export function Projects({ 
  onModalStateChange, 
  ...props 
}: { 
  onModalStateChange?: (isOpen: boolean) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalBounds, setModalBounds] = useState<DOMRect | undefined>(undefined);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCardClick = async (project: Project, cardElement: HTMLElement) => {
    setSelectedProject(project);
    onModalStateChange?.(true);
    
    if (project.contentFile) {
      setIsLoading(true);
      try {
        const response = await fetch(`/project-content/${project.contentFile}`);
        if (response.ok) {
          const content = await response.text();
          setMarkdownContent(content);
        } else {
          setMarkdownContent("Content not found.");
        }
      } catch (error) {
        setMarkdownContent("Error loading content.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setMarkdownContent("");
    }
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setMarkdownContent("");
    onModalStateChange?.(false);
  };

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
              onCardClick={handleCardClick}
            />
          ))}
        </section>
      </div>
      
      <Modal
        isOpen={!!selectedProject}
        onClose={handleCloseModal}
        title={selectedProject?.title || ""}
        url={selectedProject?.url || ""}
        layoutId={selectedProject ? `project-${selectedProject.title}` : undefined}
        markdownContent={isLoading ? "Loading..." : markdownContent}
      />
    </>
  );
}
