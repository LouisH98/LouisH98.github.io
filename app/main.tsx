import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './page';
import './globals.css';
// Keep development tools out of the scene by default. Add ?devControls=1 locally
// when adjusting lighting or room layout.
const showDevControls=import.meta.env.DEV&&new URLSearchParams(location.search).has('devControls');
if(showDevControls)document.documentElement.dataset.devControls='visible';
const LightingControls=showDevControls?lazy(()=>import('../components/console/LightingControls')):null;
createRoot(document.getElementById('root')!).render(<><Home />{LightingControls&&<Suspense fallback={null}><LightingControls/></Suspense>}</>);
