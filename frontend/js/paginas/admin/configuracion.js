// Configuración de la tienda: solo datos que cambian en la vida real y antes
// estaban fijos en el código (nombre, WhatsApp, umbral de inventario bajo).
import { api, textoError } from '../../api.js';
import { CONFIG } from '../../config.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, cargando, alerta, avisar } from '../../componentes/ui.js';
import { invalidarContenido } from '../../componentes/contenidoTienda.js';

export async function render(app) {
  const cont = adminLayout(app, '/admin/configuracion');
  cont.innerHTML = cargando('Cargando la configuración…');

  let c;
  try {
    c = await api('/admin/configuracion');
  } catch (error) {
    cont.innerHTML = alerta(textoError(error));
    return;
  }

  cont.innerHTML = `
    ${encabezadoAdmin('Configuración', 'Se aplica de inmediato en toda la tienda.')}
    <section class="mg-panel" style="max-width:640px">
      <form id="formConfig" novalidate>
        <div class="mb-3"><label class="form-label" for="nombre">Nombre de la tienda</label>
          <input id="nombre" class="form-control" maxlength="60" required value="${esc(c.nombre)}"></div>
        <div class="mb-3"><label class="form-label" for="whatsapp">WhatsApp del negocio</label>
          <input id="whatsapp" class="form-control" inputmode="numeric" maxlength="15" required value="${esc(c.whatsapp)}" aria-describedby="ayudaWa">
          <div id="ayudaWa" class="form-text">Solo dígitos, con el indicativo del país (57 para Colombia). Se usa en los enlaces de pago y de personalizados.</div>
          <div class="invalid-feedback">Escribe solo dígitos, entre 10 y 15.</div></div>
        <div class="mb-3"><label class="form-label" for="umbral">Inventario bajo: avisar con</label>
          <div class="input-group" style="max-width:240px"><input id="umbral" class="form-control" type="number" min="0" max="1000" step="1" required value="${esc(c.umbral_inventario_bajo)}"><span class="input-group-text">unidades o menos</span></div>
          <div class="invalid-feedback" id="errUmbral">Escribe un número entero entre 0 y 1000.</div></div>
        <button class="btn btn-primary" type="submit">Guardar configuración</button>
      </form>
    </section>`;

  cont.querySelector('#formConfig').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const wa = form.querySelector('#whatsapp');
    const umbral = Number(form.querySelector('#umbral').value);
    const nombre = form.querySelector('#nombre').value.trim();
    const waOk = /^\d{10,15}$/.test(wa.value.trim());
    const umbralOk = Number.isInteger(umbral) && umbral >= 0 && umbral <= 1000;
    wa.classList.toggle('is-invalid', !waOk);
    form.querySelector('#errUmbral').classList.toggle('d-block', !umbralOk);
    if (!waOk || !umbralOk || !nombre) return;
    try {
      const datos = await api('/admin/configuracion', {
        metodo: 'PATCH',
        cuerpo: { datos: { nombre, whatsapp: wa.value.trim(), umbral_inventario_bajo: umbral } },
      });
      CONFIG.WHATSAPP = datos.whatsapp;
      invalidarContenido();
      avisar('Configuración guardada.');
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });
}
