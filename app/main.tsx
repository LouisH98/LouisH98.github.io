import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './page';
import './globals.css';
const LightingControls=import.meta.env.DEV?lazy(()=>import('../components/console/LightingControls')):null;
createRoot(document.getElementById('root')!).render(<><Home />{LightingControls&&<Suspense fallback={null}><LightingControls/></Suspense>}</>);
