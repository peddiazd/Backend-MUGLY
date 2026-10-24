
"""
Flask-Migrate: la extensión se inicializa dentro del app factory.

Este módulo reexporta la instancia migrate para uso externo.
"""

from app import migrate  # noqa: F401
