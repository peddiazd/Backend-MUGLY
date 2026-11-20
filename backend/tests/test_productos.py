import json


class TestProductos:
    """Pruebas de integracion para el dominio de productos de MUGLY."""

    def test_crear_producto_con_admin(self, client, admin_auth):
        """Un administrador puede crear un producto: 201."""
        resp = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug clasico",
                "descripcion": "Mug de ceramica",
                "precio": 25000,
            },
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 201
        assert datos["success"] is True
        assert datos["data"]["nombre"] == "Mug clasico"

    def test_crear_producto_sin_token(self, client):
        """Crear sin token debe responder 401."""
        resp = client.post(
            "/api/v1/productos",
            json={
                "nombre": "Mug clasico",
                "descripcion": "Mug de ceramica",
                "precio": 25000,
            },
        )

        assert resp.status_code == 401

    def test_crear_producto_con_usuario_normal(self, client, usuario_auth):
        """Un usuario normal no puede crear productos: 403."""
        resp = client.post(
            "/api/v1/productos",
            headers=usuario_auth,
            json={
                "nombre": "Mug clasico",
                "descripcion": "Mug de ceramica",
                "precio": 25000,
            },
        )

        assert resp.status_code == 403

    def test_listar_productos_sin_auth(self, client):
        """Consultar el catalogo sin autenticacion debe responder 200."""
        resp = client.get("/api/v1/productos")
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert isinstance(datos["data"], list)

    def test_detalle_producto_sin_auth(self, client, admin_auth):
        """Consultar el detalle de un producto es publico."""
        creado = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug detalle",
                "descripcion": "Producto para consultar",
                "precio": 20000,
            },
        )
        producto_id = json.loads(creado.data)["data"]["id"]

        resp = client.get(f"/api/v1/productos/{producto_id}")
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert datos["data"]["nombre"] == "Mug detalle"

    def test_detalle_producto_inexistente(self, client):
        """Consultar un producto inexistente debe responder 404."""
        resp = client.get("/api/v1/productos/99999")
        datos = json.loads(resp.data)

        assert resp.status_code == 404
        assert datos["success"] is False

    def test_actualizar_producto_con_usuario_normal(
        self, client, admin_auth, usuario_auth
    ):
        """Un usuario normal no puede actualizar productos: 403."""
        creado = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug original",
                "descripcion": "Descripcion original",
                "precio": 18000,
            },
        )
        producto_id = json.loads(creado.data)["data"]["id"]

        resp = client.patch(
            f"/api/v1/productos/{producto_id}",
            headers=usuario_auth,
            json={"nombre": "Mug modificado"},
        )

        assert resp.status_code == 403

    def test_eliminar_producto_con_usuario_normal(
        self, client, admin_auth, usuario_auth
    ):
        """Un usuario normal no puede eliminar productos: 403."""
        creado = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug para eliminar",
                "descripcion": "Prueba de permisos",
                "precio": 15000,
            },
        )
        producto_id = json.loads(creado.data)["data"]["id"]

        resp = client.delete(
            f"/api/v1/productos/{producto_id}",
            headers=usuario_auth,
        )

        assert resp.status_code == 403

    def test_actualizar_producto_con_admin(self, client, admin_auth):
        """Un administrador puede actualizar productos: 200."""
        creado = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug antes",
                "descripcion": "Descripcion original",
                "precio": 18000,
            },
        )
        producto_id = json.loads(creado.data)["data"]["id"]

        resp = client.patch(
            f"/api/v1/productos/{producto_id}",
            headers=admin_auth,
            json={"nombre": "Mug actualizado"},
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["data"]["nombre"] == "Mug actualizado"
        assert datos["data"]["descripcion"] == "Descripcion original"

    def test_eliminar_producto_con_admin(self, client, admin_auth):
        """Un administrador puede eliminar productos: 204."""
        creado = client.post(
            "/api/v1/productos",
            headers=admin_auth,
            json={
                "nombre": "Mug temporal",
                "descripcion": "Producto para eliminar",
                "precio": 12000,
            },
        )
        producto_id = json.loads(creado.data)["data"]["id"]

        resp = client.delete(
            f"/api/v1/productos/{producto_id}",
            headers=admin_auth,
        )

        assert resp.status_code == 204

        consulta = client.get(f"/api/v1/productos/{producto_id}")
        assert consulta.status_code == 404
