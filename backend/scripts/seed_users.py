#!/usr/bin/env python3
"""
Script para insertar usuarios de prueba en la tabla t_usuarios de DynamoDB.
Crea estudiantes, autoridades y administradores para testing.

Uso:
    python scripts/seed_users.py
"""

import boto3
import hashlib
import uuid
from datetime import datetime
import sys

# Configurar DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('t_usuarios')

def hash_password(password):
    """Hash de contraseña con SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

# Datos de usuarios de prueba
users = [
    # ==================== ESTUDIANTES ====================
    {
        "id": str(uuid.uuid4()),
        "first_name": "Juan",
        "last_name": "Pérez García",
        "email": "juan.perez@utec.edu.pe",
        "password": hash_password("student123"),
        "role": "student",
        "DNI": "72345678",
        "cellphone": "987654321",
        "registration_date": datetime.utcnow().isoformat(),
        "data_student": {
            "career": "Ingeniería de Sistemas",
            "cycle": 5,
            "code": 202012345
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "María",
        "last_name": "González López",
        "email": "maria.gonzalez@utec.edu.pe",
        "password": hash_password("student123"),
        "role": "student",
        "DNI": "73456789",
        "cellphone": "987654322",
        "registration_date": datetime.utcnow().isoformat(),
        "data_student": {
            "career": "Ingeniería Civil",
            "cycle": 3,
            "code": 202213456
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Carlos",
        "last_name": "Ramírez Torres",
        "email": "carlos.ramirez@utec.edu.pe",
        "password": hash_password("student123"),
        "role": "student",
        "DNI": "74567890",
        "cellphone": "987654323",
        "registration_date": datetime.utcnow().isoformat(),
        "data_student": {
            "career": "Ingeniería Industrial",
            "cycle": 7,
            "code": 202014567
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Ana",
        "last_name": "Martínez Silva",
        "email": "ana.martinez@utec.edu.pe",
        "password": hash_password("student123"),
        "role": "student",
        "DNI": "75678901",
        "cellphone": "987654324",
        "registration_date": datetime.utcnow().isoformat(),
        "data_student": {
            "career": "Ingeniería de Software",
            "cycle": 6,
            "code": 202115678
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Luis",
        "last_name": "Fernández Ruiz",
        "email": "luis.fernandez@utec.edu.pe",
        "password": hash_password("student123"),
        "role": "student",
        "DNI": "76789012",
        "cellphone": "987654325",
        "registration_date": datetime.utcnow().isoformat(),
        "data_student": {
            "career": "Ingeniería Mecatrónica",
            "cycle": 4,
            "code": 202216789
        }
    },
    
    # ==================== AUTORIDADES ====================
    {
        "id": str(uuid.uuid4()),
        "first_name": "Roberto",
        "last_name": "Sánchez Morales",
        "email": "roberto.sanchez@utec.edu.pe",
        "password": hash_password("authority123"),
        "role": "authority",
        "DNI": "45678901",
        "cellphone": "956789012",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Mantenimiento",
            "charge": "Jefe de Mantenimiento",
            "notifications_urgency": ["ALTA", "MEDIA"]
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Patricia",
        "last_name": "Díaz Vega",
        "email": "patricia.diaz@utec.edu.pe",
        "password": hash_password("authority123"),
        "role": "authority",
        "DNI": "46789012",
        "cellphone": "956789013",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Seguridad",
            "charge": "Jefe de Seguridad",
            "notifications_urgency": ["ALTA"]
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Miguel",
        "last_name": "Castro Flores",
        "email": "miguel.castro@utec.edu.pe",
        "password": hash_password("authority123"),
        "role": "authority",
        "DNI": "47890123",
        "cellphone": "956789014",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Limpieza",
            "charge": "Supervisor de Limpieza",
            "notifications_urgency": ["ALTA", "MEDIA", "BAJA"]
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Elena",
        "last_name": "Vargas Mendoza",
        "email": "elena.vargas@utec.edu.pe",
        "password": hash_password("authority123"),
        "role": "authority",
        "DNI": "48901234",
        "cellphone": "956789015",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Servicios",
            "charge": "Coordinadora de Servicios",
            "notifications_urgency": ["ALTA", "MEDIA"]
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Jorge",
        "last_name": "Rojas Paredes",
        "email": "jorge.rojas@utec.edu.pe",
        "password": hash_password("authority123"),
        "role": "authority",
        "DNI": "49012345",
        "cellphone": "956789016",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Mantenimiento",
            "charge": "Técnico de Mantenimiento",
            "notifications_urgency": ["ALTA", "MEDIA"]
        }
    },
    
    # ==================== ADMINISTRADORES ====================
    {
        "id": str(uuid.uuid4()),
        "first_name": "Andrea",
        "last_name": "Torres Castillo",
        "email": "andrea.torres@utec.edu.pe",
        "password": hash_password("admin123"),
        "role": "admin",
        "DNI": "40123456",
        "cellphone": "956123456",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Administración",
            "charge": "Directora de Operaciones",
            "notifications_urgency": ["ALTA"]
        }
    },
    {
        "id": str(uuid.uuid4()),
        "first_name": "Fernando",
        "last_name": "Jiménez Ríos",
        "email": "fernando.jimenez@utec.edu.pe",
        "password": hash_password("admin123"),
        "role": "admin",
        "DNI": "41234567",
        "cellphone": "956234567",
        "registration_date": datetime.utcnow().isoformat(),
        "data_authority": {
            "sector": "Administración",
            "charge": "Gerente de Infraestructura",
            "notifications_urgency": ["ALTA", "MEDIA"]
        }
    }
]

def seed_users():
    """Inserta los usuarios en DynamoDB"""
    print("🚀 Iniciando seed de usuarios...")
    print(f"📊 Total de usuarios a insertar: {len(users)}\n")
    
    success_count = 0
    error_count = 0
    
    # Contadores por rol
    students = 0
    authorities = 0
    admins = 0
    
    for user in users:
        try:
            # Verificar si el email ya existe
            try:
                response = table.query(
                    IndexName='EmailIndex',
                    KeyConditionExpression='email = :email',
                    ExpressionAttributeValues={':email': user['email']}
                )
                
                if response['Items']:
                    print(f"⚠️  Email ya existe: {user['email']} - omitiendo")
                    error_count += 1
                    continue
            except:
                # Si el índice no existe, continuar
                pass
            
            table.put_item(Item=user)
            
            # Emoji según rol
            emoji = "👨‍🎓" if user['role'] == 'student' else "👷" if user['role'] == 'authority' else "👔"
            
            print(f"{emoji} ✅ {user['first_name']} {user['last_name']} ({user['role']})")
            print(f"   📧 {user['email']}")
            if user['role'] == 'student':
                print(f"   🎓 {user['data_student']['career']} - Ciclo {user['data_student']['cycle']}")
                students += 1
            else:
                print(f"   💼 {user['data_authority']['sector']} - {user['data_authority']['charge']}")
                if user['role'] == 'authority':
                    authorities += 1
                else:
                    admins += 1
            print()
            
            success_count += 1
            
        except Exception as e:
            print(f"❌ Error insertando {user['email']}: {str(e)}\n")
            error_count += 1
    
    print(f"{'='*60}")
    print(f"✨ Seed completado!")
    print(f"   ✅ Exitosos: {success_count}")
    print(f"   ❌ Errores: {error_count}")
    print(f"\n📊 Resumen por rol:")
    print(f"   👨‍🎓 Estudiantes: {students}")
    print(f"   👷 Autoridades: {authorities}")
    print(f"   👔 Administradores: {admins}")
    print(f"{'='*60}\n")
    
    print(f"🔑 Credenciales de acceso:")
    print(f"   Estudiantes:    email@utec.edu.pe / student123")
    print(f"   Autoridades:    email@utec.edu.pe / authority123")
    print(f"   Administradores: email@utec.edu.pe / admin123")
    print()
    
    return success_count, error_count

if __name__ == "__main__":
    try:
        success, errors = seed_users()
        sys.exit(0 if errors == 0 else 1)
    except Exception as e:
        print(f"❌ Error fatal: {str(e)}")
        sys.exit(1)
