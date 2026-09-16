// Pruebas de almacen.js — leer y guardar en localStorage, sin abrir un navegador:
// se le inyecta un storage falso con la misma forma que localStorage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLAVE, VERSION_ACTUAL, datosVacios, cargar, guardar } from '../almacen.js';

function storageFalso(inicial = {}) {
  const mapa = new Map(Object.entries(inicial));
  return {
    getItem: (clave) => (mapa.has(clave) ? mapa.get(clave) : null),
    setItem: (clave, valor) => mapa.set(clave, valor),
    removeItem: (clave) => mapa.delete(clave),
    mapa,
  };
}

function storageBloqueado() {
  return {
    getItem: () => {
      throw new Error('localStorage bloqueado');
    },
    setItem: () => {
      throw new Error('localStorage bloqueado');
    },
  };
}

function storageLleno() {
  return {
    getItem: () => null,
    setItem: () => {
      const error = new Error('sin espacio');
      error.name = 'QuotaExceededError';
      throw error;
    },
  };
}

test('datosVacios trae la versión actual, filtro "todas" y sin obras', () => {
  const datos = datosVacios();
  assert.equal(datos.version, VERSION_ACTUAL);
  assert.equal(datos.filtro, 'todas');
  assert.deepEqual(datos.obras, []);
});

test('cargar sin nada guardado devuelve datos vacíos', () => {
  const r = cargar(storageFalso());
  assert.equal(r.estado, 'ok');
  assert.deepEqual(r.datos, datosVacios());
});

test('guardar y volver a cargar hacen un viaje de ida y vuelta completo', () => {
  const storage = storageFalso();
  const obra = { id: '1', titulo: 'X', capitulo: 3, estado: 'leyendo', enlace: null };
  const datos = { version: VERSION_ACTUAL, filtro: 'leyendo', obras: [obra] };
  const g = guardar(datos, storage);
  assert.equal(g.ok, true);
  const r = cargar(storage);
  assert.deepEqual(r.datos, datos);
});

test('cargar JSON corrupto no lo borra: lo copia a un respaldo y arranca vacío (CB-09)', () => {
  const storage = storageFalso({ [CLAVE]: '{esto no es json' });
  const r = cargar(storage);
  assert.equal(r.estado, 'corrupto');
  assert.deepEqual(r.datos, datosVacios());
  // El original sigue intacto:
  assert.equal(storage.getItem(CLAVE), '{esto no es json');
  // Y hay una copia de respaldo:
  const claveRespaldo = [...storage.mapa.keys()].find((k) => k.startsWith('vineta:respaldo-'));
  assert.ok(claveRespaldo, 'debería existir una clave de respaldo');
});

test('cargar con una obra inválida la aparta y conserva las demás (CB-10)', () => {
  const buena = { id: '1', titulo: 'Solo Leveling', capitulo: 10, estado: 'leyendo', enlace: null };
  const mala = { id: '2', titulo: 'Rota', capitulo: 'no-numero', estado: 'leyendo' };
  const storage = storageFalso({
    [CLAVE]: JSON.stringify({ version: VERSION_ACTUAL, filtro: 'todas', obras: [buena, mala] }),
  });
  const r = cargar(storage);
  assert.equal(r.estado, 'obras_descartadas');
  assert.equal(r.obrasDescartadas, 1);
  assert.deepEqual(r.datos.obras, [buena]);
});

test('cargar con localStorage bloqueado no revienta, devuelve datos vacíos (CB-07)', () => {
  const r = cargar(storageBloqueado());
  assert.equal(r.estado, 'bloqueado');
  assert.deepEqual(r.datos, datosVacios());
});

test('cargar con una versión de esquema más nueva no toca los datos (CB-11)', () => {
  const futuros = { version: VERSION_ACTUAL + 1, filtro: 'todas', obras: [] };
  const storage = storageFalso({ [CLAVE]: JSON.stringify(futuros) });
  const r = cargar(storage);
  assert.equal(r.estado, 'version_futura');
});

test('guardar detecta el espacio lleno y avisa sin perder lo que ya había (CB-08)', () => {
  const g = guardar(datosVacios(), storageLleno());
  assert.equal(g.ok, false);
  assert.equal(g.error, 'No hay espacio para guardar. Libera espacio en el navegador e inténtalo de nuevo.');
});
