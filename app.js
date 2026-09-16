// app.js — el único archivo que toca el DOM. La lógica vive en obras.js
// (reglas puras) y almacen.js (localStorage). Ver docs/pactos/2026-09-16-vineta-v1.md.
import * as Obras from './obras.js';
import * as Almacen from './almacen.js';

// --- Almacenamiento con red de seguridad (CB-07) ---

function crearAlmacenamiento() {
  try {
    const prueba = '__vineta_prueba__';
    window.localStorage.setItem(prueba, '1');
    window.localStorage.removeItem(prueba);
    return window.localStorage;
  } catch {
    const mapa = new Map();
    return {
      getItem: (clave) => (mapa.has(clave) ? mapa.get(clave) : null),
      setItem: (clave, valor) => mapa.set(clave, valor),
      removeItem: (clave) => mapa.delete(clave),
    };
  }
}

const storage = crearAlmacenamiento();

// --- Estado en memoria ---

let datos = Almacen.datosVacios();
let soloLectura = false;
/** ids en el orden en que se muestran ahora mismo (RN-06: no se recalcula con un +1). */
let ordenActual = [];
let ultimaAccion = null; // para "Deshacer": { obraAnterior, obraNueva, obraEliminada, mensaje }
let avisoTimeoutId = null;

// --- Referencias del DOM ---

const el = {
  banner: document.getElementById('banner'),
  bannerTexto: document.getElementById('banner-texto'),
  bannerBoton: document.getElementById('banner-boton'),
  lista: document.getElementById('lista-obras'),
  filtros: document.getElementById('filtros'),
  botonAgregar: document.getElementById('boton-agregar'),
  dialogoObra: document.getElementById('dialogo-obra'),
  formulario: document.getElementById('formulario-obra'),
  tituloDialogo: document.getElementById('dialogo-obra__titulo'),
  campoId: document.getElementById('obra-id'),
  campoTitulo: document.getElementById('obra-titulo'),
  errorTituloTexto: document.getElementById('error-titulo-texto'),
  botonVerObra: document.getElementById('boton-ver-obra'),
  campoCapitulo: document.getElementById('obra-capitulo'),
  errorCapitulo: document.getElementById('error-capitulo'),
  campoEstado: document.getElementById('obra-estado'),
  campoEnlace: document.getElementById('obra-enlace'),
  errorEnlace: document.getElementById('error-enlace'),
  botonEliminar: document.getElementById('boton-eliminar'),
  botonCancelar: document.getElementById('boton-cancelar'),
  dialogoConfirmar: document.getElementById('dialogo-confirmar'),
  textoConfirmar: document.getElementById('dialogo-confirmar__texto'),
  confirmarCancelar: document.getElementById('confirmar-cancelar'),
  confirmarAceptar: document.getElementById('confirmar-aceptar'),
  aviso: document.getElementById('aviso'),
  avisoTexto: document.getElementById('aviso-texto'),
  avisoBoton: document.getElementById('aviso-boton'),
  plantillaObra: document.getElementById('plantilla-obra'),
};

// --- Arranque ---

function iniciar() {
  const resultado = Almacen.cargar(storage);
  datos = resultado.datos;

  if (resultado.estado === 'bloqueado') {
    mostrarBanner(
      'Este navegador no deja guardar tus obras. Lo que agregues se perderá al cerrar.'
    );
  } else if (resultado.estado === 'version_futura') {
    soloLectura = true;
    mostrarBanner('Esta copia de Viñeta está desactualizada. Recarga para seguir editando.');
  } else if (resultado.estado === 'corrupto') {
    mostrarAviso('No pudimos leer tus obras guardadas. Guardamos una copia para intentar recuperarla.');
  } else if (resultado.estado === 'obras_descartadas') {
    const n = resultado.obrasDescartadas;
    mostrarAviso(`${n} obra${n === 1 ? '' : 's'} no se pudo leer y se guardó aparte.`);
  }

  aplicarFiltro(datos.filtro || 'todas', { guardar: false });
  registrarEventos();
  registrarServiceWorker();
}

// --- Guardado ---

/** Guarda `datos` en el almacenamiento. Si falla, deshace el cambio en memoria. */
function persistir(datosAnteriores) {
  const resultado = Almacen.guardar(datos, storage);
  if (!resultado.ok) {
    datos = datosAnteriores; // CB-08: no dejamos en pantalla un dato que no se guardó
    if (resultado.error) mostrarAviso(resultado.error);
    render();
    return false;
  }
  return true;
}

// --- Orden y filtro (RN-02, RN-06) ---

function recomputarOrden() {
  const filtradas = Obras.filtrarPorEstado(datos.obras, datos.filtro);
  ordenActual = Obras.ordenarObras(filtradas).map((o) => o.id);
}

function aplicarFiltro(filtro, { guardar = true } = {}) {
  const datosAnteriores = datos;
  datos = { ...datos, filtro };
  recomputarOrden();
  for (const boton of el.filtros.querySelectorAll('.filtros__boton')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.filtro === filtro));
  }
  render();
  if (guardar) persistir(datosAnteriores); // HU-11 (Could): recordar el último filtro
}

// --- Render ---

function textoEstado(estado) {
  if (estado === Obras.ESTADOS.LEYENDO) return 'Leyendo';
  if (estado === Obras.ESTADOS.PAUSA) return 'En pausa';
  return 'Terminado';
}

function actualizarContadores() {
  const conteo = Obras.contarPorEstado(datos.obras);
  for (const span of el.filtros.querySelectorAll('[data-contador]')) {
    const clave = span.dataset.contador;
    const n = conteo[clave] ?? 0;
    span.textContent = n > 0 ? `(${n})` : '';
  }
}

function mensajeVacio(filtro) {
  if (filtro === 'todas') return 'Todavía no tienes obras. Agrega la primera.';
  if (filtro === 'leyendo') return 'No tienes obras leyendo.';
  if (filtro === 'pausa') return 'No tienes obras en pausa.';
  return 'No tienes obras terminadas.';
}

function render() {
  actualizarContadores();
  el.lista.replaceChildren();

  const porId = new Map(datos.obras.map((o) => [o.id, o]));
  const idsVisibles = ordenActual.filter((id) => porId.has(id));

  if (idsVisibles.length === 0) {
    const vacio = document.createElement('div');
    vacio.className = 'lista-obras__vacio';
    const texto = document.createElement('p');
    texto.textContent = mensajeVacio(datos.filtro);
    vacio.append(texto);
    if (datos.filtro === 'todas') {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton boton--primario';
      boton.textContent = 'Agregar obra';
      boton.addEventListener('click', () => abrirFormulario());
      vacio.append(boton);
    } else {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton boton--secundario';
      boton.textContent = 'Ver todas';
      boton.addEventListener('click', () => aplicarFiltro('todas'));
      vacio.append(boton);
    }
    el.lista.append(vacio);
    return;
  }

  for (const id of idsVisibles) {
    el.lista.append(crearTarjeta(porId.get(id)));
  }
}

function crearTarjeta(obra) {
  const nodo = el.plantillaObra.content.firstElementChild.cloneNode(true);
  nodo.dataset.id = obra.id;

  nodo.querySelector('.tarjeta-obra__titulo').textContent = obra.titulo;
  nodo.querySelector('.tarjeta-obra__capitulo').textContent = `Cap. ${obra.capitulo}`;
  nodo.querySelector('.tarjeta-obra__estado').textContent = textoEstado(obra.estado);

  const enlace = nodo.querySelector('.tarjeta-obra__leer');
  if (obra.enlace) {
    enlace.href = obra.enlace;
    enlace.hidden = false;
  }

  const botonMasUno = nodo.querySelector('.tarjeta-obra__mas-uno');
  if (obra.estado === Obras.ESTADOS.TERMINADO) {
    botonMasUno.remove();
  } else {
    botonMasUno.addEventListener('click', (evento) => {
      evento.stopPropagation();
      sumarCapitulo(obra.id);
    });
  }

  nodo.querySelector('.tarjeta-obra__cuerpo').addEventListener('click', () => abrirFormulario(obra.id));

  return nodo;
}

// --- Avisos (Deshacer) y banner persistente ---

function mostrarBanner(texto) {
  el.bannerTexto.textContent = texto;
  el.banner.hidden = false;
}

function mostrarAviso(texto, { textoBoton = null, alHacerClic = null, duracionMs = 5000 } = {}) {
  if (avisoTimeoutId) clearTimeout(avisoTimeoutId);
  el.avisoTexto.textContent = texto;
  if (textoBoton) {
    el.avisoBoton.textContent = textoBoton;
    el.avisoBoton.hidden = false;
    el.avisoBoton.onclick = () => {
      ocultarAviso();
      alHacerClic?.();
    };
  } else {
    el.avisoBoton.hidden = true;
    el.avisoBoton.onclick = null;
  }
  el.aviso.hidden = false;
  avisoTimeoutId = setTimeout(ocultarAviso, duracionMs);
}

function ocultarAviso() {
  el.aviso.hidden = true;
  if (avisoTimeoutId) {
    clearTimeout(avisoTimeoutId);
    avisoTimeoutId = null;
  }
}

// --- Sumar un capítulo (HU-06, HU-07, HU-08) ---

function sumarCapitulo(id) {
  const obra = datos.obras.find((o) => o.id === id);
  if (!obra) return;

  const resultado = Obras.sumarCapitulo(obra);
  if (!resultado.ok) {
    mostrarAviso(resultado.error);
    return;
  }

  const datosAnteriores = datos;
  const obraAnterior = obra;
  datos = {
    ...datos,
    obras: datos.obras.map((o) => (o.id === id ? resultado.obra : o)),
  };

  if (!persistir(datosAnteriores)) return;

  render(); // RN-06: usa el mismo ordenActual, la tarjeta no cambia de lugar

  const pasoAPausaALeyendo = obraAnterior.estado === Obras.ESTADOS.PAUSA;
  const mensaje = pasoAPausaALeyendo
    ? `«${obra.titulo}» volvió a Leyendo · Cap. ${resultado.obra.capitulo}`
    : `«${obra.titulo}» · Cap. ${resultado.obra.capitulo}`;

  mostrarAviso(mensaje, {
    textoBoton: 'Deshacer',
    alHacerClic: () => deshacerSumaCapitulo(id, obraAnterior),
  });
}

function deshacerSumaCapitulo(id, obraAnterior) {
  const datosAnteriores = datos;
  datos = { ...datos, obras: datos.obras.map((o) => (o.id === id ? obraAnterior : o)) };
  if (!persistir(datosAnteriores)) return;
  render();
}

// --- Formulario: agregar / editar (HU-01, HU-03, HU-04, HU-05) ---

let obraEnEdicionId = null;
let huboCambiosEnFormulario = false;

function limpiarErrores() {
  el.errorTituloTexto.textContent = '';
  el.errorCapitulo.textContent = '';
  el.errorEnlace.textContent = '';
  el.botonVerObra.hidden = true;
  el.botonVerObra.onclick = null;
}

function abrirFormulario(id = null) {
  if (soloLectura) {
    mostrarAviso('Esta copia de Viñeta está desactualizada. Recarga para seguir editando.');
    return;
  }
  obraEnEdicionId = id;
  huboCambiosEnFormulario = false;
  limpiarErrores();

  const obra = id ? datos.obras.find((o) => o.id === id) : null;

  el.tituloDialogo.textContent = obra ? 'Editar obra' : 'Agregar obra';
  el.campoId.value = obra?.id ?? '';
  el.campoTitulo.value = obra?.titulo ?? '';
  el.campoCapitulo.value = obra ? String(obra.capitulo) : '';
  el.campoEstado.value = obra?.estado ?? Obras.ESTADOS.LEYENDO;
  el.campoEnlace.value = obra?.enlace ?? '';
  el.botonEliminar.hidden = !obra;

  el.dialogoObra.showModal();
  el.campoTitulo.focus();
}

function cerrarFormularioConConfirmacion() {
  if (huboCambiosEnFormulario && !confirm('¿Descartar los cambios?')) {
    return;
  }
  el.dialogoObra.close();
}

function guardarFormulario(evento) {
  evento.preventDefault();
  limpiarErrores();

  const valores = {
    titulo: el.campoTitulo.value,
    capitulo: el.campoCapitulo.value,
    estado: el.campoEstado.value,
    enlace: el.campoEnlace.value,
  };

  if (obraEnEdicionId) {
    guardarEdicion(obraEnEdicionId, valores);
  } else {
    guardarNueva(valores);
  }
}

function mostrarErroresDeValidacion(resultado) {
  const error = resultado.error;
  if (resultado.obraExistenteId) {
    el.errorTituloTexto.textContent = error;
    el.botonVerObra.hidden = false;
    el.botonVerObra.onclick = () => {
      el.dialogoObra.close();
      abrirFormulario(resultado.obraExistenteId);
    };
  } else if (error.includes('capítulo')) {
    el.errorCapitulo.textContent = error;
  } else if (error.includes('enlace') || error.includes('http')) {
    el.errorEnlace.textContent = error;
  } else {
    el.errorTituloTexto.textContent = error;
  }
}

function guardarNueva(valores) {
  const resultado = Obras.crearObra(valores, datos.obras);
  if (!resultado.ok) {
    mostrarErroresDeValidacion(resultado);
    return;
  }

  const datosAnteriores = datos;
  datos = { ...datos, obras: [...datos.obras, resultado.obra] };
  if (!persistir(datosAnteriores)) return;

  el.dialogoObra.close();
  recomputarOrden();
  avisarSiQuedaFueraDelFiltro(resultado.obra);
  render();
}

function guardarEdicion(id, valores) {
  const obraOriginal = datos.obras.find((o) => o.id === id);
  const otras = datos.obras.filter((o) => o.id !== id);
  const resultado = Obras.crearObra(valores, otras, obraOriginal.creadaEn);
  if (!resultado.ok) {
    mostrarErroresDeValidacion(resultado);
    return;
  }

  const cambioAlgo =
    resultado.obra.titulo !== obraOriginal.titulo ||
    resultado.obra.capitulo !== obraOriginal.capitulo ||
    resultado.obra.estado !== obraOriginal.estado ||
    resultado.obra.enlace !== obraOriginal.enlace;

  const obraFinal = {
    ...resultado.obra,
    id: obraOriginal.id,
    creadaEn: obraOriginal.creadaEn,
    actualizadaEn: cambioAlgo ? new Date().toISOString() : obraOriginal.actualizadaEn,
  };

  const datosAnteriores = datos;
  datos = { ...datos, obras: datos.obras.map((o) => (o.id === id ? obraFinal : o)) };
  if (cambioAlgo && !persistir(datosAnteriores)) return;

  el.dialogoObra.close();
  recomputarOrden();
  if (cambioAlgo) avisarSiQuedaFueraDelFiltro(obraFinal);
  render();
}

function avisarSiQuedaFueraDelFiltro(obra) {
  if (datos.filtro !== 'todas' && obra.estado !== datos.filtro) {
    mostrarAviso(`«${obra.titulo}» se guardó en ${textoEstado(obra.estado)}`, {
      textoBoton: 'Ver',
      alHacerClic: () => aplicarFiltro(obra.estado),
    });
  }
}

// --- Eliminar (HU-04) ---

function pedirConfirmacionDeEliminar() {
  const obra = datos.obras.find((o) => o.id === obraEnEdicionId);
  if (!obra) return;
  el.textoConfirmar.textContent = `¿Eliminar «${obra.titulo}»? Esta acción no se puede deshacer.`;
  el.dialogoObra.close();
  el.dialogoConfirmar.showModal();
}

function eliminarObraConfirmada() {
  const id = obraEnEdicionId;
  const datosAnteriores = datos;
  datos = { ...datos, obras: datos.obras.filter((o) => o.id !== id) };
  el.dialogoConfirmar.close();
  if (!persistir(datosAnteriores)) return;
  recomputarOrden();
  render();
}

// --- Eventos ---

function registrarEventos() {
  el.botonAgregar.addEventListener('click', () => abrirFormulario());
  el.botonCancelar.addEventListener('click', cerrarFormularioConConfirmacion);
  el.formulario.addEventListener('input', () => {
    huboCambiosEnFormulario = true;
  });
  el.formulario.addEventListener('submit', guardarFormulario);
  el.dialogoObra.addEventListener('cancel', (evento) => {
    // Tecla Escape o botón "atrás": misma confirmación que Cancelar.
    if (huboCambiosEnFormulario) {
      evento.preventDefault();
      cerrarFormularioConConfirmacion();
    }
  });

  el.botonEliminar.addEventListener('click', pedirConfirmacionDeEliminar);
  el.confirmarCancelar.addEventListener('click', () => el.dialogoConfirmar.close());
  el.confirmarAceptar.addEventListener('click', eliminarObraConfirmada);

  for (const boton of el.filtros.querySelectorAll('.filtros__boton')) {
    boton.addEventListener('click', () => aplicarFiltro(boton.dataset.filtro));
  }
}

// --- Service worker (offline + aviso de versión nueva, CB-04/CB-05) ---

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then((registro) => {
    registro.addEventListener('updatefound', () => {
      const nuevo = registro.installing;
      if (!nuevo) return;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarBanner('Hay una versión nueva de Viñeta.');
          el.bannerBoton.textContent = 'Actualizar';
          el.bannerBoton.hidden = false;
          el.bannerBoton.onclick = () => nuevo.postMessage('SALTAR_ESPERA');
        }
      });
    });
  });

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    window.location.reload();
  });
}

// --- Ir ---

iniciar();
