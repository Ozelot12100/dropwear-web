/**
 * Punto ÚNICO de reporte de errores de la aplicación.
 *
 * Hoy registra en consola. Para producción, conectar Sentry aquí (requiere una
 * cuenta de Sentry y un DSN):
 *   1) crear el proyecto en Sentry y definir `VITE_SENTRY_DSN` en el entorno.
 *   2) en `initMonitoring()`:
 *        if (import.meta.env.VITE_SENTRY_DSN) {
 *          const Sentry = await import('@sentry/react');
 *          Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
 *        }
 *   3) reenviar en `reportError()` con `Sentry.captureException(error)`.
 *
 * Al centralizar el reporte, habilitar monitoreo real es un cambio de pocas
 * líneas y no hay que tocar el resto del código.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[DropWear] Error capturado:", error, context ?? {})
}

/**
 * Registra handlers globales para errores no capturados (que de otro modo son
 * invisibles en el celular del usuario) y prepara el monitoreo.
 */
export function initMonitoring(): void {
  if (typeof window === "undefined") return
  window.addEventListener("error", (event) => reportError(event.error ?? event.message))
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason))
}
