// Contenido de la tienda: textos, imágenes, orden y visibilidad de las
// secciones de Inicio y de la página Nosotros, con borrador y publicación.
import { api, urlImagen, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, cargando, alerta, avisar, confirmar } from '../../componentes/ui.js';
import { invalidarContenido } from '../../componentes/contenidoTienda.js';

// Campos editables por bloque: [campo, etiqueta, tipo, máximo].
const CAMPOS = {
  portada: [['titulo', 'Título', 'texto', 120], ['resaltado', 'Palabra resaltada (debe aparecer en el título)', 'texto', 40],
    ['subtitulo', 'Subtítulo', 'area', 300], ['boton', 'Texto del botón principal', 'texto', 40],
    ['enlace_secundario', 'Texto del enlace a personalizados', 'texto', 60], ['etiqueta', 'Etiqueta junto al mug', 'texto', 40]],
  escena: [],
  coleccion: [['titulo', 'Título', 'texto', 120], ['texto', 'Texto', 'area', 300]],
  banner: [['titulo', 'Título', 'texto', 120], ['texto', 'Texto', 'area', 300], ['boton', 'Texto del botón', 'texto', 40],
    ['enlace', 'Enlace del botón (#/catalogo, #/personalizados o https://…)', 'texto', 200]],
  personaliza: [['titulo', 'Título', 'texto', 120], ['texto', 'Texto', 'area', 300], ['boton', 'Texto del botón', 'texto', 40]],
  catalogo: [['titulo', 'Título', 'texto', 120], ['cantidad', 'Cuántos productos mostrar (2 a 8)', 'numero', 8]],
  nosotros: [['titulo', 'Título', 'texto', 120], ['texto', 'Texto', 'area', 500]],
};
const AYUDA = {
  escena: 'Sección animada con el mug que recibe su diseño al hacer scroll. Solo se puede mostrar u ocultar.',
  banner: 'Banner promocional opcional. Actívalo con el interruptor cuando tengas una promoción.',
};

export async function render(app) {
  const cont = adminLayout(app, '/admin/contenido');
  let estadoContenido = null;
  let seleccion = 'portada';

  cont.innerHTML = cargando('Cargando el contenido…');

  async function cargar() {
    estadoContenido = await api('/admin/contenido');
  }

  const bloque = (clave) => estadoContenido.bloques.find((b) => b.clave === clave);
  const secciones = () => estadoContenido.bloques.filter((b) => b.tipo === 'seccion')
    .sort((a, b) => a.borrador.orden - b.borrador.orden);

  function campo([nombre, etiqueta, tipo, maximo], valor) {
    const id = `c-${nombre}`;
    if (tipo === 'area') return `<div class="mb-3"><label class="form-label" for="${id}">${etiqueta}</label><textarea id="${id}" name="${nombre}" class="form-control" rows="3" maxlength="${maximo}">${esc(valor ?? '')}</textarea></div>`;
    if (tipo === 'numero') return `<div class="mb-3"><label class="form-label" for="${id}">${etiqueta}</label><input id="${id}" name="${nombre}" class="form-control" type="number" min="2" max="${maximo}" step="1" value="${esc(valor ?? '')}" style="max-width:140px"></div>`;
    return `<div class="mb-3"><label class="form-label" for="${id}">${etiqueta}</label><input id="${id}" name="${nombre}" class="form-control" maxlength="${maximo}" value="${esc(valor ?? '')}"></div>`;
  }

  function pintar() {
    const pendientes = estadoContenido.cambios_pendientes;
    const b = bloque(seleccion);
    const datos = b.borrador.datos;
    const lista = secciones();
    cont.innerHTML = `
      ${encabezadoAdmin('Contenido de la tienda', 'Textos e imágenes que ven los clientes. Los cambios quedan en borrador hasta que los publiques.',
        `<span class="mg-borrador ${pendientes ? '' : 'ok'}" role="status">${pendientes ? `${pendientes} ${pendientes === 1 ? 'bloque con cambios sin publicar' : 'bloques con cambios sin publicar'}` : 'Todo publicado'}</span>
         <button class="btn btn-outline-secondary" type="button" data-accion="descartar" ${pendientes ? '' : 'disabled'}>Descartar borrador</button>
         <button class="btn btn-primary" type="button" data-accion="publicar" ${pendientes ? '' : 'disabled'}>Publicar cambios</button>`)}
      <div class="mg-contenido">
        <aside class="mg-panel">
          <div class="mg-panel-cab"><h2>Secciones de Inicio</h2></div>
          <ol class="mg-secciones">
            ${lista.map((s, i) => `
              <li class="${s.clave === seleccion ? 'sel' : ''}">
                <button type="button" class="nombre" data-ver="${s.clave}" ${s.clave === seleccion ? 'aria-current="true"' : ''}>${esc(s.nombre)}</button>
                ${s.pendiente ? '<span class="punto" title="Cambios sin publicar"></span>' : ''}
                <button type="button" class="btn btn-light mover" data-mover="${s.clave}" data-dir="-1" aria-label="Subir ${esc(s.nombre)}" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="btn btn-light mover" data-mover="${s.clave}" data-dir="1" aria-label="Bajar ${esc(s.nombre)}" ${i === lista.length - 1 ? 'disabled' : ''}>↓</button>
                <span class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" data-visible="${s.clave}" ${s.borrador.visible ? 'checked' : ''} aria-label="Mostrar ${esc(s.nombre)}"></span>
              </li>`).join('')}
          </ol>
          <div class="mg-panel-cab mt-3"><h2>Páginas</h2></div>
          <ol class="mg-secciones">
            <li class="${seleccion === 'nosotros' ? 'sel' : ''}"><button type="button" class="nombre" data-ver="nosotros">Nosotros</button>${bloque('nosotros').pendiente ? '<span class="punto" title="Cambios sin publicar"></span>' : ''}</li>
          </ol>
          <p class="mg-nota mb-0">Las flechas cambian el orden y el interruptor muestra u oculta la sección.</p>
        </aside>

        <div class="d-grid gap-3">
          <section class="mg-panel">
            <div class="mg-panel-cab"><h2>${esc(b.nombre)}</h2>${b.pendiente ? '<span class="mg-borrador">Sin publicar</span>' : ''}</div>
            ${AYUDA[seleccion] ? `<p class="text-suave">${AYUDA[seleccion]}</p>` : ''}
            <form data-bloque="${seleccion}" novalidate>
              ${CAMPOS[seleccion].map((c) => campo(c, datos[c[0]])).join('')}
              ${b.admite_imagen ? `
                <div class="mb-3"><span class="form-label d-block">Imagen ${seleccion === 'portada' ? 'principal (reemplaza el mug ilustrado)' : 'del banner'}</span>
                  <div class="mg-imagen-campo">
                    ${datos.imagen ? `<img src="${esc(urlImagen(datos.imagen))}" alt="Imagen actual">` : '<span class="sin">Sin imagen</span>'}
                    <div class="flex-grow-1 small text-suave">JPG, PNG o WEBP · máximo 5 MB${seleccion === 'portada' ? ' · mejor con fondo transparente' : ''}</div>
                    <label class="btn btn-outline-primary btn-sm mb-0">Subir imagen<input type="file" accept="image/jpeg,image/png,image/webp" data-imagen hidden></label>
                    ${datos.imagen ? '<button class="btn btn-outline-secondary btn-sm" type="button" data-accion="quitar-imagen">Quitar</button>' : ''}
                  </div></div>` : ''}
              ${CAMPOS[seleccion].length ? '<button class="btn btn-primary" type="submit">Guardar en borrador</button>' : ''}
            </form>
          </section>
          <section class="mg-panel">
            <div class="mg-panel-cab"><h2>Vista previa del borrador</h2><a href="#/${seleccion === 'nosotros' ? 'nosotros' : ''}?vista=borrador" target="_blank" rel="noopener">Abrir en pantalla completa</a></div>
            <iframe title="Vista previa del borrador" src="#/${seleccion === 'nosotros' ? 'nosotros' : ''}?vista=borrador&t=${Date.now()}" style="width:100%;height:520px;border:1px solid var(--mg-borde);border-radius:14px;background:#fff" loading="lazy"></iframe>
          </section>
        </div>
      </div>`;
  }

  async function aplicar(promesa, mensaje) {
    try {
      estadoContenido = await promesa;
      invalidarContenido();  // la tienda vuelve a pedir lo publicado
      pintar();
      if (mensaje) avisar(mensaje);
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  }

  try {
    await cargar();
  } catch (error) {
    cont.innerHTML = alerta(textoError(error));
    return;
  }
  pintar();

  cont.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-bloque]');
    if (!form) return;
    ev.preventDefault();
    const clave = form.dataset.bloque;
    const datos = {};
    CAMPOS[clave].forEach(([nombre, , tipo]) => {
      const valor = form.querySelector(`[name="${nombre}"]`).value.trim();
      datos[nombre] = tipo === 'numero' ? Number(valor) : valor;
    });
    if (clave === 'portada' && datos.resaltado && !datos.titulo.includes(datos.resaltado)) {
      avisar('La palabra resaltada debe aparecer en el título.', 'warning');
      return;
    }
    if (datos.enlace && !/^(#\/|https:\/\/)/.test(datos.enlace)) {
      avisar('El enlace debe ser una ruta de la tienda (#/catalogo) o una dirección https://.', 'warning');
      return;
    }
    aplicar(api(`/admin/contenido/${clave}`, { metodo: 'PATCH', cuerpo: { datos } }), 'Guardado en borrador. Revisa la vista previa y publica cuando esté listo.');
  });

  cont.addEventListener('change', (ev) => {
    const sw = ev.target.closest('[data-visible]');
    if (sw) {
      aplicar(api(`/admin/contenido/${sw.dataset.visible}`, { metodo: 'PATCH', cuerpo: { visible: sw.checked } }),
        sw.checked ? 'Sección visible en el borrador.' : 'Sección oculta en el borrador.');
      return;
    }
    const archivo = ev.target.closest('[data-imagen]')?.files?.[0];
    if (archivo) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) { avisar('La imagen debe ser JPG, PNG o WEBP.', 'danger'); return; }
      if (archivo.size > 5 * 1024 * 1024) { avisar('La imagen supera el tamaño máximo de 5 MB.', 'danger'); return; }
      const datos = new FormData();
      datos.append('imagen', archivo);
      aplicar(api(`/admin/contenido/${seleccion}/imagen`, { metodo: 'POST', formData: datos }), 'Imagen cargada en el borrador.');
    }
  });

  cont.addEventListener('click', async (ev) => {
    const ver = ev.target.closest('[data-ver]');
    if (ver) { seleccion = ver.dataset.ver; pintar(); return; }

    const mover = ev.target.closest('[data-mover]');
    if (mover) {
      const orden = secciones().map((s) => s.clave);
      const i = orden.indexOf(mover.dataset.mover);
      const j = i + Number(mover.dataset.dir);
      [orden[i], orden[j]] = [orden[j], orden[i]];
      aplicar(api('/admin/contenido/orden', { metodo: 'PUT', cuerpo: { orden } }), 'Orden actualizado en el borrador.');
      return;
    }

    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    if (b.dataset.accion === 'publicar' && await confirmar('Publicar cambios', 'Los clientes verán el contenido del borrador desde ahora. ¿Publicar?', 'Publicar')) {
      aplicar(api('/admin/contenido/publicar', { metodo: 'POST' }), 'Cambios publicados en la tienda.');
    }
    if (b.dataset.accion === 'descartar' && await confirmar('Descartar borrador', 'Se perderán los cambios sin publicar y el borrador volverá a lo que ven los clientes.', 'Descartar', 'btn-danger')) {
      aplicar(api('/admin/contenido/descartar', { metodo: 'POST' }), 'Borrador descartado.');
    }
    if (b.dataset.accion === 'quitar-imagen') {
      aplicar(api(`/admin/contenido/${seleccion}/imagen`, { metodo: 'DELETE' }), 'Imagen quitada del borrador.');
    }
  });
}
