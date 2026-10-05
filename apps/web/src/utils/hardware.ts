/**
 * hardware.ts — Utilitários de acesso a APIs de Hardware do Navegador / Mobile.
 * 
 * 1. Screen Wake Lock API:
 *    Mantém a tela de entregadores e cozinhas (KDS) sempre ligada durante operações ativas.
 * 
 * 2. Vibration API (Haptics):
 *    Emite feedback tátil para confirmação de ações críticas (novo pedido, entrega confirmada).
 */

let wakeLockSentinel: any = null;

/**
 * Solicita WakeLock para impedir que a tela do dispositivo apague.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator && (navigator as any).wakeLock) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      console.log('💡 Screen Wake Lock ativado com sucesso.');

      wakeLockSentinel.addEventListener('release', () => {
        console.log('💡 Screen Wake Lock foi liberado.');
        wakeLockSentinel = null;
      });

      return true;
    } catch (err: any) {
      console.warn(`Não foi possível ativar Wake Lock: ${err.message}`);
    }
  }
  return false;
}

/**
 * Libera o WakeLock para restaurar o comportamento normal de economia de energia.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch (err: any) {
      console.warn(`Erro ao liberar Wake Lock: ${err.message}`);
    }
  }
}

/**
 * Dispara vibração háptica no dispositivo móvel.
 */
export function triggerHaptic(pattern: number | number[] = 100): boolean {
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration API indisponível ou bloqueada:', e);
    }
  }
  return false;
}
