// Utilidad para exportar datos a CSV desde el navegador (sin dependencias).
// Incluye BOM UTF-8 y CRLF para que Excel abra los acentos correctamente.

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
    if (value == null) return '';
    const s = String(value);
    // Entrecomillar si contiene coma, comilla o salto de línea (RFC 4180).
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/**
 * Genera un CSV a partir de encabezados + filas y dispara su descarga.
 * @param filename nombre del archivo (incluye `.csv`)
 * @param headers  encabezados de columna
 * @param rows     filas (cada una un arreglo alineado con `headers`)
 */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
    const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
    const csv = '﻿' + lines.join('\r\n'); // BOM para Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Fecha de hoy en formato YYYY-MM-DD (local) para nombrar archivos. */
export function todayStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
