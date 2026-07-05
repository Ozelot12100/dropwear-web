import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { reportError } from "../lib/monitoring"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Captura errores de render en cualquier parte del árbol y muestra una pantalla
 * de recuperación en lugar de dejar la app en blanco. Reporta el error al hook
 * central de monitoreo (Sentry-ready).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#1f2937",
          background: "#f9fafb",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
        <p style={{ margin: 0, color: "#6b7280", maxWidth: "42ch" }}>
          Ocurrió un error inesperado. Tu sesión sigue activa; recarga la página para continuar.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>
    )
  }
}
