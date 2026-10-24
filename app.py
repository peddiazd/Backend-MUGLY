from app import crear_app

# Crear la aplicación
app = crear_app()

if __name__ == "__main__":
    # Modo debug para reiniciar al guardar cambios
    app.run(debug=True, port=5000)
