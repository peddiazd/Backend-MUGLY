// Administración de clientes: búsqueda en el servidor, ficha y acciones (RF18, D5).
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, moneda, fecha, cargando, alerta, avisar, modal, confirmar, insigniaEstado } from '../../componentes/ui.js';

const POR_PAGINA = 20;

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/clientes');
  const filtros = { q: query.q || '', estado: 'todos', pedidos: 'todos', registro: 'todos', orden: 'recientes', pagina: 1 };
  let resultado = null;
  let seleccionado = null;
  let espera = null;
  let consulta = 0;

  cont.innerHTML = `
    ${encabezadoAdmin('Clientes', 'Búsqueda en el servidor: no se cargan todos los clientes en el navegador.',
      '<button class="btn btn-outline-primary" type="button" data-exportar>Exportar CSV</button>')}
    <form class="mg-filtros" data-filtros role="search" aria-label="Buscar clientes">
      <label class="visually-hidden" for="fq">Buscar por nombre, apellido, correo, teléfono o ID</label>
      <input id="fq" name="q" class="form-control" type="search" placeholder="Nombre, apellido, correo, teléfono o ID" value="${esc(filtros.q)}" autocomplete="off">
      <label class="visually-hidden" for="festado">Estado de la cuenta</label>
      <select id="festado" name="estado" class="form-select"><option value="todos">Todos los estados</option><option value="activos">Activos</option><option value="desactivados">Desactivados</option></select>
      <label class="visually-hidden" for="fpedidos">Pedidos</label>
      <select id="fpedidos" name="pedidos" class="form-select"><option value="todos">Con o sin pedidos</option><option value="con">Con pedidos</option><option value="sin">Sin pedidos</option></select>
      <label class="visually-hidden" for="fregistro">Fecha de registro</label>
      <select id="fregistro" name="registro" class="form-select"><option value="todos">Registro: cualquier fecha</option><option value="30d">Últimos 30 días</option><option value="anio">Este año</option></select>
      <label class="visually-hidden" for="forden">Orden</label>
      <select id="forden" name="orden" class="form-select"><option value="recientes">Más recientes</option><option value="pedidos">Más pedidos</option><option value="compra">Mayor compra confirmada</option></select>
    </form>
    <div class="mg-paneles">
      <section class="mg-panel" aria-live="polite" id="lista"></section>
      <aside class="mg-panel mg-ficha" id="ficha" aria-live="polite"></aside>
    </div>`;

  const lista = cont.querySelector('#lista');
  const ficha = cont.querySelector('#ficha');

  function pintarLista() {
    const r = resultado;
    if (!r.items.length) {
      lista.innerHTML = `<div class="mg-vacio"><b>Sin resultados</b>${filtros.q ? `Ningún cliente coincide con “${esc(filtros.q)}”.` : 'No hay clientes con estos filtros.'}</div>`;
      return;
    }
    lista.innerHTML = `
      <div class="table-responsive"><table class="table mb-0">
        <thead class="table-light small"><tr><th scope="col">ID</th><th scope="col">Cliente</th><th scope="col">Registro</th><th scope="col">Pedidos</th><th scope="col">Compra confirmada</th><th scope="col">Estado</th></tr></thead>
        <tbody>${r.items.map((u) => {
          const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ');
          return `<tr data-fila="${u.id}" tabindex="0" class="${seleccionado === u.id ? 'mg-seleccionada' : ''}" aria-label="Ver ficha de ${esc(u.correo)}">
            <td class="num">${u.id}</td>
            <td><b>${esc(u.correo)}</b><br><span class="small text-suave">${esc(nombre || 'Sin nombre registrado')}${u.telefono ? ` · ${esc(u.telefono)}` : ''}</span></td>
            <td class="small">${fecha(u.fecha_creacion)}</td>
            <td class="num">${u.pedidos}</td>
            <td class="num">${moneda(u.compra_confirmada)}</td>
            <td><span class="estado ${u.activo ? 'estado-pagado' : 'estado-cancelado'}">${u.activo ? 'Activo' : 'Desactivado'}</span></td></tr>`;
        }).join('')}</tbody>
      </table></div>
      <nav class="mg-paginacion" aria-label="Paginación">
        <span>${r.total} ${r.total === 1 ? 'cliente' : 'clientes'} · página ${r.pagina} de ${r.paginas}</span>
        <span class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" data-pagina="${r.pagina - 1}" ${r.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-pagina="${r.pagina + 1}" ${r.pagina >= r.paginas ? 'disabled' : ''}>Siguiente</button>
        </span>
      </nav>`;
  }

  async function buscar() {
    const mia = ++consulta;
    lista.innerHTML = cargando('Buscando clientes…');
    const params = new URLSearchParams({ ...filtros, por_pagina: POR_PAGINA });
    try {
      const r = await api(`/admin/usuarios?${params}`);
      if (mia !== consulta) return;  // llegó una búsqueda más nueva
      resultado = r;
      pintarLista();
      if (!seleccionado && r.items.length) await verFicha(r.items[0].id);
      if (!r.items.length) ficha.innerHTML = '<div class="mg-vacio"><b>Selecciona un cliente</b>Su ficha aparecerá aquí.</div>';
    } catch (error) {
      if (mia === consulta) lista.innerHTML = alerta(textoError(error));
    }
  }

  async function verFicha(id) {
    seleccionado = id;
    lista.querySelectorAll('tr[data-fila]').forEach((tr) => tr.classList.toggle('mg-seleccionada', Number(tr.dataset.fila) === id));
    ficha.innerHTML = cargando('Cargando ficha…');
    try {
      const u = await api(`/admin/usuarios/${id}`);
      const p = u.perfil ?? {};
      ficha.innerHTML = `
        <div class="mg-panel-cab"><h2 class="text-truncate">${esc(u.correo)}</h2><span class="estado ${u.activo ? 'estado-pagado' : 'estado-cancelado'}">${u.activo ? 'Activo' : 'Desactivado'}</span></div>
        <dl>
          <dt>ID</dt><dd>${u.id}</dd>
          <dt>Nombre</dt><dd>${esc([p.nombre, p.apellido].filter(Boolean).join(' ') || 'Sin registrar')}</dd>
          <dt>Teléfono</dt><dd>${esc(p.telefono || 'Sin registrar')}</dd>
          <dt>Registro</dt><dd>${fecha(u.fecha_creacion)}</dd>
          <dt>Compra confirmada</dt><dd>${moneda(u.resumen.compra_confirmada)}</dd>
          <dt>Pendiente de pago</dt><dd>${moneda(u.resumen.pendiente_de_pago)}</dd>
        </dl>
        <h3 class="h6 mb-2">Pedidos (${u.resumen.pedidos})</h3>
        ${u.pedidos.length ? `<div class="table-responsive"><table class="table table-sm mb-0"><tbody>
          ${u.pedidos.map((x) => `<tr><td><a class="fw-bold" href="#/admin/pedidos?q=${x.id}">#${x.id}</a></td><td class="small">${fecha(x.fecha_creacion)}</td><td class="num">${moneda(x.total)}</td><td>${insigniaEstado(x.estado)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="text-suave small mb-0">Sin pedidos.</p>'}
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button class="btn btn-outline-secondary btn-sm" type="button" data-accion="editar">Editar datos</button>
          <button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-primary'}" type="button" data-accion="${u.activo ? 'desactivar' : 'activar'}">${u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
        </div>
        <p class="mg-nota mb-0">La contraseña nunca se muestra ni se edita desde el panel.</p>`;
      ficha.dataset.usuario = JSON.stringify({ id: u.id, correo: u.correo, perfil: p });
    } catch (error) {
      ficha.innerHTML = alerta(textoError(error));
    }
  }

  // Filtros: escribir espera 300 ms antes de buscar; los selectores buscan al cambiar.
  const form = cont.querySelector('[data-filtros]');
  form.addEventListener('submit', (ev) => ev.preventDefault());
  form.addEventListener('input', (ev) => {
    filtros[ev.target.name] = ev.target.value.trim();
    filtros.pagina = 1;
    seleccionado = null;
    clearTimeout(espera);
    espera = setTimeout(buscar, ev.target.name === 'q' ? 300 : 0);
  });

  lista.addEventListener('click', (ev) => {
    const pag = ev.target.closest('[data-pagina]');
    if (pag) { filtros.pagina = Number(pag.dataset.pagina); seleccionado = null; buscar(); return; }
    const fila = ev.target.closest('tr[data-fila]');
    if (fila) verFicha(Number(fila.dataset.fila));
  });
  lista.addEventListener('keydown', (ev) => {
    const fila = ev.target.closest('tr[data-fila]');
    if (fila && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); verFicha(Number(fila.dataset.fila)); }
  });

  cont.querySelector('[data-exportar]').addEventListener('click', async () => {
    try { await descargar('/admin/reportes/clientes.csv', 'mugly-clientes.csv'); } catch (error) { avisar(textoError(error), 'danger'); }
  });

  ficha.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    const u = JSON.parse(ficha.dataset.usuario);
    const perfil = u.perfil;
    try {
      if (b.dataset.accion === 'editar') {
        const ok = await modal({
          titulo: `Editar · ${u.correo}`,
          textoAceptar: 'Guardar',
          contenido: `
            <div class="row g-3">
              <div class="col-6"><label for="nombre" class="form-label">Nombre</label>
                <input id="nombre" class="form-control" maxlength="50" value="${esc(perfil.nombre ?? '')}"></div>
              <div class="col-6"><label for="apellido" class="form-label">Apellido</label>
                <input id="apellido" class="form-control" maxlength="50" value="${esc(perfil.apellido ?? '')}"></div>
              <div class="col-12"><label for="telefono" class="form-label">Teléfono</label>
                <input id="telefono" class="form-control" type="tel" maxlength="20" value="${esc(perfil.telefono ?? '')}"></div>
            </div>`,
          alAceptar: async (el) => {
            const cuerpo = {
              nombre: el.querySelector('#nombre').value.trim(),
              apellido: el.querySelector('#apellido').value.trim(),
              telefono: el.querySelector('#telefono').value.trim(),
            };
            if (cuerpo.telefono && !/^[0-9+\s-]{7,20}$/.test(cuerpo.telefono)) {
              throw new Error('El teléfono solo puede tener números, espacios, + o guiones (7 a 20 caracteres).');
            }
            await api(`/admin/usuarios/${u.id}`, { metodo: 'PATCH', cuerpo });
            return true;
          },
        });
        if (ok) { avisar('Datos del cliente actualizados.'); await buscar(); await verFicha(u.id); }
      }
      if (b.dataset.accion === 'desactivar' || b.dataset.accion === 'activar') {
        const activar = b.dataset.accion === 'activar';
        const ok = await confirmar(
          activar ? 'Activar cliente' : 'Desactivar cliente',
          activar ? `¿Permitir que ${u.correo} vuelva a iniciar sesión?` : `¿Desactivar a ${u.correo}? No podrá iniciar sesión; su cuenta y sus pedidos se conservan.`,
          activar ? 'Activar' : 'Desactivar',
          activar ? 'btn-primary' : 'btn-danger',
        );
        if (ok) {
          await api(`/admin/usuarios/${u.id}`, { metodo: 'PATCH', cuerpo: { activo: activar } });
          avisar(activar ? 'Cliente activado.' : 'Cliente desactivado.');
          await buscar();
          await verFicha(u.id);
        }
      }
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });

  await buscar();
}
