#!/bin/bash

# Este script automatiza el proceso de agregar, confirmar y enviar cambios a Git.

# Verifica si se proporcionó un mensaje de commit.
if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar un mensaje para el commit."
  echo "Uso: ./deploy.sh \"Tu mensaje de commit\""
  exit 1
fi

# Asigna el primer argumento a la variable COMMIT_MESSAGE.
COMMIT_MESSAGE="$1"

# Obtiene el nombre de la rama actual.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "📦 Agregando todos los cambios..."
git add .

echo "📝 Creando commit con el mensaje: \"$COMMIT_MESSAGE\""
git commit -m "$COMMIT_MESSAGE"

echo "🚀 Subiendo cambios a la rama '$CURRENT_BRANCH'..."
git push origin "$CURRENT_BRANCH"

echo "✅ ¡Listo! Tus cambios han sido enviados al repositorio."
