# Design

> Identidad "Viñeta fotográfica" — acordada en `docs/pactos/2026-09-16-vineta-v1.md` §3.
> Semilla pre-implementación (todavía no hay código que escanear). Se puede regenerar con
> `/impeccable document` una vez construida la interfaz, para capturar los tokens reales.

## Theme

**Estrategia de color: Committed.** Un acento saturado (coral quemado) sobre una base tinta muy
oscura / crema muy clara — no neutros tibios genéricos de IA. Ambos temas siguen
`prefers-color-scheme`, ninguno es "el default": de noche domina el oscuro (uso principal, ver
PRODUCT.md), de día el claro.

**Escena física:** alguien recostado, de noche, con el celular a upalmo de la cara, revisando una
sola cosa antes de dormir. Eso empuja el tema oscuro como el que más se prueba primero, aunque los
dos son de primera clase.

## Color Palette (OKLCH)

Anclas de marca (fijadas en el pacto, no negociables — CL-05):

| Token | OKLCH | Hex aprox. | Rol |
|---|---|---|---|
| `--tinta` | `oklch(0.2373 0.0215 222.4)` | `#132126` | Base del tema oscuro |
| `--crema` | `oklch(0.9448 0.0160 82.8)` | `#f2ece1` | Base del tema claro |
| `--coral` | `oklch(0.6536 0.1585 31.9)` | `#e0654f` | Acento — botones, +1, estado activo |

### Tema oscuro (`prefers-color-scheme: dark`)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `oklch(0.2373 0.0215 222.4)` | Fondo de página (`--tinta`) |
| `--superficie` | `oklch(0.2750 0.0220 220)` | Tarjetas de obra |
| `--superficie-2` | `oklch(0.3200 0.0230 218)` | Formulario / modal, elementos elevados |
| `--borde` | `oklch(0.3800 0.0200 218 / 0.6)` | Bordes sutiles |
| `--texto` | `oklch(0.9448 0.0160 82.8)` | Texto principal (`--crema`) |
| `--texto-tenue` | `oklch(0.7400 0.0180 90)` | Texto secundario — cumple ≥4.5:1 sobre `--bg` |
| `--acento` | `oklch(0.6536 0.1585 31.9)` | Botones, +1, filtro activo |
| `--acento-texto` | `oklch(0.1600 0.0100 30)` | Texto/ícono **sobre** el acento (no blanco: falla contraste) |
| `--exito` / `--peligro` | `oklch(0.72 0.15 145)` / `oklch(0.68 0.19 25)` | Confirmaciones / eliminar |

### Tema claro (`prefers-color-scheme: light` o sin soporte)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `oklch(0.9448 0.0160 82.8)` | Fondo de página (`--crema`) |
| `--superficie` | `oklch(0.9800 0.0080 85)` | Tarjetas de obra (más clara que el fondo) |
| `--superficie-2` | `oklch(1.0000 0 0)` | Formulario / modal |
| `--borde` | `oklch(0.7500 0.0150 80 / 0.6)` | Bordes sutiles |
| `--texto` | `oklch(0.2373 0.0215 222.4)` | Texto principal (`--tinta`) |
| `--texto-tenue` | `oklch(0.4400 0.0200 220)` | Texto secundario — cumple ≥4.5:1 sobre `--bg` |
| `--acento` | `oklch(0.6100 0.1650 31.9)` | Acento, un toque más oscuro que en modo oscuro para mantener contraste sobre crema |
| `--acento-texto` | `oklch(0.9900 0.0050 80)` | Texto/ícono sobre el acento |

**Regla de contraste (obligatoria antes de dar por cerrada cualquier pantalla):** verificar con
DevTools o axe que `--texto` sobre `--bg`/`--superficie` da ≥4.5:1, y `--acento-texto` sobre
`--acento` da ≥4.5:1 en ambos temas. Si algo falla, se ajusta la luminosidad (`L`) del token, no
el tono (`H`) — así la identidad no se disuelve por accesibilidad.

## Typography

**Contraste editorial: serif de título + sans para UI/números** (no dos sans similares).

- **Títulos y nombre de obra:** pila serif de sistema —
  `Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif`.
  Sin autohospedar ni pedir a un CDN (CL-07): esto también evita descargar archivos de fuente
  para un proyecto que se define explícitamente "sin build". Se acepta la ligera variación entre
  sistemas operativos porque ninguna pesa en el vínculo con el nombre "Viñeta" (a diferencia de la
  paleta, la tipografía exacta no fue parte de lo pactado en la letra chica).
- **UI, capítulos y filtros:** pila sans de sistema —
  `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Números de capítulo:** la misma sans, con `font-variant-numeric: tabular-nums` — los dígitos
  ocupan el mismo ancho, así el número no "salta" al cambiar de 9 a 10 dígitos. Refuerza el
  principio "el número manda".

Escala: `clamp()` para el título de obra (mín 1rem, ideal 4vw, máx 1.25rem — nunca se acerca al
techo de 6rem de un display hero, esto es UI de producto, no un titular de marca). Números de
capítulo en 1.5rem/2rem, peso 600-700.

## Components

- **Tarjeta de obra:** `--superficie` de fondo, esquinas 12px, difuminado de identidad en el
  borde (ver "El difuminado" abajo). Título (serif) arriba, capítulo grande (sans tabular) +
  estado (texto, no solo color) debajo, botón **+1** circular de 44×44px a la derecha.
- **El difuminado ("viñeta fotográfica"):** un `box-shadow: inset 0 0 28px -6px var(--bg)`
  (usa el color de fondo de la página, no del acento) sobre la tarjeta — imita el oscurecimiento
  de las esquinas de una foto vieja/un panel de cómic. Sutil: nunca debe oscurecer el texto.
- **Formulario (agregar/editar):** modal sobre `--superficie-2`, un campo por fila, mensajes de
  error en texto bajo el campo (nunca solo un borde rojo — cumple CL-09 y la regla de no usar
  franjas de color como único indicador).
- **Filtros:** pastillas (`Todas · Leyendo · En pausa · Terminado`), la activa con fondo
  `--acento` y texto `--acento-texto`; las demás con `--borde` y `--texto-tenue`. El contador
  (Could, HU-10) va como número tenue después del texto, no como badge separado.
- **Aviso de Deshacer:** barra baja fija, `--superficie-2`, con el botón "Deshacer" en `--acento`.

## Layout

Una sola columna en celular (ancho objetivo principal); `grid-template-columns:
repeat(auto-fit, minmax(280px, 1fr))` en pantallas anchas — sin breakpoints fijos. Nada de
tarjetas anidadas dentro de tarjetas. Espaciado con ritmo: más aire alrededor del título de la
app y los filtros que entre tarjetas consecutivas.

## Motion

Energía **funcional, no decorativa** — coherente con "íntimo, preciso" (PRODUCT.md), no un
juguete. +1 anima el número con un crossfade corto (~150ms, `ease-out-quart`) en vez de un
contador que cuenta uno por uno. El aviso de Deshacer entra deslizando desde abajo (~200ms) y
sale con fade. Todo con alternativa instantánea bajo `prefers-reduced-motion: reduce` (CL-09).
Sin bounce ni elastic.
