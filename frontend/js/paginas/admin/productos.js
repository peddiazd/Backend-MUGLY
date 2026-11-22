// Productos e inventario (v1.3.0, CR-02, RF30): referencia y tipo de mug,
// stock con − / + que guarda al confirmar el servidor (RF15), columna de
// inventario propia, tipos de mug administrables (RN26) y foto dentro de Editar.
import { api, urlImagen, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, avisar, ic, ib, vacio, sr, tipoMug, fecha, hora, diaISO, acciones, abrirPop, cerrarPop, itemMenu, abrirDrawer, drawerActual,
  cerrarDrawer, confirmarAccion, editarValor, fld, marcar, pieForm, opts, chipsHtml, filtroBtn,
} from '../../componentes/adminUI.js';

const DEF = { cat: 'todos', tipo: 'todos', inv: 'todos' };
const f = { q: '', ...DEF };
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/productos');
  if (query.bajo) Object.assign(f, DEF, { inv: 'alerta' });
  let productos = []; let tipos = []; let umbral = 3;
  const ui = {}; // estado del stepper por producto: { pend, st }
  const timers = {};

  const invEstado = (p) => (!p.disponible ? 'na' : p.cantidad_stock === 0 ? 'agotado' : p.cantidad_stock <= umbral ? 'bajo' : 'ok');
  const INV = { ok: 'Suficiente', bajo: 'Bajo', agotado: 'Agotado', na: 'No aplica' };
  function celdaInv(p) {
    const e = invEstado(p);
    if (e === 'na') return '<span class="faint" tabindex="0" data-tip="Retirado del catálogo: no genera alertas de inventario">No aplica</span>';
    if (e === 'ok') return `<span class="st st-activo" data-tip="Más de ${umbral} unidades">${ic('check', 14, 2)}Suficiente</span>`;
    if (e === 'bajo') return `<span class="st st-pendiente" tabindex="0" data-tip="Quedan ${p.cantidad_stock}. Con ${umbral} o menos conviene reponer pronto.">${ic('alert', 14, 2)}Bajo · reponer</span>`;
    return `<span class="st st-error" tabindex="0" data-tip="Sin unidades: los clientes no pueden comprarlo. Repón el stock o retíralo del catálogo.">${ic('ban', 14, 2)}Agotado</span>`;
  }
  function celdaStock(p) {
    const u = ui[p.id] || {}; const v = u.pend ?? p.cantidad_stock; const bloq = u.st === 'saving';
    const est = u.st === 'saving' ? `<span class="stk-state" data-tip="Guardando…">${ic('loader', 15, 2.2).replace('class="i"', 'class="i spin"')}</span>`
      : u.st === 'pending' ? `<span class="stk-state" data-tip="Cambio sin enviar todavía">${ic('clock', 14, 2)}</span>`
        : u.st === 'ok' ? `<span class="stk-state" style="color:var(--ok)" data-tip="Guardado">${ic('check', 15, 2.4)}</span>`
          : u.st === 'err' ? `<span class="stk-state" style="color:var(--err)" data-tip="No se guardó">${ic('alert', 15, 2)}</span>` : '<span class="stk-state"></span>';
    return `<div class="stk"><div class="stepper ${u.st || ''}" role="group" aria-label="Stock de ${esc(p.nombre)}">
      <button type="button" data-act="stock" data-id="${p.id}" data-d="-1" aria-label="Quitar una unidad" data-tip="Quitar una unidad" ${v <= 0 || bloq ? 'disabled' : ''}>${ic('minus', 14, 2.2)}</button>
      <button type="button" class="v" data-act="ajustar" data-id="${p.id}" aria-label="${v} unidades. Ajustar cantidad" data-tip="Ajustar cantidad (cambios grandes)" ${bloq ? 'disabled' : ''}>${v}</button>
      <button type="button" data-act="stock" data-id="${p.id}" data-d="1" aria-label="Agregar una unidad" data-tip="Agregar una unidad" ${bloq ? 'disabled' : ''}>${ic('plus', 14, 2.2)}</button></div>${est}</div>`;
  }
  const img = (p) => (p.imagen ? `<img src="${esc(urlImagen(p.imagen))}" alt="">` : ic('mug', 20));
  const filtrados = () => {
    const q = f.q.toLowerCase();
    return productos.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q) && !(p.referencia || '').toLowerCase().includes(q)) return false;
      if (f.cat === 'visibles' && !p.disponible) return false;
      if (f.cat === 'retirados' && p.disponible) return false;
      if (f.tipo !== 'todos' && String(p.tipo?.id) !== String(f.tipo)) return false;
      const e = invEstado(p);
      if (f.inv === 'alerta' && e !== 'bajo' && e !== 'agotado') return false;
      if (['ok', 'bajo', 'agotado'].includes(f.inv) && e !== f.inv) return false;
      return true;
    });
  };
  function tabla() {
    const l = filtrados();
    if (!l.length) return vacio(f.inv === 'alerta' ? 'check-c' : 'mug', f.inv === 'alerta' ? 'Ningún producto necesita reposición' : 'Ningún producto coincide', f.inv === 'alerta' ? `Todos los productos visibles tienen más de ${umbral} unidades.` : 'Prueba con otro nombre o referencia, o quita filtros.');
    return `<div class="tw"><table class="t"><thead><tr><th style="width:56px">Imagen</th><th>Referencia</th><th>Producto</th><th>Tipo</th><th class="num">Precio</th><th>Stock</th><th>Inventario</th><th>Catálogo</th><th class="ac">Acciones</th></tr></thead><tbody>
      ${l.map((p) => `<tr data-row="${p.id}" class="${drawerActual()?.ref === `pr${p.id}` ? 'sel' : ''}"><td><span class="thumb">${img(p)}</span></td><td><span class="ref">${esc(p.referencia) || sr}</span></td><td><b style="font-weight:600">${esc(p.nombre)}</b></td><td>${tipoMug(p.tipo?.nombre)}</td><td class="num">${moneda(p.precio)}</td>
        <td data-stock-cell="${p.id}">${celdaStock(p)}</td><td data-inv-cell="${p.id}">${celdaInv(p)}</td>
        <td>${p.disponible ? `<span class="st st-visible" data-tip="Los clientes lo ven en el catálogo">${ic('eye', 14, 2)}Visible</span>` : `<span class="st st-retirado" data-tip="Oculto del catálogo. Se conserva por sus pedidos.">${ic('eye-off', 14, 2)}Retirado</span>`}</td>
        <td class="ac"><div class="acts">${ib('eye', 'Ver producto', 'ver', `data-id="${p.id}"`)}${ib('dots', 'Más acciones', 'menu', `data-id="${p.id}" aria-haspopup="menu"`)}</div></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function pintar() {
    const alerta = productos.filter((p) => ['bajo', 'agotado'].includes(invEstado(p))).length;
    const fN = ['cat', 'tipo', 'inv'].filter((k) => f[k] !== 'todos').length;
    cont.innerHTML = `
      ${encabezadoAdmin('Productos e inventario', `${productos.length} productos · ${alerta ? `<b style="color:var(--warn)">${alerta} necesitan reposición</b>` : 'inventario al día'} · alerta con ${umbral} unidades o menos (se cambia en Configuración)`,
        `<button type="button" class="btn btn-sec" data-act="tipos">${ic('box', 16)}Tipos de mug</button>${ib('plus', 'Agregar producto', 'nuevo', '', 'add')}`)}
      <div class="tb">
        <div class="field-s">${ic('search', 16, 1.9)}<label class="sr" for="prq">Buscar producto</label><input id="prq" type="search" placeholder="Nombre o referencia" value="${esc(f.q)}" autocomplete="off"></div>
        ${filtroBtn('filtros', fN, 'Filtrar por catálogo, tipo e inventario')}
        ${chipsHtml('prod', [...(f.cat !== 'todos' ? [[`Catálogo: ${f.cat === 'visibles' ? 'Visibles' : 'Retirados'}`, 'cat']] : []), ...(f.tipo !== 'todos' ? [[`Tipo: ${tipos.find((t) => String(t.id) === String(f.tipo))?.nombre || ''}`, 'tipo']] : []), ...(f.inv !== 'todos' ? [[`Inventario: ${f.inv === 'alerta' ? 'Bajo o agotado' : INV[f.inv]}`, 'inv']] : [])])}
      </div>
      <section class="card" id="prodTabla">${tabla()}</section>
      <p class="muted" style="font-size:12px;margin:0;display:flex;gap:6px;align-items:center">${ic('info', 14)}Cada clic en + o − se envía al servidor; el número queda en gris hasta que el servidor confirma.</p>`;
    cont.querySelector('#prq').addEventListener('input', (e) => { f.q = e.target.value.trim(); cont.querySelector('#prodTabla').innerHTML = tabla(); });
  }
  async function cargar() {
    const [lista, t, cfg] = await Promise.all([api('/admin/productos'), api('/admin/tipos-producto'), api('/admin/configuracion')]);
    productos = lista.sort((a, b) => b.id - a.id); tipos = t; umbral = Number(cfg.umbral_inventario_bajo ?? 3);
  }
  const recargar = async () => { await cargar(); pintar(); };

  function pintarCelda(p) {
    const ti = cont.querySelector(`[data-inv-cell="${p.id}"]`); if (ti) ti.innerHTML = celdaInv(p);
    const td = cont.querySelector(`[data-stock-cell="${p.id}"]`); if (!td) return;
    const foco = td.contains(document.activeElement) ? (document.activeElement.dataset.d ?? 'v') : null;
    td.innerHTML = celdaStock(p);
    if (foco) (foco === 'v' ? td.querySelector('.v') : td.querySelector(`[data-d="${foco}"]`))?.focus();
  }
  function cambiarStock(p, objetivo) {
    ui[p.id] = { pend: objetivo, st: 'pending' }; pintarCelda(p);
    clearTimeout(timers[p.id]);
    timers[p.id] = setTimeout(async () => {
      const valor = ui[p.id].pend; ui[p.id].st = 'saving'; pintarCelda(p);
      try {
        const nuevo = await api(`/productos/${p.id}`, { metodo: 'PATCH', cuerpo: { cantidad_stock: valor } });
        p.cantidad_stock = nuevo.cantidad_stock; ui[p.id] = { st: 'ok' }; pintarCelda(p);
        setTimeout(() => { if (ui[p.id]?.st === 'ok') { ui[p.id] = {}; pintarCelda(p); } }, 1400);
      } catch (error) {
        ui[p.id] = { st: 'err' }; pintarCelda(p);
        avisar(`No se actualizó el stock de ${p.nombre}. Sigue en ${p.cantidad_stock} unidades. ${textoError(error)}`, 'danger');
        setTimeout(() => { if (ui[p.id]?.st === 'err') { ui[p.id] = {}; pintarCelda(p); } }, 2600);
      }
    }, 450);
  }

  function formulario(p) {
    const nuevo = !p;
    p = p || { referencia: '', nombre: '', tipo: tipos[0] || null, descripcion: '', precio: '', cantidad_stock: 0, disponible: true, imagen: null };
    let archivo = null, vista = null;
    const fotoHtml = () => `<div class="drop" id="pDrop"><span class="pic">${vista ? `<img src="${vista}" alt="">` : p.imagen ? `<img src="${esc(urlImagen(p.imagen))}" alt="">` : ic('photo', 26)}</span>
      <div class="tx"><b style="color:var(--tinta);font-size:13px">${vista ? 'Foto nueva lista para guardar' : p.imagen ? 'Foto actual' : 'Sin foto todavía'}</b><span style="font-size:12px">Arrastra una foto aquí o elige un archivo. JPG, PNG o WEBP, máximo 5 MB.</span>
        <span class="acts-d"><label class="btn btn-sec btn-sm" for="pFile" style="cursor:pointer">${ic('upload', 14)}${p.imagen || vista ? 'Reemplazar' : 'Subir foto'}</label>${vista ? '<button type="button" class="btn btn-sec btn-sm" id="pDeshacer">Deshacer</button>' : ''}</span>
        <input id="pFile" type="file" accept="image/jpeg,image/png,image/webp" class="sr"><span id="pErr" style="font-size:12px;color:var(--err);font-weight:600"></span></div></div>`;
    abrirDrawer({
      form: true, titulo: nuevo ? 'Agregar producto' : 'Editar producto', sub: nuevo ? '' : `<span class="ref">${esc(p.referencia || '')}</span> · ${esc(p.nombre)}`,
      cuerpo: () => `<div class="form">
        <fieldset class="fs"><legend>Fotografía</legend><div id="pFoto">${fotoHtml()}</div></fieldset>
        <fieldset class="fs"><legend>Identificación</legend>
          <div class="row2">${fld('f-ref', 'Referencia', { valor: p.referencia, max: 30, req: true, attrs: 'style="text-transform:uppercase"', help: 'Única. Ejemplo: MG-CL-001.', err: 'Letras, números y guiones (2 a 30).' })}
          <div>${fld('f-tipo', 'Tipo de mug', { valor: p.tipo?.id ?? '', req: true, opciones: tipos.map((t) => [t.id, t.nombre]), err: 'Elige el tipo.' })}<button type="button" class="lnk-btn" data-act="tipos" style="margin-top:4px">Administrar tipos</button></div></div>
          ${fld('f-nombre', 'Nombre', { valor: p.nombre, max: 200, req: true, err: 'Escribe el nombre.' })}
          ${fld('f-desc', 'Descripción', { valor: p.descripcion, area: true, req: true, err: 'Escribe la descripción.' })}</fieldset>
        <fieldset class="fs"><legend>Venta e inventario</legend>
          <div class="row2">${fld('f-precio', 'Precio (COP)', { tipo: 'number', valor: p.precio, req: true, attrs: 'min="1" step="1" inputmode="numeric"', err: 'Debe ser mayor a cero.' })}
          ${nuevo ? fld('f-stock', 'Unidades iniciales', { tipo: 'number', valor: 0, req: true, attrs: 'min="0" step="1" inputmode="numeric"', err: 'Entero de 0 o más.' }) : `<div class="fld"><label>Stock</label><div class="muted" style="height:38px;display:flex;align-items:center">${p.cantidad_stock} unidades · se ajusta con − / + en la tabla</div></div>`}</div>
          <label class="sw"><input type="checkbox" id="f-disp" ${p.disponible ? 'checked' : ''}>Visible en el catálogo</label>
          <span class="muted" style="font-size:12px;margin-top:-6px">Retirar no borra el producto ni cambia su stock: solo lo oculta a los clientes.</span></fieldset></div>`,
      alPintar: (dr) => {
        const enlazar = () => {
          const inp = dr.querySelector('#pFile'), drop = dr.querySelector('#pDrop');
          const tomar = (file) => {
            const err = dr.querySelector('#pErr'); err.textContent = '';
            if (!file) return;
            if (!FORMATOS.includes(file.type)) { err.textContent = 'La foto debe ser JPG, PNG o WEBP.'; return; }
            if (file.size > 5 * 1024 * 1024) { err.textContent = 'La foto supera 5 MB.'; return; }
            archivo = file;
            const rd = new FileReader(); rd.onload = () => { vista = rd.result; dr.querySelector('#pFoto').innerHTML = fotoHtml(); enlazar(); }; rd.readAsDataURL(file);
          };
          inp.addEventListener('change', () => tomar(inp.files[0]));
          drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', () => drop.classList.remove('over'));
          drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); tomar(e.dataTransfer.files[0]); });
          dr.querySelector('#pDeshacer')?.addEventListener('click', () => { archivo = null; vista = null; dr.querySelector('#pFoto').innerHTML = fotoHtml(); enlazar(); });
        };
        enlazar();
      },
      pie: () => pieForm(nuevo ? 'Crear producto' : 'Guardar cambios'),
      validar: (fm) => {
        let ok = marcar(fm, 'f-ref', /^[A-Za-z0-9-]{2,30}$/.test(fm['f-ref'].value.trim()));
        ok = marcar(fm, 'f-tipo', !!fm['f-tipo'].value) && ok;
        ok = marcar(fm, 'f-nombre', !!fm['f-nombre'].value.trim()) && ok;
        ok = marcar(fm, 'f-desc', !!fm['f-desc'].value.trim()) && ok;
        ok = marcar(fm, 'f-precio', Number(fm['f-precio'].value) > 0) && ok;
        if (nuevo) { const s = Number(fm['f-stock'].value); ok = marcar(fm, 'f-stock', fm['f-stock'].value !== '' && Number.isInteger(s) && s >= 0) && ok; }
        return ok;
      },
      guardar: async (fm) => {
        const cuerpo = { referencia: fm['f-ref'].value.trim().toUpperCase(), tipo_id: Number(fm['f-tipo'].value), nombre: fm['f-nombre'].value.trim(), descripcion: fm['f-desc'].value.trim(), precio: Number(fm['f-precio'].value), disponible: fm['f-disp'].checked };
        if (nuevo) cuerpo.cantidad_stock = Number(fm['f-stock'].value);
        const prod = nuevo ? await api('/productos', { metodo: 'POST', cuerpo }) : await api(`/productos/${p.id}`, { metodo: 'PATCH', cuerpo });
        if (archivo) { const fd = new FormData(); fd.append('imagen', archivo); await api(`/productos/${prod.id}/imagen`, { metodo: 'POST', formData: fd }); }
        return prod;
      },
      okMsg: nuevo ? 'Producto creado.' : 'Producto guardado.', despues: recargar,
    });
  }

  async function ver(p) {
    const anio = new Date().getFullYear();
    let a = null;
    try { a = await api(`/admin/reportes/productos/${p.id}?desde=${anio}-01-01&hasta=${diaISO(new Date())}&agrupar=mes`); } catch { a = null; }
    abrirDrawer({
      ref: `pr${p.id}`, titulo: esc(p.nombre), sub: `<span class="ref">${esc(p.referencia || '')}</span>${tipoMug(p.tipo?.nombre)}${p.disponible ? '<span class="st st-visible">Visible</span>' : '<span class="st st-retirado">Retirado</span>'}`,
      cuerpo: () => `<div style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;align-items:start;margin-bottom:8px"><span class="thumb" style="width:120px;height:120px;border-radius:12px">${img(p)}</span><p style="margin:0">${esc(p.descripcion)}</p></div>
        <p class="sec-t">Catálogo e inventario</p>
        <dl class="kv"><dt>Referencia</dt><dd class="tab-n">${esc(p.referencia) || sr}</dd><dt>Tipo</dt><dd>${esc(p.tipo?.nombre) || sr}</dd><dt>Precio</dt><dd>${moneda(p.precio)}</dd><dt>Stock</dt><dd>${p.cantidad_stock} unidades · ${INV[invEstado(p)]}</dd><dt>Catálogo</dt><dd>${p.disponible ? 'Visible para los clientes' : 'Retirado (oculto)'}</dd></dl>
        ${a ? `<p class="sec-t">Ventas confirmadas este año</p>
        <dl class="kv"><dt>Unidades</dt><dd class="tab-n">${a.unidades}</dd><dt>Ingresos</dt><dd>${moneda(a.ingresos)}</dd><dt>Clientes distintos</dt><dd class="tab-n">${a.clientes}</dd><dt>Última venta</dt><dd>${a.ventas[0] ? `${fecha(a.ventas[0].fecha)} · ${hora(a.ventas[0].fecha)}` : '<span class="muted">Sin ventas</span>'}</dd></dl>` : ''}
        <div style="margin-top:12px"><a class="btn btn-sec" href="#/admin/finanzas?producto=${p.id}">${ic('chart', 16)}Ver análisis de ventas</a></div>`,
    });
  }

  function abrirTipos() {
    abrirDrawer({ titulo: 'Tipos de mug', sub: `${tipos.length} tipos`,
      cuerpo: () => `<form id="tNuevo" class="form" style="gap:10px" novalidate><div class="row2" style="grid-template-columns:1fr auto;align-items:end">${fld('t-n', 'Nuevo tipo', { max: 40, req: true, attrs: 'placeholder="Ejemplo: Vaso para tinto"', err: 'Escribe un nombre que no exista.' })}<button type="submit" class="btn btn-green" style="height:38px">${ic('plus', 16)}Agregar</button></div></form>
        <p class="sec-t" style="margin-top:18px">Tipos existentes</p>
        <ul class="list">${tipos.map((x) => `<li><span class="grow"><b style="font-weight:600">${esc(x.nombre)}</b><br><span class="muted" style="font-size:12px">${esc(x.descripcion || 'Sin descripción')}</span></span><span class="tag">${x.productos} ${x.productos === 1 ? 'producto' : 'productos'}</span>${ib('pencil', `Editar ${x.nombre}`, 'tipo-editar', `data-id="${x.id}"`)}${x.productos ? `<button type="button" class="ib off" aria-disabled="true" aria-label="No se puede eliminar: lo usan ${x.productos} productos" data-tip="No se puede eliminar: lo usan ${x.productos} productos">${ic('trash')}</button>` : ib('trash', `Eliminar ${x.nombre}`, 'tipo-eliminar', `data-id="${x.id}"`, 'danger')}</li>`).join('')}</ul>
        <div class="note" style="margin-top:14px">${ic('info', 16)}<span>Al crear o editar un producto eliges su tipo. Un tipo con productos no se puede eliminar.</span></div>`,
      alPintar: (dr) => dr.querySelector('#tNuevo').addEventListener('submit', async (e) => {
        e.preventDefault(); const fm = e.target, n = fm['t-n'].value.trim();
        if (!marcar(fm, 't-n', !!n)) return fm['t-n'].focus();
        try { await api('/admin/tipos-producto', { metodo: 'POST', cuerpo: { nombre: n } }); avisar(`Tipo “${n}” agregado.`); await cargar(); pintar(); abrirTipos(); }
        catch (err) { marcar(fm, 't-n', false); fm.querySelector('.errm').textContent = textoError(err); }
      }),
    });
  }

  acciones({
    nuevo: () => formulario(null),
    editar: (el) => formulario(productos.find((x) => x.id === Number(el.dataset.id))),
    ver: (el) => ver(productos.find((x) => x.id === Number(el.dataset.id))),
    tipos: () => abrirTipos(),
    'tipo-editar': (el) => {
      const x = tipos.find((t) => t.id === Number(el.dataset.id));
      editarValor({ titulo: 'Editar tipo de mug', cuerpo: fld('m-n', 'Nombre', { valor: x.nombre, max: 40, req: true, err: 'Escribe un nombre.' }) + fld('m-d', 'Descripción', { valor: x.descripcion, max: 120 }),
        validar: (fm) => marcar(fm, 'm-n', !!fm['m-n'].value.trim()),
        guardar: async (fm) => { await api(`/admin/tipos-producto/${x.id}`, { metodo: 'PATCH', cuerpo: { nombre: fm['m-n'].value.trim(), descripcion: fm['m-d'].value.trim() || null } }); await cargar(); pintar(); abrirTipos(); },
        okMsg: 'Tipo actualizado.' });
    },
    'tipo-eliminar': (el) => { const x = tipos.find((t) => t.id === Number(el.dataset.id)); confirmarAccion({ titulo: `Eliminar el tipo “${x.nombre}”`, peligro: true, icono: 'trash', ok: 'Eliminar', texto: 'Ningún producto lo usa. Esta acción no se puede deshacer.' }, async () => { await api(`/admin/tipos-producto/${x.id}`, { metodo: 'DELETE' }); avisar('Tipo eliminado.'); await cargar(); pintar(); abrirTipos(); }); },
    'quitar-filtro': (el) => { const k = el.dataset.k; if (k === '*') Object.assign(f, DEF); else f[k] = DEF[k]; pintar(); },
    filtros: (el) => {
      const c = (fn) => productos.filter(fn).length;
      const p = abrirPop(el, `<form class="form" id="prf" style="width:340px"><b style="font-size:13.5px">Filtrar productos</b>
        <div class="fld"><label>Catálogo</label>${opts('prf-c', f.cat, [['todos', 'Todos', productos.length], ['visibles', 'Visibles', c((x) => x.disponible)], ['retirados', 'Retirados', c((x) => !x.disponible)]])}</div>
        <div class="fld"><label>Tipo de mug</label>${opts('prf-t', f.tipo, [['todos', 'Todos', productos.length], ...tipos.map((t) => [String(t.id), esc(t.nombre), c((y) => y.tipo?.id === t.id)])])}</div>
        <div class="fld"><label>Inventario</label>${opts('prf-i', f.inv, [['todos', 'Todos', productos.length], ['alerta', 'Bajo o agotado', c((x) => ['bajo', 'agotado'].includes(invEstado(x)))], ['ok', 'Suficiente', c((x) => invEstado(x) === 'ok')], ['bajo', 'Bajo', c((x) => invEstado(x) === 'bajo')], ['agotado', 'Agotado', c((x) => invEstado(x) === 'agotado')]])}</div>
        <div class="pop-f"><button type="button" class="btn btn-sec" id="prfL">Limpiar</button><button type="submit" class="btn btn-green">Aplicar</button></div></form>`);
      p.querySelector('#prfL').addEventListener('click', () => { Object.assign(f, DEF); cerrarPop(); pintar(); });
      p.querySelector('#prf').addEventListener('submit', (e) => { e.preventDefault(); const v = (n) => p.querySelector(`[name=${n}]:checked`).value; Object.assign(f, { cat: v('prf-c'), tipo: v('prf-t'), inv: v('prf-i') }); cerrarPop(); pintar(); });
    },
    menu: (el) => { const d = `data-id="${el.dataset.id}"`; abrirPop(el, `<div class="menu" role="menu">${itemMenu(true, 'pencil', 'Editar producto y foto', 'editar', d)}<hr>${itemMenu(true, 'trash', 'Eliminar producto', 'eliminar', d, '', 'danger')}</div>`); },
    stock: (el) => { const p = productos.find((x) => x.id === Number(el.dataset.id)); const v = (ui[p.id]?.pend ?? p.cantidad_stock) + Number(el.dataset.d); if (v < 0 || ui[p.id]?.st === 'saving') return; cambiarStock(p, v); },
    ajustar: (el) => {
      const p = productos.find((x) => x.id === Number(el.dataset.id));
      const pop = abrirPop(el, `<form class="form" id="sa"><b style="font-size:13.5px">Ajustar stock · ${esc(p.nombre)}</b>${fld('sa-v', 'Nueva cantidad', { tipo: 'number', valor: ui[p.id]?.pend ?? p.cantidad_stock, req: true, attrs: 'min="0" step="1" inputmode="numeric"', help: `Actual: ${p.cantidad_stock} unidades`, err: 'Entero de 0 o más.' })}<div class="pop-f"><button type="button" class="btn btn-sec" id="saNo">Cancelar</button><button type="submit" class="btn btn-green">Guardar</button></div></form>`);
      pop.querySelector('#saNo').addEventListener('click', cerrarPop);
      pop.querySelector('#sa').addEventListener('submit', (e) => { e.preventDefault(); const v = Number(e.target['sa-v'].value); if (e.target['sa-v'].value === '' || !Number.isInteger(v) || v < 0) { e.target['sa-v'].closest('.fld').classList.add('bad'); return; } cerrarPop(); cambiarStock(p, v); });
    },
    eliminar: (el) => {
      const p = productos.find((x) => x.id === Number(el.dataset.id));
      confirmarAccion({ titulo: `Eliminar ${p.nombre}`, peligro: true, icono: 'trash', ok: 'Eliminar', texto: 'Si el producto tiene pedidos, <b>no se borra</b>: se retira del catálogo para conservar el historial. Si no tiene pedidos, se borra con su foto y no se puede deshacer.' },
        async () => { const res = await api(`/productos/${p.id}`, { metodo: 'DELETE' }); avisar(res ? `${p.nombre} tiene pedidos: se retiró del catálogo.` : `${p.nombre} eliminado.`); if (drawerActual()?.ref === `pr${p.id}`) cerrarDrawer(); await recargar(); });
    },
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:200px"></div>';
  try { await recargar(); } catch (error) { cont.innerHTML = `${encabezadoAdmin('Productos e inventario')}<div class="note err">${ic('alert', 16, 2)}<span>${esc(textoError(error))}</span></div>`; }
}
