// Contenido de la tienda (RF27; v1.3.0 CR-02): editor con casillas visibles,
// vista previa en vivo (borrador o publicado, sección o página completa,
// computador o celular), "Ver cambios" antes de publicar.
// Borrador/publicado y orden de secciones: dominio contenido (ADR de CR-01).
import { api, urlImagen, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { invalidarContenido } from '../../componentes/contenidoTienda.js';
import { CONFIG } from '../../config.js';
import {
  esc, avisar, ic, ib, SPIN, acciones, abrirDrawer, cerrarDrawer, confirmarAccion, contador,
} from '../../componentes/adminUI.js';

const CAMPOS = {
  portada: [['etiqueta', 'Etiqueta', 40], ['titulo', 'Título', 120], ['resaltado', 'Texto resaltado', 40], ['subtitulo', 'Subtítulo', 300, true], ['boton', 'Botón principal', 40], ['enlace_secundario', 'Enlace secundario', 60]],
  escena: [],
  coleccion: [['titulo', 'Título', 120], ['texto', 'Texto', 300, true]],
  banner: [['titulo', 'Título', 120], ['texto', 'Texto', 300, true], ['boton', 'Texto del botón', 40], ['enlace', 'Destino del botón', 200]],
  personaliza: [['titulo', 'Título', 120], ['texto', 'Texto', 300, true], ['boton', 'Texto del botón', 40]],
  catalogo: [['titulo', 'Título', 120], ['cantidad', 'Productos a mostrar', 'num']],
  nosotros: [['titulo', 'Título', 120], ['texto', 'Texto', 500, true]],
};
const ENLACE = /^(#\/[\w\-/?=&.]*|https:\/\/[^\s<>"']+)$/;
const s = { sel: 'portada', form: null, dirty: false, vista: 'borrador', disp: 'escritorio', alcance: 'seccion' };
const copia = (x) => JSON.parse(JSON.stringify(x));
const MUG = '<svg viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" fill="#F3F6EF"/><path d="M18 26h36v24a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14z" fill="#B7C5A4"/><path d="M54 31h4a8 8 0 0 1 0 16h-4" fill="none" stroke="#B7C5A4" stroke-width="5" stroke-linecap="round"/></svg>';

export async function render(app) {
  const cont = adminLayout(app, '/admin/contenido');
  let bloques = []; let productos = [];

  const bloque = (k) => bloques.find((b) => b.clave === k);
  const secciones = (ver = 'borrador') => bloques.filter((b) => b.tipo === 'seccion').sort((a, b) => (a[ver].orden ?? 0) - (b[ver].orden ?? 0));
  const ordenCambiado = () => secciones('borrador').map((b) => b.clave).join() !== secciones('publicado').map((b) => b.clave).join();
  const pendiente = (b) => JSON.stringify({ v: b.borrador.visible, d: b.borrador.datos }) !== JSON.stringify({ v: b.publicado.visible, d: b.publicado.datos });
  const nCambios = () => bloques.filter(pendiente).length + (ordenCambiado() ? 1 : 0);
  function asegurarForm() {
    const b = bloque(s.sel);
    if (!s.form || s.form.clave !== b.clave) { s.form = { clave: b.clave, visible: b.borrador.visible !== false, datos: copia(b.borrador.datos) }; s.dirty = false; }
    return s.form;
  }

  function seccionPrev(clave, visible, d, hl) {
    let h = '';
    const im = (src) => `<img src="${esc(urlImagen(src))}" alt="">`;
    if (clave === 'portada') h = `<div class="pv-hero"><div>${d.etiqueta ? `<span class="tag">${esc(d.etiqueta)}</span>` : ''}<h3>${esc(d.titulo)} <mark>${esc(d.resaltado)}</mark></h3><p>${esc(d.subtitulo)}</p><span class="pv-btn">${esc(d.boton)}</span> <span style="font-size:12px;font-weight:700;color:var(--verde);margin-left:8px">${esc(d.enlace_secundario)} →</span></div><div class="art">${d.imagen ? im(d.imagen) : MUG}</div></div>`;
    else if (clave === 'banner') h = `<div class="pv-band"><div><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p></div><span class="pv-btn">${esc(d.boton)}</span>${d.imagen ? im(d.imagen) : ''}</div>`;
    else if (clave === 'escena') h = `<div style="display:flex;align-items:center;gap:14px;color:var(--tinta-2)"><span style="width:72px;flex:none">${MUG}</span><span style="font-size:12.5px">Escena animada de un mug. No tiene textos: solo se muestra, se oculta o cambia de lugar.</span></div>`;
    else if (clave === 'catalogo') h = `<p class="pv-h">${esc(d.titulo)}</p><div class="pv-prods">${productos.slice(0, d.cantidad || 4).map((p) => `<div><span>${p.imagen ? im(p.imagen) : MUG}</span><b>${esc(p.nombre)}</b></div>`).join('')}</div>`;
    else h = `<p class="pv-h">${esc(d.titulo)}</p><p class="pv-t">${esc(d.texto)}</p>${d.boton ? `<span class="pv-btn">${esc(d.boton)}</span>` : ''}`;
    return `<div class="pv-sec ${hl ? 'hl' : ''} ${visible === false ? 'oculta' : ''}">${visible === false ? '<span class="flag tag">Oculta</span>' : ''}${h}</div>`;
  }
  function previewHtml() {
    const f = asegurarForm(), pub = s.vista === 'publicado';
    const de = (b) => (pub ? b.publicado : b.clave === f.clave ? { visible: f.visible, datos: f.datos } : b.borrador);
    let cuerpo;
    if (s.alcance === 'pagina' && f.clave !== 'nosotros') {
      cuerpo = secciones(pub ? 'publicado' : 'borrador').filter((b) => !pub || b.publicado.visible !== false).map((b) => { const x = de(b); return seccionPrev(b.clave, x.visible, x.datos, b.clave === f.clave && !pub); }).join('');
    } else { const b = bloque(f.clave), x = de(b); cuerpo = seccionPrev(b.clave, x.visible, x.datos, false); }
    return `<div class="pv-wrap ${s.disp}"><div class="pv"><div class="pv-bar"><i></i><i></i><i></i><span style="margin-left:6px">${esc(CONFIG.NOMBRE)} · ${f.clave === 'nosotros' ? 'Nosotros' : 'Inicio'} · ${pub ? 'lo que ven hoy los clientes' : 'borrador'}</span></div><div class="pv-nav">${esc(CONFIG.NOMBRE.toLowerCase())}<span><b>Inicio</b><b>Catálogo</b><b>Personalizados</b><b>Nosotros</b></span></div>${cuerpo}</div></div>`;
  }
  function editorHtml() {
    const f = asegurarForm(), b = bloque(f.clave), campos = CAMPOS[f.clave] || [];
    return `<div class="card-h"><h2>${esc(b.nombre)}</h2>${pendiente(b) ? '<span class="st st-borrador">En borrador</span>' : '<span class="tag">Publicado</span>'}</div>
      <div class="card-b"><div class="form">
        ${b.tipo === 'seccion' ? `<label class="sw"><input type="checkbox" data-in="vis" ${f.visible ? 'checked' : ''}>Mostrar esta sección en la tienda</label>` : ''}
        ${campos.map(([k, l, max, area]) => (max === 'num'
    ? `<div class="fld"><label for="ce-${k}">${l}</label><div class="num-step" style="justify-content:flex-start">${ib('minus', 'Mostrar uno menos', 'num', 'data-d="-1"', 'outline', f.datos[k] <= 2)}<input id="ce-${k}" class="inp" type="number" min="2" max="8" value="${f.datos[k]}" data-in="campo" data-k="${k}" style="width:70px;text-align:center">${ib('plus', 'Mostrar uno más', 'num', 'data-d="1"', 'outline', f.datos[k] >= 8)}<span class="muted" style="font-size:12px">entre 2 y 8</span></div></div>`
    : `<div class="fld"><label for="ce-${k}"><span>${l}</span><span class="cnt">${String(f.datos[k] ?? '').length}/${max}</span></label>${area ? `<textarea id="ce-${k}" maxlength="${max}" data-in="campo" data-k="${k}">${esc(f.datos[k])}</textarea>` : `<input id="ce-${k}" type="text" maxlength="${max}" value="${esc(f.datos[k])}" data-in="campo" data-k="${k}">`}${k === 'enlace' ? '<span class="help">Una página de la tienda (#/catalogo) o una dirección https://</span><span class="errm">Usa una página de la tienda (#/catalogo) o una dirección https://</span>' : k === 'titulo' ? '<span class="errm">El título no puede quedar vacío.</span>' : ''}</div>`)).join('')}
        ${b.admite_imagen ? `<div class="fld"><label>Imagen</label><div class="drop" id="cDrop"><span class="pic">${f.datos.imagen ? `<img src="${esc(urlImagen(f.datos.imagen))}" alt="">` : MUG}</span><div class="tx"><b style="color:var(--tinta);font-size:13px">${f.datos.imagen ? 'Imagen cargada en el borrador' : 'Ilustración por defecto'}</b><span style="font-size:12px">JPG, PNG o WEBP, máximo 5 MB. Se guarda en el borrador al subirla.</span><span class="acts-d"><label class="btn btn-sec btn-sm" for="cFile" style="cursor:pointer">${ic('upload', 14)}${f.datos.imagen ? 'Reemplazar' : 'Subir imagen'}</label>${f.datos.imagen ? '<button type="button" class="btn btn-sec btn-sm" data-act="quitar-img">Quitar</button>' : ''}</span><input id="cFile" type="file" accept="image/jpeg,image/png,image/webp" class="sr"></div></div></div>` : ''}
        ${!campos.length && !b.admite_imagen ? `<div class="note">${ic('info', 16)}<span>Esta sección no tiene textos editables: puedes mostrarla, ocultarla o moverla en la lista.</span></div>` : ''}
      </div></div>
      <div class="ed-f"><span class="state ${s.dirty ? 'dirty' : ''}" id="edState">${s.dirty ? `${ic('clock', 14, 2)}Cambios sin guardar` : `${ic('check', 14, 2)}Todo guardado en el borrador`}</span>
        <button type="button" class="btn btn-sec" data-act="revertir" ${s.dirty ? '' : 'disabled'}>Descartar</button>
        <button type="button" class="btn btn-green" data-act="guardar" ${s.dirty ? '' : 'disabled'}>Guardar en borrador</button></div>`;
  }
  function pintar() {
    asegurarForm();
    const n = nCambios(), secc = secciones();
    const item = (x, i, ultimo) => { const vis = x.clave === s.sel ? s.form.visible : x.borrador.visible !== false; return `<li ${x.clave === s.sel ? 'aria-current="true"' : ''} class="${vis ? '' : 'off'}">
      <button type="button" class="pick" data-act="sel" data-k="${x.clave}"><span class="ord">${i == null ? '' : i + 1}</span><span class="nm">${esc(x.nombre)}</span>${vis ? '' : ic('eye-off', 14)}${pendiente(x) || (x.clave === s.sel && s.dirty) ? '<span class="dotp" data-tip="Tiene cambios sin publicar"></span>' : ''}</button>
      ${i == null ? '' : ib('up', `Subir ${x.nombre}`, 'mover', `data-k="${x.clave}" data-d="-1"`, '', i === 0) + ib('down', `Bajar ${x.nombre}`, 'mover', `data-k="${x.clave}" data-d="1"`, '', ultimo)}</li>`; };
    cont.innerHTML = `
      ${encabezadoAdmin('Contenido de la tienda', 'Edita textos e imágenes, mira el resultado al lado y publica cuando esté listo. Los clientes solo ven lo publicado.',
        `${n ? `<span class="st st-borrador" style="margin-right:4px">${n} ${n === 1 ? 'cambio' : 'cambios'} sin publicar</span>` : '<span class="muted" style="font-size:12.5px;margin-right:6px">La tienda está al día</span>'}
         <button type="button" class="btn btn-sec" data-act="diff" ${n ? '' : 'disabled'}>${ic('diff', 16)}Ver cambios</button>
         ${ib('ext', 'Abrir la vista previa completa en otra pestaña', 'abrir-previa')}
         ${ib('undo', 'Descartar todo el borrador', 'descartar', '', '', !n)}
         <button class="btn btn-pri" type="button" data-act="publicar" ${n ? '' : 'disabled'}>Publicar</button>`)}
      <div class="ed-grid">
        <section class="card"><div class="card-h"><h2>Página de Inicio</h2></div>
          <ul class="blk-list" aria-label="Secciones de Inicio en orden">${secc.map((x, i) => item(x, i, i === secc.length - 1)).join('')}</ul>
          <div class="card-h" style="padding-top:4px;min-height:36px"><h2>Otras páginas</h2></div>
          <ul class="blk-list">${bloques.filter((b) => b.tipo !== 'seccion').map((x) => item(x, null)).join('')}</ul></section>
        <section class="card ed-card" id="editor">${editorHtml()}</section>
        <section class="card pv-col"><div class="card-h"><h2>Vista previa</h2><span class="muted" style="font-size:12px">se actualiza mientras escribes</span></div>
          <div class="pv-tools">
            <div class="seg" role="group" aria-label="Versión">${[['borrador', 'Borrador'], ['publicado', 'Publicado']].map(([v, t]) => `<button type="button" data-act="vista" data-v="${v}" aria-pressed="${s.vista === v}">${t}</button>`).join('')}</div>
            <div class="seg" role="group" aria-label="Alcance">${[['seccion', 'Sección'], ['pagina', 'Página completa']].map(([v, t]) => `<button type="button" data-act="alcance" data-v="${v}" aria-pressed="${s.alcance === v}" ${v === 'pagina' && bloque(s.sel).tipo !== 'seccion' ? 'disabled' : ''}>${t}</button>`).join('')}</div>
            <div class="seg" role="group" aria-label="Dispositivo">${[['escritorio', 'desktop', 'Computador'], ['movil', 'phone', 'Celular']].map(([v, i, t]) => `<button type="button" data-act="disp" data-v="${v}" aria-pressed="${s.disp === v}" aria-label="${t}" data-tip="${t}">${ic(i, 15)}</button>`).join('')}</div>
          </div>
          <div class="pv-stage" id="pvStage">${previewHtml()}</div></section>
      </div>`;
    enlazar();
  }
  function estadoEditor() {
    const st = cont.querySelector('#edState'); if (!st) return;
    st.className = `state ${s.dirty ? 'dirty' : ''}`;
    st.innerHTML = s.dirty ? `${ic('clock', 14, 2)}Cambios sin guardar` : `${ic('check', 14, 2)}Todo guardado en el borrador`;
    cont.querySelectorAll('#editor .ed-f .btn').forEach((b) => { b.disabled = !s.dirty; });
  }
  function enlazar() {
    cont.querySelectorAll('#editor [data-in]').forEach((el) => el.addEventListener('input', () => {
      if (el.dataset.in === 'vis') s.form.visible = el.checked;
      else { const k = el.dataset.k; s.form.datos[k] = k === 'cantidad' ? Math.max(2, Math.min(8, Number(el.value) || 2)) : el.value; contador(el); el.closest('.fld')?.classList.remove('bad'); }
      s.dirty = true; estadoEditor(); cont.querySelector('#pvStage').innerHTML = previewHtml();
    }));
    const inp = cont.querySelector('#cFile'), drop = cont.querySelector('#cDrop');
    if (!inp) return;
    const subir = async (file) => {
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { avisar('La imagen debe ser JPG, PNG o WEBP de máximo 5 MB.', 'danger'); return; }
      const fd = new FormData(); fd.append('imagen', file);
      try { const r = await api(`/admin/contenido/${s.sel}/imagen`, { metodo: 'POST', formData: fd }); bloques = r.bloques; s.form.datos.imagen = bloque(s.sel).borrador.datos.imagen; avisar('Imagen cargada en el borrador.'); pintar(); } catch (e) { avisar(textoError(e), 'danger'); }
    };
    inp.addEventListener('change', () => subir(inp.files[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); subir(e.dataTransfer.files[0]); });
  }
  function diffHtml() {
    const lab = (cl, k) => (CAMPOS[cl].find((x) => x[0] === k) || [k, k === 'imagen' ? 'Imagen' : k])[1];
    const fmt = (k, v) => (k === 'imagen' ? (v ? 'imagen cargada' : 'ilustración por defecto') : v === '' || v == null ? '(vacío)' : String(v));
    let out = '';
    bloques.filter(pendiente).forEach((b) => {
      const items = [];
      if ((b.borrador.visible !== false) !== (b.publicado.visible !== false)) items.push(['Visible', b.publicado.visible !== false ? 'Sí' : 'No', b.borrador.visible !== false ? 'Sí' : 'No']);
      Object.keys(b.borrador.datos).forEach((k) => { if (JSON.stringify(b.borrador.datos[k]) !== JSON.stringify(b.publicado.datos[k])) items.push([lab(b.clave, k), fmt(k, b.publicado.datos[k]), fmt(k, b.borrador.datos[k])]); });
      if (items.length) out += `<p class="sec-t">${esc(b.nombre)}</p><ul class="diff">${items.map(([k, a, n]) => `<li><span class="k">${esc(k)}</span><span><del>${esc(a)}</del></span><span><ins>${esc(n)}</ins></span></li>`).join('')}</ul>`;
    });
    if (ordenCambiado()) out += `<p class="sec-t">Orden de las secciones de Inicio</p><ul class="diff"><li><span class="k">Antes</span><del>${secciones('publicado').map((b) => esc(b.nombre)).join(' → ')}</del></li><li><span class="k">Ahora</span><ins>${secciones('borrador').map((b) => esc(b.nombre)).join(' → ')}</ins></li></ul>`;
    return out || '<p class="muted">No hay cambios.</p>';
  }
  async function cargar() {
    const [c, p] = await Promise.all([api('/admin/contenido'), api('/productos').catch(() => [])]);
    bloques = c.bloques; productos = p;
  }

  acciones({
    sel: (el) => {
      const k = el.dataset.k; if (k === s.sel) return;
      const ir = () => { s.sel = k; s.form = null; if (bloque(k).tipo !== 'seccion') s.alcance = 'seccion'; pintar(); cont.querySelector(`[data-act="sel"][data-k="${k}"]`)?.focus(); };
      if (!s.dirty) return ir();
      confirmarAccion({ titulo: 'Tienes cambios sin guardar', icono: 'clock', ok: 'Descartar y continuar', texto: `Los cambios en <b>${esc(bloque(s.sel).nombre)}</b> no se han guardado en el borrador.` }, async () => ir());
    },
    mover: async (el) => {
      const lista = secciones().map((b) => b.clave); const i = lista.indexOf(el.dataset.k); const j = i + Number(el.dataset.d);
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      try { bloques = (await api('/admin/contenido/orden', { metodo: 'PUT', cuerpo: { orden: lista } })).bloques; pintar(); cont.querySelector(`[data-act="mover"][data-k="${el.dataset.k}"][data-d="${el.dataset.d}"]:not(:disabled)`)?.focus(); } catch (e) { avisar(textoError(e), 'danger'); }
    },
    vista: (el) => { s.vista = el.dataset.v; pintar(); },
    alcance: (el) => { s.alcance = el.dataset.v; pintar(); },
    disp: (el) => { s.disp = el.dataset.v; pintar(); },
    num: (el) => { s.form.datos.cantidad = Math.max(2, Math.min(8, Number(s.form.datos.cantidad) + Number(el.dataset.d))); s.dirty = true; cont.querySelector('#editor').innerHTML = editorHtml(); enlazar(); cont.querySelector('#pvStage').innerHTML = previewHtml(); },
    'quitar-img': async () => { try { bloques = (await api(`/admin/contenido/${s.sel}/imagen`, { metodo: 'DELETE' })).bloques; s.form.datos.imagen = null; avisar('Imagen quitada del borrador.'); pintar(); } catch (e) { avisar(textoError(e), 'danger'); } },
    revertir: () => { s.form = null; s.dirty = false; pintar(); avisar('Cambios descartados.', 'warning'); },
    guardar: async (el) => {
      const f = s.form; let ok = true;
      if (f.datos.titulo !== undefined && !String(f.datos.titulo).trim()) { cont.querySelector('#ce-titulo')?.closest('.fld').classList.add('bad'); ok = false; }
      if (f.datos.enlace !== undefined && !ENLACE.test(String(f.datos.enlace).trim())) { cont.querySelector('#ce-enlace')?.closest('.fld').classList.add('bad'); ok = false; }
      if (!ok) return;
      el.disabled = true; el.innerHTML = `${SPIN()}Guardando…`;
      const datos = {}; (CAMPOS[f.clave] || []).forEach(([k]) => { datos[k] = f.datos[k]; });
      const cuerpo = { datos }; if (bloque(f.clave).tipo === 'seccion') cuerpo.visible = f.visible;
      try { bloques = (await api(`/admin/contenido/${f.clave}`, { metodo: 'PATCH', cuerpo })).bloques; s.form = null; s.dirty = false; pintar(); avisar('Guardado en el borrador. Los clientes no lo ven hasta que publiques.'); }
      catch (e) { el.disabled = false; el.textContent = 'Guardar en borrador'; avisar(textoError(e), 'danger'); }
    },
    diff: () => abrirDrawer({ titulo: 'Cambios sin publicar', sub: 'Así cambiará lo que ven los clientes', cuerpo: diffHtml, pie: () => '<button class="btn btn-sec" type="button" data-act="dr-close">Cerrar</button><button class="btn btn-pri" type="button" data-act="publicar">Publicar</button>' }),
    'abrir-previa': () => window.open(`${location.pathname}#/${bloque(s.sel).clave === 'nosotros' ? 'nosotros' : ''}?vista=borrador`, '_blank', 'noopener'),
    publicar: () => {
      if (s.dirty) { avisar('Guarda o descarta primero los cambios de la sección que estás editando.', 'warning'); return; }
      const lista = bloques.filter(pendiente).map((b) => b.nombre).concat(ordenCambiado() ? ['Orden de secciones'] : []);
      confirmarAccion({ titulo: 'Publicar cambios', icono: 'layout', ok: 'Publicar', texto: `Los clientes verán de inmediato: <b>${lista.map(esc).join(', ')}</b>.` },
        async () => { bloques = (await api('/admin/contenido/publicar', { metodo: 'POST' })).bloques; invalidarContenido(); cerrarDrawer(); pintar(); avisar('Cambios publicados en la tienda.'); });
    },
    descartar: () => confirmarAccion({ titulo: 'Descartar todo el borrador', peligro: true, icono: 'undo', ok: 'Descartar', texto: 'Se pierden todos los cambios sin publicar y el contenido vuelve a lo que ven hoy los clientes.' },
      async () => { bloques = (await api('/admin/contenido/descartar', { metodo: 'POST' })).bloques; s.form = null; s.dirty = false; pintar(); avisar('Borrador descartado.'); }),
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:220px"></div>';
  try { await cargar(); pintar(); } catch (error) { cont.innerHTML = `${encabezadoAdmin('Contenido de la tienda')}<div class="note err">${ic('alert', 16, 2)}<span>${esc(textoError(error))}</span></div>`; }
}
