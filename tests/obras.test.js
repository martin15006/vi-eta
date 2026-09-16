// Pruebas de obras.js — la lógica pura de Viñeta (sin DOM, sin localStorage).
// Corre con: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS,
  CAPITULO_MAXIMO,
  normalizarTitulo,
  clavesComparacion,
  tituloDuplicado,
  validarTitulo,
  validarCapitulo,
  validarEnlace,
  crearObra,
  sumarCapitulo,
  ordenarObras,
  filtrarPorEstado,
  contarPorEstado,
} from '../obras.js';

// --- normalizarTitulo / clavesComparacion / tituloDuplicado (RN-01) ---

test('normalizarTitulo recorta espacios de los bordes y colapsa los repetidos', () => {
  assert.equal(normalizarTitulo('  Solo   Leveling  '), 'Solo Leveling');
});

test('clavesComparacion ignora mayúsculas, tildes y espacios repetidos (RN-01)', () => {
  const clave = clavesComparacion('Solo Leveling');
  assert.equal(clavesComparacion('solo  leveling'), clave);
  assert.equal(clavesComparacion('SÓLO LEVELING'), clavesComparacion('SOLO LEVELING'));
});

test('tituloDuplicado detecta el mismo título con distinta mayúscula, tilde o espacios', () => {
  const obras = [{ id: '1', titulo: 'Solo Leveling' }];
  assert.equal(tituloDuplicado('solo  leveling', obras), true);
  assert.equal(tituloDuplicado('Otra obra', obras), false);
});

test('tituloDuplicado ignora la propia obra al editar', () => {
  const obras = [{ id: '1', titulo: 'Solo Leveling' }];
  assert.equal(tituloDuplicado('Solo Leveling', obras, '1'), false);
});

// --- validarTitulo ---

test('validarTitulo rechaza vacío o solo espacios', () => {
  const r = validarTitulo('   ');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Escribe el título de la obra');
});

test('validarTitulo rechaza más de 100 caracteres', () => {
  const r = validarTitulo('a'.repeat(101));
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Máximo 100 caracteres');
});

test('validarTitulo acepta un título normal y lo devuelve normalizado', () => {
  const r = validarTitulo('  Solo   Leveling  ');
  assert.equal(r.ok, true);
  assert.equal(r.valor, 'Solo Leveling');
});

// --- validarCapitulo ---

test('validarCapitulo acepta coma decimal y la convierte a número (CB-23)', () => {
  const r = validarCapitulo('45,5');
  assert.equal(r.ok, true);
  assert.equal(r.valor, 45.5);
});

test('validarCapitulo vacío equivale a 0 (CB-25)', () => {
  const r = validarCapitulo('');
  assert.equal(r.ok, true);
  assert.equal(r.valor, 0);
});

test('validarCapitulo rechaza negativo, mayor a 9999, con letras o con dos decimales', () => {
  const mensaje = 'El capítulo debe ser un número entre 0 y 9999 (puede tener un decimal)';
  assert.equal(validarCapitulo('-1').ok, false);
  assert.equal(validarCapitulo('10000').ok, false);
  assert.equal(validarCapitulo('abc').ok, false);
  assert.equal(validarCapitulo('45.55').ok, false);
  assert.equal(validarCapitulo('abc').error, mensaje);
});

// --- validarEnlace ---

test('validarEnlace acepta vacío como "sin enlace"', () => {
  const r = validarEnlace('');
  assert.equal(r.ok, true);
  assert.equal(r.valor, null);
});

test('validarEnlace rechaza esquemas que no sean http/https (CB-26)', () => {
  const r = validarEnlace('javascript:alert(1)');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Pega un enlace que empiece por http:// o https://');
});

test('validarEnlace acepta http:// y https://', () => {
  assert.equal(validarEnlace('https://ejemplo.com/obra').ok, true);
  assert.equal(validarEnlace('http://ejemplo.com/obra').ok, true);
});

// --- crearObra ---

test('crearObra guarda valores válidos con estado por defecto Leyendo y capítulo 0', () => {
  const r = crearObra({ titulo: 'Solo Leveling' }, []);
  assert.equal(r.ok, true);
  assert.equal(r.obra.titulo, 'Solo Leveling');
  assert.equal(r.obra.capitulo, 0);
  assert.equal(r.obra.estado, ESTADOS.LEYENDO);
  assert.equal(typeof r.obra.id, 'string');
  assert.equal(r.obra.creadaEn, r.obra.actualizadaEn);
});

test('crearObra devuelve error de título vacío', () => {
  const r = crearObra({ titulo: '' }, []);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Escribe el título de la obra');
});

test('crearObra devuelve error de duplicado citando el título existente', () => {
  const existentes = [{ id: '1', titulo: 'Solo Leveling' }];
  const r = crearObra({ titulo: 'solo  leveling' }, existentes);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Ya tienes «Solo Leveling» en tu lista');
  assert.equal(r.obraExistenteId, '1'); // para el botón "Ver obra" (HU-01·4)
});

test('crearObra devuelve error de capítulo inválido', () => {
  const r = crearObra({ titulo: 'Una obra', capitulo: '-3' }, []);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'El capítulo debe ser un número entre 0 y 9999 (puede tener un decimal)');
});

// --- sumarCapitulo (RN-03, RN-04, RN-05) ---

test('sumarCapitulo lleva al siguiente entero: 45 -> 46', () => {
  const obra = { capitulo: 45, estado: ESTADOS.LEYENDO };
  const r = sumarCapitulo(obra);
  assert.equal(r.ok, true);
  assert.equal(r.obra.capitulo, 46);
});

test('sumarCapitulo lleva al siguiente entero con decimales: 45.5 -> 46', () => {
  const obra = { capitulo: 45.5, estado: ESTADOS.LEYENDO };
  const r = sumarCapitulo(obra);
  assert.equal(r.obra.capitulo, 46);
});

test('sumarCapitulo no avanza una obra Terminada (RN-04)', () => {
  const obra = { capitulo: 100, estado: ESTADOS.TERMINADO };
  const r = sumarCapitulo(obra);
  assert.equal(r.ok, false);
});

test('sumarCapitulo pasa una obra en pausa a Leyendo (RN-05)', () => {
  const obra = { capitulo: 12, estado: ESTADOS.PAUSA };
  const r = sumarCapitulo(obra);
  assert.equal(r.ok, true);
  assert.equal(r.obra.estado, ESTADOS.LEYENDO);
  assert.equal(r.obra.capitulo, 13);
});

test('sumarCapitulo no sube más allá del tope 9999 (CB-28)', () => {
  const obra = { capitulo: CAPITULO_MAXIMO, estado: ESTADOS.LEYENDO };
  const r = sumarCapitulo(obra);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'Llegaste al límite de capítulos (9999)');
});

// --- ordenarObras (RN-02) ---

test('ordenarObras pone primero la de actualización más reciente', () => {
  const obras = [
    { id: 'a', actualizadaEn: '2026-01-01T00:00:00.000Z' },
    { id: 'b', actualizadaEn: '2026-06-01T00:00:00.000Z' },
    { id: 'c', actualizadaEn: '2026-03-01T00:00:00.000Z' },
  ];
  const ordenadas = ordenarObras(obras).map((o) => o.id);
  assert.deepEqual(ordenadas, ['b', 'c', 'a']);
});

// --- filtrarPorEstado / contarPorEstado ---

test('filtrarPorEstado devuelve solo las obras del estado pedido', () => {
  const obras = [
    { id: '1', estado: ESTADOS.LEYENDO },
    { id: '2', estado: ESTADOS.PAUSA },
    { id: '3', estado: ESTADOS.LEYENDO },
  ];
  const resultado = filtrarPorEstado(obras, ESTADOS.LEYENDO).map((o) => o.id);
  assert.deepEqual(resultado, ['1', '3']);
  assert.equal(filtrarPorEstado(obras, 'todas').length, 3);
});

test('contarPorEstado cuenta cada estado', () => {
  const obras = [
    { id: '1', estado: ESTADOS.LEYENDO },
    { id: '2', estado: ESTADOS.PAUSA },
    { id: '3', estado: ESTADOS.LEYENDO },
    { id: '4', estado: ESTADOS.TERMINADO },
  ];
  const conteo = contarPorEstado(obras);
  assert.equal(conteo.todas, 4);
  assert.equal(conteo.leyendo, 2);
  assert.equal(conteo.pausa, 1);
  assert.equal(conteo.terminado, 1);
});
