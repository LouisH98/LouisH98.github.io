import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './page';
import './globals.css';
// Development controls are intentionally always available in the Vite dev server.
// They are not included in production builds.
if(import.meta.env.DEV)document.documentElement.dataset.devControls='visible';
const LightingControls=import.meta.env.DEV?lazy(()=>import('../components/console/LightingControls')):null;
createRoot(document.getElementById('root')!).render(<><Home />{LightingControls&&<Suspense fallback={null}><LightingControls/></Suspense>}</>);
