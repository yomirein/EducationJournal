// js/audio.js - Звуковой движок Web Audio API для Скретч
class ScratchAudio {
  constructor() {
    this.ctx = null;
    this.volume = 1.0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol / 100));
  }

  // Синтез звука «Мяу» котика Scratch
  playMeow() {
    this.init();
    const now = this.ctx.currentTime;
    
    // Основной осциллятор с вибрато и изменением высоты
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';

    // Формантный фильтр для гласного звука [m-e-o-w]
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    filter.Q.value = 3.0;

    // Питч: подъем и спад тона
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.48);

    // Огибающая громкости
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.3 * this.volume, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  // Воспроизведение MIDI ноты (60 = C4 / До первой октавы)
  playNote(midiNote = 60, durationSec = 0.5) {
    this.init();
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4 * this.volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  // Дополнительные звуковые эффекты
  playSound(name) {
    this.init();
    const now = this.ctx.currentTime;
    switch (name) {
      case 'pop':
      case 'щелчок': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.5 * this.volume, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
      case 'jump':
      case 'прыжок': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }
      case 'coin':
      case 'монета': {
        this.playNote(72, 0.1);
        setTimeout(() => this.playNote(79, 0.25), 100);
        break;
      }
      case 'laser':
      case 'лазер': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(990, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      default:
        this.playMeow();
    }
  }
}

window.scratchAudio = new ScratchAudio();
