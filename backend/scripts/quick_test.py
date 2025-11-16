#!/usr/bin/env python3
"""
Script de test rápido para verificar el funcionamiento del backend.
Registra usuarios de prueba y crea un reporte de ejemplo.

Uso:
    python scripts/quick_test.py <API_ENDPOINT>
    
Ejemplo:
    python scripts/quick_test.py https://abc123.execute-api.us-east-1.amazonaws.com/dev
"""

import sys
import json
import requests
import uuid

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Se requiere el endpoint de la API")
        print("Uso: python scripts/quick_test.py <API_ENDPOINT>")
        print("Ejemplo: python scripts/quick_test.py https://abc123.execute-api.us-east-1.amazonaws.com/dev")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    
    print("=" * 60)
    print("🧪 UTEC Alerta - Test Rápido")
    print("=" * 60)
    print()
    
    # 1. Registrar estudiante
    print("1️⃣  Registrando estudiante...")
    student_email = f"estudiante.test.{uuid.uuid4().hex[:8]}@utec.edu.pe"
    student_data = {
        "first_name": "María",
        "last_name": "García",
        "email": student_email,
        "password": "test123",
        "role": "student",
        "DNI": "72345678",
        "cellphone": "987654321",
        "data_student": {
            "career": "Ingeniería de Software",
            "cycle": 5,
            "code": 202010456
        }
    }
    
    try:
        response = requests.post(f"{base_url}/auth/register", json=student_data)
        response.raise_for_status()
        student_result = response.json()
        student_token = student_result.get('token')
        print(f"   ✅ Estudiante registrado: {student_email}")
        print(f"   🔑 Token: {student_token[:20]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    print()
    
    # 2. Registrar autoridad
    print("2️⃣  Registrando autoridad...")
    authority_email = f"autoridad.test.{uuid.uuid4().hex[:8]}@utec.edu.pe"
    authority_data = {
        "first_name": "Carlos",
        "last_name": "Rodríguez",
        "email": authority_email,
        "password": "test123",
        "role": "authority",
        "DNI": "12345678",
        "cellphone": "987123456",
        "data_authority": {
            "sector": "Mantenimiento",
            "charge": "Jefe de Mantenimiento",
            "notifications_urgency": ["MEDIA", "ALTA"]
        }
    }
    
    try:
        response = requests.post(f"{base_url}/auth/register", json=authority_data)
        response.raise_for_status()
        authority_result = response.json()
        authority_token = authority_result.get('token')
        print(f"   ✅ Autoridad registrada: {authority_email}")
        print(f"   🔑 Token: {authority_token[:20]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    print()
    
    # 3. Login del estudiante
    print("3️⃣  Probando login del estudiante...")
    login_data = {
        "email": student_email,
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{base_url}/auth/login", json=login_data)
        response.raise_for_status()
        login_result = response.json()
        print(f"   ✅ Login exitoso")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    print()
    
    # 4. Crear reporte
    print("4️⃣  Creando reporte como estudiante...")
    report_data = {
        "lugar_id": "550e8400-e29b-41d4-a716-446655440001",  # Baño torre 1 piso 3
        "urgencia": "ALTA",
        "descripcion": "Test: Fuga de agua detectada en el baño. El agua está saliendo del lavabo."
    }
    
    headers = {
        "Authorization": f"Bearer {student_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{base_url}/reports/create", json=report_data, headers=headers)
        response.raise_for_status()
        report_result = response.json()
        report_id = report_result.get('report', {}).get('id_reporte')
        print(f"   ✅ Reporte creado: {report_id}")
        print(f"   📍 Lugar: {report_result.get('report', {}).get('lugar', {}).get('nombre')}")
        print(f"   ⚠️  Urgencia: {report_result.get('report', {}).get('urgencia')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print(f"   Response: {response.text if 'response' in locals() else 'N/A'}")
        sys.exit(1)
    
    print()
    
    # 5. Actualizar estado del reporte
    print("5️⃣  Actualizando estado del reporte como autoridad...")
    update_data = {
        "id_reporte": report_id,
        "estado": "ATENDIENDO",
        "comentario": "Personal de mantenimiento notificado y en camino"
    }
    
    headers = {
        "Authorization": f"Bearer {authority_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(f"{base_url}/reports/update-status", json=update_data, headers=headers)
        response.raise_for_status()
        update_result = response.json()
        print(f"   ✅ Estado actualizado a: {update_result.get('report', {}).get('estado')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print(f"   Response: {response.text if 'response' in locals() else 'N/A'}")
        sys.exit(1)
    
    print()
    
    # 6. Marcar como resuelto
    print("6️⃣  Marcando reporte como resuelto...")
    resolve_data = {
        "id_reporte": report_id,
        "estado": "RESUELTO",
        "comentario": "Problema resuelto exitosamente"
    }
    
    try:
        response = requests.post(f"{base_url}/reports/update-status", json=resolve_data, headers=headers)
        response.raise_for_status()
        resolve_result = response.json()
        print(f"   ✅ Estado actualizado a: {resolve_result.get('report', {}).get('estado')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✨ ¡Todas las pruebas pasaron exitosamente!")
    print("=" * 60)
    print()
    print("📝 Credenciales de prueba:")
    print(f"   Estudiante: {student_email} / test123")
    print(f"   Autoridad: {authority_email} / test123")
    print()
    print("🔗 WebSocket URL (agrega tu token):")
    ws_url = base_url.replace('https://', 'wss://').replace('/dev', '/dev')
    print(f"   {ws_url}?token=TU_TOKEN")
    print()

if __name__ == "__main__":
    main()
