"""Pruebas del panel administrativo: seguridad, búsquedas, reportes y contenido."""
import io
import json
import uuid

import pytest

RUTAS_ADMIN = [
    ("GET", "/api/v1/admin/resumen"),
    ("GET", "/api/v1/admin/reportes/ventas"),
    ("GET", "/api/v1/admin/reportes/ventas.csv"),
    ("GET", "/api/v1/admin/reportes/pedidos.csv"),
    ("GET", "/api/v1/admin/reportes/clientes.csv"),
    ("GET", "/api/v1/admin/contenido"),
    ("GET", "/api/v1/admin/contenido/vista-previa"),
    ("PATCH", "/api/v1/admin/contenido/portada"),
    ("POST", "/api/v1/admin/contenido/publicar"),
    ("GET", "/api/v1/admin/configuracion"),
    ("PATCH", "/api/v1/admin/configuracion"),
    ("GET", "/api/v1/admin/usuarios?q=a"),
    ("GET", "/api/v1/admin/pedidos?q=1"),
]


def datos(resp):
    return json.loads(resp.data)["data"]


def crear_producto(client, admin_auth, precio=20000, stock=10):
    resp = client.post(
        "/api/v1/productos",
        headers=admin_auth,
        json={"nombre": f"Mug {uuid.uuid4().hex[:6]}", "descripcion": "Prueba", "precio": precio,
              "cantidad_stock": stock},
    )
    return datos(resp)["id"]


def crear_pedido(client, auth, producto_id, cantidad=1):
    resp = client.post("/api/v1/pedidos", headers=auth,
                       json={"detalles": [{"producto_id": producto_id, "cantidad": cantidad}]})
    return datos(resp)["id"]


# ------------------------------------------------------------------ seguridad
@pytest.mark.parametrize("metodo,ruta", RUTAS_ADMIN)
def test_rutas_admin_exigen_token(client, metodo, ruta):
    assert client.open(ruta, method=metodo).status_code == 401


@pytest.mark.parametrize("metodo,ruta", RUTAS_ADMIN)
def test_cliente_no_accede_al_panel(client, usuario_auth, metodo, ruta):
    resp = client.open(ruta, method=metodo, headers=usuario_auth, json={})
    assert resp.status_code == 403


# ------------------------------------------------------------------ clientes
def test_busqueda_de_clientes_paginada_y_sin_contrasena(client, admin_auth):
    correo = f"buscable-{uuid.uuid4().hex[:6]}@ejemplo.com"
    client.post("/api/v1/usuarios/registro", json={"correo": correo, "contrasena": "123456"})

    resp = client.get(f"/api/v1/admin/usuarios?q={correo[:14]}&por_pagina=5", headers=admin_auth)
    assert resp.status_code == 200
    r = datos(resp)
    assert r["total"] == 1 and r["pagina"] == 1 and r["por_pagina"] == 5
    item = r["items"][0]
    assert item["correo"] == correo and item["pedidos"] == 0
    assert "contrasena" not in item


def test_busqueda_de_clientes_excluye_administradores(client, admin_auth):
    r = datos(client.get("/api/v1/admin/usuarios?q=admin-", headers=admin_auth))
    assert all(i["rol"] == "usuario" for i in r["items"])


def test_busqueda_de_clientes_valida_parametros(client, admin_auth):
    resp = client.get("/api/v1/admin/usuarios?orden=nombre", headers=admin_auth)
    assert resp.status_code == 400


def test_listado_sin_parametros_sigue_siendo_una_lista(client, admin_auth):
    assert isinstance(datos(client.get("/api/v1/admin/usuarios", headers=admin_auth)), list)


def test_ficha_del_cliente_incluye_pedidos_y_resumen(client, admin_auth, usuario_auth):
    pid = crear_producto(client, admin_auth, precio=10000)
    pedido = crear_pedido(client, usuario_auth, pid, 2)
    perfil = datos(client.get("/api/v1/usuarios/perfil", headers=usuario_auth))
    ficha = datos(client.get(f"/api/v1/admin/usuarios/{perfil['usuario_id']}", headers=admin_auth))
    assert ficha["pedidos"][0]["id"] == pedido
    assert ficha["resumen"]["pendiente_de_pago"] == 20000
    assert ficha["resumen"]["compra_confirmada"] == 0


# ------------------------------------------------------------------- pedidos
def test_busqueda_de_pedidos_por_numero(client, admin_auth, usuario_auth):
    pid = crear_producto(client, admin_auth)
    pedido = crear_pedido(client, usuario_auth, pid)
    r = datos(client.get(f"/api/v1/admin/pedidos?q=%23{pedido}", headers=admin_auth))
    assert r["total"] == 1 and r["items"][0]["id"] == pedido
    assert "@" in r["items"][0]["cliente"]
    assert r["por_estado"]["pendiente"] >= 1


# ------------------------------------------------------------------ reportes
def test_reporte_distingue_ventas_pendientes_y_cancelados(client, admin_auth, usuario_auth):
    antes = datos(client.get("/api/v1/admin/reportes/ventas", headers=admin_auth))["indicadores"]
    pid = crear_producto(client, admin_auth, precio=15000, stock=20)

    pagado = crear_pedido(client, usuario_auth, pid, 2)       # 30.000 confirmado
    client.patch(f"/api/v1/admin/pedidos/{pagado}/estado", headers=admin_auth, json={"estado": "pagado"})
    crear_pedido(client, usuario_auth, pid, 1)                 # 15.000 pendiente
    cancelado = crear_pedido(client, usuario_auth, pid, 3)     # 45.000 cancelado
    client.patch(f"/api/v1/admin/pedidos/{cancelado}/estado", headers=admin_auth, json={"estado": "cancelado"})

    r = datos(client.get("/api/v1/admin/reportes/ventas", headers=admin_auth))
    i = r["indicadores"]
    assert i["ventas_confirmadas"]["valor"] - antes["ventas_confirmadas"]["valor"] == 30000
    assert i["pagos_confirmados"]["valor"] - antes["pagos_confirmados"]["valor"] == 30000
    assert i["pendiente_de_cobro"]["valor"] - antes["pendiente_de_cobro"]["valor"] == 15000
    assert i["cancelados"]["valor"] - antes["cancelados"]["valor"] == 45000
    fila = next(f for f in r["por_producto"] if f["producto_id"] == pid)
    assert fila["unidades"] == 2 and fila["ingresos"] == 30000
    assert sum(d["ventas"] for d in r["serie"]) == i["ventas_confirmadas"]["valor"]


def test_reporte_rechaza_periodo_invertido(client, admin_auth):
    resp = client.get("/api/v1/admin/reportes/ventas?desde=2026-11-20&hasta=2026-11-01", headers=admin_auth)
    assert resp.status_code == 400


def test_resumen_del_dashboard(client, admin_auth):
    r = datos(client.get("/api/v1/admin/resumen", headers=admin_auth))
    for clave in ("mes", "pendiente_de_cobro", "clientes", "productos", "atencion", "recientes", "ultimos_7_dias"):
        assert clave in r
    assert len(r["ultimos_7_dias"]) == 7


def test_exportacion_csv(client, admin_auth):
    resp = client.get("/api/v1/admin/reportes/pedidos.csv", headers=admin_auth)
    assert resp.status_code == 200
    assert resp.mimetype == "text/csv"
    assert "attachment" in resp.headers["Content-Disposition"]
    assert resp.data.decode("utf-8-sig").startswith("Pedido;Fecha;Cliente")


# ------------------------------------------------------------------ contenido
def test_contenido_publico_tiene_valores_iniciales(client):
    r = datos(client.get("/api/v1/contenido"))
    claves = [s["clave"] for s in r["secciones"]]
    assert claves[0] == "portada" and "banner" not in claves  # el banner inicia oculto
    assert r["tienda"]["whatsapp"].isdigit()


def test_borrador_no_es_publico_hasta_publicar(client, admin_auth):
    titulo = f"Título de prueba {uuid.uuid4().hex[:4]}"
    resp = client.patch("/api/v1/admin/contenido/portada", headers=admin_auth, json={"datos": {"titulo": titulo}})
    assert resp.status_code == 200

    portada = lambda r: next(s for s in r["secciones"] if s["clave"] == "portada")["datos"]
    assert portada(datos(client.get("/api/v1/contenido")))["titulo"] != titulo
    assert portada(datos(client.get("/api/v1/admin/contenido/vista-previa", headers=admin_auth)))["titulo"] == titulo

    client.post("/api/v1/admin/contenido/publicar", headers=admin_auth)
    assert portada(datos(client.get("/api/v1/contenido")))["titulo"] == titulo


def test_contenido_rechaza_campos_y_enlaces_invalidos(client, admin_auth):
    assert client.patch("/api/v1/admin/contenido/portada", headers=admin_auth,
                        json={"datos": {"inventado": "x"}}).status_code == 400
    assert client.patch("/api/v1/admin/contenido/banner", headers=admin_auth,
                        json={"datos": {"enlace": "javascript:alert(1)"}}).status_code == 400
    assert client.patch("/api/v1/admin/contenido/no-existe", headers=admin_auth, json={}).status_code == 404


def test_ocultar_y_ordenar_secciones(client, admin_auth):
    client.patch("/api/v1/admin/contenido/banner", headers=admin_auth, json={"visible": True})
    orden = ["banner", "portada", "escena", "coleccion", "personaliza", "catalogo"]
    assert client.put("/api/v1/admin/contenido/orden", headers=admin_auth, json={"orden": orden}).status_code == 200
    assert client.put("/api/v1/admin/contenido/orden", headers=admin_auth,
                      json={"orden": ["portada"]}).status_code == 400
    previa = datos(client.get("/api/v1/admin/contenido/vista-previa", headers=admin_auth))
    assert [s["clave"] for s in previa["secciones"]][0] == "banner"
    client.post("/api/v1/admin/contenido/descartar", headers=admin_auth)
    assert datos(client.get("/api/v1/admin/contenido", headers=admin_auth))["cambios_pendientes"] == 0


def test_imagen_de_contenido(client, admin_auth):
    cabeceras = {"Authorization": admin_auth["Authorization"]}
    png = (io.BytesIO(b"\x89PNG\r\n\x1a\nfalso"), "portada.png", "image/png")
    resp = client.post("/api/v1/admin/contenido/portada/imagen", headers=cabeceras,
                       data={"imagen": png}, content_type="multipart/form-data")
    assert resp.status_code == 200
    bloque = next(b for b in datos(resp)["bloques"] if b["clave"] == "portada")
    assert bloque["borrador"]["datos"]["imagen"].startswith("/uploads/")

    txt = (io.BytesIO(b"hola"), "nota.txt", "text/plain")
    assert client.post("/api/v1/admin/contenido/portada/imagen", headers=cabeceras,
                       data={"imagen": txt}, content_type="multipart/form-data").status_code == 400
    assert client.post("/api/v1/admin/contenido/coleccion/imagen", headers=cabeceras,
                       data={"imagen": (io.BytesIO(b"\x89PNG"), "a.png", "image/png")},
                       content_type="multipart/form-data").status_code == 400


def test_configuracion_de_la_tienda(client, admin_auth):
    assert client.patch("/api/v1/admin/configuracion", headers=admin_auth,
                        json={"datos": {"whatsapp": "abc"}}).status_code == 400
    resp = client.patch("/api/v1/admin/configuracion", headers=admin_auth,
                        json={"datos": {"umbral_inventario_bajo": 5}})
    assert datos(resp)["umbral_inventario_bajo"] == 5
    assert datos(client.get("/api/v1/admin/resumen", headers=admin_auth))["productos"]["umbral"] == 5
