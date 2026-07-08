export class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  bgmGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  bgmNodes: (OscillatorNode | BiquadFilterNode)[] = [];
  volume = 0.3;

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);

    this.setVolume(this.volume);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  playBGM() {
    if (!this.ctx || !this.bgmGain) return;
    this.stopBGM();

    const now = this.ctx.currentTime;
    
    // A simple rhythmic bass drone
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 65.41; // C2
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    
    // Modulate filter
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2; // 2 Hz
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150;
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    osc.connect(filter);
    filter.connect(this.bgmGain);
    
    osc.start(now);
    lfo.start(now);
    
    this.bgmNodes.push(osc, lfo, filter);
    this.bgmGain.gain.setValueAtTime(0.2, now);
  }

  stopBGM() {
    this.bgmNodes.forEach(node => {
      try { 
        if (node instanceof OscillatorNode) {
          node.stop(); 
        }
        node.disconnect();
      } catch(e) {}
    });
    this.bgmNodes = [];
  }

  playLaser() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playHit() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playEscape() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playWarning() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(1000, now + 3.0);
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 1.5);
    gain.gain.linearRampToValueAtTime(0.01, now + 3.0);
    
    osc.start(now);
    osc.stop(now + 3.0);
  }

  playGameOver() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(50, now + 1.0);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
    
    osc.start(now);
    osc.stop(now + 1.0);
  }
}

export const audio = new AudioEngine();
