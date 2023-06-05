"use client";

import { useCallback, useEffect, useRef } from "react";
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
  const thingElem = useRef<HTMLHeadingElement | null>(null);

  const typeGreeting = useCallback(() => {
    if (!thingElem.current) return;

    // @ts-ignore - unfortunately, the lib types aren't coming through
    const instance = new TypeIt(greetingElem.current, {
      speed: 20,
      afterComplete: onGreetingFinished,
      lifeLike: true,
    });

    const thingTextLength = thingElem.current.innerText.length;

    instance.pause(1000).delete(thingTextLength);

    thingsIDo.forEach((thing, index) => {
      const isLast = index === thingsIDo.length - 1;
      instance
        .type(thing)
        .pause(650)
        .delete(isLast ? 0 : thing.length);
    });

    instance.go();
  }, [thingElem, onGreetingFinished]);

  useEffect(() => {
    typeGreeting();
  }, [typeGreeting]);

  return (
    <>
      <h1 ref={greetingElem} className="p-[8vw] text-[4vw] lg:p-28 lg:text-5xl">
        Hey! I&apos;m Louis. 👋
        <br /> Here are some{" "}
        <span ref={thingElem}>experiments I&apos;ve played with.</span>
      </h1>
    </>
  );
}
