"""
Genera los diagramas de arquitectura de MUGLY como archivos SVG.

Uso (desde la raíz del repositorio):
    python docs/diagramas/generar_diagramas.py

Cada diagrama refleja el código de la versión v1.0.0: nombres de clases,
rutas, tablas y tecnologías salen de backend/ y frontend/.
"""
import os

from svg_base import C, Diagrama

SALIDA = os.path.dirname(os.path.abspath(__file__))
DIAGRAMAS = []


def registrar(f):
    DIAGRAMAS.append(f)
    return f


# =====================================================================
# C4 · Nivel 1 · Contexto
# =====================================================================
@registrar
def c4_contexto():
    d = Diagrama("c4_contexto", 1040, 600, "C4 nivel 1: diagrama de contexto de MUGLY")
    d.persona(200, 10, 240, 112, "Cliente",
              "Compra mugs del catálogo, paga por WhatsApp y sigue sus pedidos.")
    d.persona(840, 10, 250, 112, "Administrador",
              "Propietario del negocio: gestiona productos, inventario, pedidos, clientes y envíos.")
    d.caja(355, 235, 330, 135, "MUGLY", "[Sistema de software]",
           "Tienda virtual de mugs: catálogo, carrito, pedidos, inventario, clientes "
           "y envíos, con panel de administración.", tam_titulo=18)
    gris = C["gris"]
    d.caja(40, 465, 250, 110, "WhatsApp", "[Sistema externo]",
           "Canal del negocio (+57 313 361 2247) para coordinar pagos y mugs personalizados.",
           relleno=gris)
    d.caja(395, 465, 250, 110, "Empresa de transporte", "[Servicio externo]",
           "Despacha el pedido y entrega el número de guía.", relleno=gris)
    d.caja(750, 465, 250, 110, "Pasarela de pago", "[Sistema externo · fuera de v1.0]",
           "RF21 diferido por la decisión D8. Sin integración en esta versión.",
           relleno="#B9BFC4", color=C["texto"], discontinuo=True, borde=C["gris"])
    d.flecha([(200, 162), (200, 302), (355, 302)],
             "Consulta el catálogo, compra\ny sigue sus pedidos [HTTP]", 200, 214)
    d.flecha([(840, 162), (840, 302), (685, 302)],
             "Gestiona productos, inventario,\npedidos, clientes y envíos [HTTP]", 840, 214)
    d.flecha([(400, 370), (400, 412), (165, 412), (165, 465)],
             "Abre el chat (enlace wa.me) para\npagar o pedir un personalizado", 270, 412)
    d.flecha([(520, 465), (520, 370)],
             "Guía y transportadora registradas\nmanualmente por el administrador",
             560, 420, discontinuo=True)
    d.flecha([(640, 370), (640, 412), (875, 412), (875, 465)],
             "Integración diferida (D8)", 800, 412, discontinuo=True)
    return d


# =====================================================================
# C4 · Nivel 2 · Contenedores
# =====================================================================
@registrar
def c4_contenedores():
    d = Diagrama("c4_contenedores", 1140, 720, "C4 nivel 2: diagrama de contenedores de MUGLY")
    d.persona(250, 4, 230, 96, "Cliente")
    d.persona(620, 4, 230, 96, "Administrador")
    d.frontera(40, 196, 860, 500, "MUGLY [sistema de software]")
    d.caja(80, 240, 780, 120, "Aplicación web (SPA)",
           "[Contenedor: HTML5, CSS3, JavaScript Vanilla con módulos ES, Bootstrap 5.3.3]",
           "Interfaz del cliente y panel de administración. Enrutador por hash, estado "
           "global en localStorage y un único cliente HTTP. Se entrega como archivos estáticos.",
           relleno=C["primario2"])
    d.caja(80, 440, 300, 140, "API REST de MUGLY",
           "[Contenedor: Python 3.14, Flask 3.1, SQLAlchemy 2.0]",
           "Reglas de negocio, autenticación JWT y autorización por rol. Prefijo /api/v1.")
    d.cilindro(470, 430, 210, 160, "Base de datos",
               "[Contenedor: MySQL 8.0 · InnoDB · utf8mb4]",
               "usuarios, perfiles, productos, pedidos, detalles e historial de estados")
    d.cilindro(712, 440, 168, 140, "Almacén de imágenes", "[Carpeta backend/uploads]",
               "Fotos de productos con nombre UUID", relleno="#4A6550")
    d.caja(940, 250, 180, 100, "WhatsApp", "[Sistema externo]", relleno=C["gris"])
    d.flecha([(250, 140), (250, 240)], "Usa [navegador]", 250, 196)
    d.flecha([(620, 140), (620, 240)], "Usa [navegador]", 620, 196)
    d.flecha([(230, 360), (230, 440)],
             "Peticiones fetch · JSON sobre HTTP\nAuthorization: Bearer <JWT>", 230, 400)
    d.flecha([(380, 510), (470, 510)], "SQL\n(ORM +\nPyMySQL)", 425, 510, tam=10.5)
    d.flecha([(230, 580), (230, 640), (796, 640), (796, 592)],
             "Guarda y sirve imágenes (JPG, PNG, WEBP · máx. 5 MB)", 520, 640)
    d.flecha([(860, 300), (940, 300)], "Abre\nwa.me", 900, 278, tam=10.5)
    return d


# =====================================================================
# C4 · Nivel 3 · Componentes de la API
# =====================================================================
@registrar
def c4_componentes():
    d = Diagrama("c4_componentes", 1180, 950, "C4 nivel 3: componentes de la API REST de MUGLY")
    d.caja(440, 8, 300, 66, "Aplicación web (SPA)", "[Contenedor]", relleno=C["primario2"],
           tam_titulo=14)
    d.frontera(20, 104, 1140, 730, "API REST de MUGLY [contenedor Flask]")
    comp = "#E6ECDD"
    claro = dict(relleno=comp, borde=C["primario"], color=C["texto"], tam_titulo=13.5,
                 tam_desc=11.2, tam_tipo=10.5)
    d.caja(45, 130, 340, 84, "Fábrica crear_app()", "[app/__init__.py]",
           "Registra blueprints, CORS, /uploads y manejadores de error → JSON {success, error}",
           **claro)
    d.caja(425, 130, 330, 84, "Seguridad", "[app/seguridad.py]",
           "@requiere_token y @requiere_admin: JWT HS256, cuenta activa y rol → 401 / 403",
           **claro)
    d.caja(795, 130, 340, 84, "Configuración", "[app/config.py + .env]",
           "SECRET_KEY, conexión MySQL, orígenes CORS, carpeta de imágenes y límite de 5 MB",
           **claro)
    columnas = [
        (45, "Dominio usuarios", [
            ("Controladores", "usuarios_bp · admin_bp", "/usuarios/registro · /login · /perfil · /admin/usuarios"),
            ("DTO", "marshmallow", "RegistroUsuarioDTO · ActualizarPerfilDTO · AdminActualizarUsuarioDTO"),
            ("UsuarioServicio", "servicio", "Registro, inicio de sesión, emisión de JWT, perfil y desactivación"),
            ("UsuarioRepositorio", "repositorio", "Consultas por id y correo; guardar usuario y perfil"),
            ("Usuario · PerfilUsuario", "modelos SQLAlchemy", None),
        ]),
        (425, "Dominio productos", [
            ("Controladores", "productos_bp · admin_bp", "/productos · /productos/{id}/imagen · /admin/productos"),
            ("DTO", "marshmallow", "CrearProductoDTO · ActualizarProductoDTO"),
            ("ProductoServicio", "servicio", "Catálogo disponible, retiro lógico e imágenes validadas"),
            ("ProductoRepositorio", "repositorio", "Disponibles, todos, tiene_pedidos(), guardar y eliminar"),
            ("Producto", "modelo SQLAlchemy", None),
        ]),
        (805, "Dominio pedidos", [
            ("Controladores", "pedidos_bp · admin_bp", "/pedidos · /admin/pedidos/{id}/estado · /personalizados"),
            ("DTO", "marshmallow", "CrearPedidoDTO · CambiarEstadoPedidoDTO · CrearPedidoPersonalizadoDTO"),
            ("PedidoServicio", "servicio", "Transiciones de estado y descuento de stock con bloqueo"),
            ("PedidoRepositorio", "repositorio", "Por id, todos, por usuario; guardar pedido y detalle"),
            ("Pedido · DetallePedido · HistorialEstadoPedido", "modelos SQLAlchemy", None),
        ]),
    ]
    filas_y = [262, 370, 478, 586, 694]
    rotulos = ["valida la entrada", "datos validados", "consulta / guarda", "ORM"]
    for x, titulo, filas in columnas:
        w = 330
        d.texto(x + w / 2, 250, titulo.upper(), 11, C["acento"], 700)
        for i, (t, tipo, desc) in enumerate(filas):
            d.caja(x, filas_y[i], w, 78, t, f"[{tipo}]", desc, **claro)
            if i < 4:
                d.flecha([(x + w / 2, filas_y[i] + 78), (x + w / 2, filas_y[i + 1])],
                         rotulos[i], x + w / 2, filas_y[i] + 93, tam=10)
    d.flecha([(805, 517), (781, 517), (781, 733), (755, 733)], "stock", 781, 625, tam=10)
    d.flecha([(590, 74), (590, 130)], "HTTP · JSON · /api/v1", 590, 102)
    d.cilindro(440, 858, 300, 82, "MySQL · mugly_db", "[Base de datos]")
    for x in (210, 970):
        xd = 440 if x < 590 else 740
        d.flecha([(x, 772), (x, 899), (xd, 899)])
    d.flecha([(590, 772), (590, 858)], "SQLAlchemy + PyMySQL", 590, 834, tam=10.5)
    return d


# =====================================================================
# Arquitectura lógica por capas
# =====================================================================
@registrar
def arquitectura_logica():
    d = Diagrama("arquitectura_logica", 1180, 660, "Arquitectura lógica de MUGLY por capas")
    d.texto(285, 32, "FRONTEND · SPA (frontend/)", 13, C["acento"], 700)
    d.texto(830, 32, "BACKEND · API REST (backend/app/)", 13, C["acento"], 700)
    banda = dict(relleno="#E6ECDD", borde=C["primario"], color=C["texto"],
                 tam_titulo=14, tam_desc=11.5, tam_tipo=10.5)
    fe = [
        ("Vista", "index.html · css/estilos.css · Bootstrap 5.3.3 local",
         "Contenedores #encabezado, #app, #pie y #toasts; variables de marca en :root"),
        ("Páginas", "js/paginas/",
         "inicio · catalogo · detalle · carrito · personalizados · nosotros · misPedidos · ingresar · "
         "registro · admin/pedidos · admin/productos · admin/clientes"),
        ("Componentes reutilizables", "js/componentes/",
         "ui.js · encabezado.js · adminLayout.js · producto.js (tarjeta) · mockups.js · "
         "escena.js (monta y desmonta el motor de scroll)"),
        ("Núcleo de la SPA", "js/",
         "router.js (rutas hash y protección por rol) · estado.js (sesión y carrito) · "
         "api.js (cliente HTTP único) · config.js"),
    ]
    be = [
        ("Presentación HTTP · Controladores", "Blueprints Flask",
         "usuarios_bp · productos_bp · pedidos_bp · admin_bp. Reciben la petición y responden JSON."),
        ("Validación · DTO", "marshmallow",
         "Esquemas de entrada por caso de uso. Datos inválidos → 400 con detalle por campo."),
        ("Aplicación · Servicios", "Reglas de negocio",
         "UsuarioServicio · ProductoServicio · PedidoServicio: RN01–RN18, transiciones, stock y JWT."),
        ("Datos · Repositorios y Modelos", "SQLAlchemy",
         "UsuarioRepositorio · ProductoRepositorio · PedidoRepositorio y las 6 entidades ORM."),
    ]
    ys = [56, 171, 286, 401]
    for i, y in enumerate(ys):
        d.caja(30, y, 510, 95, fe[i][0], fe[i][1], fe[i][2], **banda)
        d.caja(640, y, 380, 95, be[i][0], be[i][1], be[i][2], **banda)
        if i < 3:
            d.flecha([(285, y + 95), (285, y + 115)])
            d.flecha([(830, y + 95), (830, y + 115)])
    d.caja(1040, 56, 120, 440, "Transversal", None,
           "seguridad.py\n(JWT, roles)\n\nconfig.py\n(.env)\n\nmanejadores\nde error\n(__init__.py)",
           relleno=C["calido"], borde=C["acento"], color=C["texto"], tam_titulo=13.5, tam_desc=11)
    d.flecha([(540, 448), (590, 448), (590, 103), (640, 103)],
             "HTTP + JSON\nfetch · JWT", 590, 275)
    d.cilindro(700, 528, 260, 100, "MySQL 8.0 · mugly_db", "[Persistencia]")
    d.flecha([(830, 496), (830, 528)])
    d.caja(30, 532, 230, 90, "WhatsApp", "[Externo]", "Enlaces wa.me para pago y personalizados",
           relleno=C["gris"], tam_desc=11)
    d.flecha([(150, 496), (150, 532)])
    d.caja(290, 532, 250, 90, "localStorage", "[Navegador]", "Sesión (token y usuario) y carrito",
           relleno=C["calido"], borde=C["acento"], color=C["texto"], tam_desc=11)
    d.flecha([(415, 496), (415, 532)])
    d.caja(985, 532, 175, 90, "uploads/", "[Archivos]", "Imágenes de productos",
           relleno="#4A6550", tam_desc=11)
    d.flecha([(1010, 496), (1010, 532)], discontinuo=True)
    return d


# =====================================================================
# UML · Casos de uso
# =====================================================================
@registrar
def uml_casos_uso():
    d = Diagrama("uml_casos_uso", 1100, 790, "UML: diagrama de casos de uso de MUGLY")
    d.rect(250, 20, 600, 740, C["calido2"], C["primario"], 16, 1.6, capa="fondo")
    d.texto(550, 50, "MUGLY", 16, C["primario"], 700)
    d.actor(110, 290, "Cliente")
    d.actor(990, 250, "Administrador")
    d.actor(990, 560, "WhatsApp\n«sistema externo»", C["gris"])
    cliente = [
        ("CU01", "Registrarse en el sistema", 90), ("CU03", "Consultar catálogo", 160),
        ("CU04", "Consultar información de producto", 230), ("CU05", "Realizar compra", 300),
        ("CU06", "Realizar pago (por WhatsApp, D3)", 370), ("CU07", "Consultar pedidos", 440),
        ("CU08", "Consultar estado del pedido", 510), ("CU09", "Solicitar mug personalizado", 580),
    ]
    admin = [
        ("CU10", "Gestionar productos", 150), ("CU11", "Gestionar inventario", 225),
        ("CU12", "Gestionar pedidos (confirma pago)", 300), ("CU13", "Gestionar clientes", 375),
        ("CU14", "Gestionar información de envío", 450), ("CU15", "Registrar guía de envío", 525),
    ]
    for cu, t, y in cliente:
        d.caso_uso(395, y, 125, 28, f"{cu} · {t}")
        d.flecha([(136, 335), (270, y)], punta=None, color="#8A9184", grosor=1.1)
    for cu, t, y in admin:
        d.caso_uso(705, y, 125, 28, f"{cu} · {t}")
        d.flecha([(964, 295), (830, y)], punta=None, color="#8A9184", grosor=1.1)
    d.caso_uso(550, 690, 130, 30, "CU02 · Iniciar sesión", relleno="#F3E3D6", borde=C["acento"])
    d.flecha([(130, 395), (420, 690)], punta=None, color="#8A9184", grosor=1.1)
    d.flecha([(975, 355), (680, 690)], punta=None, color="#8A9184", grosor=1.1)
    d.flecha([(964, 610), (520, 580)], punta=None, color="#8A9184", grosor=1.1, discontinuo=True)
    d.nota(20, 560, 210,
           "Sin pasarela en v1.0 (D3, D8): el cliente paga por WhatsApp y el "
           "administrador confirma el pago en CU12, que descuenta el inventario (CU11).")
    return d


# =====================================================================
# UML · Clases del dominio
# =====================================================================
@registrar
def uml_clases():
    d = Diagrama("uml_clases", 1180, 740, "UML: diagrama de clases del modelo de dominio")
    d.clase(40, 40, 300, "Usuario", [
        "id: int  «PK»", "correo: str(255)  «único»", "contrasena: str  (hash)",
        "rol: str = \"usuario\" | \"admin\"", "activo: bool = true", "fecha_creacion: datetime"])
    d.clase(40, 330, 300, "PerfilUsuario", [
        "id: int  «PK»", "nombre: str(50) [0..1]", "apellido: str(50) [0..1]",
        "telefono: str(20) [0..1]", "usuario_id: int  «FK, único»"])
    d.clase(450, 40, 310, "Pedido", [
        "id: int  «PK»", "usuario_id: int  «FK»", "estado: EstadoPedido",
        "tipo: TipoPedido = catalogo", "descripcion: text [0..1]",
        "transportadora: str(100) [0..1]", "numero_guia: str(100) [0..1]",
        "total: Decimal(10,2)", "fecha_creacion: datetime"])
    d.clase(450, 420, 310, "DetallePedido", [
        "id: int  «PK»", "pedido_id: int  «FK»", "producto_id: int  «FK»",
        "cantidad: int  (≥ 1)", "precio_unitario: Decimal(10,2)"])
    d.clase(870, 420, 280, "Producto", [
        "id: int  «PK»", "nombre: str(200)", "descripcion: text",
        "precio: Decimal(10,2)", "disponible: bool", "cantidad_stock: int  (≥ 0)",
        "imagen: str(255) [0..1]"])
    d.clase(870, 40, 280, "HistorialEstadoPedido", [
        "id: int  «PK»", "pedido_id: int  «FK»", "estado: str(30)",
        "fecha: datetime", "usuario_id: int  «FK»"])
    d.clase(40, 560, 160, "TipoPedido", ["catalogo", "personalizado"], estereotipo="enumeration",
            relleno=C["calido2"])
    d.clase(220, 560, 160, "EstadoPedido", ["pendiente", "pagado", "enviado", "entregado",
                                            "cancelado"], estereotipo="enumeration",
            relleno=C["calido2"])
    m = 10.5
    # Usuario ◆— PerfilUsuario
    d.flecha([(190, 205), (190, 330)], "perfil", 190, 270, punta=None, inicio="rombo")
    d.texto(200, 222, "1", m, ancla="start"); d.texto(200, 324, "0..1", m, ancla="start")
    # Usuario — Pedido
    d.flecha([(340, 110), (450, 110)], "realiza", 395, 98, punta=None)
    d.texto(348, 128, "1", m, ancla="start"); d.texto(442, 128, "0..*", m, ancla="end")
    # Pedido ◆— DetallePedido
    d.flecha([(605, 265), (605, 420)], "detalles", 605, 340, punta=None, inicio="rombo")
    d.texto(615, 285, "1", m, ancla="start"); d.texto(615, 414, "1..*", m, ancla="start")
    # Producto — DetallePedido
    d.flecha([(870, 500), (760, 500)], "se vende en", 815, 488, punta=None)
    d.texto(862, 518, "1", m, ancla="end"); d.texto(768, 518, "0..*", m, ancla="start")
    # Pedido ◆— Historial
    d.flecha([(760, 110), (870, 110)], "historial", 815, 98, punta=None, inicio="rombo")
    d.texto(778, 128, "1", m, ancla="start"); d.texto(862, 128, "1..*", m, ancla="end")
    # Usuario — Historial (quién hizo el cambio)
    d.flecha([(190, 40), (190, 18), (1010, 18), (1010, 40)], "registra el cambio (usuario_id)",
             600, 18, punta=None)
    d.texto(200, 34, "1", m, ancla="start"); d.texto(1020, 34, "0..*", m, ancla="start")
    # Dependencias con las enumeraciones
    d.flecha([(450, 160), (410, 160), (410, 640), (380, 640)], "«usa»", 410, 400,
             discontinuo=True, punta="abierta")
    d.flecha([(410, 640), (410, 718), (120, 718), (120, 653)], None, discontinuo=True,
             punta="abierta")
    return d


# =====================================================================
# UML · Clases por capas del dominio pedidos
# =====================================================================
@registrar
def uml_clases_pedidos():
    d = Diagrama("uml_clases_pedidos", 1180, 640,
                 "UML: clases por capas del dominio pedidos")
    d.clase(30, 30, 350, "pedidos/controladores.py", [], [
        "+ crear_pedido()          POST /pedidos",
        "+ listar_pedidos()        GET /pedidos",
        "+ obtener_pedido(id)      GET /pedidos/{id}",
        "+ listar_todos_los_pedidos()  GET /admin/pedidos",
        "+ obtener_pedido_admin(id)    GET /admin/…/{id}",
        "+ cambiar_estado_pedido(id)   PATCH …/estado",
        "+ crear_pedido_personalizado() POST …",
    ], estereotipo="blueprint · pedidos_bp / admin_bp", tam=10.8)
    d.clase(30, 330, 350, "CambiarEstadoPedidoDTO", [
        "estado: OneOf(pagado, enviado,",
        "        entregado, cancelado)",
        "transportadora: str [0..1] (≤ 100)",
        "numero_guia: str [0..1] (≤ 100)"], estereotipo="DTO · marshmallow.Schema")
    d.clase(30, 500, 350, "CrearPedidoDTO · CrearPedidoPersonalizadoDTO", [
        "detalles: List[producto_id, cantidad ≥ 1]",
        "usuario_id · descripcion (1–2000) · total ≥ 0.01"], estereotipo="DTO")
    d.clase(440, 30, 340, "PedidoServicio", [
        "TRANSICIONES: dict  (pendiente→pagado|cancelado,",
        "   pagado→enviado, enviado→entregado)"], [
        "+ crear_pedido(usuario_id, datos)",
        "+ crear_pedido_personalizado(admin_id, datos)",
        "+ cambiar_estado(pedido_id, admin_id, datos)",
        "+ listar_todos_los_pedidos()",
        "+ obtener_pedido_admin(pedido_id)",
        "+ listar_pedidos_usuario(usuario_id)",
        "+ obtener_pedido_usuario(pedido_id, usuario_id)",
        "- _descontar_inventario(pedido)",
        "- _serializar_pedido(pedido)"], estereotipo="servicio", tam=10.8)
    d.clase(440, 430, 340, "Excepciones del dominio", [
        "PedidoNoEncontradoError        → 404",
        "ProductoPedidoNoDisponibleError → 400",
        "TransicionEstadoInvalidaError  → 400",
        "DatosEnvioRequeridosError      → 400"], estereotipo="Exception", tam=10.8,
        relleno="#FBEDEA")
    d.clase(840, 30, 310, "PedidoRepositorio", [], [
        "+ guardar(pedido)", "+ obtener_por_id(pedido_id)", "+ obtener_todos()",
        "+ obtener_por_usuario(usuario_id)", "+ guardar_detalle(detalle)"],
        estereotipo="repositorio")
    d.clase(840, 260, 310, "Modelos (SQLAlchemy)", [
        "Pedido", "DetallePedido", "HistorialEstadoPedido", "Producto  (dominio productos)"],
        estereotipo="db.Model")
    d.nota(840, 450, 310,
           "app/__init__.py registra un manejador por excepción y responde "
           "{\"success\": false, \"error\": {\"message\": …}} con el código indicado.")
    d.flecha([(205, 206), (205, 330)], "valida con", 205, 268, discontinuo=True, punta="abierta")
    d.flecha([(380, 120), (440, 120)], "usa", 410, 108, discontinuo=True, punta="abierta")
    d.flecha([(780, 100), (840, 100)], "usa", 810, 88, discontinuo=True, punta="abierta")
    d.flecha([(780, 275), (840, 275)], "bloquea con\nFOR UPDATE", 810, 305, discontinuo=True,
             punta="abierta", tam=10)
    d.flecha([(995, 172), (995, 260)], "persiste", 995, 216, discontinuo=True, punta="abierta")
    d.flecha([(610, 287), (610, 430)], "lanza", 610, 358, discontinuo=True, punta="abierta")
    d.flecha([(780, 520), (840, 520)], "traducidas\na JSON", 810, 548, discontinuo=True,
             punta="abierta", tam=10)
    return d


# =====================================================================
# UML · Secuencia: el administrador confirma el pago
# =====================================================================
@registrar
def uml_secuencia_pago():
    d = Diagrama("uml_secuencia_pago", 1240, 840,
                 "UML: secuencia de la confirmación del pago de un pedido")
    vidas = [
        ("Administrador", None, 70), ("admin/pedidos.js", "SPA · página", 222),
        ("api.js", "SPA · cliente HTTP", 372), ("@requiere_admin", "seguridad.py", 527),
        ("cambiar_estado_pedido", "controlador", 690), ("CambiarEstadoPedidoDTO", "DTO", 855),
        ("PedidoServicio", "servicio", 1015), ("MySQL", "mugly_db", 1160),
    ]
    x = {n: cx for n, _, cx in vidas}
    for n, sub, cx in vidas:
        if sub is None:
            d.actor(cx, 6, "", C["texto"])
            d.texto(cx, 122, n, 12.5, C["texto"], 700)
            top = 132
        else:
            d.caja(cx - 76, 20, 152, 54, n, sub, relleno=C["primario"] if n != "MySQL"
                   else C["primario2"], tam_titulo=10.8 if len(n) > 18 else 12, tam_tipo=10)
            top = 74
        d._add("lineas", f'<line x1="{cx}" y1="{top}" x2="{cx}" y2="{790}" stroke="#A5ADB4" '
                         f'stroke-width="1.2" stroke-dasharray="5 5"/>')
    # Barras de activación
    for n, y1, y2 in [("cambiar_estado_pedido", 330, 690), ("PedidoServicio", 428, 640),
                      ("@requiere_admin", 210, 330), ("api.js", 168, 720)]:
        d.rect(x[n] - 6, y1, 12, y2 - y1, C["calido"], C["primario"], 2, 1.1)

    def msg(a, b, y, t, ret=False):
        xa, xb = x[a], x[b]
        d.flecha([(xa + (6 if xb > xa else -6), y), (xb + (-6 if xb > xa else 6), y)],
                 discontinuo=ret, punta="abierta" if ret else "flecha")
        d.etiqueta((xa + xb) / 2, y - 12 - (t.count("\n") * 7), t, 10.8)

    def propio(a, y, t):
        cx = x[a] + 6
        d.flecha([(cx, y), (cx + 34, y), (cx + 34, y + 20), (cx, y + 20)])
        d.etiqueta(cx + 40 + len(max(t.split("\n"), key=len)) * 3.1, y + 10, t, 10.8)

    msg("Administrador", "admin/pedidos.js", 160, "1. Clic en «Confirmar pago» y acepta el modal")
    msg("admin/pedidos.js", "api.js", 200, "2. cambiarEstado(1, {estado: 'pagado'})")
    msg("api.js", "@requiere_admin", 240,
        "3. PATCH /api/v1/admin/pedidos/1/estado\nAuthorization: Bearer <JWT>")
    propio("@requiere_admin", 255, "4. jwt.decode(HS256)")
    msg("@requiere_admin", "MySQL", 305, "5. SELECT usuario → ¿existe, activo y rol = admin?")
    msg("@requiere_admin", "cambiar_estado_pedido", 345, "6. llama con usuario_id")
    msg("cambiar_estado_pedido", "CambiarEstadoPedidoDTO", 385, "7. load(cuerpo)")
    msg("CambiarEstadoPedidoDTO", "cambiar_estado_pedido", 412, "datos validados", ret=True)
    msg("cambiar_estado_pedido", "PedidoServicio", 450, "8. cambiar_estado(1, admin_id, datos)")
    msg("PedidoServicio", "MySQL", 490, "9. SELECT pedido … FOR UPDATE")
    propio("PedidoServicio", 505, "10. valida\npendiente → pagado")
    msg("PedidoServicio", "MySQL", 565,
        "11. SELECT producto … FOR UPDATE\nUPDATE cantidad_stock (tipo catálogo)")
    msg("PedidoServicio", "MySQL", 610, "12. INSERT historial · COMMIT")
    msg("PedidoServicio", "cambiar_estado_pedido", 640, "pedido serializado", ret=True)
    msg("cambiar_estado_pedido", "api.js", 690, "13. 200 {success: true, data: pedido}", ret=True)
    msg("api.js", "admin/pedidos.js", 720, "data", ret=True)
    msg("admin/pedidos.js", "Administrador", 755, "14. Toast «Pedido #1 marcado como pagado»", ret=True)
    d.nota(20, 790 - 4, 1200,
           "Caminos alternos: sin token o token inválido → 401 · rol distinto de admin → 403 · "
           "cuerpo inválido → 400 (DTO) · transición no permitida o stock insuficiente → "
           "ROLLBACK y 400 · pedido inexistente → 404.", tam=11)
    return d


# =====================================================================
# UML · Máquina de estados del pedido
# =====================================================================
@registrar
def uml_estados_pedido():
    d = Diagrama("uml_estados_pedido", 1120, 470, "UML: máquina de estados del pedido")

    def estado(x, y, nombre, color):
        d.rect(x, y, 160, 62, C["blanco"], color, 26, 2)
        d.texto(x + 80, y + 37, nombre, 15, color, 700)

    d._add("cajas", f'<circle cx="50" cy="130" r="11" fill="{C["texto"]}"/>')
    d._add("cajas", f'<circle cx="50" cy="300" r="11" fill="{C["texto"]}"/>')
    estado(170, 99, "pendiente", "#9A6B00")
    estado(470, 99, "pagado", C["primario"])
    estado(760, 99, "enviado", "#2F6B3C")
    estado(760, 300, "entregado", C["verde"])
    estado(170, 300, "cancelado", C["gris"])
    for cx, cy in [(1020, 331), (450, 331)]:
        d._add("cajas", f'<circle cx="{cx}" cy="{cy}" r="13" fill="none" stroke="{C["texto"]}" stroke-width="2"/>'
                        f'<circle cx="{cx}" cy="{cy}" r="7" fill="{C["texto"]}"/>')
    d.flecha([(61, 130), (170, 130)], "crear_pedido\n[stock suficiente]", 112, 82, tam=10.5)
    d.flecha([(50, 289), (50, 200), (130, 200), (130, 150), (170, 150)],
             "registrar personalizado\n(admin, tipo personalizado)", 90, 236, tam=10.5)
    d.flecha([(330, 130), (470, 130)],
             "confirmar pago (admin)\n/ descuenta stock si\ntipo = catálogo", 400, 66, tam=10.5)
    d.flecha([(630, 130), (760, 130)],
             "enviar (admin)\n[transportadora y guía]", 695, 76, tam=10.5)
    d.flecha([(840, 161), (840, 300)], "entregar (admin)", 840, 230, tam=10.5)
    d.flecha([(250, 161), (250, 300)],
             "cancelar (admin)\npago no concretado\no desistimiento", 250, 230, tam=10.5)
    d.flecha([(920, 331), (1007, 331)])
    d.flecha([(330, 331), (437, 331)])
    d.nota(470, 390, 640,
           "Toda transición se valida contra TRANSICIONES en PedidoServicio y se registra en "
           "historial_estados_pedido con fecha y usuario. Cualquier otra transición → 400.")
    return d


# =====================================================================
# Despliegue (arquitectura computacional)
# =====================================================================
@registrar
def despliegue():
    d = Diagrama("despliegue", 1180, 650, "Diagrama de despliegue de MUGLY (entorno local v1.0)")
    d.actor(85, 150, "Cliente /\nAdministrador")
    d.nodo(200, 30, 950, 560, "Equipo local · Windows 11", "dispositivo")
    d.nodo(240, 110, 270, 200, "Navegador web (Chrome)", "entorno de ejecución",
           relleno=C["blanco"])
    d.artefacto(258, 180, 234, 112, "SPA MUGLY",
                "index.html, js/ y css/ cargados en memoria; sesión y carrito en localStorage")
    d.nodo(240, 360, 270, 190, "Python http.server :5173", "servidor web estático",
           relleno=C["blanco"])
    d.artefacto(258, 430, 234, 100, "frontend/",
                "Archivos estáticos: HTML, CSS, JS, Bootstrap 5.3.3 y motor scrollcraft")
    d.nodo(570, 110, 300, 440, "Python 3.14 · venv", "entorno de ejecución",
           relleno=C["blanco"])
    d.artefacto(588, 180, 264, 112, "API Flask · app.py :5000",
                "crear_app(): blueprints /api/v1, JWT, CORS, manejadores de error")
    d.artefacto(588, 306, 264, 96, "backend/uploads/",
                "Imágenes de productos servidas en /uploads/<archivo>")
    d.artefacto(588, 416, 264, 112, "migrations/ (Alembic)",
                "Flask-Migrate · 6 versiones; versión actual 9ed994615ffd")
    d.nodo(930, 110, 200, 300, "MySQL Server 8.0", "servidor de BD", relleno=C["blanco"])
    d.artefacto(946, 180, 168, 140, "mugly_db",
                "InnoDB · utf8mb4_unicode_ci · 7 tablas")
    d.caja(40, 470, 140, 100, "WhatsApp", "[Internet · wa.me]", relleno=C["gris"], tam_titulo=13)
    d.flecha([(110, 220), (240, 220)], "HTTP", 175, 208, capa="sobre")
    d.flecha([(375, 310), (375, 360)], "HTTP GET :5173\n(descarga la SPA)", 445, 335, tam=10.5, capa="sobre")
    d.flecha([(510, 236), (570, 236)], "HTTP :5000\nJSON + JWT\n(CORS)", 540, 196, tam=10, capa="sobre")
    d.flecha([(870, 236), (930, 236)], "TCP 3306\nPyMySQL", 900, 270, tam=10, capa="sobre")
    d.flecha([(240, 290), (110, 290), (110, 470)], "HTTPS\n(enlace)", 150, 380, tam=10.5, capa="sobre")
    d.nota(930, 440, 200,
           "v1.0 se ejecuta en local (MGL-ALC-001). La nube queda fuera de esta versión.",
           tam=10.5)
    return d


# =====================================================================
# Base de datos · modelo lógico
# =====================================================================
@registrar
def bd_logico():
    d = Diagrama("bd_logico", 1120, 560, "Modelo lógico de la base de datos (entidad-relación)")

    def entidad(x, y, nombre, attrs, w=230):
        h = 34 + len(attrs) * 21 + 10
        d.rect(x, y, w, h, C["blanco"], C["primario"], 8, 1.6)
        d._add("cajas", f'<path d="M{x},{y + 8} a8,8 0 0,1 8,-8 h{w - 16} a8,8 0 0,1 8,8 v26 h{-w} z" '
                        f'fill="{C["primario"]}"/>')
        d.texto(x + w / 2, y + 22, nombre, 13.5, C["blanco"], 700)
        for i, (a, clave) in enumerate(attrs):
            color = C["acento"] if clave else C["texto"]
            pref = {"PK": "🔑 ", "FK": "↗ ", "PK": "PK  ", "FK": "FK  ", "UQ": "UQ  "}.get(clave, "      ")
            d.texto(x + 12, y + 54 + i * 21, f"{pref}{a}", 12, color, 600 if clave else 400, "start")
        return h

    entidad(40, 40, "USUARIO", [("id", "PK"), ("correo", "UQ"), ("contrasena", None),
                                ("rol", None), ("activo", None), ("fecha_creacion", None)])
    entidad(40, 350, "PERFIL", [("id", "PK"), ("usuario_id", "FK"), ("nombre", None),
                               ("apellido", None), ("telefono", None)])
    entidad(445, 40, "PEDIDO", [("id", "PK"), ("usuario_id", "FK"), ("estado", None),
                               ("tipo", None), ("descripcion", None), ("transportadora", None),
                               ("numero_guia", None), ("total", None), ("fecha_creacion", None)])
    entidad(445, 350, "DETALLE_PEDIDO", [("id", "PK"), ("pedido_id", "FK"), ("producto_id", "FK"),
                                        ("cantidad", None), ("precio_unitario", None)])
    entidad(850, 350, "PRODUCTO", [("id", "PK"), ("nombre", None), ("descripcion", None),
                                  ("precio", None), ("disponible", None), ("cantidad_stock", None),
                                  ("imagen", None)])
    entidad(850, 40, "HISTORIAL_ESTADO", [("id", "PK"), ("pedido_id", "FK"), ("estado", None),
                                         ("fecha", None), ("usuario_id", "FK")])
    m = 12

    def rel(pts, t, lx, ly, a, b, pa, pb):
        d.flecha(pts, t, lx, ly, punta=None, tam=11, color=C["primario"], grosor=1.6)
        d.texto(pa[0], pa[1], a, m, C["acento"], 700)
        d.texto(pb[0], pb[1], b, m, C["acento"], 700)

    rel([(155, 210), (155, 350)], "tiene", 155, 285, "1", "0..1", (168, 230), (180, 342))
    rel([(270, 110), (445, 110)], "realiza", 357, 98, "1", "N", (282, 128), (434, 128))
    rel([(560, 273), (560, 350)], "contiene", 560, 312, "1", "N", (572, 292), (572, 342))
    rel([(850, 430), (675, 430)], "aparece en", 762, 418, "1", "N", (838, 448), (688, 448))
    rel([(675, 90), (850, 90)], "registra cambios", 762, 78, "1", "N", (688, 108), (838, 108))
    rel([(155, 40), (155, 18), (965, 18), (965, 40)], "hace el cambio", 560, 18,
        "1", "N", (168, 34), (978, 34))
    return d


# =====================================================================
# Base de datos · modelo físico (MySQL 8.0)
# =====================================================================
@registrar
def bd_fisico():
    d = Diagrama("bd_fisico", 1300, 720, "Modelo físico de la base de datos en MySQL 8.0")

    def tabla(x, y, nombre, cols, w=360):
        fila = 21
        h = 34 + len(cols) * fila + 10
        d.rect(x, y, w, h, C["blanco"], C["primario"], 6, 1.5)
        d._add("cajas", f'<path d="M{x},{y + 6} a6,6 0 0,1 6,-6 h{w - 12} a6,6 0 0,1 6,6 v28 h{-w} z" '
                        f'fill="{C["primario"]}"/>')
        d.texto(x + 12, y + 22, nombre, 13.5, C["blanco"], 700, "start")
        d.texto(x + w - 12, y + 22, "InnoDB", 10.5, C["calido"], 400, "end", cursiva=True)
        for i, (col, tipo, flags) in enumerate(cols):
            cy = y + 52 + i * fila
            if i % 2:
                d.rect(x + 1, cy - 15, w - 2, fila, C["calido2"], None, 0, capa="cajas")
            clave = "PK" in flags or "FK" in flags
            d.texto(x + 10, cy, col, 11.5, C["acento"] if clave else C["texto"],
                    700 if clave else 400, "start", fuente="Consolas, monospace")
            d.texto(x + 150, cy, tipo, 11, C["primario2"], 400, "start", fuente="Consolas, monospace")
            d.texto(x + w - 10, cy, flags, 10.5, C["gris"], 600, "end")
        return h

    tabla(30, 40, "usuarios", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("correo", "VARCHAR(255)", "NOT NULL · UNIQUE"),
        ("contrasena", "VARCHAR(255)", "NOT NULL (hash)"), ("fecha_creacion", "DATETIME", "NULL"),
        ("rol", "VARCHAR(20)", "NOT NULL · DEF 'usuario'"), ("activo", "TINYINT(1)", "NOT NULL · DEF 1")])
    tabla(30, 330, "perfiles", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("nombre", "VARCHAR(50)", "NULL"),
        ("apellido", "VARCHAR(50)", "NULL"), ("telefono", "VARCHAR(20)", "NULL"),
        ("usuario_id", "INT", "FK · UNIQUE")])
    tabla(470, 40, "pedidos", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("usuario_id", "INT", "FK · NOT NULL · IDX"),
        ("estado", "VARCHAR(30)", "NOT NULL"), ("total", "DECIMAL(10,2)", "NOT NULL"),
        ("fecha_creacion", "DATETIME", "NOT NULL"), ("tipo", "VARCHAR(20)", "NOT NULL · DEF 'catalogo'"),
        ("descripcion", "TEXT", "NULL"), ("transportadora", "VARCHAR(100)", "NULL"),
        ("numero_guia", "VARCHAR(100)", "NULL")])
    tabla(470, 390, "detalles_pedido", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("pedido_id", "INT", "FK · NOT NULL · IDX"),
        ("producto_id", "INT", "FK · NOT NULL · IDX"), ("cantidad", "INT", "NOT NULL"),
        ("precio_unitario", "DECIMAL(10,2)", "NOT NULL")])
    tabla(910, 40, "historial_estados_pedido", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("pedido_id", "INT", "FK · NOT NULL · IDX"),
        ("estado", "VARCHAR(30)", "NOT NULL"), ("fecha", "DATETIME", "NOT NULL"),
        ("usuario_id", "INT", "FK · NOT NULL · IDX")])
    tabla(910, 390, "productos", [
        ("id", "INT", "PK · AUTO_INCREMENT"), ("nombre", "VARCHAR(200)", "NOT NULL"),
        ("descripcion", "TEXT", "NOT NULL"), ("precio", "DECIMAL(10,2)", "NOT NULL"),
        ("disponible", "TINYINT(1)", "NOT NULL"), ("cantidad_stock", "INT", "NOT NULL"),
        ("imagen", "VARCHAR(255)", "NULL")])
    tabla(30, 560, "alembic_version", [("version_num", "VARCHAR(32)", "PK")])
    k = dict(color=C["acento"], tam=10, color_texto=C["acento"], grosor=1.6)
    d.flecha([(210, 330), (210, 210)], "FK usuario_id", 210, 270, **k)
    d.flecha([(470, 140), (390, 140)], "FK\nusuario_id", 430, 165, **k)
    d.flecha([(650, 390), (650, 273)], "FK pedido_id", 650, 331, **k)
    d.flecha([(830, 480), (910, 480)], "FK\nproducto_id", 870, 505, **k)
    d.flecha([(910, 110), (830, 110)], "FK\npedido_id", 870, 135, **k)
    d.flecha([(1090, 40), (1090, 16), (300, 16), (300, 40)], "FK usuario_id (quién hizo el cambio)",
             695, 16, **k)
    d.nota(910, 600, 360,
           "utf8mb4 · utf8mb4_unicode_ci. Las FK no usan ON DELETE CASCADE: por eso un "
           "producto con pedidos se retira de forma lógica (disponible = 0) y no se "
           "borra (RNF04).", tam=10.5)
    d.nota(470, 560, 360,
           "Restricciones: perfiles_ibfk_1, pedidos_ibfk_1, detalles_pedido_ibfk_1 y _2, "
           "historial_estados_pedido_ibfk_1 y _2.", tam=10.5)
    d.nota(30, 640, 360,
           "alembic_version guarda la revisión aplicada por Flask-Migrate (9ed994615ffd).",
           tam=10.5)
    return d


# =====================================================================
# Seguridad: autenticación y autorización
# =====================================================================
@registrar
def seguridad():
    d = Diagrama("seguridad", 1180, 560, "Diseño de seguridad: autenticación y autorización")
    paso = dict(relleno="#E6ECDD", borde=C["primario"], color=C["texto"], tam_titulo=12.5,
                tam_desc=10.8, tam_tipo=10)
    malo = dict(relleno="#F6E1DE", borde=C["rojo"], color=C["texto"], tam_titulo=12.5,
                tam_desc=10.8)
    bueno = dict(relleno="#DDEFE3", borde=C["verde"], color=C["texto"], tam_titulo=12.5,
                 tam_desc=10.8)
    filas = [
        (40, "1 · REGISTRO", [
            ("POST /usuarios/registro", "RegistroUsuarioDTO", "correo válido · contraseña ≥ 6"),
            ("UsuarioServicio", None, "correo único; hash con Werkzeug (generate_password_hash)"),
            ("MySQL", None, "Guarda el hash, nunca la contraseña · rol = usuario"),
        ], ("201 Creado", "400 datos inválidos o correo repetido")),
        (210, "2 · INICIO DE SESIÓN", [
            ("POST /usuarios/login", None, "correo y contraseña obligatorios"),
            ("check_password_hash", None, "Compara con el hash; la cuenta debe estar activa"),
            ("JWT HS256", None, "Claims sub (id), iat y exp (15 min); firmado con SECRET_KEY"),
        ], ("200 + access_token", "401 credenciales · 403 desactivada")),
        (380, "3 · PETICIÓN PROTEGIDA", [
            ("Authorization: Bearer", "api.js lo agrega", "Token tomado de estado.js (localStorage)"),
            ("@requiere_token", None, "Decodifica y verifica firma y expiración; usuario existe y activo"),
            ("@requiere_admin", None, "Lee el rol en la BD: exige admin para /admin/* y gestión de productos"),
        ], ("Controlador ejecuta", "401 sin token / inválido · 403 rol")),
    ]
    for y, titulo, pasos, (ok, err) in filas:
        d.texto(40, y + 4, titulo, 11.5, C["acento"], 700, "start")
        x = 40
        for i, (t, tipo, desc) in enumerate(pasos):
            d.caja(x, y + 16, 210, 100, t, f"[{tipo}]" if tipo else None, desc, **paso)
            if i < 2:
                d.flecha([(x + 210, y + 66), (x + 250, y + 66)])
            x += 250
        d.flecha([(750, y + 66), (800, y + 66)])
        d.caja(800, y + 16, 165, 100, ok, None, None, **bueno)
        d.texto(980, y + 70, "o", 12, C["gris"], 700)
        d.caja(995, y + 16, 165, 100, err, None, None, **malo)
    d.etiqueta(590, 540, "La SPA oculta el panel a clientes (router.js), pero la autorización real "
               "está en el backend. Al recibir 401, api.js emite «mugly:sesion-invalida» y cierra la sesión.",
               11, C["primario"], C["calido2"])
    return d


if __name__ == "__main__":
    for f in DIAGRAMAS:
        d = f()
        ruta = os.path.join(SALIDA, f"{d.nombre}.svg")
        with open(ruta, "w", encoding="utf-8") as fh:
            fh.write(d.svg())
        print("ok", d.nombre)
