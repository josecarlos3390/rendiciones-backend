import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);
  
  // Mapa de intentos fallidos por username
  private attempts: Map<string, LoginAttempt> = new Map();
  
  // Límites de seguridad
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos
  private readonly ATTEMPT_WINDOW_MS = 30 * 60 * 1000; // 30 minutos (ventana de tiempo)
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
  
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Iniciar cleanup periódico
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAttempts();
    }, this.CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }

  /**
   * Verifica si una cuenta está bloqueada
   * @throws ForbiddenException si la cuenta está bloqueada
   */
  checkLockout(username: string): void {
    const normalizedUsername = username.toLowerCase().trim();
    const attempt = this.attempts.get(normalizedUsername);
    
    if (!attempt) {
      return;
    }

    // Si hay bloqueo activo
    if (attempt.lockedUntil) {
      const now = Date.now();
      if (now < attempt.lockedUntil) {
        const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
        this.logger.warn(
          `Intento de login en cuenta bloqueada: ${normalizedUsername} ` +
          `(${remainingMinutes} minutos restantes)`
        );
        throw new ForbiddenException(
          `Cuenta bloqueada temporalmente por seguridad. ` +
          `Intenta nuevamente en ${remainingMinutes} minutos.`
        );
      } else {
        // Bloqueo expirado, limpiar
        this.attempts.delete(normalizedUsername);
      }
    }
  }

  /**
   * Registra un intento fallido de login
   */
  recordFailedAttempt(username: string): void {
    const normalizedUsername = username.toLowerCase().trim();
    const now = Date.now();
    
    let attempt = this.attempts.get(normalizedUsername);
    
    if (!attempt) {
      attempt = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      };
    } else {
      // Verificar si la ventana de tiempo se reinició
      if (now - attempt.firstAttempt > this.ATTEMPT_WINDOW_MS) {
        // Reiniciar contador
        attempt = {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        };
      } else {
        attempt.count++;
        attempt.lastAttempt = now;
      }
    }

    // Si excede el límite, bloquear
    if (attempt.count >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      this.logger.warn(
        `Cuenta bloqueada por fuerza bruta: ${normalizedUsername} ` +
        `(${attempt.count} intentos fallidos)`
      );
    } else {
      this.logger.warn(
        `Intento fallido ${attempt.count}/${this.MAX_ATTEMPTS}: ${normalizedUsername}`
      );
    }

    this.attempts.set(normalizedUsername, attempt);
  }

  /**
   * Limpia el registro de intentos exitosos (login correcto)
   */
  recordSuccessfulLogin(username: string): void {
    const normalizedUsername = username.toLowerCase().trim();
    const wasBlocked = this.attempts.has(normalizedUsername);
    
    if (this.attempts.delete(normalizedUsername) && wasBlocked) {
      this.logger.log(`Intentos fallidos reseteados tras login exitoso: ${normalizedUsername}`);
    }
  }

  /**
   * Obtiene estadísticas de intentos (para debugging/admin)
   */
  getStats(): {
    totalTracked: number;
    currentlyLocked: number;
    attempts: Array<{ username: string; count: number; locked: boolean }>;
  } {
    const now = Date.now();
    const attempts = Array.from(this.attempts.entries()).map(([username, attempt]) => ({
      username,
      count: attempt.count,
      locked: attempt.lockedUntil ? now < attempt.lockedUntil : false,
    }));

    return {
      totalTracked: this.attempts.size,
      currentlyLocked: attempts.filter(a => a.locked).length,
      attempts,
    };
  }

  /**
   * Limpia intentos antiguos (más de 30 minutos sin actividad)
   */
  private cleanupOldAttempts(): void {
    const now = Date.now();
    let count = 0;

    for (const [username, attempt] of this.attempts.entries()) {
      // Limpiar si no hay actividad reciente (y no está bloqueado)
      // O si el bloqueo ya expiró
      const shouldCleanup = 
        (!attempt.lockedUntil && now - attempt.lastAttempt > this.ATTEMPT_WINDOW_MS) ||
        (attempt.lockedUntil && now > attempt.lockedUntil);

      if (shouldCleanup) {
        this.attempts.delete(username);
        count++;
      }
    }

    if (count > 0) {
      this.logger.debug(`${count} registros de intentos antiguos limpiados`);
    }
  }

  /**
   * Desbloquea manualmente una cuenta (para uso administrativo)
   */
  unlockAccount(username: string): boolean {
    const normalizedUsername = username.toLowerCase().trim();
    const existed = this.attempts.has(normalizedUsername);
    
    if (existed) {
      this.attempts.delete(normalizedUsername);
      this.logger.log(`Cuenta desbloqueada manualmente: ${normalizedUsername}`);
    }
    
    return existed;
  }
}
