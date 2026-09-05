// Development-only fixed-time review page; not an entry point in the Pages build.
import { createRoot } from 'react-dom/client';
import Scene from '../components/console/Scene';
import BitmapText from '../components/console/BitmapText';
import { bootFrame } from '../lib/console/timeline';
import '../app/globals.css';
const elapsed = Number(new URLSearchParams(location.search).get('time') || 0);
createRoot(document.getElementById('root')!).render(<main className="console is-booting" style={{height:'100svh',minHeight:0}}>
  <Scene boot elapsed={elapsed} reduced={false} view="menu" onFailure={() => { document.title='WebGL unavailable'; }} />
  <div className="boot-titles" style={{opacity:bootFrame(elapsed).title}}><BitmapText>Louis Computer Entertainment</BitmapText></div>
  <span style={{position:'absolute',bottom:12,right:16,fontSize:12,color:'#888'}}>Reference time: {elapsed.toFixed(2)} s</span>
</main>);
