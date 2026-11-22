"""Pruebas de la solicitud de cambio CR-02 (v1.3.0): RF29–RF35, RN22–RN27."""
import uuid

API = "/api/v1"


def _cliente_payload(**extra):
    datos = {
        "correo": f"wa-{uuid.uuid4().hex[:8]}@ejemplo.com",
        "nombre": "Rosa", "apellido": "Mejía", "telefono": "300 000 0999",
        "tipo_documento": "CC", "numero_documento": str(uuid.uuid4().int)[:10],
        "departamento": "Antioquia", "ciudad": "Medellín", "direccion": "Cl 50 # 40-10",
    }
    datos.update(extra)
    return datos


def _producto(client, admin_auth, **extra):
    datos = {"nombre": "Mug prueba", "descripcion": "Mug de prueba", "precio": 30000, "cantidad_stock": 10}
    datos.update(extra)
    resp = client.post(f"{API}/productos", json=datos, headers=admin_auth)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()["data"]


def _pedido_pagado(client, admin_auth, usuario_auth, cantidad=2):
    prod = _producto(client, admin_auth)
    resp = client.post(f"{API}/pedidos", json={"detalles": [{"producto_id": prod["id"], "cantidad": cantidad}]}, headers=usuario_auth)
    pedido = resp.get_json()["data"]
    resp = client.patch(f"{API}/admin/pedidos/{pedido['id']}/estado", json={"estado": "pagado"}, headers=admin_auth)
    assert resp.status_code == 200
    return pedido, prod


class TestClientesRF29:
    def test_crear_cliente_devuelve_enlace_de_activacion(self, client, admin_auth):
        resp = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth)
        assert resp.status_code == 201
        datos = resp.get_json()["data"]
        assert datos["perfil"]["ciudad"] == "Medellín"
        assert datos["enlace"]["tipo"] == "activar" and datos["enlace"]["token"]

    def test_cliente_activa_cuenta_con_el_enlace_una_sola_vez(self, client, admin_auth):
        datos = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth).get_json()["data"]
        token = datos["enlace"]["token"]
        assert client.post(f"{API}/usuarios/restablecer-contrasena", json={"token": token, "contrasena": "nueva123"}).status_code == 200
        login = client.post(f"{API}/usuarios/login", json={"correo": datos["correo"], "contrasena": "nueva123"})
        assert login.status_code == 200
        # El mismo enlace ya no sirve
        assert client.post(f"{API}/usuarios/restablecer-contrasena", json={"token": token, "contrasena": "otra123"}).status_code == 400

    def test_correo_duplicado_al_crear(self, client, admin_auth):
        datos = _cliente_payload()
        client.post(f"{API}/admin/usuarios", json=datos, headers=admin_auth)
        assert client.post(f"{API}/admin/usuarios", json=datos, headers=admin_auth).status_code == 400

    def test_documento_invalido(self, client, admin_auth):
        resp = client.post(f"{API}/admin/usuarios", json=_cliente_payload(numero_documento="1.0"), headers=admin_auth)
        assert resp.status_code == 400

    def test_admin_edita_datos_de_envio(self, client, admin_auth):
        uid = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth).get_json()["data"]["id"]
        resp = client.patch(f"{API}/admin/usuarios/{uid}", json={"ciudad": "Cali", "direccion": "Av 6N # 23-40"}, headers=admin_auth)
        assert resp.get_json()["data"]["perfil"]["ciudad"] == "Cali"

    def test_buscar_cliente_por_documento(self, client, admin_auth):
        datos = _cliente_payload(numero_documento="9876543210")
        client.post(f"{API}/admin/usuarios", json=datos, headers=admin_auth)
        resp = client.get(f"{API}/admin/usuarios?q=9876543210", headers=admin_auth)
        assert any(i["numero_documento"] == "9876543210" for i in resp.get_json()["data"]["items"])

    def test_eliminar_cliente_sin_pedidos(self, client, admin_auth):
        uid = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth).get_json()["data"]["id"]
        assert client.delete(f"{API}/admin/usuarios/{uid}", headers=admin_auth).status_code == 204
        assert client.get(f"{API}/admin/usuarios/{uid}", headers=admin_auth).status_code == 404

    def test_no_se_elimina_cliente_con_pedidos_rn24(self, client, admin_auth, usuario_auth):
        pedido, _ = _pedido_pagado(client, admin_auth, usuario_auth)
        resp = client.delete(f"{API}/admin/usuarios/{pedido['usuario_id']}", headers=admin_auth)
        assert resp.status_code == 400

    def test_enlace_restablecer_lo_genera_solo_el_admin(self, client, admin_auth, usuario_auth):
        uid = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth).get_json()["data"]["id"]
        assert client.post(f"{API}/admin/usuarios/{uid}/enlace-acceso", json={}, headers=usuario_auth).status_code == 403
        resp = client.post(f"{API}/admin/usuarios/{uid}/enlace-acceso", json={"tipo": "restablecer"}, headers=admin_auth)
        assert resp.status_code == 201 and resp.get_json()["data"]["tipo"] == "restablecer"

    def test_cambiar_contrasena_propia(self, client, usuario_auth):
        mal = client.patch(f"{API}/usuarios/contrasena", json={"actual": "otra", "nueva": "abcdef"}, headers=usuario_auth)
        assert mal.status_code == 400
        ok = client.patch(f"{API}/usuarios/contrasena", json={"actual": "123456", "nueva": "abcdef"}, headers=usuario_auth)
        assert ok.status_code == 200


class TestProductosRF30:
    def test_tipos_crear_renombrar_y_no_eliminar_en_uso(self, client, admin_auth):
        nombre = f"Vaso tinto {uuid.uuid4().hex[:4]}"
        tipo = client.post(f"{API}/admin/tipos-producto", json={"nombre": nombre}, headers=admin_auth).get_json()["data"]
        assert client.post(f"{API}/admin/tipos-producto", json={"nombre": nombre.upper()}, headers=admin_auth).status_code == 409
        _producto(client, admin_auth, tipo_id=tipo["id"], referencia=f"VT-{uuid.uuid4().hex[:5]}")
        assert client.delete(f"{API}/admin/tipos-producto/{tipo['id']}", headers=admin_auth).status_code == 409
        resp = client.patch(f"{API}/admin/tipos-producto/{tipo['id']}", json={"nombre": nombre + " grande"}, headers=admin_auth)
        assert resp.get_json()["data"]["productos"] == 1

    def test_eliminar_tipo_sin_productos(self, client, admin_auth):
        tipo = client.post(f"{API}/admin/tipos-producto", json={"nombre": f"T-{uuid.uuid4().hex[:6]}"}, headers=admin_auth).get_json()["data"]
        assert client.delete(f"{API}/admin/tipos-producto/{tipo['id']}", headers=admin_auth).status_code == 204

    def test_referencia_unica_rn27(self, client, admin_auth):
        ref = f"MG-{uuid.uuid4().hex[:5]}"
        prod = _producto(client, admin_auth, referencia=ref.lower())
        assert prod["referencia"] == ref.upper()
        resp = client.post(f"{API}/productos", json={"nombre": "Otro", "descripcion": "x", "precio": 1000, "referencia": ref}, headers=admin_auth)
        assert resp.status_code == 409


class TestPedidosRF31RF32:
    def test_pedido_copia_direccion_del_perfil(self, client, admin_auth, usuario_auth):
        client.patch(f"{API}/usuarios/perfil", json={"ciudad": "Pereira", "direccion": "Cl 19 # 8-34", "departamento": "Risaralda"}, headers=usuario_auth)
        pedido, _ = _pedido_pagado(client, admin_auth, usuario_auth)
        detalle = client.get(f"{API}/admin/pedidos/{pedido['id']}", headers=admin_auth).get_json()["data"]
        assert detalle["envio"]["ciudad"] == "Pereira"

    def test_archivo_solo_pedidos_cerrados_rn25(self, client, admin_auth, usuario_auth):
        pedido, _ = _pedido_pagado(client, admin_auth, usuario_auth)
        assert client.patch(f"{API}/admin/pedidos/{pedido['id']}/archivo", json={"archivado": True}, headers=admin_auth).status_code == 400
        client.patch(f"{API}/admin/pedidos/{pedido['id']}/estado", json={"estado": "enviado", "transportadora": "Envía", "numero_guia": "EN-1"}, headers=admin_auth)
        client.patch(f"{API}/admin/pedidos/{pedido['id']}/estado", json={"estado": "entregado"}, headers=admin_auth)
        resp = client.patch(f"{API}/admin/pedidos/{pedido['id']}/archivo", json={"archivado": True}, headers=admin_auth)
        assert resp.get_json()["data"]["archivado"] is True and resp.get_json()["data"]["estado"] == "entregado"
        activos = client.get(f"{API}/admin/pedidos?vista=activos&q={pedido['id']}", headers=admin_auth).get_json()["data"]["items"]
        archivo = client.get(f"{API}/admin/pedidos?vista=archivo&q={pedido['id']}", headers=admin_auth).get_json()["data"]["items"]
        assert not activos and archivo

    def test_reembolso_parcial_y_total_rn22(self, client, admin_auth, usuario_auth):
        pedido, prod = _pedido_pagado(client, admin_auth, usuario_auth, cantidad=2)
        url = f"{API}/admin/pedidos/{pedido['id']}/reembolsos"
        parcial = client.post(url, json={"tipo": "reembolso", "monto": 10000, "motivo": "Producto defectuoso o dañado"}, headers=admin_auth)
        assert parcial.status_code == 201 and parcial.get_json()["data"]["estado"] == "pagado"
        excede = client.post(url, json={"tipo": "reembolso", "monto": 999999, "motivo": "x"}, headers=admin_auth)
        assert excede.status_code == 400
        stock_antes = client.get(f"{API}/productos/{prod['id']}").get_json()["data"]["cantidad_stock"]
        total = client.post(url, json={"tipo": "devolucion", "motivo": "Error en el pedido", "reingresar": True}, headers=admin_auth)
        datos = total.get_json()["data"]
        assert datos["estado"] == "reembolsado" and datos["reembolsado"] == datos["total"]
        stock_despues = client.get(f"{API}/productos/{prod['id']}").get_json()["data"]["cantidad_stock"]
        assert stock_despues == stock_antes + 2

    def test_no_se_reembolsa_pedido_pendiente(self, client, admin_auth, usuario_auth):
        prod = _producto(client, admin_auth)
        pedido = client.post(f"{API}/pedidos", json={"detalles": [{"producto_id": prod["id"], "cantidad": 1}]}, headers=usuario_auth).get_json()["data"]
        resp = client.post(f"{API}/admin/pedidos/{pedido['id']}/reembolsos", json={"tipo": "reembolso", "motivo": "x"}, headers=admin_auth)
        assert resp.status_code == 400

    def test_personalizado_con_datos_acordados_y_pagado(self, client, admin_auth):
        uid = client.post(f"{API}/admin/usuarios", json=_cliente_payload(), headers=admin_auth).get_json()["data"]["id"]
        resp = client.post(f"{API}/admin/pedidos/personalizados", json={
            "usuario_id": uid, "descripcion": "Mug con foto", "total": 90000, "cantidad": 2,
            "mug_base": "Mágico", "transportadora_acordada": "Envía", "entrega_acordada": "2026-12-01", "pagado": True,
        }, headers=admin_auth)
        datos = resp.get_json()["data"]
        assert resp.status_code == 201 and datos["estado"] == "pagado" and datos["cantidad_personalizado"] == 2
        assert datos["envio"]["ciudad"] == "Medellín"


class TestReportesRF33:
    def test_reporte_con_anterior_reembolsos_y_semana(self, client, admin_auth, usuario_auth):
        pedido, _ = _pedido_pagado(client, admin_auth, usuario_auth)
        client.post(f"{API}/admin/pedidos/{pedido['id']}/reembolsos", json={"tipo": "reembolso", "monto": 5000, "motivo": "x"}, headers=admin_auth)
        r = client.get(f"{API}/admin/reportes/ventas?agrupar=semana", headers=admin_auth).get_json()["data"]
        ind = r["indicadores"]
        assert ind["reembolsos"]["valor"] >= 5000
        assert ind["ventas_netas"] == ind["ventas_confirmadas"]["valor"] - ind["reembolsos"]["valor"]
        assert "anterior" in r and r["agrupar"] == "semana"

    def test_detalle_de_producto(self, client, admin_auth, usuario_auth):
        _, prod = _pedido_pagado(client, admin_auth, usuario_auth, cantidad=3)
        r = client.get(f"{API}/admin/reportes/productos/{prod['id']}", headers=admin_auth).get_json()["data"]
        assert r["unidades"] == 3 and len(r["por_hora"]) == 24 and len(r["por_dia_semana"]) == 7
        assert r["compradores"][0]["unidades"] == 3
