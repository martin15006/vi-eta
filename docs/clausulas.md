# Cláusulas · Viñeta

> Reglas que no se negocian en este proyecto. Todo pacto se revisa contra ellas.
> Una cláusula cambia solo con el OK explícito de Martín, anotado en el historial.

| ID | Cláusula | Por qué |
|---|---|---|
| **CL-01** | Sin backend: todos los datos del lector viven en `localStorage`, ninguno sale del dispositivo. | RNF-06, privacidad y funcionar sin conexión |
| **CL-02** | JavaScript sin framework, módulos ES2020 nativos; sin dependencias de npm en producción. | 3 funcionalidades no justifican un paso de build |
| **CL-03** | Máximo 3 funcionalidades clave (Biblioteca, Progreso, Filtros). Todo lo demás queda anotado para v1.1+. | Regla de Oro del taller FESTECH |
| **CL-04** | Se publica en GitHub Pages, repo `martin15006/vi-eta`, siempre por HTTPS. | Lo exige el service worker offline |
| **CL-05** | Identidad visual propia: metáfora, paleta y tipografía no se parecen a ningún otro proyecto de Martín (grimoire, ÁNIMA, SISVIA, Apuntes del Monarca…). | Regla de "identidad propia, nunca copiar" |
| **CL-06** | Todo texto escrito por el lector se muestra con `textContent`, nunca `innerHTML`. | RNF-07, evitar XSS |
| **CL-07** | Sin CDN externo: fuentes e íconos se sirven desde el propio repo. | RNF-20, tiene que andar sin conexión |
| **CL-08** | Toda la interfaz en español simple; cada error dice qué pasó y cómo arreglarlo. | RNF-19 |
| **CL-09** | Accesible: contraste WCAG 2.1 AA, botones táctiles de mínimo 44×44px, tema claro y oscuro según el sistema. | RNF-12 a RNF-17 |
| **CL-10** | El nombre en toda la interfaz y el repo es "Viñeta"; la palabra FESTECH no aparece en ningún lado. | Pedido explícito de Martín |

## Stack fijo

- Ninguno framework. HTML5 + CSS3 + JavaScript (ES2020, módulos nativos).
- `localStorage` del navegador (clave `vineta:datos`) como única base de datos. Sin servidor ni base de datos remota.
- Se publica en GitHub Pages, repo `martin15006/vi-eta`, siempre por HTTPS (lo exige el service worker).

## Historial

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-09-16 | Primera versión | Aprobadas por Martín en el chat |
