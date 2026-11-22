// Clientes (v1.3.0, CR-02, RF29): documento y dirección de envío, ficha de
// solo consulta, acciones en el menú ⋯ (editar, restablecer contraseña,
// desactivar, eliminar sin pedidos — RN24) y alta de clientes por WhatsApp.
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, avisar, ic, ib, vacio, sr, badge, fecha, fechaC, hora, acciones, abrirPop, itemMenu, abrirDrawer, drawerActual,
  cerrarDrawer, confirmarAccion, fld, marcar, pieForm, opts, chipsHtml, filtroBtn, pieTabla, TEL, CORREO, diaISO,
} from '../../componentes/adminUI.js';
import { DEPARTAMENTOS, enlaceDlg } from './pedidos.js';

const DEF = { estado: 'todos', pedidos: 'todos', ciudad: '' };
const f = { q: '', orden: 'recientes', pagina: 1, ...DEF };
const docFmt = (c) => (c.numero_documento ? `${c.tipo_documento || ''} ${c.numero_documento}`.trim() : '');

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/clientes');
  if (query.q) f.q = query.q;
  let r = { items: [], total: 0, pagina: 1, paginas: 1 };
  let consulta = 0; let espera = null;
  const filtrosN = () => (f.estado !== 'todos') + (f.pedidos !== 'todos') + !!f.ciudad;

  function tabla() {
    if (!r.items.length) return vacio('search', 'Ningún cliente coincide', 'Busca por nombre, documento, correo, teléfono, ciudad o ID.');
    return `<div class="tw"><table class="t"><thead><tr><th>ID</th><th>Documento</th><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Teléfono</th><th>Ciudad</th><th>Registro</th><th class="num">Pedidos</th><th>Estado</th><th class="ac">Acciones</th></tr></thead><tbody>
      ${r.items.map((c) => `<tr data-row="${c.id}" class="${drawerActual()?.ref === `c${c.id}` ? 'sel' : ''}"><td class="id">${c.id}</td><td class="tab-n">${esc(docFmt(c)) || sr}</td><td>${esc(c.nombre) || sr}</td><td>${esc(c.apellido) || sr}</td><td>${esc(c.correo)}</td><td class="tab-n">${esc(c.telefono) || sr}</td><td>${esc(c.ciudad) || sr}</td><td class="tab-n">${fecha(c.fecha_creacion)}</td><td class="num">${c.pedidos}</td>
        <td>${c.activo ? '<span class="st st-activo">Activo</span>' : '<span class="st st-inactivo" data-tip="No puede iniciar sesión">Desactivado</span>'}</td>
        <td class="ac"><div class="acts">${ib('eye', 'Ver ficha del cliente', 'ver', `data-id="${c.id}"`)}${ib('dots', 'Más acciones', 'menu', `data-id="${c.id}" aria-haspopup="menu"`)}</div></td></tr>`).join('')}
      </tbody></table></div>${pieTabla(r, 'pagina')}`;
  }
  function pintar() {
    cont.innerHTML = `
      ${encabezadoAdmin('Clientes', 'Se registran en la tienda o los agregas tú cuando compran por WhatsApp. Aquí se consultan, editan, desactivan o eliminan.',
        `${ib('download', 'Exportar clientes (CSV)', 'exportar')}${ib('plus', 'Agregar cliente', 'nuevo', '', 'add')}`)}
      <div class="tb">
        <div class="field-s">${ic('search', 16, 1.9)}<label class="sr" for="cq">Buscar cliente</label><input id="cq" type="search" placeholder="Nombre, documento, correo, teléfono o ciudad" value="${esc(f.q)}" autocomplete="off"></div>
        ${filtroBtn('filtros', filtrosN(), 'Filtrar por estado, pedidos y ciudad')}
        ${chipsHtml('cli', [...(f.estado !== 'todos' ? [[`Estado: ${f.estado === 'activos' ? 'Activos' : 'Desactivados'}`, 'estado']] : []), ...(f.pedidos !== 'todos' ? [[f.pedidos === 'con' ? 'Con pedidos' : 'Sin pedidos', 'pedidos']] : []), ...(f.ciudad ? [[`Ciudad: ${f.ciudad}`, 'ciudad']] : [])])}
        <span class="grow"></span>
        <label class="sr" for="cOrden">Ordenar</label>
        <select class="sel" id="cOrden"><option value="recientes" ${f.orden === 'recientes' ? 'selected' : ''}>Más recientes</option><option value="pedidos" ${f.orden === 'pedidos' ? 'selected' : ''}>Más pedidos</option><option value="compra" ${f.orden === 'compra' ? 'selected' : ''}>Mayor compra</option></select>
      </div>
      <section class="card" id="cliTabla" aria-live="polite">${tabla()}</section>`;
    cont.querySelector('#cq').addEventListener('input', (e) => { f.q = e.target.value.trim(); f.pagina = 1; clearTimeout(espera); espera = setTimeout(() => buscar(true), 300); });
    cont.querySelector('#cOrden').addEventListener('change', (e) => { f.orden = e.target.value; buscar(); });
  }
  async function buscar(soloTabla = false) {
    const mia = ++consulta;
    const params = new URLSearchParams({ q: f.q, estado: f.estado, pedidos: f.pedidos, orden: f.orden, pagina: f.pagina, por_pagina: 20 });
    if (f.ciudad) params.set('ciudad', f.ciudad);
    try {
      const datos = await api(`/admin/usuarios?${params}`);
      if (mia !== consulta) return;
      r = datos;
      if (soloTabla && cont.querySelector('#cliTabla')) cont.querySelector('#cliTabla').innerHTML = tabla(); else pintar();
    } catch (error) { if (mia === consulta) avisar(textoError(error), 'danger'); }
  }

  async function ver(id) {
    let u;
    try { u = await api(`/admin/usuarios/${id}`); } catch (error) { avisar(textoError(error), 'danger'); return; }
    const p = u.perfil || {}, v = (x) => esc(x) || '<span class="muted">Sin registrar</span>';
    abrirDrawer({
      ref: `c${u.id}`, titulo: esc([p.nombre, p.apellido].filter(Boolean).join(' ') || u.correo),
      sub: `${u.activo ? '<span class="st st-activo">Activo</span>' : '<span class="st st-inactivo">Desactivado</span>'}<span>Cliente #${u.id} · desde ${fecha(u.fecha_creacion)}</span>`,
      tabs: [['datos', 'Datos'], ['pedidos', `Pedidos (${u.pedidos.length})`]],
      cuerpo: (t) => (t === 'datos' ? `
        <p class="sec-t">Identificación</p>
        <dl class="kv"><dt>Nombre</dt><dd>${v(p.nombre)}</dd><dt>Apellido</dt><dd>${v(p.apellido)}</dd><dt>Documento</dt><dd>${v(docFmt(p))}</dd></dl>
        <p class="sec-t">Contacto</p>
        <dl class="kv"><dt>Correo</dt><dd>${esc(u.correo)}</dd><dt>Teléfono</dt><dd>${v(p.telefono)}</dd></dl>
        <p class="sec-t">Dirección de envío</p>
        <dl class="kv"><dt>Dirección</dt><dd>${v(p.direccion)}</dd><dt>Complemento</dt><dd>${v(p.complemento)}</dd><dt>Ciudad</dt><dd>${v(p.ciudad)}</dd><dt>Departamento</dt><dd>${v(p.departamento)}</dd></dl>
        <p class="sec-t">Compras</p>
        <dl class="kv"><dt>Pedidos</dt><dd>${u.resumen.pedidos}</dd><dt>Compra confirmada</dt><dd>${moneda(u.resumen.compra_confirmada)}</dd><dt>Pendiente de pago</dt><dd>${moneda(u.resumen.pendiente_de_pago)}</dd></dl>
        <p class="sec-t">Cuenta</p>
        <dl class="kv"><dt>Estado</dt><dd>${u.activo ? 'Activa: puede iniciar sesión' : 'Desactivada: no puede iniciar sesión'}</dd><dt>Contraseña</dt><dd>Nunca se muestra. Se restablece desde ⋯ › Restablecer contraseña</dd></dl>
        <div class="note" style="margin-top:14px">${ic('info', 16)}<span>Esta ficha es solo de consulta. Editar, desactivar y eliminar están en el menú ⋯ de la fila.</span></div>`
        : u.pedidos.length ? `<div class="tw"><table class="t"><thead><tr><th>Pedido</th><th>Fecha</th><th class="num">Total</th><th>Estado</th><th class="ac"><span class="sr">Ver</span></th></tr></thead><tbody>${u.pedidos.map((x) => `<tr><td class="id">#${x.id}</td><td class="tab-n">${fechaC(x.fecha_creacion)}</td><td class="num">${moneda(x.total)}</td><td>${badge(x.estado)}</td><td class="ac"><a class="ib" href="#/admin/pedidos?q=${x.id}" aria-label="Ver pedido #${x.id}" data-tip="Ver pedido #${x.id}">${ic('eye')}</a></td></tr>`).join('')}</tbody></table></div>`
          : vacio('bag', 'Sin pedidos', 'Este cliente todavía no ha comprado.')),
    });
    cont.querySelectorAll('.t tr[data-row]').forEach((row) => row.classList.toggle('sel', row.dataset.row === String(id)));
  }

  async function formulario(id) {
    let u = null;
    if (id) { try { u = await api(`/admin/usuarios/${id}`); } catch (error) { avisar(textoError(error), 'danger'); return; } }
    const nuevo = !u, p = u?.perfil || {};
    abrirDrawer({
      form: true, titulo: nuevo ? 'Agregar cliente' : 'Editar datos del cliente', sub: nuevo ? 'Para clientes que compran por WhatsApp sin registrarse en la tienda' : `Cliente #${u.id} · ${esc(u.correo)}`,
      cuerpo: () => `<div class="form">
        <fieldset class="fs"><legend>Identificación</legend>
          <div class="row2">${fld('f-nom', 'Nombre', { valor: p.nombre, max: 50, req: true, err: 'Escribe el nombre.' })}${fld('f-ape', 'Apellido', { valor: p.apellido, max: 50, req: true, err: 'Escribe el apellido.' })}</div>
          <div class="row-doc">${fld('f-tdoc', 'Tipo', { valor: p.tipo_documento || 'CC', req: true, opciones: [['CC', 'CC'], ['CE', 'CE'], ['TI', 'TI'], ['PA', 'Pasaporte']] })}${fld('f-doc', 'Número de documento', { valor: p.numero_documento, max: 15, req: true, attrs: 'inputmode="numeric"', help: 'Sin puntos.', err: 'Entre 5 y 15 dígitos o letras.' })}</div></fieldset>
        <fieldset class="fs"><legend>Contacto</legend>
          ${fld('f-mail', 'Correo', { tipo: 'email', valor: u?.correo, max: 255, req: true, help: 'Con él inicia sesión el cliente. Debe ser único.', err: 'Escribe un correo válido.' })}
          ${fld('f-tel', 'Teléfono', { tipo: 'tel', valor: p.telefono, max: 20, req: true, help: 'Se usa para coordinar el envío por WhatsApp.', err: 'Solo números, espacios, + o guiones (7 a 20).' })}</fieldset>
        <fieldset class="fs"><legend>Dirección de envío</legend>
          <div class="row2">${fld('f-dep', 'Departamento', { valor: p.departamento || '', req: true, opciones: [['', 'Elige…'], ...DEPARTAMENTOS.map((d) => [d, d])], err: 'Elige el departamento.' })}${fld('f-ciu', 'Ciudad', { valor: p.ciudad, max: 60, req: true, err: 'Escribe la ciudad.' })}</div>
          ${fld('f-dir', 'Dirección', { valor: p.direccion, max: 120, req: true, help: 'Ejemplo: Cra 15 # 85-20', err: 'Escribe la dirección.' })}
          ${fld('f-comp', 'Complemento', { valor: p.complemento, max: 80, help: 'Apartamento, torre, barrio o indicaciones.' })}</fieldset>
        ${nuevo ? `<div class="note">${ic('info', 16)}<span>Al guardar se genera un enlace para que el cliente cree su contraseña; se lo envías por WhatsApp.</span></div>` : ''}</div>`,
      pie: () => pieForm(nuevo ? 'Agregar cliente' : 'Guardar cambios'),
      validar: (fm) => {
        let ok = marcar(fm, 'f-nom', !!fm['f-nom'].value.trim());
        ok = marcar(fm, 'f-ape', !!fm['f-ape'].value.trim()) && ok;
        ok = marcar(fm, 'f-doc', /^[0-9A-Za-z]{5,15}$/.test(fm['f-doc'].value.trim())) && ok;
        ok = marcar(fm, 'f-mail', CORREO.test(fm['f-mail'].value.trim())) && ok;
        ok = marcar(fm, 'f-tel', TEL.test(fm['f-tel'].value.trim())) && ok;
        ok = marcar(fm, 'f-dep', !!fm['f-dep'].value) && ok;
        ok = marcar(fm, 'f-ciu', !!fm['f-ciu'].value.trim()) && ok;
        return marcar(fm, 'f-dir', !!fm['f-dir'].value.trim()) && ok;
      },
      guardar: (fm) => {
        const cuerpo = { correo: fm['f-mail'].value.trim(), nombre: fm['f-nom'].value.trim(), apellido: fm['f-ape'].value.trim(), telefono: fm['f-tel'].value.trim(),
          tipo_documento: fm['f-tdoc'].value, numero_documento: fm['f-doc'].value.trim(), departamento: fm['f-dep'].value, ciudad: fm['f-ciu'].value.trim(),
          direccion: fm['f-dir'].value.trim(), complemento: fm['f-comp'].value.trim() || (nuevo ? null : '') };
        return nuevo ? api('/admin/usuarios', { metodo: 'POST', cuerpo }) : api(`/admin/usuarios/${u.id}`, { metodo: 'PATCH', cuerpo });
      },
      okMsg: nuevo ? 'Cliente agregado.' : 'Datos del cliente guardados.',
      despues: async (res) => { await buscar(); if (nuevo && res?.enlace) enlaceDlg(res, res.enlace); },
    });
  }

  acciones({
    pagina: (el) => { f.pagina = Number(el.dataset.v); buscar(); },
    ver: (el) => ver(Number(el.dataset.id)),
    nuevo: () => formulario(null),
    editar: (el) => formulario(Number(el.dataset.id)),
    exportar: async () => { try { await descargar('/admin/reportes/clientes.csv', `mugly-clientes-${diaISO(new Date())}.csv`); } catch (e) { avisar(textoError(e), 'danger'); } },
    'quitar-filtro': (el) => { const k = el.dataset.k; if (k === '*') Object.assign(f, DEF); else f[k] = DEF[k]; f.pagina = 1; buscar(); },
    filtros: (el) => {
      const p = abrirPop(el, `<form class="form" id="cf" style="width:300px"><b style="font-size:13.5px">Filtrar clientes</b>
        <div class="fld"><label>Estado</label>${opts('cf-e', f.estado, [['todos', 'Todos'], ['activos', 'Activos'], ['desactivados', 'Desactivados']])}</div>
        <div class="fld"><label>Pedidos</label>${opts('cf-p', f.pedidos, [['todos', 'Todos'], ['con', 'Con pedidos'], ['sin', 'Sin pedidos']])}</div>
        ${fld('cf-c', 'Ciudad', { valor: f.ciudad, max: 60, req: true })}
        <div class="pop-f"><button type="button" class="btn btn-sec" id="cfL">Limpiar</button><button type="submit" class="btn btn-green">Aplicar</button></div></form>`);
      p.querySelector('#cfL').addEventListener('click', () => { Object.assign(f, DEF); f.pagina = 1; p.remove(); buscar(); });
      p.querySelector('#cf').addEventListener('submit', (e) => { e.preventDefault(); Object.assign(f, { estado: p.querySelector('[name=cf-e]:checked').value, pedidos: p.querySelector('[name=cf-p]:checked').value, ciudad: e.target['cf-c'].value.trim(), pagina: 1 }); p.remove(); buscar(); });
    },
    menu: (el) => {
      const c = r.items.find((x) => x.id === Number(el.dataset.id)), d = `data-id="${c.id}"`;
      abrirPop(el, `<div class="menu" role="menu">${itemMenu(true, 'pencil', 'Editar datos', 'editar', d)}${itemMenu(true, 'link', 'Restablecer contraseña', 'reset', d)}${itemMenu(true, c.activo ? 'user-x' : 'user-ok', c.activo ? 'Desactivar cuenta' : 'Activar cuenta', 'toggle', d)}<hr>${itemMenu(true, 'trash', 'Eliminar cliente', 'eliminar', d, '', 'danger')}</div>`);
    },
    reset: (el) => {
      const c = r.items.find((x) => x.id === Number(el.dataset.id));
      confirmarAccion({ titulo: 'Restablecer contraseña', icono: 'key', ok: 'Generar enlace', texto: `Se creará un enlace para que <b>${esc(c.nombre || c.correo)}</b> elija una contraseña nueva. Vence en 30 minutos y sirve una sola vez. Tú no verás la contraseña.` },
        async () => { const enlace = await api(`/admin/usuarios/${c.id}/enlace-acceso`, { metodo: 'POST', cuerpo: { tipo: 'restablecer' } }); setTimeout(() => enlaceDlg(c, enlace), 250); });
    },
    toggle: (el) => {
      const c = r.items.find((x) => x.id === Number(el.dataset.id));
      const fin = async () => { await api(`/admin/usuarios/${c.id}`, { metodo: 'PATCH', cuerpo: { activo: !c.activo } }); avisar(`Cuenta ${c.activo ? 'desactivada' : 'activada'}.`); if (drawerActual()?.ref === `c${c.id}`) cerrarDrawer(); await buscar(); };
      if (c.activo) confirmarAccion({ titulo: 'Desactivar cuenta', icono: 'user-x', ok: 'Desactivar', texto: `<b>${esc(c.nombre || c.correo)}</b> no podrá iniciar sesión. Sus datos y pedidos se conservan y puedes activarla de nuevo.` }, fin);
      else confirmarAccion({ titulo: 'Activar cuenta', icono: 'user-ok', ok: 'Activar', texto: `<b>${esc(c.nombre || c.correo)}</b> podrá volver a iniciar sesión.` }, fin);
    },
    eliminar: (el) => {
      const c = r.items.find((x) => x.id === Number(el.dataset.id));
      if (c.pedidos) return confirmarAccion({ titulo: 'No se puede eliminar', icono: 'alert', ok: c.activo ? 'Desactivar cuenta' : '', texto: `<b>${esc(c.nombre || c.correo)}</b> tiene ${c.pedidos} pedido(s). Los pedidos se conservan por el historial de ventas y envíos, así que su registro no se borra. Puedes desactivar la cuenta.` },
        async () => { await api(`/admin/usuarios/${c.id}`, { metodo: 'PATCH', cuerpo: { activo: false } }); avisar('Cuenta desactivada.'); await buscar(); });
      confirmarAccion({ titulo: 'Eliminar cliente', peligro: true, icono: 'trash', ok: 'Eliminar definitivamente', texto: `Se borrará el registro de <b>${esc(c.nombre || c.correo)}</b> (${esc(c.correo)}). No tiene pedidos. Esta acción no se puede deshacer.` },
        async () => { await api(`/admin/usuarios/${c.id}`, { metodo: 'DELETE' }); if (drawerActual()?.ref === `c${c.id}`) cerrarDrawer(); avisar('Cliente eliminado.'); await buscar(); });
    },
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:200px"></div>';
  await buscar();
}
