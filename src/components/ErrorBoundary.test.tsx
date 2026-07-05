import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "./ErrorBoundary"

vi.mock("../lib/monitoring", () => ({ reportError: vi.fn() }))

function Boom(): never {
  throw new Error("fallo de render")
}

describe("ErrorBoundary", () => {
  it("renderiza los hijos cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <span>contenido normal</span>
      </ErrorBoundary>,
    )
    expect(screen.getByText("contenido normal")).toBeInTheDocument()
  })

  it("muestra la pantalla de recuperación cuando un hijo lanza un error", () => {
    // React imprime el error esperado en consola; lo silenciamos para no ensuciar la salida.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument()
    spy.mockRestore()
  })
})
