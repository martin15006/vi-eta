# SRS · Viñeta

**Documento de Especificación de Requerimientos de Software**

| Campo | Valor |
|---|---|
| Producto | **Viñeta**: registro personal de lecturas — manhwa, manga, cómics y libros |
| Versión del documento | 1.2 (borrador para revisión) |
| Fecha | 16 de septiembre de 2026 |
| Autor | Juan Sebastián Martín Moncada |
| Plataforma | Aplicación web instalable (PWA) para Android, iOS y escritorio |

## Índice

1. [Visión general del proyecto](#1-visión-general-del-proyecto)
2. [Roles y permisos de usuario](#2-roles-y-permisos-de-usuario)
3. [Requerimientos funcionales](#3-requerimientos-funcionales)
4. [Requerimientos no funcionales](#4-requerimientos-no-funcionales)
5. [Arquitectura técnica y restricciones](#5-arquitectura-técnica-y-restricciones)
6. [Casos borde y excepciones](#6-casos-borde-y-excepciones)
7. [Anexo A: criterios de terminado](#anexo-a-criterios-de-terminado)

### Glosario

| Término | Significado |
|---|---|
| Obra | Un manhwa, manga, cómic, novela o libro que el lector sigue dentro de la app. |
| Capítulo actual | La unidad de progreso que uses en esa obra: el capítulo de un manhwa o cómic, o el capítulo (o página) de un libro. `0` significa que aún no empieza. Es un número que vos definís; la app no valida qué representa. |
| Estado | Situación de una obra: **Leyendo**, **En pausa** o **Terminado**. |
| PWA | *Progressive Web App*: página web que se instala en la pantalla de inicio y funciona sin conexión. |
| Service worker | Script del navegador que guarda la app en caché para poder abrirla sin internet. |
| localStorage | Almacenamiento del navegador donde la app guarda los datos, dentro del propio dispositivo. |

---

## 1. Visión general del proyecto

### 1.1 Problema que resuelve

Quien sigue varias historias a la vez —manhwa, cómics, novelas, libros— las lee o las tiene repartidas en formatos y ritmos distintos: semanal, por temporadas, o de una sentada en un fin de semana. Al volver a una obra después de un tiempo:

- **No recuerda en qué capítulo iba**, y termina releyendo capítulos o saltándose alguno.
- **Las notas del celular y el historial del navegador no sirven**: se mezclan con todo lo demás y no dicen el estado de cada obra.
- **Cada plataforma de lectura guarda solo su propio progreso**, así que ninguna tiene la lista completa.

### 1.2 Objetivo general

Darle al lector **un solo lugar, rápido y sin cuentas**, donde saber en qué capítulo va de cada obra y actualizarlo **con un toque**.

### 1.3 Objetivos medibles

| # | Objetivo | Cómo se mide |
|---|---|---|
| O1 | Encontrar el capítulo de una obra en **menos de 5 segundos** desde que se abre la app | Cronómetro, con 20 obras cargadas |
| O2 | Registrar un capítulo leído con **1 toque** | Conteo de interacciones |
| O3 | Funcionar **sin internet** después de la primera visita | Prueba en modo avión |
| O4 | **Ningún dato** de la biblioteca sale del dispositivo | Pestaña *Red* de las DevTools: ninguna petición a dominios de terceros |

### 1.4 Alcance del sistema

Regla de producto: **máximo 3 funcionalidades clave**. Un alcance acotado mantiene el foco y evita que el desarrollo se desvíe del objetivo.

| # | Funcionalidad clave | Módulo |
|---|---|---|
| **F1** | Registrar obras con su capítulo actual y su estado | Biblioteca |
| **F2** | Avanzar un capítulo con un solo toque | Progreso |
| **F3** | Filtrar la lista por estado | Filtros |

**Dentro del alcance (v1.0)**

- Crear, ver, editar y eliminar obras.
- Botón **+1** para avanzar capítulos, con opción de deshacer.
- Filtros por estado.
- Funcionamiento sin conexión e instalación en la pantalla de inicio.

**Fuera del alcance (v1.0)**

- Cuentas de usuario y sincronización entre dispositivos.
- Avisos de capítulos nuevos.
- Portadas, imágenes, calificaciones y reseñas.
- **Leer las obras dentro de la app.** Viñeta no muestra, aloja ni descarga contenido de ninguna obra (manhwa, libro, cómic o lo que sea): solo guarda los datos que escribe el lector.

El detalle y el motivo de cada exclusión están en la [sección 3.4](#34-wont-have-descartado-en-v10).

---

## 2. Roles y permisos de usuario

Viñeta **no tiene cuentas ni servidor**: los datos viven en el navegador de cada dispositivo. Quien usa ese navegador es el dueño de esa biblioteca.

### 2.1 Roles

| Rol | Quién es | Descripción |
|---|---|---|
| **Lector** | Persona que sigue manhwa, cómics, novelas o libros desde su celular o computador | Único usuario de la app. Controla todos sus datos. |
| **Mantenedor** | Desarrollador que publica nuevas versiones | Sube el código al hosting. **No tiene acceso** a los datos de ningún lector. |

### 2.2 Matriz de permisos

| Acción | Lector | Mantenedor |
|---|:---:|:---:|
| Ver la lista de obras | ✅ | ❌ |
| Agregar una obra | ✅ | ❌ |
| Editar una obra | ✅ | ❌ |
| Eliminar una obra | ✅ (con confirmación) | ❌ |
| Sumar un capítulo y deshacer | ✅ | ❌ |
| Filtrar por estado | ✅ | ❌ |
| Instalar la app en la pantalla de inicio | ✅ | ❌ |
| Ver los datos de otro lector | ❌ | ❌ |
| Publicar una nueva versión de la app | ❌ | ✅ |

> **Nota:** si varias personas usan el mismo navegador, comparten la misma biblioteca. Es una limitación aceptada de v1.0 (ver [CB-15](#62-almacenamiento-y-datos)).

---

## 3. Requerimientos funcionales

**Convenciones**

- Historias con el formato *"Como [rol], quiero [función] para [objetivo]"*.
- Criterios de aceptación en formato **Dado / Cuando / Entonces**.
- Prioridad **MoSCoW**: **Must** (imprescindible), **Should** (importante), **Could** (deseable), **Won't** (no en esta versión).

### 3.0 Resumen

| ID | Historia | Módulo | Prioridad |
|---|---|---|---|
| HU-01 | Agregar una obra | Biblioteca (F1) | **Must** |
| HU-02 | Ver mi lista de obras | Biblioteca (F1) | **Must** |
| HU-03 | Editar una obra | Biblioteca (F1) | **Must** |
| HU-04 | Eliminar una obra | Biblioteca (F1) | **Must** |
| HU-05 | Guardar el enlace de lectura | Biblioteca (F1) | Could |
| HU-06 | Sumar un capítulo con un toque | Progreso (F2) | **Must** |
| HU-07 | Deshacer un toque accidental | Progreso (F2) | **Must** |
| HU-08 | Retomar automáticamente una obra en pausa | Progreso (F2) | **Must** |
| HU-09 | Filtrar por estado | Filtros (F3) | **Must** |
| HU-10 | Ver cuántas obras hay por estado | Filtros (F3) | Could |
| HU-11 | Recordar el último filtro usado | Filtros (F3) | Could |

**Totales:** 8 Must · 0 Should · 3 Could · 6 Won't.

### Reglas de datos

| Campo | Obligatorio | Valor por defecto | Regla |
|---|:---:|---|---|
| Título | Sí | (vacío) | De 1 a 100 caracteres, después de quitar los espacios del inicio y del final. No se puede repetir (RN-01). |
| Capítulo actual | Sí | `0` | Número de 0 a 9999, con **máximo un decimal** (ej. `45.5` para capítulos especiales, o para anotar una página exacta). Acepta punto o coma. Sirve igual para el capítulo de un manhwa que para la página o el capítulo de un libro. |
| Estado | Sí | Leyendo | Leyendo · En pausa · Terminado |
| Enlace de lectura | No | (vacío) | Debe empezar por `http://` o `https://`. Máximo 500 caracteres. |

### Reglas de negocio

| ID | Regla |
|---|---|
| **RN-01** | Los títulos se comparan **normalizados**: sin espacios repetidos, sin mayúsculas y sin tildes. *"Solo Leveling"*, *"solo  leveling"* y *"SÓLO LEVELING"* son la misma obra. |
| **RN-02** | La lista se ordena por **fecha de última actualización**, la más reciente arriba. |
| **RN-03** | **+1 lleva al siguiente capítulo entero**: 45 → 46 y 45.5 → 46. |
| **RN-04** | Una obra **Terminada** no se puede avanzar con +1. Para cambiarla hay que editarla. |
| **RN-05** | Sumar un capítulo a una obra **En pausa** la pasa a **Leyendo**. |
| **RN-06** | Mientras la pantalla esté abierta, **una obra no cambia de lugar al tocar +1**, para que el botón no se mueva bajo el dedo. El nuevo orden se aplica al cambiar de filtro o al volver a abrir la app. |

### 3.1 Módulo Biblioteca (F1)

#### HU-01 · Agregar una obra · **Must**

> Como **lector**, quiero **agregar una obra con su título, el capítulo en que voy y su estado** para **no depender de mi memoria**.

**Criterios de aceptación**

1. **Dado** que estoy en la lista, **cuando** toco *"Agregar obra"*, **entonces** se abre un formulario con Título vacío, Capítulo en `0` y Estado en *Leyendo*, con el cursor en el título.
2. **Dado** un formulario válido, **cuando** toco *"Guardar"*, **entonces** la obra se guarda, aparece de primera en la lista y el formulario se cierra.
3. **Dado** un título vacío o con solo espacios, **cuando** toco *"Guardar"*, **entonces** no se guarda y bajo el campo aparece: *"Escribe el título de la obra"*.
4. **Dado** un título que ya existe según RN-01, **cuando** toco *"Guardar"*, **entonces** no se guarda y aparece *"Ya tienes «Solo Leveling» en tu lista"* con un botón *"Ver obra"* que abre la existente.
5. **Dado** un capítulo inválido (negativo, mayor a 9999, con dos o más decimales, o con letras), **cuando** toco *"Guardar"*, **entonces** no se guarda y aparece: *"El capítulo debe ser un número entre 0 y 9999 (puede tener un decimal)"*.
6. **Dado** que escribí algo en el formulario, **cuando** intento cerrarlo sin guardar, **entonces** se pregunta *"¿Descartar los cambios?"*.

#### HU-02 · Ver mi lista de obras · **Must**

> Como **lector**, quiero **ver todas mis obras con su capítulo y su estado de un vistazo** para **decidir qué leer**.

**Criterios de aceptación**

1. **Dado** que tengo obras, **cuando** abro la app, **entonces** cada una muestra su título, el capítulo (*"Cap. 46"*) y el estado **escrito con texto**, no solo con un color.
2. **Dado** que tengo varias obras, **cuando** se muestra la lista, **entonces** respeta el orden de RN-02.
3. **Dado** que no tengo obras, **cuando** abro la app, **entonces** veo *"Todavía no tienes obras. Agrega la primera."* y el botón *"Agregar obra"*.
4. **Dado** un título que no cabe, **cuando** se muestra en la lista, **entonces** se corta con *"…"* a dos líneas como máximo, y el título completo se ve al editar la obra.
5. **Dado** que tengo 1.000 obras, **cuando** abro la app, **entonces** la lista aparece en menos de 300 ms en un celular de gama media.

#### HU-03 · Editar una obra · **Must**

> Como **lector**, quiero **corregir el título, el capítulo o el estado de una obra** para **arreglar errores o marcarla como terminada**.

**Criterios de aceptación**

1. **Dado** que estoy en la lista, **cuando** toco una obra (fuera del botón +1), **entonces** se abre el formulario con sus datos actuales.
2. **Dado** que edito una obra, **cuando** toco *"Guardar"*, **entonces** se aplican las mismas validaciones de HU-01. Para detectar duplicados se ignora la propia obra.
3. **Dado** que cambié algo, **cuando** guardo, **entonces** se actualiza la fecha de última actualización. **Si no cambié nada**, el formulario se cierra sin tocar la fecha.

#### HU-04 · Eliminar una obra · **Must**

> Como **lector**, quiero **eliminar una obra que ya no sigo** para **mantener mi lista limpia**.

**Criterios de aceptación**

1. **Dado** que estoy editando una obra, **cuando** busco cómo eliminarla, **entonces** el botón *"Eliminar"* está **dentro del formulario**, no en la lista, para evitar toques accidentales.
2. **Dado** que toco *"Eliminar"*, **cuando** aparece la confirmación *"¿Eliminar «Título»? Esta acción no se puede deshacer."*, **entonces** el botón enfocado por defecto es *"Cancelar"*.
3. **Dado** que confirmo, **cuando** se elimina la obra, **entonces** desaparece de la lista y vuelvo a la pantalla principal.

#### HU-05 · Guardar el enlace de lectura · Could

> Como **lector**, quiero **guardar el enlace donde leo cada obra** para **abrirla directo desde la app**.

**Criterios de aceptación**

1. **Dado** el formulario, **cuando** lo abro, **entonces** hay un campo opcional *"Enlace de lectura"*.
2. **Dado** un enlace que no empieza por `http://` o `https://` (por ejemplo `javascript:` o texto suelto), **cuando** toco *"Guardar"*, **entonces** no se guarda y aparece: *"Pega un enlace que empiece por http:// o https://"*.
3. **Dado** una obra con enlace, **cuando** veo la lista, **entonces** tiene un botón *"Leer"* que abre el enlace en una pestaña nueva.

### 3.2 Módulo Progreso (F2)

#### HU-06 · Sumar un capítulo con un toque · **Must**

> Como **lector**, quiero **marcar que leí un capítulo más con un solo toque** para **actualizar mi progreso sin abrir formularios**.

**Criterios de aceptación**

1. **Dado** una obra *Leyendo* o *En pausa*, **cuando** veo la lista, **entonces** tiene un botón **+1** de al menos 44 × 44 px.
2. **Dado** que toco +1, **cuando** se procesa, **entonces** se aplica RN-03, **se guarda en ese mismo instante** y el número nuevo se ve en menos de 100 ms.
3. **Dado** que toco +1 varias veces seguidas, **cuando** termino, **entonces** cada toque sumó uno (3 toques = +3), ninguno se perdió y la obra no cambió de lugar (RN-06).
4. **Dado** una obra *Terminada*, **cuando** veo la lista, **entonces** no tiene botón +1 (RN-04).
5. **Dado** una obra en el capítulo 9999, **cuando** toco +1, **entonces** no sube y aparece *"Llegaste al límite de capítulos (9999)"*.

#### HU-07 · Deshacer un toque accidental · **Must**

> Como **lector**, quiero **deshacer el último +1** para **corregir un toque accidental sin editar la obra**.

**Criterios de aceptación**

1. **Dado** que toqué +1, **cuando** se guarda, **entonces** aparece un aviso *"«Título» · Cap. 46"* con el botón *"Deshacer"* durante 5 segundos.
2. **Dado** el aviso visible, **cuando** toco *"Deshacer"*, **entonces** se restauran exactamente el capítulo, el estado y la fecha anteriores.
3. **Dado** que toqué +1 varias veces, **cuando** toco *"Deshacer"*, **entonces** se revierte **solo el último toque**. El aviso reinicia sus 5 segundos con cada toque.

#### HU-08 · Retomar automáticamente una obra en pausa · **Must**

> Como **lector**, quiero **que una obra en pausa vuelva a "Leyendo" cuando le sumo un capítulo** para **no cambiar el estado a mano**.

**Criterios de aceptación**

1. **Dado** una obra *En pausa*, **cuando** toco +1, **entonces** pasa a *Leyendo* (RN-05) y aparece *"«Título» volvió a Leyendo · Cap. 13"* con *"Deshacer"*.
2. **Dado** ese aviso, **cuando** toco *"Deshacer"*, **entonces** se revierten **el capítulo y el estado**.

### 3.3 Módulo Filtros (F3)

#### HU-09 · Filtrar por estado · **Must**

> Como **lector**, quiero **ver solo las obras de un estado** para **concentrarme en lo que estoy leyendo**.

**Criterios de aceptación**

1. **Dado** que estoy en la lista, **cuando** la veo, **entonces** arriba están los filtros **Todas · Leyendo · En pausa · Terminado**.
2. **Dado** que toco un filtro, **cuando** se aplica, **entonces** la lista cambia en menos de 100 ms, sin recargar la página.
3. **Dado** un filtro activo, **cuando** lo miro, **entonces** se distingue por algo más que el color (forma o subrayado) y lo anuncia el lector de pantalla.
4. **Dado** un filtro sin obras, **cuando** lo selecciono, **entonces** veo *"No tienes obras en pausa."* con el botón *"Ver todas"*.
5. **Dado** que guardo una obra cuyo estado no coincide con el filtro activo, **cuando** se cierra el formulario, **entonces** aparece *"«Título» se guardó en Terminado"* con el botón *"Ver"*, que cambia a ese filtro.

#### HU-10 · Ver cuántas obras hay por estado · Could

> Como **lector**, quiero **ver cuántas obras tengo en cada estado** para **saber cuánto tengo pendiente**.

**Criterios de aceptación**

1. **Dado** que tengo obras, **cuando** veo los filtros, **entonces** cada uno muestra su cantidad (*"Leyendo 7"*).
2. **Dado** que agrego, edito, elimino o avanzo una obra, **cuando** se guarda, **entonces** las cantidades se actualizan al instante.

#### HU-11 · Recordar el último filtro usado · Could

> Como **lector**, quiero **que la app abra con el último filtro que usé** para **no elegirlo cada vez**.

**Criterios de aceptación**

1. **Dado** que elegí un filtro, **cuando** cierro y vuelvo a abrir la app, **entonces** ese filtro sigue activo.
2. **Dado** que abro la app por primera vez, **cuando** se muestra la lista, **entonces** el filtro activo es *Todas*.

### 3.4 Won't have (descartado en v1.0)

| Idea | Por qué no entra en v1.0 |
|---|---|
| Cuentas y sincronización entre dispositivos | Requiere backend, inicio de sesión y manejo de datos personales. Multiplica el alcance. |
| Avisos de capítulos nuevos (notificaciones push) | La app tendría que consultar los sitios de lectura, y no existe una fuente oficial, fiable y con permiso para hacerlo. |
| Portadas e imágenes | Llenan rápido el almacenamiento local (~5 MB) y traen problemas de derechos de autor. |
| Buscar la obra en catálogos externos (AniList, MangaDex, Goodreads, Open Library) | Agrega dependencia de red y sería una cuarta funcionalidad. |
| Exportar e importar un respaldo | Protege contra la pérdida de datos ([CB-13](#62-almacenamiento-y-datos)). **Es la candidata #1 para v1.1.** |
| Calificaciones, reseñas y recomendaciones | No resuelven el problema planteado. |

---

## 4. Requerimientos no funcionales

### 4.1 Rendimiento y tiempos de respuesta

| ID | Requisito | Meta | Cómo se verifica |
|---|---|---|---|
| RNF-01 | Primera carga (sin caché) | LCP ≤ 2,5 s | Lighthouse, perfil móvil |
| RNF-02 | Aperturas siguientes (desde caché) | Lista visible en < 1 s | DevTools, pestaña *Performance* |
| RNF-03 | Respuesta visual al tocar +1, filtros o *Guardar* | < 100 ms | DevTools, pestaña *Performance* |
| RNF-04 | Lista con 1.000 obras | Se muestra en < 300 ms y el scroll no se traba | Datos de prueba generados |
| RNF-05 | Peso total de la app | < 150 KB sin contar íconos | Pestaña *Red*, caché desactivada |

### 4.2 Seguridad y privacidad de datos

| ID | Requisito |
|---|---|
| RNF-06 | **Los datos no salen del dispositivo**: sin backend, sin analítica, sin cookies y sin scripts de terceros. La app no pide nombre, correo ni ningún dato personal. |
| RNF-07 | Todo texto escrito por el usuario se muestra con `textContent`, **nunca con `innerHTML`**, para evitar la inyección de código (XSS). |
| RNF-08 | Política de seguridad de contenido en el HTML: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`. El navegador bloquea cualquier script o recurso de otro dominio. |
| RNF-09 | Los enlaces de lectura solo aceptan `http://` y `https://`, y se abren con `rel="noopener noreferrer"`. |
| RNF-10 | La app se sirve **solo por HTTPS**, que además es un requisito del service worker. |
| RNF-11 | La app **no pide permisos** del dispositivo: ni notificaciones, ni ubicación, ni cámara. |

### 4.3 Usabilidad y diseño UX/UI

| ID | Requisito |
|---|---|
| RNF-12 | **Pensada primero para el celular** y para usarse con una mano. Funciona desde 320 px de ancho hasta escritorio, sin scroll horizontal. |
| RNF-13 | Todos los botones táctiles miden **al menos 44 × 44 px**. |
| RNF-14 | Contraste **WCAG 2.1 nivel AA**: 4,5:1 en texto normal y 3:1 en texto grande e íconos. |
| RNF-15 | El estado de una obra se comunica **con texto**, no solo con color. |
| RNF-16 | **Tema claro y oscuro** según la configuración del sistema (`prefers-color-scheme`), porque se lee mucho de noche. |
| RNF-17 | Respeta `prefers-reduced-motion`: sin animaciones para quien las desactivó. |
| RNF-18 | Usable con teclado y lector de pantalla: todos los campos tienen etiqueta y los avisos se anuncian con `aria-live`. |
| RNF-19 | Mensajes en español sencillo. Cada error dice **qué pasó y cómo arreglarlo**. |
| RNF-20 | Las fuentes y los íconos vienen incluidos en la app (sin CDN), para que funcionen sin conexión. La identidad visual (paleta y tipografía) se define en la fase de diseño. |

### 4.4 Escalabilidad y disponibilidad

| ID | Requisito |
|---|---|
| RNF-21 | **Escalabilidad de usuarios:** el hosting solo entrega archivos estáticos, así que sirve igual a 1 que a 10.000 lectores. Cada lector procesa sus datos en su propio dispositivo. |
| RNF-22 | **Escalabilidad de datos:** cada obra ocupa unos 200 bytes, así que 1.000 obras ocupan ≈ 200 KB, muy por debajo del límite de ~5 MB de localStorage. |
| RNF-23 | **Disponibilidad:** después de la primera visita, la app funciona **100 % sin conexión**. Si el hosting se cae, solo afecta la primera instalación y la llegada de actualizaciones. |
| RNF-24 | **Mantenibilidad:** la lógica de negocio va separada de la interfaz, en módulos que se pueden probar sin navegador. El esquema de datos tiene número de versión para migrar sin perder información. |
| RNF-25 | **Compatibilidad:** las dos últimas versiones de Chrome (Android y escritorio), Edge, Firefox y Safari (iOS y macOS). |

---

## 5. Arquitectura técnica y restricciones

### 5.1 Decisión de arquitectura

| Opción | A favor | En contra | Decisión |
|---|---|---|:---:|
| **PWA estática + localStorage** | Sin servidor. Funciona sin conexión. Se instala desde el navegador en Android e iOS. Se muestra desde cualquier equipo. | Los datos quedan atados a un navegador; no hay sincronización. | ✅ **Elegida** |
| App nativa (Flutter) | Experiencia nativa. | Hay que publicar en tiendas y compilar para iOS exige un Mac. Es demasiado para 3 funcionalidades. | ❌ |
| Web + backend (Node.js + PostgreSQL) | Sincroniza entre dispositivos. | Login, servidor, costos y datos personales. Rompe la regla de 3 funcionalidades. | ❌ (camino para v2) |

### 5.2 Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| **Frontend** | HTML5, CSS3 y JavaScript (ES2020, módulos nativos), **sin framework** | Tres funcionalidades no justifican React; así no hay paso de compilación. |
| **Backend** | **Ninguno** | Los datos no salen del dispositivo (RNF-06). |
| **Base de datos** | `localStorage` del navegador: un documento JSON bajo la clave `vineta:datos` | Simple, síncrono y suficiente para el volumen esperado (RNF-22). |
| **Offline e instalación** | Service worker + Web App Manifest | Abrir sin conexión e instalar en la pantalla de inicio. |
| **Hosting** | GitHub Pages | Gratis, con HTTPS incluido (lo exige el service worker). |
| **Pruebas** | `node --test` (incluido en Node.js 18 o superior) para la lógica, más una lista de pruebas manuales basada en la [sección 6](#6-casos-borde-y-excepciones) | Sin dependencias extra. |
| **Control de versiones** | Git + GitHub | Historial y publicación en GitHub Pages. |

### 5.3 Componentes

```text
vineta/
├── index.html              Estructura de la página
├── estilos.css             Diseño visual, temas claro y oscuro
├── app.js                  Interfaz: lista, formulario, filtros y avisos (el único que toca el DOM)
├── obras.js                Reglas puras: validar, normalizar títulos, sumar capítulo, filtrar, ordenar
├── almacen.js              Leer y guardar en localStorage, versión del esquema, errores de espacio
├── sw.js                   Service worker: caché de la app para usarla sin conexión
├── manifest.webmanifest    Nombre, íconos y colores para instalarla
├── iconos/
├── tests/
│   └── obras.test.js       Pruebas de obras.js con node --test
└── docs/
    └── SRS.md              Este documento
```

**Regla de dependencias:** `app.js` usa a `obras.js` y a `almacen.js`. **`obras.js` no toca el DOM ni el almacenamiento**, por eso se puede probar en Node sin abrir un navegador.

```text
 Usuario ──► app.js ──► obras.js     (decide: ¿es válido? ¿cuál es el capítulo nuevo?)
               │
               └──────► almacen.js ──► localStorage
 sw.js ──► caché del navegador (sirve los archivos de la app sin internet)
```

### 5.4 Modelo de datos

Documento guardado en `localStorage` bajo la clave `vineta:datos`:

```json
{
  "version": 1,
  "filtro": "todas",
  "obras": [
    {
      "id": "3f1c0a8e-6b2d-4f7a-9c1e-5d8b2a7f4e10",
      "titulo": "Solo Leveling",
      "capitulo": 45.5,
      "estado": "leyendo",
      "enlace": null,
      "creadaEn": "2026-09-16T20:15:00.000Z",
      "actualizadaEn": "2026-09-16T20:15:00.000Z"
    }
  ]
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `version` | entero | Versión del esquema. Hoy vale `1`. |
| `filtro` | texto | `todas` · `leyendo` · `pausa` · `terminado` |
| `obras[].id` | texto | `crypto.randomUUID()`. Si no existe, marca de tiempo + número aleatorio ([CB-16](#62-almacenamiento-y-datos)). |
| `obras[].titulo` | texto | 1 a 100 caracteres, sin espacios al inicio ni al final. |
| `obras[].capitulo` | número | 0 a 9999, con máximo un decimal. |
| `obras[].estado` | texto | `leyendo` · `pausa` · `terminado` |
| `obras[].enlace` | texto o `null` | URL `http(s)` de hasta 500 caracteres, o `null`. |
| `obras[].creadaEn` / `actualizadaEn` | texto | Fecha en formato ISO 8601 (UTC). |

### 5.5 Servicios de terceros e integraciones

| Servicio | Para qué se usa | Qué datos recibe |
|---|---|---|
| **GitHub Pages** | Hospedar los archivos de la app | Solo las peticiones normales de archivos que hace cualquier navegador. **Ningún dato de la biblioteca.** |

No se integran notificaciones push, analítica, fuentes externas ni APIs de terceros en v1.0 (ver [sección 3.4](#34-wont-have-descartado-en-v10)).

### 5.6 Restricciones

- **Máximo 3 funcionalidades clave.** Cualquier funcionalidad nueva pasa a v1.1 o a una versión posterior.
- **Sin dependencias de npm** en producción.
- **Debe servirse por HTTPS** (o `localhost` durante el desarrollo). **No funciona abierta como archivo local** (`file://`): el navegador bloquea ahí los módulos de JavaScript. Para desarrollar se usa un servidor local.
- **Solo en español** en v1.0.
- **El almacenamiento lo limita el navegador:** unos 5 MB por sitio.

---

## 6. Casos borde y excepciones

Cada caso indica **qué hace el sistema** y **qué mensaje ve el lector**. *"Ninguno"* significa que el sistema lo resuelve sin interrumpir.

> **Pagos: no aplica.** Viñeta no maneja pagos, compras ni suscripciones.

### 6.1 Conexión

| ID | Situación | Comportamiento esperado | Mensaje al lector |
|---|---|---|---|
| CB-01 | **Primera visita sin internet** | La app no puede cargar porque todavía no está en caché. Es el comportamiento normal del navegador. | La página de error del propio navegador |
| CB-02 | **Se pierde la conexión mientras se usa** | Todo sigue funcionando: los datos son locales y no hay peticiones pendientes. | Ninguno |
| CB-03 | **Conexión lenta o intermitente al abrir** | El service worker responde **primero desde la caché**; nunca espera a la red para mostrar la lista. | Ninguno |
| CB-04 | **Hay una versión nueva publicada** | Se descarga en segundo plano y se aplica al recargar, **nunca a mitad de una edición**. | *"Hay una versión nueva de Viñeta · Actualizar"* |
| CB-05 | **Se cae la red a mitad de descargar la versión nueva** | Se conserva completa la versión anterior y se reintenta en la próxima apertura con conexión. | Ninguno |
| CB-06 | **Se abre el enlace de lectura sin conexión** | El enlace se abre en una pestaña nueva; el sitio externo muestra su propio error. | Ninguno (ocurre fuera de la app) |

### 6.2 Almacenamiento y datos

| ID | Situación | Comportamiento esperado | Mensaje al lector |
|---|---|---|---|
| CB-07 | **localStorage bloqueado** (configuración de privacidad o algunos modos incógnito) | La app funciona solo en memoria; los cambios se pierden al cerrar. | Barra fija: *"Este navegador no deja guardar tus obras. Lo que agregues se perderá al cerrar."* |
| CB-08 | **Almacenamiento lleno** (`QuotaExceededError`) | El cambio no se guarda y la pantalla **vuelve al último estado guardado**, para no mostrar un dato que no existe. | *"No hay espacio para guardar. Libera espacio en el navegador e inténtalo de nuevo."* |
| CB-09 | **Datos corruptos** (JSON inválido o editado a mano) | **No se borran**: se copian a la clave `vineta:respaldo-<fecha>` y la app arranca con la lista vacía. Si la copia también falla, no se toca el original y se sigue como en CB-07. | *"No pudimos leer tus obras guardadas. Guardamos una copia para intentar recuperarla."* |
| CB-10 | **Una sola obra con datos inválidos** (capítulo `"abc"`, estado desconocido) | Solo esa obra se aparta al respaldo; las demás cargan normal. | *"1 obra no se pudo leer y se guardó aparte."* |
| CB-11 | **Datos con una versión de esquema más nueva que la app** (quedó en caché una versión vieja) | **Modo solo lectura**: se muestra la lista, pero no se guarda nada, para no pisar los datos nuevos. | *"Esta copia de Viñeta está desactualizada. Recarga para seguir editando."* |
| CB-12 | **Datos de una versión de esquema anterior** | Se migran automáticamente antes de mostrarlos. Si la migración falla, se aplica CB-09. | Ninguno |
| CB-13 | **El navegador borra los datos** (el usuario limpia los datos del sitio, o Safari en iOS borra el almacenamiento de un sitio no instalado que no se visitó en 7 días) | Se pierde la biblioteca: no hay copia en la nube (limitación aceptada de v1.0). **Mitigación:** la app pide almacenamiento persistente con `navigator.storage.persist()` cuando el navegador lo soporta y, en iOS sin instalar, avisa una vez. | *"Instala Viñeta en tu pantalla de inicio para que Safari no borre tus obras."* |
| CB-14 | **Dos pestañas abiertas a la vez** | Cada pestaña escucha el evento `storage` y se refresca con los cambios de la otra. Gana el último guardado. | Ninguno |
| CB-15 | **Varias personas usan el mismo navegador** | Comparten la biblioteca, porque no hay cuentas. | Ninguno (limitación documentada) |
| CB-16 | **`crypto.randomUUID()` no disponible** (navegador viejo o contexto no seguro) | El id se genera con marca de tiempo + número aleatorio. | Ninguno |

### 6.3 Entrada de datos

| ID | Situación | Comportamiento esperado | Mensaje al lector |
|---|---|---|---|
| CB-17 | Título con espacios al inicio, al final o repetidos | Se limpian antes de guardar. | Ninguno |
| CB-18 | Título con solo espacios | No se guarda. | *"Escribe el título de la obra"* |
| CB-19 | Título de más de 100 caracteres (escrito o pegado) | El campo no admite más: lo pegado se corta a 100. | *"Máximo 100 caracteres"* |
| CB-20 | Título repetido con otras mayúsculas, tildes o espacios | Se bloquea (RN-01). | *"Ya tienes «Solo Leveling» en tu lista"* + *"Ver obra"* |
| CB-21 | La misma obra con nombres distintos (*"Solo Leveling"* y *"Na Honjaman Level Up"*) | No se puede detectar; se permite. | Ninguno (limitación aceptada) |
| CB-22 | Título con emojis, símbolos o código HTML (`<script>`) | Se guarda y se muestra como texto literal, **sin ejecutarse** (RNF-07). | Ninguno |
| CB-23 | Capítulo con coma decimal (`45,5`) | Se interpreta como `45.5`. | Ninguno |
| CB-24 | Capítulo negativo, mayor a 9999, con dos o más decimales, o con letras | No se guarda. | *"El capítulo debe ser un número entre 0 y 9999 (puede tener un decimal)"* |
| CB-25 | Capítulo vacío | Se toma como `0`. | Ninguno |
| CB-26 | Enlace con `javascript:`, sin protocolo o con otro esquema | No se guarda (RNF-09). | *"Pega un enlace que empiece por http:// o https://"* |

### 6.4 Interacción

| ID | Situación | Comportamiento esperado | Mensaje al lector |
|---|---|---|---|
| CB-27 | **+1 tocado muchas veces seguidas** | Cada toque suma y se guarda. La obra no cambia de lugar (RN-06). | Aviso con el número actualizado |
| CB-28 | +1 en una obra que está en el capítulo 9999 | No sube. | *"Llegaste al límite de capítulos (9999)"* |
| CB-29 | +1 en una obra *En pausa* | Pasa a *Leyendo* (RN-05). | *"«Título» volvió a Leyendo · Cap. 13 · Deshacer"* |
| CB-30 | Se guarda una obra cuyo estado no coincide con el filtro activo | Se guarda, pero no aparece en la vista actual. | *"«Título» se guardó en Terminado · Ver"* |
| CB-31 | El filtro activo queda vacío después de editar o eliminar | Se muestra el mensaje de filtro vacío. | *"No tienes obras terminadas. · Ver todas"* |
| CB-32 | Se cierra el formulario con cambios sin guardar (botón atrás de Android, tecla Escape o toque fuera) | Se pregunta antes de descartar. | *"¿Descartar los cambios?"* |
| CB-33 | Doble toque en *"Guardar"* | Se guarda **una sola vez**: el botón se desactiva mientras guarda. | Ninguno |
| CB-34 | Deshacer después de haber editado o eliminado esa obra | El botón *"Deshacer"* desaparece al editar o eliminar; no se revierte un estado que ya no existe. | Ninguno |
| CB-35 | Se cierra la app un segundo después de tocar +1 | El cambio ya está guardado, porque se guarda en el mismo toque y no al cerrar. | Ninguno |

### 6.5 Dispositivo y navegador

| ID | Situación | Comportamiento esperado | Mensaje al lector |
|---|---|---|---|
| CB-36 | Navegador sin service worker, o app servida por `http://` sin cifrar (ej. probarla desde el celular con la IP del PC, `http://192.168.x.x`) | Funciona, pero sin modo offline ni instalación, porque el service worker exige HTTPS o `localhost`. | Ninguno |
| CB-37 | Pantalla de 320 px o celular girado a horizontal | Sin scroll horizontal; los botones mantienen sus 44 px. | Ninguno |
| CB-38 | Reloj del dispositivo con la fecha equivocada | El orden por fecha puede verse raro, pero los datos no se dañan. | Ninguno (limitación aceptada) |
| CB-39 | JavaScript desactivado | Se muestra un aviso en lugar de la app. | *"Viñeta necesita JavaScript activado para funcionar."* |
| CB-40 | Texto del sistema agrandado o zoom al 200 % | La interfaz se reacomoda sin cortar botones ni texto. | Ninguno |

---

## Anexo A: criterios de terminado

La versión 1.0 se considera terminada cuando:

- [ ] Las **6 historias Must** cumplen todos sus criterios de aceptación.
- [ ] `node --test` pasa en verde para toda la lógica de `obras.js` (validaciones, RN-01 a RN-05).
- [ ] Los **40 casos borde** de la sección 6 se probaron a mano y se comportan como está escrito.
- [ ] La app abre y funciona **en modo avión** después de la primera visita (O3).
- [ ] Lighthouse la reconoce como **instalable** y cumple RNF-01.
- [ ] La pestaña *Red* no muestra **ninguna petición a dominios de terceros** (O4).
- [ ] Está publicada en GitHub Pages por HTTPS.

### Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-16 | Primera versión del documento. |
| 1.1 | 2026-09-16 | Se amplía el alcance: ya no es solo para manhwa, cubre también libros, cómics y novelas. Terminología generalizada en todo el documento. |
| 1.2 | 2026-09-16 | HU-07 y HU-08 pasan de Should a Must (ver `docs/pactos/2026-09-16-vineta-v1.md` §8, Enmiendas): RN-05 —que usa el Must HU-06— vivía en un Should, y el "deshacer" ya estaba prometido en el alcance (§1.4) sin ser Must. Encontrado por una prueba de estrés de `pacto-skill`. |
