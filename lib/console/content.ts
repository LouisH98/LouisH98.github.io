export type ProjectSection = { title: string; paragraphs: string[]; bullets?: string[]; image?: string; caption?: string };
export type Project = { external?: boolean; id: string; title: string; summary: string; category: string; technologies: string[]; image: string; url: string; linkLabel: string; sections: ProjectSection[] };
export const projects: Project[] = [
  {
    id: 'labs-creations', external: true, title: 'Labs Creations', category: 'DESIGN / 3D PRINTING',
    summary: 'Labs Creations on Etsy.',
    technologies: [], image: 'project-images/labs-creations/forest.jpg',
    url: 'https://www.etsy.com/uk/shop/LabsCreationsUK', linkLabel: 'Visit Etsy shop',
    sections: [],
  },
  {
    id: 'print-scheduler', title: 'Print Scheduler', category: 'SOFTWARE / 3D PRINTING',
    summary: 'A web app for scheduling jobs across multiple 3D printers.',
    technologies: ['Next.js', '3D printing', 'Scheduling'], image: 'project-images/print-scheduler/Dashboard.webp',
    url: 'https://print-scheduler.vercel.app', linkLabel: 'Launch project',
    sections: [
      { title: 'Why I built it', paragraphs: ['After taking my 3D printing hobby a little too far and starting a small side-gig on Etsy, I found myself spending more and more time planning the printers’ schedules. So I did what any engineer might do: spend twice as long creating a solution.', 'Existing tools didn’t quite fit. I needed to schedule jobs across different printers, work around their capabilities, and account for the times when I wouldn’t be around to start a print.'] },
      { title: 'From job to schedule', paragraphs: ['Components are individual printable items, stored as 3MF files. Products group those components together. Jobs specify which products are needed, and the scheduler assigns the work to compatible printers.'], bullets: ['Match print-bed dimensions, nozzle sizes, materials, and multi-colour capabilities.', 'Allow prints to run overnight, while preventing new jobs from starting during away times.', 'Use preferred printers when a machine is particularly well suited to a component.'], image: 'project-images/print-scheduler/Schedule.webp', caption: 'A schedule built around the printers and their constraints.' },
      { title: 'Printer compatibility', paragraphs: ['My A1 Mini has a small bed, a 0.4 mm nozzle, and an AMS for changing filaments. The P1S has a larger bed and a 0.6 mm nozzle; its CoreXY design makes it a good fit for larger prints with fewer colour changes. The A1 handles multi-colour changes efficiently, but its moving bed makes smaller prints a better fit.', 'Uploading a 3MF extracts the information needed to decide which printers can take the job. Multiple files can be attached to a component, so it can be considered for different machines.'], image: 'project-images/print-scheduler/component-preview.webp', caption: 'Component information extracted from an uploaded 3MF file.' },
      { title: 'Scheduling jobs', paragraphs: ['Once components, products, and printers are in place, adding a job triggers the scheduler to analyse compatibility and assign its parts. Folders help organise the growing library of components and products.'], image: 'project-images/print-scheduler/full-walkthrough.mp4', caption: 'Creating a job and generating its print schedule.' },
      { title: 'Planned integrations', paragraphs: ['The original project was built for personal use. The next goal is a fully automated flow: receive orders from Etsy or Shopify, schedule them, then dispatch them through local printer APIs. Automatic dispatch through Bambu Lab’s Network Plugin is an intended next step, rather than an existing feature.'] },
    ],
  },
  {
    id: 'the-screen', title: 'The Screen', category: 'HARDWARE / GENERATIVE ART',
    summary: 'A Python framework for animations on a Raspberry Pi LED matrix.',
    technologies: ['Python', 'FastAPI', 'Raspberry Pi'], image: 'project-images/the-screen/pong.mp4',
    url: 'https://github.com/LouisH98/the-screen', linkLabel: 'View on GitHub',
    sections: [
      { title: 'The display', paragraphs: ['The Screen is a framework for the Pimoroni Unicorn HAT HD. It loads independent “slides” and switches between them while running. A slide can do whatever it likes; each iteration simply returns a two-dimensional array of pixels.', 'It runs on a Raspberry Pi, including the Zero 2, and turns the LED matrix into a place to experiment with code and digital art.'] },
      { title: 'Animations', paragraphs: ['The collection includes Conway’s Game of Life, Wolfram cellular automata, a self-playing game of Pong, Matrix rain, a starfield, shaders, and GIF playback.'], image: 'project-images/the-screen/game-of-life.mp4', caption: 'Conway’s Game of Life on the Unicorn HAT HD.' },
      { title: 'Remote control', paragraphs: ['A FastAPI service controls brightness, rotation, and the active slide. Python inter-process communication passes commands to the process running the display, so the screen can also operate independently of the web server.', 'Slides are dynamically loaded with Yapsy. A slide can calculate each pixel individually or return the entire display buffer.'], image: 'project-images/the-screen/matrix.mp4', caption: 'Matrix rain, scaled down to a handful of LEDs.' },
      { title: 'Planned slides', paragraphs: ['The original roadmap includes a pendulum simulation, Snake, a weather forecast, sand and water automata, and potentially two-player Pong. A dedicated frontend was also planned.'] },
    ],
  },
  {
    id: 'loveprint', title: 'LovePrint', category: 'HARDWARE / PRINTING',
    summary: 'Send messages and drawings to an internet-connected receipt printer.',
    technologies: ['Vue 3', 'Python / Flask', 'Raspberry Pi'], image: 'project-images/loveprint.webp',
    url: 'https://github.com/LouisH98/loveprint-web-client', linkLabel: 'View on GitHub',
    sections: [
      { title: 'How it works', paragraphs: ['LovePrint is an internet-connected receipt printer, designed to run from a Raspberry Pi. Write a message or draw a picture from anywhere, and it appears on a small strip of paper.', 'The frontend uses Vue 3 and Vuetify with a mobile-first layout. It is a progressive web app, backed by a Python service built with Flask and Flask-API.'] },
      { title: 'Drawing tools', paragraphs: ['Write a message, adjust its formatting, or add a drawing. The drawing canvas has an adjustable pen size and undo/redo controls. The home screen also shows whether the printer is connected.'], image: 'project-images/loveprint/drawing.webp', caption: 'Drawing a message before sending it to the printer.' },
      { title: 'Printing', paragraphs: ['When a drawing is finished, you can remove it, download it, or send it alongside a message. The printer prints both the text and drawing.'], image: 'project-images/loveprint/drawing-and-message.webp', caption: 'Text and drawings, ready to become a print.' },
      { title: 'Message history', paragraphs: ['The history view stores the messages you’ve sent, with options to revisit, delete, or print them again.'], image: 'project-images/loveprint/history.webp', caption: 'A history of messages, ready to reprint.' },
    ],
  },
];
export const about = {
  name: 'Louis',
  intro: 'Hi, I’m Louis.',
  role: 'Senior Software Engineer at Arm',
  paragraphs: ['I build intuitive software that helps engineers get their work done, from data visualisation to performance-profiling tools.', 'Away from work, I tinker with home automation, get my hands dirty with small hardware projects, and sell 3D-printed plant pots.'],
  url: 'https://github.com/LouisH98',
  linkedin: 'https://www.linkedin.com/in/louish98/',
};

export const professionalProjects: Project[] = [
  { id: 'arm', external: true, title: 'Arm', category: 'PROFESSIONAL', summary: '', technologies: [], image: 'company-logos/arm.svg', url: 'https://www.arm.com/', linkLabel: 'Visit Arm', sections: [] },
  { id: 'cambridge-intelligence', external: true, title: 'Cambridge Intelligence', category: 'PROFESSIONAL', summary: '', technologies: [], image: 'company-logos/cambridge-intelligence.png', url: 'https://cambridge-intelligence.com/', linkLabel: 'Visit Cambridge Intelligence', sections: [] },
];
export const professionalWorkEnabled = import.meta.env?.VITE_SHOW_PROFESSIONAL_WORK === 'true';
export const projectSections = [
  ...(professionalWorkEnabled ? [{ title: 'Professional', projects: professionalProjects }] : []),
  { title: 'Personal', projects },
];
export const browserProjects = projectSections.flatMap(section => section.projects);
