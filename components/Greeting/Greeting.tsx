"use client";

import { useEffect, useRef } from "react";
import TypeIt from "typeit";

const thingsIDo = [
  "of my creative outlets.",
  "hobby projects I'm switching between.",
  "things I've worked on...",
];

export function Greeting() {
  const greetingElem = useRef<HTMLElement | null>(null);
  function typeGreeting() {
    // @ts-ignore - unfortunately, the lib types aren't coming through
    const instance = new TypeIt(".greeting", {
      speed: 25,
    });

    instance.pause(1000).delete("#thing");

    thingsIDo.forEach((thing, index) => {
      const isLast = index === thingsIDo.length - 1;
      instance
        .type(thing)
        .pause(1000)
        .delete(isLast ? 0 : thing.length);
    });

    instance.go();
  }

  useEffect(() => {
    typeGreeting();
  }, []);

  return (
    <>
      <h1 className=" p-[8vw] text-[3vw] lg:p-28 lg:text-4xl">
        Hey! I&apos;m Louis. <br /> Here are some{" "}
        <span id="thing">experiments I&apos;ve played with.</span>
      </h1>
    </>
  );
}
