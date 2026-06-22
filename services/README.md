# API Client para Expo

Cliente HTTP pré-configurado para conectar a aplicação Expo ao servidor Ecocidade.

## 📦 Uso

### Importar
```typescript
import { apiClient } from '@/services/api';
```

### Configuração de URL

A URL da API é lida de `EXPO_PUBLIC_API_URL`. Adicione em seu `.env`:

```env
EXPO_PUBLIC_API_URL=http://seu-servidor.com
```

### Autenticação

#### Registrar
```typescript
const response = await apiClient.register(
  'email@example.com',
  'senha123',
  'Seu Nome'
);
// Token é salvo automaticamente
```

#### Login
```typescript
const response = await apiClient.login(
  'email@example.com',
  'senha123'
);
// Token é salvo automaticamente
```

#### Logout
```typescript
await apiClient.logout();
```

#### Obter Perfil
```typescript
const profile = await apiClient.getProfile();
```

### Relatórios

#### Criar Relatório
```typescript
const report = await apiClient.createReport({
  title: 'Poluição em Rio',
  description: 'Água poluída com resíduos',
  latitude: -23.5505,
  longitude: -46.6333,
  category: 'pollution',
  severity: 'high',
  image: '/path/to/image.jpg', // opcional
});
```

#### Obter Meus Relatórios
```typescript
const reports = await apiClient.getMyReports();
```

#### Listar Todos os Relatórios
```typescript
const reports = await apiClient.getAllReports(limit, offset);
```

#### Obter Relatório por ID
```typescript
const report = await apiClient.getReport(id);
```

#### Atualizar Relatório
```typescript
await apiClient.updateReport(id, {
  status: 'investigating',
  severity: 'critical',
});
```

#### Deletar Relatório
```typescript
await apiClient.deleteReport(id);
```

### Zonas de Perigo

#### Listar Todas
```typescript
const zones = await apiClient.getAllDangerZones();
```

#### Apenas Ativas
```typescript
const activeZones = await apiClient.getActiveDangerZones();
```

#### Obter por ID
```typescript
const zone = await apiClient.getDangerZone(id);
```

### Análises de Segurança

#### Listar Todas
```typescript
const analyses = await apiClient.getAllSecurityAnalyses();
```

#### Obter por ID
```typescript
const analysis = await apiClient.getSecurityAnalysis(id);
```

#### Por Zona
```typescript
const analyses = await apiClient.getSecurityAnalysesByZone(zoneId);
```

## 🔐 Autenticação

O token é armazenado automaticamente em `AsyncStorage` após login/registro.

Ele é enviado automaticamente em todas as requisições que requerem autenticação.

Para verificar autenticação:
```typescript
if (apiClient.isAuthenticated()) {
  // Usuário autenticado
}
```

## ⚠️ Tratamento de Erros

```typescript
try {
  const response = await apiClient.login(email, password);
} catch (error) {
  console.error('Erro:', error.message);
  // Tratar erro
}
```

## 📝 Exemplo Completo em um Hook

```typescript
import { useState } from 'react';
import { apiClient } from '@/services/api';

export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getMyReports();
      setReports(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: any) => {
    try {
      const newReport = await apiClient.createReport(reportData);
      setReports([newReport, ...reports]);
      return newReport;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  return {
    reports,
    loading,
    error,
    fetchReports,
    createReport,
  };
}
```

## 🔧 Instalação de Dependências

Certifique-se de ter `@react-native-async-storage/async-storage` instalado:

```bash
npm install @react-native-async-storage/async-storage
# ou
expo install @react-native-async-storage/async-storage
```

## 📚 Referência de Categorias e Status

### Categorias de Relatórios
- `pollution` - Poluição
- `waste` - Resíduos
- `deforestation` - Desmatamento
- `water` - Água
- `energy` - Energia
- `other` - Outro

### Status de Relatórios
- `pending` - Pendente
- `investigating` - Investigando
- `resolved` - Resolvido
- `rejected` - Rejeitado

### Severidade
- `low` - Baixa
- `medium` - Média
- `high` - Alta
- `critical` - Crítica
