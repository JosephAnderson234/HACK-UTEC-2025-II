# 🔄 Apache Airflow Integration - Plan de 2 Horas

**Objetivo:** Demostrar el valor de Apache Airflow con **1 endpoint estratégico** + visualización frontend.

---

## 🎯 Estrategia

Crear endpoint `/reports/airflow/analytics` que muestre el **impacto agregado de Apache Airflow ML**:
- ✅ Cuántos reportes procesó
- ✅ Qué urgencias reclasificó  
- ✅ Score promedio del modelo
- ✅ Notificaciones automáticas enviadas
- ✅ Keywords detectadas por ML

---

## 🚀 Nuevo Endpoint: GET /reports/airflow/analytics

### **Propósito**
Dashboard de métricas que demuestra que Apache Airflow está clasificando reportes automáticamente.

### **Acceso**
- `admin`: Ve todo
- `authority`: Ve solo su sector

### **Query Params**
```
?period=today|week|month (default: week)
?sector=Mantenimiento|... (opcional, auto para authority)
```

### **Response**
```json
{
  "period": "week",
  "date_range": {
    "from": "2025-11-09T00:00:00Z",
    "to": "2025-11-16T00:00:00Z"
  },
  
  "airflow_processing": {
    "total_reports": 125,
    "processed_by_ml": 118,
    "processing_rate": 94.4,
    "avg_processing_time_minutes": 3.2
  },
  
  "ml_classification": {
    "avg_confidence_score": 0.72,
    "confidence_distribution": {
      "high": 85,
      "medium": 28,
      "low": 5
    }
  },
  
  "urgency_reclassification": {
    "total_reclassified": 42,
    "changes": {
      "elevated": 35,
      "reduced": 7
    }
  },
  
  "urgency_comparison": {
    "original": { "BAJA": 45, "MEDIA": 50, "ALTA": 30 },
    "classified": { "BAJA": 38, "MEDIA": 39, "ALTA": 48 },
    "impact": "+60% más urgencias ALTA detectadas"
  },
  
  "automated_notifications": {
    "total_sent": 48,
    "by_reason": {
      "high_urgency": 42,
      "high_confidence": 6
    }
  },
  
  "top_detected_keywords": [
    { "keyword": "fuga", "count": 28, "risk_level": "medium" },
    { "keyword": "robo", "count": 12, "risk_level": "high" }
  ]
}
```

---

## 💻 Backend: Lambda Function

### **functions/getAirflowAnalytics.py**

```python
import json
import boto3
from datetime import datetime, timedelta
from collections import Counter
from utils.jwt_validator import validate_token, extract_token_from_event, create_response

dynamodb = boto3.resource('dynamodb')
reports_table = dynamodb.Table('t_reportes')

def handler(event, context):
    try:
        # 1. Validar JWT
        token = extract_token_from_event(event)
        if not token:
            return create_response(401, {'error': 'Authorization required'})
        
        payload = validate_token(token)
        role = payload['user_data']['role']
        
        if role not in ['admin', 'authority']:
            return create_response(403, {'error': 'Access denied'})
        
        # 2. Extraer parámetros
        query_params = event.get('queryStringParameters') or {}
        period = query_params.get('period', 'week')
        sector_filter = query_params.get('sector')
        
        # Authority solo ve su sector
        if role == 'authority':
            sector_filter = payload['user_data'].get('data_authority', {}).get('sector')
        
        # 3. Calcular fecha inicio
        now = datetime.utcnow()
        if period == 'today':
            start = now.replace(hour=0, minute=0, second=0)
        elif period == 'month':
            start = now - timedelta(days=30)
        else:  # week
            start = now - timedelta(days=7)
        
        # 4. Obtener reportes
        response = reports_table.scan()
        reports = response.get('Items', [])
        
        while 'LastEvaluatedKey' in response:
            response = reports_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            reports.extend(response.get('Items', []))
        
        # Filtrar por fecha y sector
        reports = [r for r in reports if r.get('created_at', '') >= start.isoformat() + 'Z']
        if sector_filter:
            reports = [r for r in reports if r.get('assigned_sector') == sector_filter]
        
        # 5. Calcular métricas
        analytics = calculate_analytics(reports, period, start, now)
        
        return create_response(200, analytics)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': str(e)})


def calculate_analytics(reports, period, start, end):
    total = len(reports)
    ml_reports = [r for r in reports if r.get('clasificacion_auto')]
    
    # 1. Procesamiento
    processing_rate = (len(ml_reports) / total * 100) if total > 0 else 0
    
    # 2. Clasificación
    scores = [r.get('classification_score', 0) for r in ml_reports if r.get('classification_score')]
    avg_score = sum(scores) / len(scores) if scores else 0
    
    high_conf = len([s for s in scores if s >= 0.7])
    medium_conf = len([s for s in scores if 0.4 <= s < 0.7])
    low_conf = len([s for s in scores if s < 0.4])
    
    # 3. Reclasificaciones
    reclassified = [r for r in ml_reports 
                    if r.get('urgencia_original') != r.get('urgencia_clasificada')]
    
    levels = {'BAJA': 1, 'MEDIA': 2, 'ALTA': 3}
    elevated = [r for r in reclassified 
                if levels.get(r.get('urgencia_clasificada', 'BAJA'), 0) > 
                   levels.get(r.get('urgencia_original', 'BAJA'), 0)]
    
    # 4. Comparación urgencias
    original_dist = {'BAJA': 0, 'MEDIA': 0, 'ALTA': 0}
    classified_dist = {'BAJA': 0, 'MEDIA': 0, 'ALTA': 0}
    
    for r in ml_reports:
        if r.get('urgencia_original'):
            original_dist[r['urgencia_original']] += 1
        if r.get('urgencia_clasificada'):
            classified_dist[r['urgencia_clasificada']] += 1
    
    # 5. Notificaciones
    notified = [r for r in ml_reports if r.get('notification_sent')]
    high_urg_notif = [r for r in notified if r.get('urgencia_clasificada') == 'ALTA']
    high_score_notif = [r for r in notified if r.get('classification_score', 0) >= 0.7]
    
    # 6. Keywords
    high_risk_kw = ['robo', 'violencia', 'seguridad', 'fuego', 'incendio']
    medium_risk_kw = ['fuga', 'agua', 'electricidad', 'daño', 'roto']
    
    keyword_counts = Counter()
    keyword_risk = {}
    
    for r in ml_reports:
        desc = (r.get('descripcion') or '').lower()
        for kw in high_risk_kw:
            if kw in desc:
                keyword_counts[kw] += 1
                keyword_risk[kw] = 'high'
        for kw in medium_risk_kw:
            if kw in desc:
                keyword_counts[kw] += 1
                keyword_risk[kw] = 'medium'
    
    top_keywords = [
        {'keyword': kw, 'count': count, 'risk_level': keyword_risk.get(kw, 'medium')}
        for kw, count in keyword_counts.most_common(8)
    ]
    
    # Calcular impacto
    orig_alta = original_dist['ALTA']
    class_alta = classified_dist['ALTA']
    increase = ((class_alta - orig_alta) / orig_alta * 100) if orig_alta > 0 else 0
    
    return {
        'period': period,
        'date_range': {
            'from': start.isoformat() + 'Z',
            'to': end.isoformat() + 'Z'
        },
        'airflow_processing': {
            'total_reports': total,
            'processed_by_ml': len(ml_reports),
            'processing_rate': round(processing_rate, 1),
        },
        'ml_classification': {
            'avg_confidence_score': round(avg_score, 2),
            'confidence_distribution': {
                'high': high_conf,
                'medium': medium_conf,
                'low': low_conf
            }
        },
        'urgency_reclassification': {
            'total_reclassified': len(reclassified),
            'changes': {
                'elevated': len(elevated),
                'reduced': len(reclassified) - len(elevated)
            }
        },
        'urgency_comparison': {
            'original': original_dist,
            'classified': classified_dist,
            'impact': f"+{int(increase)}% más urgencias ALTA detectadas" if increase > 0 else "Sin cambio"
        },
        'automated_notifications': {
            'total_sent': len(notified),
            'by_reason': {
                'high_urgency': len(high_urg_notif),
                'high_confidence': len(high_score_notif)
            }
        },
        'top_detected_keywords': top_keywords
    }
```

### **serverless.yml**

```yaml
functions:
  # ... funciones existentes ...
  
  getAirflowAnalytics:
    handler: functions/getAirflowAnalytics.handler
    events:
      - http:
          path: reports/airflow/analytics
          method: get
          cors: true
    environment:
      TABLE_REPORTES: t_reportes
```

---

## 🎨 Frontend: Dashboard Component

### **1. Servicio API** (5 min)

```typescript
// frontend/src/services/airflow/index.ts
import { API_URL } from '@/utils/loaderEnv';

export const airflowService = {
  async getAnalytics(period: 'today' | 'week' | 'month' = 'week') {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/reports/airflow/analytics?period=${period}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },
};
```

### **2. Hook** (5 min)

```typescript
// frontend/src/hooks/useAirflowAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import { airflowService } from '@/services/airflow';

export const useAirflowAnalytics = (period = 'week') => {
  return useQuery({
    queryKey: ['airflow-analytics', period],
    queryFn: () => airflowService.getAnalytics(period),
    staleTime: 5 * 60 * 1000,
  });
};
```

### **3. Componente Dashboard** (60 min)

```typescript
// frontend/src/components/sections/AirflowDashboard.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, TrendingUp, Bell, Target } from 'lucide-react';
import { useAirflowAnalytics } from '@/hooks/useAirflowAnalytics';

export const AirflowDashboard = () => {
  const [period, setPeriod] = useState('week');
  const { data, isLoading } = useAirflowAnalytics(period);

  if (isLoading) return <div>Cargando...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Apache Airflow ML Analytics</h2>
            <p className="text-sm text-gray-600">Clasificación automática de reportes</p>
          </div>
        </div>
        
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="today">Hoy</option>
          <option value="week">Última semana</option>
          <option value="month">Último mes</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <p className="text-2xl font-bold">
              {data.airflow_processing.processed_by_ml}/{data.airflow_processing.total_reports}
            </p>
            <p className="text-sm text-gray-600">Procesados por ML</p>
            <Badge className="mt-2">{data.airflow_processing.processing_rate}%</Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <p className="text-2xl font-bold">
              {Math.round(data.ml_classification.avg_confidence_score * 100)}%
            </p>
            <p className="text-sm text-gray-600">Score Promedio</p>
            <Progress value={data.ml_classification.avg_confidence_score * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <p className="text-2xl font-bold">
              {data.urgency_reclassification.changes.elevated}
            </p>
            <p className="text-sm text-gray-600">Urgencias Elevadas</p>
            <p className="text-xs text-gray-500 mt-1">
              De {data.urgency_reclassification.total_reclassified} reclasificados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <p className="text-2xl font-bold">
              {data.automated_notifications.total_sent}
            </p>
            <p className="text-sm text-gray-600">Notificaciones Auto</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparación Urgencias */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Impacto en Clasificación de Urgencias</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">Original (Estudiante)</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Badge variant="outline">BAJA</Badge>
                  <span>{data.urgency_comparison.original.BAJA}</span>
                </div>
                <div className="flex justify-between">
                  <Badge variant="outline">MEDIA</Badge>
                  <span>{data.urgency_comparison.original.MEDIA}</span>
                </div>
                <div className="flex justify-between">
                  <Badge variant="outline">ALTA</Badge>
                  <span>{data.urgency_comparison.original.ALTA}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-600 mb-3">Clasificada (Airflow ML)</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Badge className="bg-green-500">BAJA</Badge>
                  <span className="font-semibold text-blue-600">
                    {data.urgency_comparison.classified.BAJA}
                  </span>
                </div>
                <div className="flex justify-between">
                  <Badge className="bg-yellow-500">MEDIA</Badge>
                  <span className="font-semibold text-blue-600">
                    {data.urgency_comparison.classified.MEDIA}
                  </span>
                </div>
                <div className="flex justify-between">
                  <Badge className="bg-red-500">ALTA</Badge>
                  <span className="font-semibold text-blue-600">
                    {data.urgency_comparison.classified.ALTA}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              💡 {data.urgency_comparison.impact}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Keywords Más Detectadas por ML</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.top_detected_keywords.map((kw, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                  <Badge variant={kw.risk_level === 'high' ? 'destructive' : 'default'}>
                    {kw.keyword}
                  </Badge>
                </div>
                <span className="font-semibold">{kw.count} veces</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### **4. Integrar en Dashboard** (5 min)

```typescript
// frontend/src/pages/Dashboard.tsx
import { AirflowDashboard } from '@/components/sections/AirflowDashboard';

const AdminDashboard = () => {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stats existentes */}
      <StatsSection />
      
      {/* ⭐ Dashboard Airflow */}
      <AirflowDashboard />
      
      <ReportsTable />
    </div>
  );
};
```

---

## ✅ Checklist (2 HORAS)

### **Backend** (45 min)
- [ ] Crear `functions/getAirflowAnalytics.py`
- [ ] Actualizar `serverless.yml`
- [ ] Deploy: `sls deploy -f getAirflowAnalytics`
- [ ] Test con Postman

### **Frontend** (75 min)
- [ ] Crear `services/airflow/index.ts` (5 min)
- [ ] Crear `hooks/useAirflowAnalytics.ts` (5 min)
- [ ] Crear `components/sections/AirflowDashboard.tsx` (60 min)
- [ ] Integrar en `Dashboard.tsx` (5 min)

---

## 🎯 Valor para Demo

**Este endpoint demuestra claramente:**
1. ✅ **Airflow está procesando**: 94% de reportes clasificados
2. ✅ **ML está funcionando**: Score promedio 72%
3. ✅ **Reclasifica urgencias**: +60% más urgencias ALTA detectadas
4. ✅ **Notifica automáticamente**: 48 alertas enviadas
5. ✅ **Detecta patrones**: Keywords de riesgo identificadas

**Perfecto para presentación hackathon** 🚀
