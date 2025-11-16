#!/bin/bash
# Script para verificar que todo esté listo antes del deploy

echo "🔍 Verificando estructura del proyecto UTEC Alerta..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar archivos principales
echo "📁 Verificando archivos principales..."

files=(
    "serverless.yml"
    "requirements.txt"
    "package.json"
    "README.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file ${RED}FALTA${NC}"
    fi
done

echo ""
echo "📁 Verificando funciones Lambda..."

functions=(
    "functions/auth.py"
    "functions/sendReport.py"
    "functions/updateStatus.py"
    "functions/onConnect.py"
    "functions/onDisconnect.py"
    "functions/sendNotify.py"
)

for func in "${functions[@]}"; do
    if [ -f "$func" ]; then
        echo -e "${GREEN}✓${NC} $func"
    else
        echo -e "${RED}✗${NC} $func ${RED}FALTA${NC}"
    fi
done

echo ""
echo "📁 Verificando recursos..."

resources=(
    "resources/dynamodb-tables.yml"
    "resources/s3.yml"
    "resources/parameter-store.yml"
)

for resource in "${resources[@]}"; do
    if [ -f "$resource" ]; then
        echo -e "${GREEN}✓${NC} $resource"
    else
        echo -e "${RED}✗${NC} $resource ${RED}FALTA${NC}"
    fi
done

echo ""
echo "📁 Verificando utilidades..."

if [ -f "utils/jwt_validator.py" ]; then
    echo -e "${GREEN}✓${NC} utils/jwt_validator.py"
else
    echo -e "${RED}✗${NC} utils/jwt_validator.py ${RED}FALTA${NC}"
fi

echo ""
echo "📁 Verificando scripts..."

scripts=(
    "scripts/seed_lugares.py"
    "scripts/quick_test.py"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        echo -e "${GREEN}✓${NC} $script"
    else
        echo -e "${RED}✗${NC} $script ${RED}FALTA${NC}"
    fi
done

echo ""
echo "📁 Verificando documentación..."

docs=(
    "README.md"
    "ARCHITECTURE.md"
    "DEPLOYMENT.md"
    "TESTING.md"
    "CONFIGURATION.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
    else
        echo -e "${RED}✗${NC} $doc ${RED}FALTA${NC}"
    fi
done

echo ""
echo "🔍 Verificando dependencias..."

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js instalado: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js ${RED}NO INSTALADO${NC}"
fi

# Verificar Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python instalado: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python ${RED}NO INSTALADO${NC}"
fi

# Verificar Serverless
if command -v serverless &> /dev/null; then
    SLS_VERSION=$(serverless --version | head -n 1)
    echo -e "${GREEN}✓${NC} Serverless Framework instalado: $SLS_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Serverless Framework no instalado"
    echo -e "   Instalar con: ${YELLOW}npm install -g serverless${NC}"
fi

# Verificar AWS CLI
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version)
    echo -e "${GREEN}✓${NC} AWS CLI instalado: $AWS_VERSION"
else
    echo -e "${YELLOW}⚠${NC} AWS CLI no instalado (opcional)"
fi

echo ""
echo "📊 Resumen del proyecto:"
echo "========================"
echo ""
echo "Funciones Lambda: 6"
echo "  - auth (login/register)"
echo "  - sendReport (crear reportes)"
echo "  - updateStatus (actualizar estados)"
echo "  - onConnect (WebSocket connect)"
echo "  - onDisconnect (WebSocket disconnect)"
echo "  - sendNotify (notificaciones)"
echo ""
echo "Tablas DynamoDB: 4"
echo "  - t_usuarios"
echo "  - t_lugares"
echo "  - t_reportes"
echo "  - t_connections"
echo ""
echo "Recursos AWS:"
echo "  - S3 Bucket (imágenes)"
echo "  - Parameter Store (JWT secret)"
echo "  - EventBridge (notificaciones)"
echo "  - API Gateway HTTP (REST API)"
echo "  - API Gateway WebSocket"
echo ""
echo "🔐 Seguridad:"
echo "  - JWT tokens (7 días expiración)"
echo "  - Validación compartida en utils/"
echo "  - Passwords hasheados (SHA-256)"
echo "  - Roles: student, authority, admin"
echo ""
echo "📚 Documentación completa en:"
echo "  - README.md (principal)"
echo "  - ARCHITECTURE.md (arquitectura)"
echo "  - DEPLOYMENT.md (deploy)"
echo "  - TESTING.md (testing)"
echo "  - CONFIGURATION.md (config)"
echo ""
echo "✨ Para empezar:"
echo ""
echo "1. Instalar dependencias:"
echo "   ${YELLOW}npm install -g serverless${NC}"
echo "   ${YELLOW}pip install -r requirements.txt${NC}"
echo ""
echo "2. Deploy:"
echo "   ${YELLOW}serverless deploy --stage dev${NC}"
echo ""
echo "3. Poblar datos:"
echo "   ${YELLOW}python scripts/seed_lugares.py${NC}"
echo ""
echo "4. Probar:"
echo "   ${YELLOW}python scripts/quick_test.py https://YOUR_API_ENDPOINT${NC}"
echo ""
echo "🎉 ¡Todo listo para el hackathon!"
