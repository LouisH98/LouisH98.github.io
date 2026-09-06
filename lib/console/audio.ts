import { asset } from './assets';
type Cue = 'move' | 'enter' | 'back' | 'save' | 'setting';
type Frame = { boot: boolean; elapsed: number };
const paths = { shutdown:'audio/crt-shutdown.mp3', boot: 'audio/startup-reference.wav', ambience: 'audio/ambience.wav', move: 'audio/cursor.wav', enter: 'audio/confirm.wav', back: 'audio/cancel.wav', save: 'audio/save-select.wav', setting: 'audio/setting.wav' };
/** Recorded PS2 interface sounds plus a recorded CRT power-down effect. */
export class ConsoleAudio {
  private context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private loading?: Promise<void>;
  private background?: AudioBufferSourceNode;
  private effects = new Set<AudioBufferSourceNode>();
  private enabled = false;
  private disposed = false;
  private revision = 0;
  private mode?: 'boot' | 'ambience';
  constructor(private frame: () => Frame, private report: (message: string) => void) {}
  async enable(automatic = false) {
    for (const effect of this.effects) { try { effect.stop(); } catch {} }
    this.effects.clear();
    const revision = ++this.revision;
    try {
      this.context ??= new AudioContext();
      if (automatic) {
        // Autoplay may be blocked. Do not leave navigation waiting on resume().
        void this.context.resume().catch(() => {});
        if (this.context.state !== 'running') return false;
      } else await this.context.resume();
      if (this.disposed || revision !== this.revision) return false;
      this.loading ??= Promise.all(Object.entries(paths).map(async ([key, path]) => {
        const response = await fetch(asset(path));
        if (!response.ok) throw new Error(`Missing ${key} audio`);
        this.buffers.set(key, await this.context!.decodeAudioData(await response.arrayBuffer()));
      })).then(() => {});
      await this.loading;
      if (this.disposed || revision !== this.revision) return false;
      this.enabled = true; this.sync(true); return true;
    } catch {
      this.loading = undefined; this.enabled = false;
      this.report('Audio could not start. You can try enabling sound again.'); return false;
    }
  }
  disable() {
    ++this.revision; this.enabled = false; this.stopBackground();
    for (const effect of this.effects) { try { effect.stop(); } catch {} }
    this.effects.clear();
  }
  shutdown() {
    const audible=this.enabled&&!document.hidden;
    this.disable();
    // Cut the menu immediately but let the final hardware sound finish on its own.
    if(audible)this.playEffect('shutdown');
  }
  private stopBackground() { try { this.background?.stop(); } catch {} this.background = undefined; this.mode = undefined; }
  sync(force = false) {
    if (!this.enabled || !this.context || document.hidden) return;
    const frame = this.frame();
    // Unlock/decode on the power gesture, but keep the CRT ignition silent.
    if (frame.boot && frame.elapsed < 0) { this.stopBackground(); return; }
    const mode = frame.boot ? 'boot' : 'ambience';
    if (mode === this.mode && !force) return;
    this.stopBackground(); this.mode = mode;
    const buffer = this.buffers.get(mode); if (!buffer) return;
    const offset = mode === 'boot' ? frame.elapsed : 0;
    if (offset >= buffer.duration) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = mode === 'ambience'; gain.gain.value = mode === 'boot' ? .12 : .035;
    source.connect(gain); gain.connect(this.context.destination); source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(0, offset); this.background = source;
  }
  cue(cue: Cue) {
    if (this.frame().boot && this.frame().elapsed < 0) return;
    if (!this.enabled || !this.context || document.hidden) return;
    this.playEffect(cue);
  }
  private playEffect(cue: Cue|'shutdown') {
    if(!this.context)return;
    const buffer = this.buffers.get(cue); if (!buffer) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; gain.gain.value = cue==='shutdown'?.2:.14;
    source.connect(gain); gain.connect(this.context.destination); this.effects.add(source);
    source.onended = () => { this.effects.delete(source); source.disconnect(); gain.disconnect(); }; source.start();
  }
  visibility() {
    if (document.hidden) { if(!this.enabled)this.disable();this.stopBackground(); void this.context?.suspend().catch(() => {}); }
    else if (this.enabled) { void this.context?.resume().then(() => this.sync(true)).catch(() => {}); }
  }
  dispose() { this.disposed = true; this.disable(); void this.context?.close().catch(() => {}); }
}
