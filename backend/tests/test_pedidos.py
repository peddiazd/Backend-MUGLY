
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

    def test_pago_confirmado_descuenta_inventario(
        self, client, admin_auth, usuario_auth
    ):
        """Un pago confirmado descuenta las unidades del pedido."""
        producto_id = self.crear_producto(client, admin_auth)

        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "confirmado"},
        )

        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert datos["data"]["estado_pago"] == "confirmado"
        assert self.consultar_stock(client, producto_id) == 8

    def test_pago_rechazado_no_descuenta_inventario(
        self, client, admin_auth, usuario_auth
    ):
        """Un pago rechazado no modifica las existencias."""
        producto_id = self.crear_producto(client, admin_auth)

        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "rechazado"},
        )

        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["data"]["estado_pago"] == "rechazado"
        assert self.consultar_stock(client, producto_id) == 10

    def test_pago_no_puede_descontar_inventario_dos_veces(
        self, client, admin_auth, usuario_auth
    ):
        """Un pedido procesado no puede descontar stock nuevamente."""
        producto_id = self.crear_producto(client, admin_auth)

        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        primera_respuesta = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "confirmado"},
        )

        segunda_respuesta = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "confirmado"},
        )

        assert primera_respuesta.status_code == 200
        assert segunda_respuesta.status_code == 400
        assert self.consultar_stock(client, producto_id) == 8

    def test_pago_con_resultado_invalido(
        self, client, admin_auth, usuario_auth
    ):
        """Un resultado inválido no modifica el pedido ni el inventario."""
        producto_id = self.crear_producto(client, admin_auth)

        creado = self.crear_pedido(
            client,
            usuario_auth,
            producto_id,
        )
        pedido_id = json.loads(creado.data)["data"]["id"]

        resp = client.post(
            f"/api/v1/pedidos/{pedido_id}/resultado-pago",
            headers=usuario_auth,
            json={"resultado": "otro"},
        )

        assert resp.status_code == 400
        assert self.consultar_stock(client, producto_id) == 10

        consulta = client.get(
            f"/api/v1/pedidos/{pedido_id}",
            headers=usuario_auth,
        )

        datos = json.loads(consulta.data)
        assert datos["data"]["estado_pago"] == "pendiente"
