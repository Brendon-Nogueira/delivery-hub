/**
 * Utilitário de Áudio utilizando a Web Audio API (Nativa do Navegador).
 * 100% gratuito e não requer arquivos MP3 externos.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private alarmInterval: number | null = null;

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Toca um som curto e agradável de sucesso (ex: Corrida Aceita)
   */
  playSuccessSound() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('AudioContext não suportado ou bloqueado', e);
    }
  }

  /**
   * Toca o som "Ding-Dong" (ex: Novo Pedido chegando no KDS)
   */
  playDingDong() {
    try {
      const ctx = this.getContext();
      
      // Ding (High)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.value = 750;
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      const now = ctx.currentTime;
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Dong (Low)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.value = 600;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      gain2.gain.setValueAtTime(0, now + 0.4);
      gain2.gain.linearRampToValueAtTime(0.5, now + 0.45);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc2.start(now + 0.4);
      osc2.stop(now + 1.2);

    } catch (e) {
      console.warn('AudioContext não suportado ou bloqueado', e);
    }
  }

  /**
   * Inicia o alarme contínuo de Novo Pedido no Restaurante
   */
  startRestaurantAlarm() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    
    // Toca imediatamente e depois a cada 3 segundos
    this.playDingDong();
    this.alarmInterval = window.setInterval(() => {
      this.playDingDong();
    }, 3000);
  }

  /**
   * Pára o alarme contínuo
   */
  stopRestaurantAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }
}

export const audioSynth = new AudioSynthesizer();
