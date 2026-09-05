'use client';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import BitmapText from './BitmapText';
type Props = { index:number; setIndex:(index:number)=>void; sound:boolean; reduced:boolean; failed:boolean; toggleSound:()=>void; toggleMotion:()=>void; replay:()=>void; cue:()=>void };
export default function Settings(p:Props) {
  const {index,setIndex}=p;
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);
  const names=['Sound','Animation','Replay Intro'];
  const value=index===0?(p.sound?'On':'Off'):index===1?(p.reduced?'Off':'On'):(p.reduced||p.failed?'Unavailable':'Start');
  function move(direction:number){setIndex((index+direction+names.length)%names.length);p.cue();}
  function activate(){p.cue();if(index===0)p.toggleSound();else if(index===1)p.toggleMotion();else p.replay();}
  const pad=(n:number)=>String(n).padStart(2,'0');
  function onKeyDown(e:KeyboardEvent<HTMLButtonElement>){
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();e.stopPropagation();
      if(e.key==='ArrowUp'||e.key==='ArrowDown')move(e.key==='ArrowUp'?-1:1);
      else if(e.key==='Home')setIndex(0);else if(e.key==='End')setIndex(2);else activate();
    }
  }
  return <section className="configuration" aria-label="System settings">
    <div className="configuration-clock"><span><BitmapText>{`${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())}`}</BitmapText></span><span><Clock3 aria-hidden="true"/><BitmapText centered>{`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}</BitmapText></span></div>
    <div className="configuration-menu">
      <h2><BitmapText color="#e6e77b">System Configuration</BitmapText></h2>
      <div className="configuration-choice">
        <button onKeyDown={onKeyDown} className="configuration-step previous" onClick={()=>move(-1)} aria-label="Previous setting"><ChevronUp aria-hidden="true"/></button>
        <button onKeyDown={onKeyDown} id="configuration-setting" data-screen-heading className="configuration-name" onClick={()=>move(1)} aria-label={`${names[index]}. Next setting`}><BitmapText color="#65d7ee" centered>{names[index]}</BitmapText></button>
        <button onKeyDown={onKeyDown} className="configuration-step next" onClick={()=>move(1)} aria-label="Next setting"><ChevronDown aria-hidden="true"/></button>
      </div>
      <button onKeyDown={onKeyDown} id="configuration-value" className="configuration-value" onClick={activate} disabled={index===2&&(p.reduced||p.failed)} aria-label={`${names[index]}: ${value}`} aria-pressed={index<2?value==='On':undefined}>
        <ChevronLeft aria-hidden="true"/><BitmapText centered>{value}</BitmapText><ChevronRight aria-hidden="true"/>
      </button>
      <output className="sr-only" aria-live="polite">{names[index]}: {value}</output>
    </div>
  </section>;
}
