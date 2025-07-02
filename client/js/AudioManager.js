import { Howl, Howler } from 'howler';

class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.backgroundMusic = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.4;
        
        this.isInitialized = false;
    }
    
    init() {
        this.setupAudioContext();
        this.loadSounds();
        this.isInitialized = true;
    }
    
    setupAudioContext() {
        Howler.volume(this.masterVolume);
        
        document.addEventListener('click', () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }
        }, { once: true });
    }
    
    loadSounds() {
        const soundFiles = {
            'pistol-shot': this.createSynthSound('pistol'),
            'rifle-shot': this.createSynthSound('rifle'),
            'shotgun-shot': this.createSynthSound('shotgun'),
            'sniper-shot': this.createSynthSound('sniper'),
            'reload': this.createSynthSound('reload'),
            'enemy-death': this.createSynthSound('enemy-death'),
            'player-hit': this.createSynthSound('player-hit'),
            'item-pickup': this.createSynthSound('item-pickup'),
            'level-complete': this.createSynthSound('level-complete'),
            'footsteps': this.createSynthSound('footsteps'),
            'cyberpunk-ambient': this.createBackgroundMusic()
        };
        
        for (const [name, soundData] of Object.entries(soundFiles)) {
            if (soundData.url) {
                this.sounds.set(name, new Howl({
                    src: [soundData.url],
                    volume: soundData.volume || this.sfxVolume,
                    loop: soundData.loop || false,
                    rate: soundData.rate || 1.0
                }));
            } else {
                this.sounds.set(name, this.createWebAudioSound(soundData));
            }
        }
    }
    
    createSynthSound(type) {
        switch (type) {
            case 'pistol':
                return {
                    type: 'synth',
                    waveform: 'square',
                    frequency: 800,
                    duration: 0.1,
                    volume: 0.6,
                    envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.04 }
                };
                
            case 'rifle':
                return {
                    type: 'synth',
                    waveform: 'sawtooth',
                    frequency: 400,
                    duration: 0.15,
                    volume: 0.7,
                    envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.06 }
                };
                
            case 'shotgun':
                return {
                    type: 'noise',
                    duration: 0.3,
                    volume: 0.8,
                    filterFreq: 2000,
                    envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.14 }
                };
                
            case 'sniper':
                return {
                    type: 'synth',
                    waveform: 'triangle',
                    frequency: 200,
                    duration: 0.4,
                    volume: 0.9,
                    envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.18 }
                };
                
            case 'reload':
                return {
                    type: 'synth',
                    waveform: 'square',
                    frequency: 300,
                    duration: 0.2,
                    volume: 0.4,
                    envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.05 }
                };
                
            case 'enemy-death':
                return {
                    type: 'synth',
                    waveform: 'sawtooth',
                    frequency: 150,
                    duration: 0.8,
                    volume: 0.6,
                    envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.4 }
                };
                
            case 'player-hit':
                return {
                    type: 'noise',
                    duration: 0.2,
                    volume: 0.5,
                    filterFreq: 1000,
                    envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.14 }
                };
                
            case 'item-pickup':
                return {
                    type: 'synth',
                    waveform: 'sine',
                    frequency: 880,
                    duration: 0.3,
                    volume: 0.5,
                    envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.15 }
                };
                
            case 'level-complete':
                return {
                    type: 'synth',
                    waveform: 'triangle',
                    frequency: 523,
                    duration: 1.0,
                    volume: 0.7,
                    envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.2 }
                };
                
            case 'footsteps':
                return {
                    type: 'noise',
                    duration: 0.1,
                    volume: 0.3,
                    filterFreq: 500,
                    envelope: { attack: 0.01, decay: 0.02, sustain: 0.1, release: 0.07 }
                };
                
            default:
                return {
                    type: 'synth',
                    waveform: 'sine',
                    frequency: 440,
                    duration: 0.2,
                    volume: 0.5,
                    envelope: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.3 }
                };
        }
    }
    
    createBackgroundMusic() {
        return {
            type: 'ambient',
            baseFreq: 80,
            harmonics: [1, 1.5, 2, 2.5, 3],
            duration: 30,
            volume: 0.2,
            loop: true
        };
    }
    
    createWebAudioSound(config) {
        let currentAmbient = null;
        
        return {
            play: () => {
                if (!window.AudioContext && !window.webkitAudioContext) {
                    console.warn('Web Audio API not supported');
                    return;
                }
                
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (config.type === 'synth') {
                    this.playSynthSound(audioContext, config);
                } else if (config.type === 'noise') {
                    this.playNoiseSound(audioContext, config);
                } else if (config.type === 'ambient') {
                    currentAmbient = this.playAmbientSound(audioContext, config);
                    return currentAmbient;
                }
            },
            volume: (vol) => {
                config.volume = vol;
            },
            stop: () => {
                if (currentAmbient && currentAmbient.stop) {
                    currentAmbient.stop();
                }
            }
        };
    }
    
    playSynthSound(audioContext, config) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = config.waveform;
        oscillator.frequency.value = config.frequency;
        
        const now = audioContext.currentTime;
        const env = config.envelope;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(config.volume, now + env.attack);
        gainNode.gain.linearRampToValueAtTime(config.volume * env.sustain, now + env.attack + env.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
        
        oscillator.start(now);
        oscillator.stop(now + config.duration);
    }
    
    playNoiseSound(audioContext, config) {
        const bufferSize = audioContext.sampleRate * config.duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * config.volume;
        }
        
        const source = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        filter.type = 'lowpass';
        filter.frequency.value = config.filterFreq;
        
        const now = audioContext.currentTime;
        const env = config.envelope;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + env.attack);
        gainNode.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
        
        source.start(now);
    }
    
    playAmbientSound(audioContext, config) {
        const oscillators = [];
        const gainNodes = [];
        
        config.harmonics.forEach((harmonic, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = config.baseFreq * harmonic;
            
            const volume = config.volume / (index + 1);
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            
            oscillator.start();
            
            oscillators.push(oscillator);
            gainNodes.push(gainNode);
        });
        
        return {
            stop: () => {
                oscillators.forEach(osc => osc.stop());
            }
        };
    }
    
    playSound(soundName, volume = 1.0) {
        if (!this.isInitialized) {
            console.warn('AudioManager not initialized');
            return;
        }
        
        const sound = this.sounds.get(soundName);
        if (sound) {
            if (sound.play) {
                sound.volume(volume * this.sfxVolume);
                sound.play();
            }
        } else {
            console.warn(`Sound '${soundName}' not found`);
        }
    }
    
    playWeaponSound(weaponType) {
        this.playSound(`${weaponType}-shot`);
    }
    
    playBackgroundMusic(musicName) {
        this.stopBackgroundMusic();
        
        const music = this.sounds.get(musicName);
        if (music) {
            // Howl 객체인지 확인
            if (music.volume && music.loop) {
                music.volume(this.musicVolume);
                music.loop(true);
                this.backgroundMusic = music.play();
            } else {
                // WebAudio 사운드인 경우 단순히 재생
                console.log('Playing ambient background music');
                this.backgroundMusic = music.play();
            }
        } else {
            console.warn(`Background music '${musicName}' not found`);
        }
    }
    
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            const music = this.sounds.get('cyberpunk-ambient');
            if (music && music.stop) {
                music.stop();
            }
            this.backgroundMusic = null;
        }
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        Howler.volume(this.masterVolume);
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.backgroundMusic) {
            const music = this.sounds.get('cyberpunk-ambient');
            if (music) {
                music.volume(this.musicVolume);
            }
        }
    }
    
    playFootsteps() {
        if (Math.random() < 0.3) {
            this.playSound('footsteps', 0.3);
        }
    }
    
    play3DSound(soundName, position, listenerPosition, maxDistance = 100) {
        const distance = position.distanceTo(listenerPosition);
        const volume = Math.max(0, 1 - (distance / maxDistance));
        
        if (volume > 0) {
            this.playSound(soundName, volume);
        }
    }
    
    dispose() {
        this.stopBackgroundMusic();
        
        this.sounds.forEach(sound => {
            if (sound.unload) {
                sound.unload();
            }
        });
        
        this.sounds.clear();
    }
}

export default AudioManager;