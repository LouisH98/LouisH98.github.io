/** Keep the initial HTML visible until a scene frame or the fallback is ready. */
export function dismissStartup() {
  document.getElementById('root')?.removeAttribute('inert');
  const loader=document.getElementById('startup-loader');
  if(!loader || loader.hasAttribute('data-ready'))return;
  loader.setAttribute('data-ready','');
  loader.setAttribute('aria-hidden','true');
  window.setTimeout(()=>loader.remove(),400);
}
