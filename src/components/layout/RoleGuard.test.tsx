import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { RoleGuard } from "./RoleGuard"
import { useAuth } from "../../hooks"

vi.mock("../../hooks", () => ({ useAuth: vi.fn() }))
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

function renderGuard(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("RoleGuard", () => {
  beforeEach(() => mockUseAuth.mockReset())

  it("muestra el contenido cuando el rol está permitido", () => {
    mockUseAuth.mockReturnValue({ profile: { role: "superadmin" }, isLoading: false })
    renderGuard(
      <RoleGuard allowed={["socio", "superadmin"]}>
        <span>acción privilegiada</span>
      </RoleGuard>,
    )
    expect(screen.getByText("acción privilegiada")).toBeInTheDocument()
  })

  it("oculta el contenido (mode hide) cuando el rol NO está permitido", () => {
    mockUseAuth.mockReturnValue({ profile: { role: "vendedor" }, isLoading: false })
    renderGuard(
      <RoleGuard allowed={["socio", "superadmin"]}>
        <span>acción privilegiada</span>
      </RoleGuard>,
    )
    expect(screen.queryByText("acción privilegiada")).not.toBeInTheDocument()
  })

  it("no renderiza nada mientras el perfil está cargando", () => {
    mockUseAuth.mockReturnValue({ profile: null, isLoading: true })
    renderGuard(
      <RoleGuard allowed={["superadmin"]}>
        <span>acción privilegiada</span>
      </RoleGuard>,
    )
    expect(screen.queryByText("acción privilegiada")).not.toBeInTheDocument()
  })

  it("no muestra el contenido protegido (mode redirect) para un rol sin permiso", () => {
    mockUseAuth.mockReturnValue({ profile: { role: "vendedor" }, isLoading: false })
    renderGuard(
      <RoleGuard allowed={["superadmin"]} mode="redirect">
        <span>panel de administración</span>
      </RoleGuard>,
    )
    expect(screen.queryByText("panel de administración")).not.toBeInTheDocument()
  })
})
