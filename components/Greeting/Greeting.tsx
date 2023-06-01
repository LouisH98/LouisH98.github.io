"use client";

import { useEffect, useRef } from "react";
import TypeIt from "typeit";

const thingsIDo = [
  "of my creative outlets.",
  "hobby projects I'm switching between.",
  "things I've worked on...",
];

export function Greeting({
  onGreetingFinished,
}: {
  onGreetingFinished?: () => void;
}) {
  const greetingElem = useRef<HTMLHeadingElement | null>(null);
  function typeGreeting() {
    // @ts-ignore - unfortunately, the lib types aren't coming through
    const instance = new TypeIt(greetingElem.current, {
      speed: 20,
      afterComplete: onGreetingFinished,
      lifeLike: true,
    });

    instance.pause(1000).delete("#thing");

    thingsIDo.forEach((thing, index) => {
      const isLast = index === thingsIDo.length - 1;
      instance
        .type(thing)
        .pause(650)
        .delete(isLast ? 0 : thing.length);
    });

    instance.go();
  }

  useEffect(() => {
    typeGreeting();
  }, []);

  return (
    <>
      <h1 ref={greetingElem} className="p-[8vw] text-[4vw] lg:p-28 lg:text-5xl">
        Hey! I&apos;m Louis. 👋
        <br /> Here are some{" "}
        <span id="thing">experiments I&apos;ve played with.</span>
      </h1>
    </>
  );
}
