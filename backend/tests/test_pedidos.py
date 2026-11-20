
import json


class TestPedidos:
    """Pruebas de integracion para el dominio de pedidos de MUGLY."""

    def crear_producto(self, client, admin_auth, cantidad_stock=10):
        """Crea un producto con una cantidad de stock determinada."""
        resp = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug para pedidos",
                "descripcion": "Producto de prueba",
                "precio": 25000,
                "cantidad_stock": cantidad_stock,
            },
        )

        assert resp.status_code == 201
        return json.loads(resp.data)["data"]["id"]

    def consultar_stock(self, client, producto_id):
        """Consulta las existencias actuales de un producto."""
        resp = client.get(f"/api/v1/productos/{producto_id}")

        assert resp.status_code == 200
        return json.loads(resp.data)["data"]["cantidad_stock"]

    def crear_pedido(self, client, usuario_auth, producto_id):
        """Crea un pedido con dos unidades de un producto."""
        return client.post(
            "/api/v1/pedidos",
            headers=usuario_auth,
            json={
                "detalles": [
                    {
                        "producto_id": producto_id,
                        "cantidad": 2,
                    }
                ]
            },
        )

    def test_crear_pedido_exitoso(
        self, client, admin_auth, usuario_auth
    ):
        """Un usuario autenticado puede crear un pedido."""
        producto_id = self.crear_producto(client, admin_auth)

        resp = self.crear_pedido(client, usuario_auth, producto_id)
        datos = json.loads(resp.data)

        assert resp.status_code == 201
        assert datos["success"] is True
        assert datos["data"]["estado"] == "pendiente"
        assert datos["data"]["total"] == 50000.0
        assert len(datos["data"]["detalles"]) == 1
        assert datos["data"]["detalles"][0]["cantidad"] == 2

        # Crear un pedido pendiente no debe descontar inventario.
        assert self.consultar_stock(client, producto_id) == 10

    def test_crear_pedido_con_stock_insuficiente(
        self, client, admin_auth, usuario_auth
    ):
        """No se permite pedir más unidades que las disponibles."""
        producto_id = self.crear_producto(client, admin_auth)

        resp = client.post(
            "/api/v1/pedidos",
            headers=usuario_auth,
            json={
                "detalles": [
                    {
                        "producto_id": producto_id,
                        "cantidad": 11,
                    }
                ]
            },
        )

        datos = json.loads(resp.data)

        assert resp.status_code == 400
        assert datos["success"] is False
        assert self.consultar_stock(client, producto_id) == 10

    def test_crear_pedido_sin_stock(
        self, client, admin_auth, usuario_auth
    ):
        """No se permite crear pedidos cuando el stock es cero."""
        producto_id = self.crear_producto(
            client,
            admin_auth,
            cantidad_stock=0,
        )

        resp = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )

        assert resp.status_code == 400
        assert self.consultar_stock(client, producto_id) == 0

    def test_crear_pedido_sin_token(self, client):
        """Crear un pedido sin autenticacion debe responder 401."""
        resp = client.post(
            "/api/v1/pedidos",
            json={"detalles": [{"producto_id": 1, "cantidad": 1}]},
        )

        assert resp.status_code == 401

    def test_crear_pedido_sin_detalles(self, client, usuario_auth):
        """Un pedido sin detalles debe responder 400."""
        resp = client.post(
            "/api/v1/pedidos",
            headers=usuario_auth,
            json={"detalles": []},
        )

        assert resp.status_code == 400

    def test_crear_pedido_con_producto_inexistente(
        self, client, usuario_auth
    ):
        """No se puede pedir un producto inexistente."""
        resp = client.post(
            "/api/v1/pedidos",
            headers=usuario_auth,
            json={
                "detalles": [
                    {"producto_id": 99999, "cantidad": 1}
                ]
            },
        )

        assert resp.status_code == 400

    def test_listar_pedidos_usuario(
        self, client, admin_auth, usuario_auth
    ):
        """El usuario puede consultar sus propios pedidos."""
        producto_id = self.crear_producto(client, admin_auth)
        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )

        assert creado.status_code == 201

        resp = client.get(
            "/api/v1/pedidos",
            headers=usuario_auth,
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert len(datos["data"]) == 1

    def test_listar_pedidos_sin_token(self, client):
        """Listar pedidos sin autenticacion debe responder 401."""
        resp = client.get("/api/v1/pedidos")

        assert resp.status_code == 401

    def test_listar_todos_los_pedidos_admin(
        self, client, admin_auth, usuario_auth
    ):
        """Un administrador puede consultar todos los pedidos."""
        producto_id = self.crear_producto(client, admin_auth)
        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = client.get(
            "/api/v1/admin/pedidos",
            headers=admin_auth,
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert any(
            pedido["id"] == pedido_id
            for pedido in datos["data"]
        )

    def test_listar_todos_los_pedidos_usuario_no_autorizado(
        self, client, usuario_auth
    ):
        """Un usuario normal no puede consultar todos los pedidos."""
        resp = client.get(
            "/api/v1/admin/pedidos",
            headers=usuario_auth,
        )

        assert resp.status_code == 403

    def test_listar_todos_los_pedidos_sin_token(self, client):
        """Consultar todos los pedidos sin token debe responder 401."""
        resp = client.get("/api/v1/admin/pedidos")

        assert resp.status_code == 401

    def test_consultar_pedido_de_otro_usuario(
        self, client, admin_auth, usuario_auth, usuario_auth2
    ):
        """Un usuario no puede consultar el pedido de otro."""
        producto_id = self.crear_producto(client, admin_auth)
        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = client.get(
            f"/api/v1/pedidos/{pedido_id}",
            headers=usuario_auth2,
        )

        assert resp.status_code == 404

    def test_consultar_pedido_inexistente(self, client, usuario_auth):
        """Consultar un pedido inexistente debe responder 404."""
        resp = client.get(
            "/api/v1/pedidos/99999",
            headers=usuario_auth,
        )

        assert resp.status_code == 404

    # --------------------------------------------------------
    # Ciclo de estados y confirmacion de pago por el admin
    # (MUG-13, MUG-14, MUG-15)
    # --------------------------------------------------------

    def cambiar_estado(self, client, admin_auth, pedido_id, **datos):
        return client.patch(
            f"/api/v1/admin/pedidos/{pedido_id}/estado",
            headers=admin_auth,
            json=datos,
        )

    def pedido_pendiente(self, client, admin_auth, usuario_auth):
        producto_id = self.crear_producto(client, admin_auth)
        creado = self.crear_pedido(client, usuario_auth, producto_id)
        return producto_id, json.loads(creado.data)["data"]["id"]

    def test_admin_confirma_pago_y_descuenta_inventario(
        self, client, admin_auth, usuario_auth
    ):
        """Pasar a pagado descuenta el stock y queda en el historial."""
        producto_id, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="pagado"
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["data"]["estado"] == "pagado"
        assert [h["estado"] for h in datos["data"]["historial"]] == [
            "pendiente",
            "pagado",
        ]
        assert self.consultar_stock(client, producto_id) == 8

    def test_cliente_no_puede_confirmar_su_pago(
        self, client, admin_auth, usuario_auth
    ):
        """El cliente no puede usar la ruta administrativa: 403."""
        producto_id, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = self.cambiar_estado(
            client, usuario_auth, pedido_id, estado="pagado"
        )

        assert resp.status_code == 403
        assert self.consultar_stock(client, producto_id) == 10

    def test_ruta_de_pago_del_cliente_ya_no_existe(
        self, client, admin_auth, usuario_auth
    ):
        """La ruta antigua de resultado de pago fue eliminada (ADR-005)."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "confirmado"},
        )

        assert resp.status_code in (404, 405)

    def test_pago_no_descuenta_inventario_dos_veces(
        self, client, admin_auth, usuario_auth
    ):
        """Un pedido pagado no puede volver a pagarse."""
        producto_id, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        primera = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="pagado"
        )
        segunda = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="pagado"
        )

        assert primera.status_code == 200
        assert segunda.status_code == 400
        assert self.consultar_stock(client, producto_id) == 8

    def test_cancelar_pedido_pendiente_no_descuenta(
        self, client, admin_auth, usuario_auth
    ):
        """Cancelar un pedido pendiente no modifica el inventario."""
        producto_id, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="cancelado"
        )

        assert resp.status_code == 200
        assert json.loads(resp.data)["data"]["estado"] == "cancelado"
        assert self.consultar_stock(client, producto_id) == 10

    def test_no_se_cancela_un_pedido_pagado(
        self, client, admin_auth, usuario_auth
    ):
        """Solo los pedidos pendientes se pueden cancelar."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )
        self.cambiar_estado(client, admin_auth, pedido_id, estado="pagado")

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="cancelado"
        )

        assert resp.status_code == 400

    def test_estado_invalido_responde_400(
        self, client, admin_auth, usuario_auth
    ):
        """Un estado fuera de la lista es rechazado por el DTO."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="otro"
        )

        assert resp.status_code == 400

    def test_no_se_salta_estados(
        self, client, admin_auth, usuario_auth
    ):
        """No se puede pasar de pendiente a enviado sin pagar."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = self.cambiar_estado(
            client,
            admin_auth,
            pedido_id,
            estado="enviado",
            transportadora="Servientrega",
            numero_guia="123",
        )

        assert resp.status_code == 400

    def test_enviar_exige_transportadora_y_guia(
        self, client, admin_auth, usuario_auth
    ):
        """Pasar a enviado sin datos de envio responde 400."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )
        self.cambiar_estado(client, admin_auth, pedido_id, estado="pagado")

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="enviado"
        )

        assert resp.status_code == 400

    def test_ciclo_completo_con_envio_visible_para_el_cliente(
        self, client, admin_auth, usuario_auth
    ):
        """pendiente, pagado, enviado y entregado; el cliente ve la guia."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        self.cambiar_estado(client, admin_auth, pedido_id, estado="pagado")
        enviado = self.cambiar_estado(
            client,
            admin_auth,
            pedido_id,
            estado="enviado",
            transportadora="Servientrega",
            numero_guia="GU-001",
        )
        entregado = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="entregado"
        )

        assert enviado.status_code == 200
        assert entregado.status_code == 200

        consulta = client.get(
            f"/api/v1/pedidos/{pedido_id}",
            headers=usuario_auth,
        )
        datos = json.loads(consulta.data)["data"]

        assert datos["estado"] == "entregado"
        assert datos["transportadora"] == "Servientrega"
        assert datos["numero_guia"] == "GU-001"
        assert len(datos["historial"]) == 4

    def test_admin_consulta_detalle_de_cualquier_pedido(
        self, client, admin_auth, usuario_auth
    ):
        """El administrador ve el detalle de pedidos de otros usuarios."""
        _, pedido_id = self.pedido_pendiente(
            client, admin_auth, usuario_auth
        )

        resp = client.get(
            f"/api/v1/admin/pedidos/{pedido_id}",
            headers=admin_auth,
        )

        assert resp.status_code == 200
        assert json.loads(resp.data)["data"]["id"] == pedido_id

    # --------------------------------------------------------
    # Pedidos personalizados (MUG-16)
    # --------------------------------------------------------

    def id_de_usuario(self, client, auth):
        resp = client.get("/api/v1/usuarios/perfil", headers=auth)
        return json.loads(resp.data)["data"]["usuario_id"]

    def test_admin_registra_pedido_personalizado(
        self, client, admin_auth, usuario_auth
    ):
        """El pedido personalizado queda asociado al cliente."""
        cliente_id = self.id_de_usuario(client, usuario_auth)

        resp = client.post(
            "/api/v1/admin/pedidos/personalizados",
            headers=admin_auth,
            json={
                "usuario_id": cliente_id,
                "descripcion": "Mug con foto familiar",
                "total": 45000,
            },
        )
        datos = json.loads(resp.data)["data"]

        assert resp.status_code == 201
        assert datos["tipo"] == "personalizado"
        assert datos["estado"] == "pendiente"
        assert datos["total"] == 45000.0

        mis_pedidos = client.get("/api/v1/pedidos", headers=usuario_auth)
        assert any(
            p["id"] == datos["id"]
            for p in json.loads(mis_pedidos.data)["data"]
        )

    def test_personalizado_pagado_no_toca_inventario(
        self, client, admin_auth, usuario_auth
    ):
        """Un personalizado se puede pagar aunque no tenga productos."""
        cliente_id = self.id_de_usuario(client, usuario_auth)
        creado = client.post(
            "/api/v1/admin/pedidos/personalizados",
            headers=admin_auth,
            json={
                "usuario_id": cliente_id,
                "descripcion": "Mug con logo",
                "total": 30000,
            },
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = self.cambiar_estado(
            client, admin_auth, pedido_id, estado="pagado"
        )

        assert resp.status_code == 200

    def test_personalizado_para_usuario_inexistente(
        self, client, admin_auth
    ):
        """Registrar un personalizado para un usuario inexistente: 404."""
        resp = client.post(
            "/api/v1/admin/pedidos/personalizados",
            headers=admin_auth,
            json={
                "usuario_id": 99999,
                "descripcion": "Mug",
                "total": 1000,
            },
        )

        assert resp.status_code == 404

    def test_cliente_no_registra_personalizados(self, client, usuario_auth):
        """Solo el administrador registra personalizados: 403."""
        resp = client.post(
            "/api/v1/admin/pedidos/personalizados",
            headers=usuario_auth,
            json={"usuario_id": 1, "descripcion": "Mug", "total": 1000},
        )

        assert resp.status_code == 403
