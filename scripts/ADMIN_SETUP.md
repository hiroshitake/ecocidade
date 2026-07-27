# 🔐 Configuração do Admin

## Problema
Ao tentar fazer login administrativo, o fluxo precisa usar o backend do PostgreSQL em vez de um registro no Firebase.

## Arquitetura atual
O app agora depende de:
- Backend Fastify + PostgreSQL
- Autenticação JWT
- Banco de dados hospedado na instância Oracle
- Frontend hospedado no Netlify

## Como configurar

### 1. Definir o endpoint do backend
No ambiente do Netlify e no arquivo .env do projeto, defina:

```bash
EXPO_PUBLIC_API_URL=https://SEU-BACKEND-ORACLE
```

### 2. Criar um usuário admin
Cadastre um usuário pelo endpoint de autenticação do backend e defina a role como `admin`.

### 3. Fazer login
Use o fluxo de login do app para entrar com email e senha. O backend retornará o token JWT e o frontend irá manter a sessão.

## ✅ Credenciais de teste
Se precisar testar, crie um usuário com:
- email: `admin@ecocidade.test`
- senha: `123456`
- role: `admin`

## 🔗 Pontos importantes
- Backend: Fastify + PostgreSQL
- Autenticação: JWT
- Deploy frontend: Netlify
- Deploy backend: Oracle
