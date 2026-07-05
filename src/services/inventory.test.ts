import { describe, it, expect, vi, beforeEach } from "vitest"
import { supabase } from "../lib/supabase"
import { inventoryService } from "./inventory"

// Mockeamos el cliente de Supabase: así testeamos que el servicio llama a los
// RPC atómicos con los argumentos correctos y propaga los errores.
vi.mock("../lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}))

const mockRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>

describe("inventoryService", () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: {}, error: null })
  })

  it("updateItemStatus llama change_item_status con precio y notas recortadas en una venta", async () => {
    await inventoryService.updateItemStatus({
      itemId: 7,
      newStatus: "vendido",
      priceSold: 250,
      notes: "  entregado a Juan  ",
    })
    expect(mockRpc).toHaveBeenCalledWith("change_item_status", {
      p_item_id: 7,
      p_new_status: "vendido",
      p_price_sold: 250,
      p_notes: "entregado a Juan",
    })
  })

  it("updateItemStatus omite el precio cuando el estado no es 'vendido'", async () => {
    await inventoryService.updateItemStatus({
      itemId: 3,
      newStatus: "apartado",
      priceSold: null,
    })
    expect(mockRpc).toHaveBeenCalledWith("change_item_status", {
      p_item_id: 3,
      p_new_status: "apartado",
      p_price_sold: undefined,
      p_notes: undefined,
    })
  })

  it("propaga el error cuando el RPC falla (no lo traga en silencio)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("row-level security") })
    await expect(
      inventoryService.updateItemStatus({ itemId: 1, newStatus: "vendido", priceSold: 10 }),
    ).rejects.toThrow("row-level security")
  })

  it("addItem llama add_inventory_item con los datos de la prenda", async () => {
    mockRpc.mockResolvedValue({ data: { id: 99 }, error: null })
    const result = await inventoryService.addItem({ productId: 5, size: "M", color: "Azul Rey" })
    expect(mockRpc).toHaveBeenCalledWith("add_inventory_item", {
      p_product_id: 5,
      p_size: "M",
      p_color: "Azul Rey",
    })
    expect(result).toEqual({ id: 99 })
  })

  it("updateItemDetails llama update_item_details", async () => {
    await inventoryService.updateItemDetails({ itemId: 2, productId: 9, size: "L", color: "Rojo" })
    expect(mockRpc).toHaveBeenCalledWith("update_item_details", {
      p_item_id: 2,
      p_product_id: 9,
      p_size: "L",
      p_color: "Rojo",
    })
  })
})
