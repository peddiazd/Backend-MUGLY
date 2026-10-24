
import json


class TestPedidos:
    """Pruebas de integracion para el dominio de pedidos de MUGLY."""

    def crear_producto(self, client, admin_auth):
        """Crea un producto para utilizarlo en las pruebas."""
        resp = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug para pedidos",
                "descripcion": "Producto de prueba",
                "precio": 25000,
            },
        )

        assert resp.status_code == 201
        return json.loads(resp.data)["data"]["id"]

    def crear_pedido(self, client, usuario_auth, producto_id):
        """Crea un pedido con un producto."""
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
        creado = self.crear_pedido(client, usuario_auth, producto_id)

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

    def test_consultar_pedido_de_otro_usuario(
        self, client, admin_auth, usuario_auth, usuario_auth2
    ):
        """Un usuario no puede consultar el pedido de otro."""
        producto_id = self.crear_producto(client, admin_auth)
        creado = self.crear_pedido(client, usuario_auth, producto_id)
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
