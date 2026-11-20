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

    # --------------------------------------------------------
    # Catalogo, imagen y retiro logico (MUG-18, MUG-19, MUG-20)
    # --------------------------------------------------------

    PNG_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    def crear(self, client, admin_auth, **extra):
        datos = {"nombre": "Mug", "descripcion": "Prueba", "precio": 20000}
        datos.update(extra)
        resp = client.post("/api/v1/productos", headers=admin_auth, json=datos)
        return json.loads(resp.data)["data"]["id"]

    def test_catalogo_publico_excluye_no_disponibles(
        self, client, admin_auth
    ):
        """El catalogo publico y el detalle ocultan productos no disponibles."""
        oculto = self.crear(client, admin_auth, disponible=False)

        lista = json.loads(client.get("/api/v1/productos").data)["data"]
        assert all(p["id"] != oculto for p in lista)
        assert client.get(f"/api/v1/productos/{oculto}").status_code == 404

    def test_admin_lista_todos_los_productos(self, client, admin_auth):
        """El administrador ve tambien los no disponibles."""
        oculto = self.crear(client, admin_auth, disponible=False)

        resp = client.get("/api/v1/admin/productos", headers=admin_auth)

        assert resp.status_code == 200
        assert any(
            p["id"] == oculto for p in json.loads(resp.data)["data"]
        )

    def test_subir_imagen_y_servirla(self, client, admin_auth):
        """El administrador sube una foto PNG y la API la sirve."""
        import io

        producto_id = self.crear(client, admin_auth)

        resp = client.post(
            f"/api/v1/productos/{producto_id}/imagen",
            headers={"Authorization": admin_auth["Authorization"]},
            data={"imagen": (io.BytesIO(self.PNG_1x1), "foto.png", "image/png")},
            content_type="multipart/form-data",
        )
        datos = json.loads(resp.data)["data"]

        assert resp.status_code == 200
        assert datos["imagen"].startswith("/uploads/")
        assert client.get(datos["imagen"]).status_code == 200

    def test_imagen_con_formato_no_permitido(self, client, admin_auth):
        """Un archivo que no es JPG, PNG o WEBP responde 400."""
        import io

        producto_id = self.crear(client, admin_auth)

        resp = client.post(
            f"/api/v1/productos/{producto_id}/imagen",
            headers={"Authorization": admin_auth["Authorization"]},
            data={"imagen": (io.BytesIO(b"hola"), "texto.txt", "text/plain")},
            content_type="multipart/form-data",
        )

        assert resp.status_code == 400

    def test_cliente_no_sube_imagenes(self, client, admin_auth, usuario_auth):
        """Solo el administrador sube fotos: 403."""
        import io

        producto_id = self.crear(client, admin_auth)

        resp = client.post(
            f"/api/v1/productos/{producto_id}/imagen",
            headers={"Authorization": usuario_auth["Authorization"]},
            data={"imagen": (io.BytesIO(self.PNG_1x1), "foto.png", "image/png")},
            content_type="multipart/form-data",
        )

        assert resp.status_code == 403

    def test_producto_con_pedidos_se_retira_y_no_se_borra(
        self, client, admin_auth, usuario_auth
    ):
        """Eliminar un producto con pedidos lo marca no disponible."""
        producto_id = self.crear(client, admin_auth, cantidad_stock=5)
        client.post(
            "/api/v1/pedidos",
            headers=usuario_auth,
            json={"detalles": [{"producto_id": producto_id, "cantidad": 1}]},
        )

        resp = client.delete(
            f"/api/v1/productos/{producto_id}",
            headers=admin_auth,
        )

        assert resp.status_code == 200
        assert json.loads(resp.data)["data"]["disponible"] is False

        pedidos = json.loads(
            client.get("/api/v1/pedidos", headers=usuario_auth).data
        )["data"]
        assert pedidos[0]["detalles"][0]["producto_id"] == producto_id
