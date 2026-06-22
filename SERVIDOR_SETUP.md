# 🚀 Servidor Backend - Ecocidade

Seu servidor backend está pronto para funcionar! Aqui está um guia rápido de como começar.

## 📂 Estrutura do Servidor

```
server/
├── src/
│   ├── index.ts              # Arquivo principal da aplicação
│   ├── config/               # Configurações (database, environment)
│   ├── controllers/          # Lógica dos endpoints
│   ├── services/             # Regras de negócio
│   ├── models/               # Definições de dados (Zod)
│   ├── middleware/           # Autenticação e validação
│   ├── routes/               # Definição de rotas
│   └── database/             # Migrações do banco
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md                 # Documentação técnica
├── DEPLOY.md                 # Instruções de deploy
└── uploads/                  # Pasta para armazenar imagens
```

## ⚡ Quick Start Local

### 1. Instalar Dependências
```bash
cd server
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite o `.env` se necessário (padrões já estão OK para desenvolvimento local).

### 3. Iniciar PostgreSQL com Docker
```bash
docker compose up postgres -d
```

### 4. Executar Migrações
```bash
npm run migrate
```

### 5. Iniciar Servidor
```bash
npm run dev
```

Pronto! Servidor rodando em **http://localhost:3000**

### 6. Testar a API

```bash
# Health check
curl http://localhost:3000/health

# Registrar usuário
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123",
    "name": "Teste Usuario"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

## 🐳 Produção com Docker

### Iniciar Tudo
```bash
cd server
docker compose up -d
```

Isso inicia:
- PostgreSQL na porta 5432
- API Fastify na porta 3000

### Verificar Status
```bash
docker compose ps
docker compose logs -f api
```

### Parar Serviços
```bash
docker compose down
```

## 📱 Conectar do App Expo

Adicione em seu `.env` do app (ou em `app.json`):

```env
EXPO_PUBLIC_API_URL=http://seu-servidor-ip:3000
```

Ou localhost se testando localmente:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Use o cliente pré-configurado em `services/api.ts`:

```typescript
import { apiClient } from '@/services/api';

// Login
const user = await apiClient.login('email@test.com', 'senha123');

// Criar relatório
const report = await apiClient.createReport({
  title: 'Poluição',
  description: 'Rio poluído',
  latitude: -23.5505,
  longitude: -46.6333,
  category: 'pollution',
  severity: 'high'
});

// Listar relatórios
const reports = await apiClient.getMyReports();
```

## 🌍 Deploy na Oracle Cloud

Veja o arquivo completo [DEPLOY.md](./server/DEPLOY.md) para instruções detalhadas.

Resumo rápido:
1. Criar Compute Instance (Ubuntu, Free Tier)
2. SSH para a instância
3. Instalar Docker
4. Clonar repositório
5. Configurar `.env`
6. `docker compose up -d`
7. Configurar Nginx (opcional, recomendado)

## 🔑 Variáveis de Ambiente Importantes

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | String de conexão | `postgresql://ecocidade:change_me@localhost/ecocidade` |
| `PORT` | Porta do servidor | `3000` |
| `JWT_SECRET` | Chave para assinar tokens | `change-me-in-production` |
| `CORS_ORIGIN` | URLs permitidas no app | `http://localhost:19000` |
| `NODE_ENV` | Ambiente | `development` |

**⚠️ Em produção, SEMPRE altere `JWT_SECRET` e `DB_PASSWORD`!**

## 📊 Endpoints Principais

### Autenticação
- `POST /auth/register` - Registrar
- `POST /auth/login` - Login
- `GET /auth/profile` - Perfil (requer token)

### Relatórios
- `POST /reports` - Criar (requer token)
- `GET /reports` - Listar todos
- `GET /reports/my-reports` - Meus (requer token)
- `GET /reports/:id` - Detalhes
- `PATCH /reports/:id` - Atualizar (requer token)
- `DELETE /reports/:id` - Deletar (requer token)

### Zonas de Perigo
- `GET /danger-zones` - Listar todas
- `GET /danger-zones/active/all` - Apenas ativas
- `GET /danger-zones/:id` - Detalhes
- `POST /danger-zones` - Criar (admin)
- `PATCH /danger-zones/:id` - Atualizar (admin)
- `DELETE /danger-zones/:id` - Deletar (admin)

### Análises de Segurança
- `GET /security-analyses` - Listar
- `GET /security-analyses/:id` - Detalhes
- `GET /security-analyses/by-zone/:zoneId` - Por zona
- Criar/atualizar/deletar (apenas admin)

## 🛠️ Scripts Úteis

```bash
npm run dev        # Desenvolvimento com hot reload
npm run build      # Compilar para produção
npm start          # Iniciar versão compilada
npm run migrate    # Executar migrações do BD
npm run lint       # Verificar código
```

## 📚 Documentação Adicional

- **README.md** - Documentação técnica completa
- **DEPLOY.md** - Instruções detalhadas de deployment
- **services/README.md** - Cliente HTTP para Expo

## 🐛 Troubleshooting

### Erro: "Cannot find module '@react-native-async-storage/async-storage'"
```bash
npm install @react-native-async-storage/async-storage
```

### Erro: "Porta 3000 já em uso"
```bash
# Mac/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro: "Connection refused" no PostgreSQL
```bash
# Verificar se banco está rodando
docker compose ps postgres

# Reiniciar
docker compose restart postgres
```

## ✅ Checklist para Produção

- [ ] Alterar `JWT_SECRET` em `.env`
- [ ] Alterar `DB_PASSWORD` em `.env`
- [ ] Configurar `CORS_ORIGIN` com URL do app real
- [ ] Configurar `API_URL` com domínio/IP correto
- [ ] Configurar firewall da Oracle Cloud
- [ ] Configurar Nginx com SSL/HTTPS
- [ ] Fazer backup do banco regularmente
- [ ] Monitorar logs e uso de recursos
- [ ] Testar endpoints com app real

## 📞 Próximos Passos

1. **Integrar com o App**: Use `apiClient` para conectar endpoints
2. **Configurar Banco**: Adicione dados de teste (zonas, análises)
3. **Deploy**: Siga [DEPLOY.md](./DEPLOY.md) para Oracle Cloud
4. **Monitorar**: Configure alertas e monitoring
5. **Escalar**: Conforme crescimento, otimize queries e índices

## 📝 Anotações

- O servidor usa TypeScript, garanta que sabe TypeScript básico
- Fastify é similar a Express, muito mais rápido
- PostgreSQL é confiável e ideal para esta aplicação
- Zod valida dados automaticamente
- JWT permite autenticação sem sessão

---

**Tudo pronto!** Comece com `npm run dev` no diretório `server/` 🎉
