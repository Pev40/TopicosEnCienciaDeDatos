#!/bin/sh

# Crear el directorio de la base de datos si no existe
mkdir -p /app/data/db

# Verificar si ya existe la base de datos
if [ -f /app/data/dashboard.db ]; then
    echo "Base de datos existente encontrada, copiando al directorio de datos..."
    cp /app/data/dashboard.db /app/data/db/dashboard.db
    echo "Base de datos copiada correctamente"
else
    echo "No se encontró base de datos existente, verificando archivos CSV..."
    
    # Verificar si hay archivos CSV
    if [ -f /app/data/*.csv ]; then
        echo "Archivos CSV encontrados, importando datos..."
        sqlite3 /app/data/db/dashboard.db <<EOF
.mode csv
.import /app/data/*.csv dashboard_mitdb
EOF
        
        if [ $? -eq 0 ]; then
            echo "Base de datos creada e importada correctamente desde CSV"
        else
            echo "Error al importar datos desde CSV"
            exit 1
        fi
    else
        echo "Error: No se encontró ni base de datos ni archivos CSV"
        exit 1
    fi
fi

# Iniciar la aplicación
echo "Iniciando la aplicación..."
exec node server.js 