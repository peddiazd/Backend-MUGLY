# Imágenes de los productos del catálogo

Mockups de los 6 productos de muestra: foto de mug blanco con el diseño de cada
producto, fondo transparente (PNG, 750 × 705 px).

La carpeta `backend/uploads/` no se versiona. En un equipo nuevo, el script
`backend/scripts/cargar_datos_demo.py` crea los 6 productos y les sube estas fotos
(ver «Ejecutar MUGLY en un computador nuevo» en el README principal). También se
pueden cambiar desde **Administración → Productos e inventario → Foto**.

| Producto (id) | Archivo |
|---|---|
| 1 · Mug clásico blanco | `producto-1-blanco.png` |
| 2 · Mug negro mate | `producto-2-negro.png` |
| 3 · Mug mágico | `producto-3-magico.png` |
| 4 · Mug pastel rosa | `producto-4-rosa.png` |
| 5 · Mug esmaltado azul | `producto-5-esmaltado.png` |
| 6 · Mug con frase | `producto-6-frases.png` |

Se generan con `frontend/js/componentes/mockups.js`, el mismo componente que usa
la página para las escenas de Inicio y Personalizados.
