// almacen.js — leer y guardar la biblioteca en localStorage.
// Recibe el `storage` como parámetro (en vez de usar `localStorage` directo)
// para poder probarlo con `node --test` sin abrir un navegador, y para poder
// reemplazarlo si `localStorage` no existe (CB-07).
import { CAPITULO_MAXIMO } from './obras.js';

export const CLAVE = 'vineta:datos';
export const VERSION_ACTUAL = 1;

const ESTADOS_VALIDOS = ['leyendo', 'pausa', 'terminado'];
const MENSAJE_SIN_ESPACIO =
  'No hay espacio para guardar. Libera espacio en el navegador e inténtalo de nuevo.';

export function datosVacios() {
  return { version: VERSION_ACTUAL, filtro: 'todas', obras: [] };
}

function esObraValida(obra) {
  return (
    obra &&
    typeof obra.titulo === 'string' &&
    obra.titulo.trim().length > 0 &&
    typeof obra.capitulo === 'number' &&
    obra.capitulo >= 0 &&
    obra.capitulo <= CAPITULO_MAXIMO &&
    ESTADOS_VALIDOS.includes(obra.estado)
  );
}

function respaldar(storage, contenido, sufijo = '') {
  const clave = `vineta:respaldo-${new Date().toISOString()}${sufijo ? '-' + sufijo : ''}`;
  try {
    storage.setItem(clave, contenido);
  } catch {
    // Si ni el respaldo entra, no tocamos el original (CB-09/CB-10 igual valen:
    // el dato corrupto o inválido se descarta de la sesión en memoria).
  }
}

/**
 * Lee la biblioteca guardada.
 * @returns {{datos: object, estado: 'ok'|'bloqueado'|'corrupto'|'obras_descartadas'|'version_futura', obrasDescartadas?: number}}
 */
export function cargar(storage) {
  let crudo;
  try {
    crudo = storage.getItem(CLAVE);
  } catch {
    return { datos: datosVacios(), estado: 'bloqueado' }; // CB-07
  }

  if (crudo == null) return { datos: datosVacios(), estado: 'ok' };

  let json;
  try {
    json = JSON.parse(crudo);
  } catch {
    respaldar(storage, crudo);
    return { datos: datosVacios(), estado: 'corrupto' }; // CB-09
  }

  if (typeof json !== 'object' || json === null || !Array.isArray(json.obras)) {
    respaldar(storage, crudo);
    return { datos: datosVacios(), estado: 'corrupto' };
  }

  if (typeof json.version === 'number' && json.version > VERSION_ACTUAL) {
    return { datos: json, estado: 'version_futura' }; // CB-11: modo solo lectura
  }

  const obrasValidas = [];
  const descartadas = [];
  for (const obra of json.obras) {
    (esObraValida(obra) ? obrasValidas : descartadas).push(obra);
  }
  if (descartadas.length > 0) {
    respaldar(storage, JSON.stringify(descartadas), 'obras'); // CB-10
  }

  return {
    datos: { version: VERSION_ACTUAL, filtro: json.filtro ?? 'todas', obras: obrasValidas },
    estado: descartadas.length > 0 ? 'obras_descartadas' : 'ok',
    obrasDescartadas: descartadas.length,
  };
}

function esErrorDeCuota(err) {
  return Boolean(err) && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
}

/**
 * Guarda la biblioteca completa.
 * @returns {{ok:true} | {ok:false, error:string|null}}
 */
export function guardar(datos, storage) {
  let texto;
  try {
    texto = JSON.stringify(datos);
  } catch {
    return { ok: false, error: 'No se pudieron preparar los datos para guardar.' };
  }
  try {
    storage.setItem(CLAVE, texto);
    return { ok: true };
  } catch (err) {
    if (esErrorDeCuota(err)) {
      return { ok: false, error: MENSAJE_SIN_ESPACIO }; // CB-08
    }
    return { ok: false, error: null }; // CB-07: bloqueado, ya se avisó una vez al cargar
  }
}
