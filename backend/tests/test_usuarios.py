import json


class TestRegistroUsuario:
    """Pruebas de integracion para registro de usuarios."""

    def test_registro_exitoso(self, client):
        """Registro valido debe responder 201."""
        resp = client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "nuevo@ejemplo.com",
                "contrasena": "123456",
            },
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 201
        assert datos["success"] is True
        assert datos["data"]["correo"] == "nuevo@ejemplo.com"

    def test_email_duplicado(self, client):
        """Registrar dos veces el mismo email debe responder 400."""
        client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "duplicado@ejemplo.com",
                "contrasena": "123456",
            },
        )
        resp = client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "duplicado@ejemplo.com",
                "contrasena": "123456",
            },
        )

        assert resp.status_code == 400

    def test_contrasena_corta(self, client):
        """Contrasena menor a 6 caracteres debe responder 400."""
        resp = client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "corta@ejemplo.com",
                "contrasena": "123",
            },
        )

        assert resp.status_code == 400

    def test_email_invalido(self, client):
        """Email sin formato valido debe responder 400."""
        resp = client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "no-es-email",
                "contrasena": "123456",
            },
        )

        assert resp.status_code == 400


class TestLogin:
    """Pruebas de integracion para login."""

    def test_login_exitoso(self, client):
        """Login valido debe devolver token y responder 200."""
        client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "login@ejemplo.com",
                "contrasena": "123456",
            },
        )
        resp = client.post(
            "/api/v1/usuarios/login",
            json={
                "correo": "login@ejemplo.com",
                "contrasena": "123456",
            },
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert "access_token" in datos["data"]

    def test_credenciales_invalidas(self, client):
        """Contrasena incorrecta debe responder 401."""
        client.post(
            "/api/v1/usuarios/registro",
            json={
                "correo": "wrong@ejemplo.com",
                "contrasena": "123456",
            },
        )
        resp = client.post(
            "/api/v1/usuarios/login",
            json={
                "correo": "wrong@ejemplo.com",
                "contrasena": "incorrecta",
            },
        )

        assert resp.status_code == 401

    def test_usuario_no_existente(self, client):
        """Usuario inexistente debe responder 401."""
        resp = client.post(
            "/api/v1/usuarios/login",
            json={
                "correo": "fantasma@ejemplo.com",
                "contrasena": "123456",
            },
        )

        assert resp.status_code == 401


class TestPerfil:
    """Pruebas de integracion para consulta y actualizacion de perfil."""

    def test_perfil_sin_token(self, client):
        """GET /perfil sin token debe responder 401."""
        resp = client.get("/api/v1/usuarios/perfil")

        assert resp.status_code == 401

    def test_perfil_con_token(self, client, usuario_auth):
        """GET /perfil con token valido debe responder 200."""
        resp = client.get(
            "/api/v1/usuarios/perfil",
            headers=usuario_auth,
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert "data" in datos

    def test_actualizar_perfil(self, client, usuario_auth):
        """PATCH /perfil con datos validos debe responder 200."""
        resp = client.patch(
            "/api/v1/usuarios/perfil",
            headers=usuario_auth,
            json={
                "nombre": "Maria",
                "apellido": "Lopez",
                "telefono": "+34600111222",
            },
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["data"]["nombre"] == "Maria"
        assert datos["data"]["apellido"] == "Lopez"

    def test_actualizacion_parcial(self, client, usuario_auth):
        """Actualizar un solo campo no debe borrar los demas."""
        r1 = client.patch(
            "/api/v1/usuarios/perfil",
            headers=usuario_auth,
            json={
                "nombre": "Ana",
                "apellido": "Garcia",
            },
        )
        assert r1.status_code == 200

        resp = client.patch(
            "/api/v1/usuarios/perfil",
            headers=usuario_auth,
            json={
                "telefono": "+34600333444",
            },
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["data"]["telefono"] == "+34600333444"
        assert datos["data"]["nombre"] == "Ana"
        assert datos["data"]["apellido"] == "Garcia"


class TestAutorizacionAdmin:
    """Pruebas de autorizacion para endpoints de administrador."""

    def test_admin_sin_token(self, client):
        """Sin token debe responder 401."""
        resp = client.get("/api/v1/admin/usuarios")

        assert resp.status_code == 401

    def test_admin_con_usuario_normal(self, client, usuario_auth):
        """Un usuario normal debe recibir 403."""
        resp = client.get(
            "/api/v1/admin/usuarios",
            headers=usuario_auth,
        )

        assert resp.status_code == 403

    def test_admin_con_admin(self, client, admin_auth):
        """Un administrador debe recibir 200 y la lista de usuarios."""
        resp = client.get(
            "/api/v1/admin/usuarios",
            headers=admin_auth,
        )
        datos = json.loads(resp.data)

        assert resp.status_code == 200
        assert datos["success"] is True
        assert isinstance(datos["data"], list)

        # Verificar que no se expongan contrasenas
        for usuario in datos["data"]:
            assert "contrasena" not in usuario


class TestGestionClientes:
    """Gestion de clientes por el administrador (MUG-17)."""

    def registrar(self, client):
        import uuid

        correo = f"cli-{uuid.uuid4().hex[:8]}@ejemplo.com"
        client.post(
            "/api/v1/usuarios/registro",
            json={"correo": correo, "contrasena": "123456"},
        )
        login = client.post(
            "/api/v1/usuarios/login",
            json={"correo": correo, "contrasena": "123456"},
        )
        datos = json.loads(login.data)["data"]
        return correo, datos["usuario"]["id"], {
            "Authorization": f"Bearer {datos['access_token']}"
        }

    def test_admin_consulta_detalle_de_cliente(self, client, admin_auth):
        _, cliente_id, _ = self.registrar(client)

        resp = client.get(
            f"/api/v1/admin/usuarios/{cliente_id}", headers=admin_auth
        )
        datos = json.loads(resp.data)["data"]

        assert resp.status_code == 200
        assert datos["activo"] is True
        assert datos["perfil"]["usuario_id"] == cliente_id

    def test_admin_edita_datos_del_cliente(self, client, admin_auth):
        _, cliente_id, _ = self.registrar(client)

        resp = client.patch(
            f"/api/v1/admin/usuarios/{cliente_id}",
            headers=admin_auth,
            json={"nombre": "Laura", "telefono": "3001234567"},
        )
        datos = json.loads(resp.data)["data"]

        assert resp.status_code == 200
        assert datos["perfil"]["nombre"] == "Laura"
        assert datos["perfil"]["telefono"] == "3001234567"

    def test_cliente_desactivado_no_inicia_sesion_ni_usa_su_token(
        self, client, admin_auth
    ):
        correo, cliente_id, token_cliente = self.registrar(client)

        resp = client.patch(
            f"/api/v1/admin/usuarios/{cliente_id}",
            headers=admin_auth,
            json={"activo": False},
        )
        assert resp.status_code == 200
        assert json.loads(resp.data)["data"]["activo"] is False

        login = client.post(
            "/api/v1/usuarios/login",
            json={"correo": correo, "contrasena": "123456"},
        )
        assert login.status_code == 403

        perfil = client.get("/api/v1/usuarios/perfil", headers=token_cliente)
        assert perfil.status_code == 403

    def test_cliente_reactivado_vuelve_a_entrar(self, client, admin_auth):
        correo, cliente_id, _ = self.registrar(client)
        url = f"/api/v1/admin/usuarios/{cliente_id}"

        client.patch(url, headers=admin_auth, json={"activo": False})
        client.patch(url, headers=admin_auth, json={"activo": True})

        login = client.post(
            "/api/v1/usuarios/login",
            json={"correo": correo, "contrasena": "123456"},
        )
        assert login.status_code == 200

    def test_admin_no_se_desactiva_a_si_mismo(self, client, admin_auth):
        perfil = client.get("/api/v1/usuarios/perfil", headers=admin_auth)
        admin_id = json.loads(perfil.data)["data"]["usuario_id"]

        resp = client.patch(
            f"/api/v1/admin/usuarios/{admin_id}",
            headers=admin_auth,
            json={"activo": False},
        )

        assert resp.status_code == 400

    def test_cliente_no_gestiona_otros_clientes(self, client, usuario_auth):
        resp = client.patch(
            "/api/v1/admin/usuarios/1",
            headers=usuario_auth,
            json={"activo": False},
        )

        assert resp.status_code == 403

    def test_usuario_inexistente(self, client, admin_auth):
        resp = client.get("/api/v1/admin/usuarios/99999", headers=admin_auth)
        assert resp.status_code == 404
