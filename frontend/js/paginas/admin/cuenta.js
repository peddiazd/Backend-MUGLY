// Mi cuenta (v1.3.0, CR-02, RF34): perfil y seguridad del administrador con la
// estructura de ajustes. Cambiar y verificar el correo o el celular con código
// queda pendiente: necesita un servicio de envío de códigos no aprobado.
import { api, textoError } from '../../api.js';
import { estado } from '../../estado.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, avisar, ic, ib, pend, fecha, acciones, editarValor, fld, marcar, TEL } from '../../componentes/adminUI.js';
import { sxRow, sxSec, btnEd, sxShell } from '../../componentes/ajustes.js';

const NAV = [[['perfil', 'Perfil', 'user', 'nombre apellido rol id'], ['contacto', 'Correo y teléfono', 'chat', 'correo email telefono celular'], ['seguridad', 'Seguridad', 'lock', 'contraseña clave sesiones']]];
const s = { sec: 'perfil', q: '' };
const vacio = '<span class="muted">Sin registrar</span>';

export async function render(app) {
  const cont = adminLayout(app, '/admin/cuenta');
  let p = {};
  const u = estado.usuario || {};

  function cuerpo() {
    if (s.sec === 'perfil') return sxSec('Perfil',
      sxRow('Foto de perfil', 'Se muestra tu inicial en el panel.', `<span class="avatar" style="width:40px;height:40px;font-size:16px">${esc((p.nombre || u.correo || 'A').charAt(0).toUpperCase())}</span>`)
      + sxRow('Nombre', '', `<span class="sx-val box">${esc(p.nombre) || vacio}</span>${btnEd('editar', 'nombre', 'Editar', 'Editar nombre')}`)
      + sxRow('Apellido', '', `<span class="sx-val box">${esc(p.apellido) || vacio}</span>${btnEd('editar', 'apellido', 'Editar', 'Editar apellido')}`)
      + sxRow('Rol', 'Permisos de administración de la tienda.', '<span class="sx-val">Administrador</span>'))
      + sxSec('Cuenta', sxRow('ID de usuario', 'Útil si necesitas soporte técnico.', `<span class="sx-val mono">#${u.id ?? ''}</span>${ib('copy', 'Copiar ID de usuario', 'copiar-txt', `data-txt="${u.id ?? ''}"`)}`)
        + (u.fecha_creacion ? sxRow('Cuenta creada', '', `<span class="sx-val">${fecha(u.fecha_creacion)}</span>`) : ''));
    if (s.sec === 'contacto') return sxSec('Correo electrónico', sxRow('Correo', 'Con él inicias sesión.', `<span class="sx-val">${esc(u.correo)}</span>${pend('Cambiar el correo exige verificarlo con un código; necesita un servicio de correo no aprobado.', 'Cambio pendiente')}`))
      + sxSec('Teléfono', sxRow('Celular', 'Para coordinar con la tienda. La verificación con código queda pendiente.', `<span class="sx-val box">${esc(p.telefono) || vacio}</span>${btnEd('editar', 'telefono', p.telefono ? 'Cambiar' : 'Agregar', 'Editar celular')}`));
    return sxSec('Contraseña', sxRow('Contraseña', 'Nunca se muestra. Al cambiarla te pedimos la actual.', `<span class="sx-val">••••••••</span>${btnEd('contrasena', '', 'Cambiar', 'Cambiar contraseña')}`))
      + sxSec('Sesiones', sxRow('Cerrar sesión en todos los dispositivos', 'Las sesiones vencen solas; cerrarlas todas a la vez requiere invalidar los tokens en el servidor.', pend('Pendiente: requiere invalidar tokens en el backend.')));
  }
  function pintar() {
    cont.innerHTML = `${encabezadoAdmin('Mi cuenta', 'Tus datos como administrador.')}${sxShell(NAV, s.sec, 'sec', cuerpo(), s.q, 'cta')}`;
    cont.querySelector('#sxq').addEventListener('input', (e) => { s.q = e.target.value; const pos = e.target.selectionStart; pintar(); const n = cont.querySelector('#sxq'); n.focus(); n.setSelectionRange(pos, pos); });
  }

  acciones({
    sec: (el) => { s.sec = el.dataset.k; pintar(); cont.querySelector(`[data-act="sec"][data-k="${s.sec}"]`)?.focus(); },
    editar: (el) => {
      const k = el.dataset.k, et = { nombre: 'Nombre', apellido: 'Apellido', telefono: 'Celular' }[k];
      editarValor({ titulo: et, cuerpo: fld('m-v', et, { tipo: k === 'telefono' ? 'tel' : 'text', valor: p[k], max: k === 'telefono' ? 20 : 50, req: true, err: k === 'telefono' ? 'Solo números, espacios, + o guiones (7 a 20).' : `Escribe tu ${et.toLowerCase()}.` }),
        validar: (f) => marcar(f, 'm-v', k === 'telefono' ? TEL.test(f['m-v'].value.trim()) : !!f['m-v'].value.trim()),
        guardar: async (f) => { p = await api('/usuarios/perfil', { metodo: 'PATCH', cuerpo: { [k]: f['m-v'].value.trim() } }); pintar(); } });
    },
    contrasena: () => editarValor({ titulo: 'Cambiar contraseña', ok: 'Cambiar contraseña',
      cuerpo: `${fld('m-act', 'Contraseña actual', { tipo: 'password', req: true, attrs: 'autocomplete="current-password"', err: 'Escribe tu contraseña actual.' })}
        ${fld('m-new', 'Nueva contraseña', { tipo: 'password', req: true, attrs: 'autocomplete="new-password"', help: 'Mínimo 6 caracteres.', err: 'Mínimo 6 caracteres y distinta de la actual.' })}
        ${fld('m-rep', 'Repite la nueva contraseña', { tipo: 'password', req: true, attrs: 'autocomplete="new-password"', err: 'Las contraseñas no coinciden.' })}`,
      validar: (f) => { let ok = marcar(f, 'm-act', !!f['m-act'].value); ok = marcar(f, 'm-new', f['m-new'].value.length >= 6 && f['m-new'].value !== f['m-act'].value) && ok; return marcar(f, 'm-rep', !!f['m-rep'].value && f['m-rep'].value === f['m-new'].value) && ok; },
      guardar: (f) => api('/usuarios/contrasena', { metodo: 'PATCH', cuerpo: { actual: f['m-act'].value, nueva: f['m-new'].value } }),
      okMsg: 'Contraseña actualizada.' }),
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:200px"></div>';
  try { p = await api('/usuarios/perfil'); } catch (error) { if (error.status !== 404) { avisar(textoError(error), 'danger'); } p = {}; }
  pintar();
}
