import { supabase } from '../lib/supabase';
import type { Brand, Category, Product } from '../types';

// Tipo extendido para productos con sus relaciones resueltas
export interface ProductWithRelations extends Product {
    brands: { name: string } | null;
    categories: { name: string } | null;
}

export const catalogService = {
    // ─────────────────────────────────────────────
    // MARCAS (brands)
    // ─────────────────────────────────────────────

    async getBrands(): Promise<Brand[]> {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    async createBrand(name: string): Promise<void> {
        const { error } = await supabase
            .from('brands')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({ name: name.trim() } as any);
        if (error) throw error;
    },

    async updateBrand(id: number, name: string): Promise<void> {
        const { error } = await supabase
            .from('brands')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ name: name.trim() } as never)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteBrand(id: number): Promise<void> {
        const { error } = await supabase
            .from('brands')
            .delete()
            .eq('id', id);
        // FK RESTRICT: Supabase lanzará error si hay productos usando esta marca
        if (error) throw error;
    },

    // ─────────────────────────────────────────────
    // CATEGORÍAS (categories)
    // ─────────────────────────────────────────────

    async getCategories(): Promise<Category[]> {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    },

    async createCategory(name: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({ name: name.trim() } as any);
        if (error) throw error;
    },

    async updateCategory(id: number, name: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ name: name.trim() } as never)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteCategory(id: number): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);
        // FK RESTRICT: lanzará error si hay productos usando esta categoría
        if (error) throw error;
    },

    // ─────────────────────────────────────────────
    // PRODUCTOS (products)
    // ─────────────────────────────────────────────

    async getProducts(): Promise<ProductWithRelations[]> {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id,
                name,
                description,
                base_price,
                brand_id,
                category_id,
                created_at,
                brands ( name ),
                categories ( name )
            `)
            .order('name', { ascending: true });
        if (error) throw error;
        return data as unknown as ProductWithRelations[];
    },

    async createProduct(payload: {
        name: string;
        description?: string | null;
        base_price: number;
        brand_id: number;
        category_id: number;
    }): Promise<void> {
        const { error } = await supabase
            .from('products')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({
                name: payload.name.trim(),
                description: payload.description?.trim() || null,
                base_price: payload.base_price,
                brand_id: payload.brand_id,
                category_id: payload.category_id,
            } as any);
        if (error) throw error;
    },

    async updateProduct(
        id: number,
        payload: {
            name?: string;
            description?: string | null;
            base_price?: number;
            brand_id?: number;
            category_id?: number;
        }
    ): Promise<void> {
        const { error } = await supabase
            .from('products')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({
                ...payload,
                name: payload.name?.trim(),
                description: payload.description?.trim() || null,
            } as never)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteProduct(id: number): Promise<void> {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        // FK CASCADE: eliminar un producto elimina todos sus inventory_items físicos
        if (error) throw error;
    },
};
