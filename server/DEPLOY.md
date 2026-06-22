# Deploy Ecocidade Server na Oracle Cloud (Free Tier)

## 📋 Pré-requisitos

- Conta Oracle Cloud (Free Tier)
- SSH configurado
- Docker e Docker Compose instalados na instância
- Nome de domínio (opcional, mas recomendado)

## 🚀 Passo a Passo

### 1. Criar uma Compute Instance na Oracle Cloud

1. Acesse [Oracle Cloud Console](https://www.oracle.com/cloud)
2. Navegue até **Compute > Instances**
3. Clique em **Create Instance**
4. Configure:
   - **Image**: Ubuntu 22.04 LTS Minimal (ou similar)
   - **Shape**: Ampere (ARM) - Qualificado para Free Tier
   - **OCPU**: 4 (máximo gratuito)
   - **RAM**: 24 GB
5. Adicione sua chave SSH pública
6. Clique em **Create**

### 2. Conectar à Instância

```bash
ssh -i seu-arquivo-chave.key ubuntu@seu-endereco-ip
```

### 3. Instalar Docker e Docker Compose

```bash
# Update sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar seu usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker compose --version
```

### 4. Clonar o Repositório

```bash
git clone https://seu-repositorio.git ecocidade-app
cd ecocidade-app/server
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo
nano .env
```

**Configuração importante para produção:**

```env
DATABASE_URL=postgresql://ecocidade:senha-super-segura@postgres:5432/ecocidade
DB_USER=ecocidade
DB_PASSWORD=senha-super-segura  # MUDE ISSO!
DB_NAME=ecocidade

PORT=3000
NODE_ENV=production
API_URL=https://seu-dominio.com  # ou IP da instância
JWT_SECRET=gere-uma-chave-jwt-segura-aqui  # Use: openssl rand -base64 32

# Adicione o IP ou domínio da sua aplicação mobile
CORS_ORIGIN=http://localhost:19000,https://seu-dominio-app.com
```

### 6. Gerar JWT Secret Seguro

```bash
openssl rand -base64 32
```

Copie o resultado para `JWT_SECRET` no `.env`.

### 7. Configurar Firewall (Oracle Cloud)

1. No console Oracle Cloud, vá para **Networking > Virtual Cloud Networks**
2. Selecione sua VCN
3. Em **Security Lists**, clique na lista padrão
4. Adicione regras de entrada:
   - **Porta 3000**: TCP (API)
   - **Porta 80**: TCP (HTTP para Nginx)
   - **Porta 443**: TCP (HTTPS para Nginx)
   - **Porta 22**: TCP (SSH)

### 8. Iniciar os Contêineres

```bash
# Navegar para o diretório do servidor
cd ~/ecocidade-app/server

# Iniciar os serviços
docker compose up -d

# Verificar logs
docker compose logs -f

# Aguarde até ver: "✓ Servidor rodando em http://localhost:3000"
```

### 9. Executar Migrações do Banco de Dados

```bash
docker compose exec api npm run migrate
```

### 10. Configurar Nginx (Reverse Proxy) - OPCIONAL MAS RECOMENDADO

```bash
sudo apt install -y nginx

# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/ecocidade
```

Cole a seguinte configuração:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Depois ative:

```bash
sudo ln -s /etc/nginx/sites-available/ecocidade /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 11. Configurar SSL/TLS com Let's Encrypt (RECOMENDADO)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d seu-dominio.com
```

### 12. Monitorar Serviços

```bash
# Ver status dos contêineres
docker compose ps

# Ver logs em tempo real
docker compose logs -f api

# Ver uso de recursos
docker stats
```

## 🔄 Manutenção e Atualizações

### Atualizar a aplicação

```bash
cd ~/ecocidade-app
git pull origin main

cd server
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Backup do banco de dados

```bash
docker compose exec postgres pg_dump -U ecocidade ecocidade > backup-$(date +%Y%m%d).sql
```

### Restaurar banco de dados

```bash
docker compose exec -T postgres psql -U ecocidade ecocidade < backup-20240120.sql
```

## 📊 Variáveis de Ambiente - Referência Completa

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@host/dbname` |
| `DB_HOST` | Host do PostgreSQL | `localhost` ou `postgres` (em Docker) |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USER` | Usuário do banco | `ecocidade` |
| `DB_PASSWORD` | Senha do banco | Gere uma segura! |
| `DB_NAME` | Nome do banco | `ecocidade` |
| `PORT` | Porta da API | `3000` |
| `NODE_ENV` | Ambiente | `production` ou `development` |
| `JWT_SECRET` | Chave JWT | Use `openssl rand -base64 32` |
| `CORS_ORIGIN` | Origens permitidas | `https://app.com,https://web.com` |
| `API_URL` | URL da API | `https://seu-dominio.com` |

## 🐛 Troubleshooting

### Erro de conexão com banco de dados

```bash
# Verificar se o PostgreSQL está rodando
docker compose ps postgres

# Verificar logs do PostgreSQL
docker compose logs postgres
```

### Porta 3000 já em uso

```bash
# Encontrar processo usando a porta
lsof -i :3000

# Matar o processo
kill -9 <PID>
```

### Permissões de pasta

```bash
# Dar permissão para pasta uploads
sudo chown -R ubuntu:ubuntu ./uploads
chmod -R 755 ./uploads
```

### Sem espaço em disco

```bash
# Limpar imagens não usadas
docker image prune -a

# Limpar volumes não usados
docker volume prune
```

## 📝 Notas Importantes

- **Segurança**: Nunca commite o `.env` com valores reais no repositório
- **Backup**: Faça backups regulares do banco de dados
- **Monitoramento**: Configure alertas na Oracle Cloud para uso de CPU/Memória
- **Free Tier Limits**: A instância Ampere tem limitações de banda e armazenamento
- **Performance**: O PostgreSQL em free tier pode ter performance limitada

## 🆘 Precisa de Ajuda?

Verifique os logs:
```bash
docker compose logs -f
```

Conecte ao banco direto:
```bash
docker compose exec postgres psql -U ecocidade -d ecocidade
```

## 📚 Referências

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Fastify Documentation](https://www.fastify.io/)
