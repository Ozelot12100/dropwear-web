# Rediseño UI/UX de DropWear — Paquete de prompts para Google Stitch

> Documento de trabajo para rediseñar **desde cero** la interfaz de DropWear con Google Stitch.
> El logo ya existe y se adjunta a Stitch aparte (**no se rediseña**). El diseño **no debe heredar** el look anterior (gris + índigo, fuente Geist).

---

## Vibe recomendado (y por qué)

DropWear es una **herramienta operativa** que se usa rápido, muchas veces al día, desde el celular en el piso de venta — pero es una **marca de ropa**. Por eso el punto óptimo no es "streetwear puro" (mata la legibilidad al operar) ni "POS genérico" (se siente sin alma), sino:

> **Herramienta operativa premium con alma de marca de ropa.** Limpia y de alto contraste como Linear/Vercel, con **un acento de marca audaz** (derivado del logo) y tipografía con carácter. Seria para manejar dinero e inventario, con personalidad de marca joven. Rompe deliberadamente con el look viejo: nueva base hueso/tinta, primario negro y un solo acento vivo.

---

## Cómo usarlo con Stitch

1. Abre Stitch y activa **modo Experimental** (más fidelidad).
2. **Adjunta tu logo** y pega el **BLOQUE 1 (ADN de diseño)**. Genera una primera pantalla (empieza por **Login** o **Inventario móvil** para fijar el estilo).
3. Para cada pantalla siguiente, pega el **Token de estilo** + el prompt de esa pantalla. Elige la plataforma correcta (**Web** o **Mobile**) según lo indicado.
4. Itera con frases cortas ("tarjetas más compactas", "sube el contraste del estatus Vendido") y exporta a Figma/código cuando te guste.

**Notas:**
- El **acento de marca** sale del logo. Si tu logo es monocromático, dile en el chat: *"usa [color] como acento de marca"*.
- Si Stitch responde mejor en inglés, traduce las **instrucciones**, pero conserva los **textos de UI en español**.
- Empieza por Inventario móvil o Login para fijar el estilo; luego Stitch reutiliza el tema en las demás pantallas.

---

## BLOQUE 1 — ADN de diseño (pégalo primero + adjunta el logo)

```
Vas a diseñar desde CERO la interfaz de "DropWear". Ignora por completo cualquier diseño previo; esta es una identidad nueva.

CONTEXTO DEL PRODUCTO
DropWear es una app web de gestión de inventario en tiempo real para una marca de ropa. La usan a diario los colaboradores desde el celular en el piso de venta (mobile-first) y los administradores desde escritorio. Idioma: español de México. Moneda: peso mexicano (formato $1,250.00). Es una herramienta operativa: se maneja rápido, con una sola mano, muchas veces al día, para registrar prendas y cambiar su estatus (disponible → apartado / vendido / devuelto).

DIRECCIÓN VISUAL
Personalidad: herramienta operativa premium con alma de marca de ropa. Limpia, de alto contraste, rápida y confiable (estilo Linear/Vercel) pero con un acento de marca audaz y tipografía con carácter. Seria para manejar dinero e inventario, con la personalidad suficiente para sentirse de una marca joven, no de un banco.

Base neutra: lienzo hueso/cálido muy claro (#F7F7F5), tarjetas en blanco puro, texto en tinta casi negra (#0E0E10). Rampa de grises precisa para texto secundario y bordes tipo hairline (#E7E7E4). NADA de morado/índigo.

Color de acento: derívalo del logo adjunto (color dominante del logo). Sistema base: NEGRO TINTA como color primario de acciones/botones; un único acento vivo de marca (el del logo) para estados activos, foco, enlaces y datos clave.

Sistema de estatus (crítico; cada estado = color + punto + etiqueta, NUNCA solo color; contraste AA):
- Disponible → verde esmeralda
- Apartado (pendiente de pago) → ámbar
- Vendido (liquidado) → azul frío
- Devuelto (atención) → rojo/rosa

Tipografía: títulos en grotesca moderna con carácter (Space Grotesk o Clash Display); cuerpo/UI en sans neutra y legible (Inter); precios, IDs y cantidades en monoespaciada tabular (Geist Mono o JetBrains Mono). Usa equivalentes de Google Fonts si hace falta.

Forma y elevación: radios medios (tarjetas 16px, inputs/botones 10–12px, chips totalmente redondeados); bordes hairline nítidos; sombras suaves y bajas. Escala de espaciado base 4px, con aire generoso.

Navegación:
- Móvil: barra de pestañas inferior fija (Inicio, Inventario, Catálogos, Bitácora, Personal), objetivos táctiles ≥44px, operación a una mano.
- Escritorio: barra superior con logo a la izquierda, navegación al centro, avatar/menú de usuario a la derecha; contenido centrado (máx. ~1200px).

Interacción y estados: micro-feedback táctil (escala 0.98 al presionar), transiciones de 150–200ms, skeletons al cargar y un resaltado sutil cuando un dato cambia en tiempo real. Cada pantalla debe contemplar estados de carga (skeleton), vacío (icono + texto guía) y error.

Accesibilidad: contraste AA, anillos de foco visibles en el acento, íconos de línea consistentes (estilo Lucide), no depender solo del color.

Logo: usa el logo adjunto TAL CUAL (no lo rediseñes, no lo recolorees), con espacio de respeto.

Todo el texto de la interfaz en español de México.
```

---

## Token de estilo (antepón esto a CADA pantalla)

```
[ESTILO DropWear] Herramienta operativa premium, mobile-first, español MX, MXN. Lienzo hueso #F7F7F5, tarjetas blancas, tinta #0E0E10, bordes hairline #E7E7E4. Primario negro tinta + un acento de marca del logo. Estatus como chip con punto + etiqueta: Disponible=verde, Apartado=ámbar, Vendido=azul, Devuelto=rojo. Títulos Space Grotesk, cuerpo Inter, números en mono tabular. Radios medios, sombras suaves, foco en el acento, contraste AA. Sin morado/índigo.
```

---

## BLOQUE 2 — Prompts por pantalla

### ① Login  *(Web y Mobile)*
```
Pantalla de inicio de sesión de DropWear. Centrada, una sola tarjeta sobre el lienzo hueso. Arriba el logo de DropWear (con espacio de respeto) y el nombre. Formulario: campo "Correo electrónico", campo "Contraseña" con mostrar/ocultar, y botón primario grande de ancho completo "Iniciar sesión" (negro tinta). El registro público está DESACTIVADO: no incluyas "crear cuenta". Al pie, en letra pequeña y discreta, el crédito "Diseñado y desarrollado por David A. Ramírez". Estado de error: mensaje en rojo suave bajo el formulario ("Correo o contraseña incorrectos"). Estado de carga: botón con spinner "Entrando...". Limpio, premium, con personalidad de marca de ropa.
```

### ② Dashboard – Resumen Ejecutivo  *(Web y Mobile)*
```
Pantalla "Resumen Ejecutivo". Encabezado con título "Resumen Ejecutivo" y subtítulo "Métricas clave del día y actividad reciente". Fila de 4 tarjetas KPI (en móvil 2x2, en escritorio 4 en línea), cada una con ícono, etiqueta, número grande en mono tabular y una nota pequeña:
1) Disponibles — "Prendas en piso" (verde)
2) Apartados — "Pendientes de pago" (ámbar)
3) Ventas Hoy — "Artículos vendidos"
4) Ingresos Hoy — monto grande en MXN resaltado en verde — "Recaudación del día"
Debajo, tarjeta "Últimas Actividades": lista de movimientos donde cada fila muestra la inicial/avatar del operador + una frase tipo "David registró una venta de Playera Básica (M, Negro)", la hora a la derecha, y en las ventas el monto "+$250.00" en verde. Incluye skeletons de carga y estado vacío "No hay actividad reciente". Los datos son en tiempo real: que la lista se sienta viva.
```

### ③ Inventario – MÓVIL (lista de tarjetas)  *(Mobile)*
```
Pantalla "Inventario", versión MÓVIL. Encabezado: "Inventario", subtítulo "128 prendas · tiempo real" y botón "+ Agregar" arriba a la derecha. Barra de búsqueda con ícono de lupa ("Buscar por producto, marca, talla o color...") y a su lado un botón de filtros con contador de filtros activos. Fila horizontal desplazable de chips de estatus con contador: Todos, Disponible, Apartado, Vendido, Devuelto (chip activo en negro tinta). Lista de tarjetas de prenda: cada tarjeta con una barra de acento de color a la izquierda según su estatus; nombre del producto en negrita + marca en gris; segunda línea con la talla (chip mono), el color y un badge de estatus con punto; a la derecha el precio en mono (en verde si está vendido), un ícono de editar y un chevron. Tocar la tarjeta abre el modal de transacción. Incluye la barra de pestañas inferior. Muestra skeletons de carga y estado vacío. Táctil, rápido, operable a una mano.
```

### ④ Inventario – ESCRITORIO (tabla)  *(Web)*
```
Pantalla "Inventario", versión ESCRITORIO. Mismo encabezado, búsqueda, botón "+ Agregar Prenda", botón de filtros y chips de estatus con contadores. Tabla de prendas dentro de una tarjeta, con columnas: ID (#, en mono gris), Producto (negrita), Marca, Talla (mayúsculas), Color, Estatus (badge con punto), "Precio Base / Venta" (alineado a la derecha, en mono; la venta en verde) y una acción de Editar. Filas con hover; hacer click en una fila abre el modal de transacción. Barra superior de navegación con logo, enlaces y avatar. Incluye skeletons y estado vacío.
```

### ⑤ Modal de transacción  *(Mobile, sobre Inventario)*
```
Modal "Actualizar Artículo #124" sobre la pantalla de inventario. Subtítulo: "Playera Básica - Nike (Talla: M)". Muestra "Estatus actual" como badge. Campo "Nuevo estatus" (selector) con opciones Disponible, Apartado, Vendido, Devuelto, cada una con su color y con la opción actual deshabilitada. Si se elige "Vendido", aparece un bloque destacado con la etiqueta "Precio cobrado (recomendado: $250)" y un input numérico requerido. Campo "Notas / comentarios (opcional)" con contador 0/200 (placeholder "Ej. Entregado a Juan Pérez"). Botones: "Cancelar" (contorno) y "Confirmar cambios" (primario negro). Estado de error en rojo suave. Diseño enfocado y cómodo en móvil.
```

### ⑥ Modal Agregar / Editar prenda  *(Mobile)*
```
Modal "Agregar Nueva Prenda al Inventario", con la nota "El artículo se registrará como disponible de inmediato". Campos: "Producto del catálogo *" (selector que muestra "Nombre — Marca ($precio)" y, al elegirlo, muestra la categoría debajo); "Talla *" (selector: XS, S, M, L, XL, XXL, ÚNICA); "Color *" (texto, ayuda "solo letras, mín. 3", contador /30, placeholder "ej. Negro, Azul Rey, Rojo Vino"). Botones "Cancelar" y "Agregar al inventario". Diseña también la variante "Editar prenda" (mismo layout, título "Editar prenda", campos precargados).
```

### ⑦ Catálogos  *(Web y Mobile)*
```
Pantalla "Gestión de Catálogos" con título y subtítulo "Administra marcas, categorías y el catálogo maestro de productos". Tarjeta con pestañas: Marcas, Categorías, Productos. Cada pestaña muestra su tabla con un botón "Nueva/Nuevo…" a la derecha. Marcas y Categorías: tabla con ID, Nombre y Acciones (editar / eliminar). Productos: tabla con ID, Nombre, Marca, Categoría, Precio Base (MXN, a la derecha) y Acciones. Modales de alta/edición: Marca y Categoría = un solo campo "Nombre"; Producto = Nombre, Marca (selector), Categoría (selector), Precio Base y Descripción opcional. Al eliminar un producto, muestra advertencia "Esto eliminará todas sus prendas físicas en inventario". Incluye estados de carga y vacío ("Sin marcas registradas").
```

### ⑧ Bitácora Operativa  *(Web y Mobile)*
```
Pantalla "Bitácora Operativa" con subtítulo "Historial inmutable de todas las operaciones registradas". Botón de filtros (por operador y por rango de fecha: Hoy, Ayer, Esta semana, Este mes). Fila de chips por acción con contador: Todas, 💰 Ventas, 📌 Apartados, ↩️ Devoluciones, 🆕 Altas, 🔄 Cambios. Tabla con columnas: ID, Prenda (nombre + "marca · talla · color"), Operador, Acción (badge de color), Estado (transición tipo "Apartado → Vendido"), Precio Venta (solo para roles financieros, en verde), Notas y Fecha (formato es-MX). En MÓVIL, convierte cada registro en una tarjeta legible en lugar de tabla. Incluye skeletons y estado vacío. Debe transmitir la sensación de un registro confiable e inmutable.
```

### ⑨ Personal (Staff)  *(Web)*
```
Pantalla "Gestión de Personal" (solo superadmin), con ícono, título y subtítulo "Administra los accesos y roles de los colaboradores". Botón "Nuevo Colaborador". Tabla con columnas: Nombre (con badge "Bloqueado" si aplica), Rol (badge; superadmin resaltado), Fecha de ingreso, ID del sistema (mono, corto) y Acciones (íconos: cambiar contraseña, cambiar rol, bloquear/desbloquear). Las filas de usuarios bloqueados van atenuadas. Modales: crear colaborador (Nombre completo, Correo, Contraseña temporal + confirmar, Rol) con estado de éxito "¡Colaborador creado exitosamente!"; restablecer contraseña; cambiar rol (selector: Socio, Vendedor, Repartidor, Contador, Super Administrador); y confirmar bloqueo/desbloqueo (estilo destructivo). Roles en español.
```

### ⑩ Mi Perfil  *(Web y Mobile)*
```
Pantalla "Mi Perfil". Tarjeta con avatar (inicial del nombre), nombre completo, badge de rol y fecha de ingreso. Sección de seguridad con botón "Cambiar contraseña" que abre un modal (Contraseña actual, Nueva contraseña, Confirmar). Botón "Cerrar sesión" en rojo suave. Limpio y sencillo.
```

### ⑪ Navegación (componentes)  *(Web y Mobile)*
```
Componentes de navegación de DropWear. MÓVIL: barra inferior fija con 5 pestañas (Inicio, Inventario, Catálogos, Bitácora, Personal), cada una con ícono + etiqueta y la pestaña activa resaltada. ESCRITORIO: barra superior con el logo de DropWear a la izquierda, los enlaces al centro (Inicio, Inventario, Catálogos, Bitácora, Personal) y a la derecha el nombre + rol + un avatar circular que abre un menú (Mi Perfil, Cambiar contraseña, Cerrar sesión). Muestra el menú de usuario abierto y los estados activos.
```

---

## Referencia rápida (datos reales de la app)

- **Estatus de prenda:** disponible · apartado · vendido · devuelto
- **Roles:** Super Administrador · Socio · Vendedor · Repartidor · Contador
- **Tallas:** XS, S, M, L, XL, XXL, ÚNICA
- **Permisos de navegación:** Catálogos → solo Socio y Superadmin · Personal → solo Superadmin · resto → todos los roles
- **Roles financieros** (ven precio de venta en Bitácora): Superadmin, Socio, Contador
- **Moneda / idioma:** MXN ($1,250.00) · español de México
