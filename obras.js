// obras.js — reglas puras de Viñeta.
// No toca el DOM ni localStorage: por eso se puede probar con `node --test`
// sin abrir un navegador. Ver docs/SRS.md §3 y §5.3.

export const ESTADOS = Object.freeze({
  LEYENDO: 'leyendo',
  PAUSA: 'pausa',
  TERMINADO: 'terminado',
});

export const CAPITULO_MAXIMO = 9999;
export const TITULO_MAXIMO = 100;
export const ENLACE_MAXIMO = 500;

const MENSAJE_TITULO_VACIO = 'Escribe el título de la obra';
const MENSAJE_TITULO_LARGO = 'Máximo 100 caracteres';
const MENSAJE_CAPITULO_INVALIDO =
  'El capítulo debe ser un número entre 0 y 9999 (puede tener un decimal)';
const MENSAJE_ENLACE_INVALIDO = 'Pega un enlace que empiece por http:// o https://';
const MENSAJE_LIMITE_CAPITULO = 'Llegaste al límite de capítulos (9999)';

/** Recorta espacios de los bordes y colapsa los espacios repetidos del medio. */
export function normalizarTitulo(titulo) {
  return String(titulo ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Clave de comparación para RN-01: sin mayúsculas, sin tildes y con los
 * espacios normalizados. Dos títulos con la misma clave son "la misma obra".
 */
export function clavesComparacion(titulo) {
  return normalizarTitulo(titulo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** ¿Alguna obra de la lista ya tiene este título? (RN-01). Ignora `idExcluir`. */
export function tituloDuplicado(titulo, obras, idExcluir = null) {
  const clave = clavesComparacion(titulo);
  return obras.some((obra) => obra.id !== idExcluir && clavesComparacion(obra.titulo) === clave);
}

/** @returns {{ok:true, valor:string} | {ok:false, error:string}} */
export function validarTitulo(titulo) {
  const limpio = normalizarTitulo(titulo);
  if (limpio.length === 0) return { ok: false, error: MENSAJE_TITULO_VACIO };
  if (limpio.length > TITULO_MAXIMO) return { ok: false, error: MENSAJE_TITULO_LARGO };
  return { ok: true, valor: limpio };
}

/** @returns {{ok:true, valor:number} | {ok:false, error:string}} */
export function validarCapitulo(valor) {
  const texto = String(valor ?? '').trim();
  if (texto.length === 0) return { ok: true, valor: 0 };
  const normalizado = texto.replace(',', '.');
  if (!/^\d{1,4}(\.\d)?$/.test(normalizado)) {
    return { ok: false, error: MENSAJE_CAPITULO_INVALIDO };
  }
  const numero = Number(normalizado);
  if (numero < 0 || numero > CAPITULO_MAXIMO) {
    return { ok: false, error: MENSAJE_CAPITULO_INVALIDO };
  }
  return { ok: true, valor: numero };
}

/** @returns {{ok:true, valor:string|null} | {ok:false, error:string}} */
export function validarEnlace(valor) {
  const texto = String(valor ?? '').trim();
  if (texto.length === 0) return { ok: true, valor: null };
  if (texto.length > ENLACE_MAXIMO || !/^https?:\/\//i.test(texto)) {
    return { ok: false, error: MENSAJE_ENLACE_INVALIDO };
  }
  return { ok: true, valor: texto };
}

function generarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // CB-16: navegador viejo o contexto no seguro sin crypto.randomUUID().
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Valida y arma una obra nueva. `obrasExistentes` se usa para detectar
 * duplicados (RN-01). No toca almacenamiento: eso lo hace almacen.js.
 * @returns {{ok:true, obra:object} | {ok:false, error:string}}
 */
export function crearObra(datos, obrasExistentes, ahora = new Date().toISOString()) {
  const titulo = validarTitulo(datos.titulo);
  if (!titulo.ok) return titulo;

  const clave = clavesComparacion(titulo.valor);
  const existente = obrasExistentes.find((obra) => clavesComparacion(obra.titulo) === clave);
  if (existente) {
    return {
      ok: false,
      error: `Ya tienes «${existente.titulo}» en tu lista`,
      obraExistenteId: existente.id,
    };
  }

  const capitulo = validarCapitulo(datos.capitulo);
  if (!capitulo.ok) return capitulo;

  const enlace = validarEnlace(datos.enlace);
  if (!enlace.ok) return enlace;

  const estado = datos.estado ?? ESTADOS.LEYENDO;

  return {
    ok: true,
    obra: {
      id: generarId(),
      titulo: titulo.valor,
      capitulo: capitulo.valor,
      estado,
      enlace: enlace.valor,
      creadaEn: ahora,
      actualizadaEn: ahora,
    },
  };
}

/**
 * Suma un capítulo (RN-03: al siguiente entero). Pasa Pausa -> Leyendo
 * (RN-05). Rechaza obras Terminadas (RN-04) y el tope de 9999 (CB-28).
 * @returns {{ok:true, obra:object} | {ok:false, error:string}}
 */
export function sumarCapitulo(obra, ahora = new Date().toISOString()) {
  if (obra.estado === ESTADOS.TERMINADO) {
    return { ok: false, error: 'Esta obra ya está Terminada' };
  }
  if (obra.capitulo >= CAPITULO_MAXIMO) {
    return { ok: false, error: MENSAJE_LIMITE_CAPITULO };
  }
  return {
    ok: true,
    obra: {
      ...obra,
      capitulo: Math.floor(obra.capitulo) + 1,
      estado: ESTADOS.LEYENDO,
      actualizadaEn: ahora,
    },
  };
}

/** RN-02: la más reciente primero. No muta el arreglo recibido. */
export function ordenarObras(obras) {
  return [...obras].sort((a, b) => new Date(b.actualizadaEn) - new Date(a.actualizadaEn));
}

export function filtrarPorEstado(obras, filtro) {
  if (filtro === 'todas') return obras;
  return obras.filter((obra) => obra.estado === filtro);
}

export function contarPorEstado(obras) {
  return {
    todas: obras.length,
    leyendo: obras.filter((o) => o.estado === ESTADOS.LEYENDO).length,
    pausa: obras.filter((o) => o.estado === ESTADOS.PAUSA).length,
    terminado: obras.filter((o) => o.estado === ESTADOS.TERMINADO).length,
  };
}
