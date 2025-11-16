#!/usr/bin/env python3
"""
Script para insertar datos de lugares en la tabla t_lugares de DynamoDB.
Ejecutar después del deploy de Serverless Framework.

Uso:
    python scripts/seed_lugares.py
"""

import boto3
import sys

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('t_lugares')

# Datos de lugares
lugares = [
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Baño torre 1 piso 3",
        "type": "baño",
        "tower": "T1",
        "floor": 3
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Aula A101",
        "type": "aula",
        "tower": "T1",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Laboratorio de Cómputo L201",
        "type": "laboratorio",
        "tower": "T2",
        "floor": 2
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Auditorio Principal",
        "type": "auditorio",
        "tower": "T3",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "Estacionamiento Norte",
        "type": "estacionamiento",
        "tower": "",
        "floor": 0
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "name": "Baño torre 2 piso 1",
        "type": "baño",
        "tower": "T2",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440007",
        "name": "Cafetería Principal",
        "type": "cafeteria",
        "tower": "T1",
        "floor": 1
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440008",
        "name": "Biblioteca Central",
        "type": "biblioteca",
        "tower": "T4",
        "floor": 2
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440009",
        "name": "Sala SUM",
        "type": "sala_sum",
        "tower": "T2",
        "floor": 3
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "Patio Central",
        "type": "patio",
        "tower": "",
        "floor": 0
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "name": "Jardín Norte",
        "type": "jardin",
        "tower": "",
        "floor": 0
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440012",
        "name": "Entrada Principal",
        "type": "entrada",
        "tower": "",
        "floor": 0
    }
]

def seed_lugares():
    """Inserta los lugares en DynamoDB"""
    print("🚀 Iniciando seed de lugares...")
    print(f"📊 Total de lugares a insertar: {len(lugares)}\n")
    
    success_count = 0
    error_count = 0
    
    for lugar in lugares:
        try:
            table.put_item(Item=lugar)
            print(f"✅ Insertado: {lugar['name']} ({lugar['type']}) - Torre {lugar['tower'] or 'N/A'}, Piso {lugar['floor']}")
            success_count += 1
        except Exception as e:
            print(f"❌ Error insertando {lugar['name']}: {str(e)}")
            error_count += 1
    
    print(f"\n{'='*60}")
    print(f"✨ Seed completado!")
    print(f"   ✅ Exitosos: {success_count}")
    print(f"   ❌ Errores: {error_count}")
    print(f"{'='*60}\n")
    
    return success_count, error_count

if __name__ == "__main__":
    try:
        success, errors = seed_lugares()
        sys.exit(0 if errors == 0 else 1)
    except Exception as e:
        print(f"❌ Error fatal: {str(e)}")
        sys.exit(1)
