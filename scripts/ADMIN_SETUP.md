# 🔐 Configuração do Admin de Teste

## Problema
Ao tentar fazer login administrativo com CNPJ `12345678900`, recebe a mensagem:
> "CNPJ não encontrado no sistema."

## Causa
O documento do admin de teste não existe na collection `admin_users` do Firestore.

## Solução

### Opção 1: Usar o Script Automático (Recomendado)

#### 1️⃣ Verificar Status
Primeiro, verifique se o admin já existe:

```bash
npm run check-admin
```

Este comando vai mostrar se o admin existe ou não no Firestore.

#### 2️⃣ Configurar Admin de Teste
Se o admin não existe, execute:

```bash
npm run setup-admin
```

Este script vai:
1. Criar um usuário no Firebase Auth (se não existir)
2. Criar um documento em `admin_users` com o CNPJ de teste
3. Exibir as credenciais

### Opção 2: Configurar Manualmente no Firestore Console

Se preferir criar manualmente, siga estes passos:

1. **Acesse Firebase Console:**
   - Vá em https://console.firebase.google.com
   - Selecione seu projeto
   - Vá em Firestore Database

2. **Crie a Collection (se não existir):**
   - Clique em "Create Collection"
   - Nome: `admin_users`

3. **Crie um Documento com estes dados:**

```json
{
  "cnpj": "12345678900",
  "email": "admin@ecocidade.test",
  "name": "Admin Teste",
  "uid": "<seu-uid-aqui>",
  "status": "active",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

4. **Para obter o UID:**
   - Vá em Authentication
   - Crie um novo usuário com email: `admin@ecocidade.test`
   - Senha: `123456`
   - Copie o UID gerado
   - Cole no campo `uid` do documento criado acima

## ✅ Credenciais de Teste

Após configurar, use estas credenciais para fazer login:

| Campo | Valor |
|-------|-------|
| CNPJ | `12.345.678/0001-90` |
| Senha | `123456` |

Ou sem formatação:
| Campo | Valor |
|-------|-------|
| CNPJ | `12345678900` |
| Senha | `123456` |

## 🔗 Links Úteis

- [Firebase Firestore Console](https://console.firebase.google.com)
- [Firebase Authentication](https://console.firebase.google.com/u/0/project/_/authentication)
- Documentação: [Admin Login Documentation](./ADMIN_LOGIN.md)

## ❓ Troubleshooting

### Erro: "Email já está em uso"
- O email `admin@ecocidade.test` já existe no Firebase Auth
- Execute o script novamente e ele vai usar o email existente

### Erro: "Sem permissão no Firestore"
- Verifique as regras de segurança do Firestore
- Certifique-se que tem permissão de escrever em `admin_users`

### Erro: "Firebase não configurado"
- Verifique se o arquivo `.env` está preenchido com as credenciais do Firebase
- Certifique-se que `EXPO_PUBLIC_FIREBASE_PROJECT_ID` está correto

## 📝 Estrutura do Documento admin_users

```typescript
{
  cnpj: string;           // CNPJ sem formatação (14 dígitos)
  email: string;          // Email para autenticação Firebase
  name: string;           // Nome do administrador
  uid: string;            // UID do Firebase Auth
  status: 'active' | 'inactive';  // Status do admin
  role: 'admin' | 'superadmin';   // Papel do admin
  createdAt?: Timestamp;  // Data de criação
  updatedAt?: Timestamp;  // Data de atualização
}
```

## 🎯 Fluxo de Login Admin

```
1. Usuário entra CNPJ e Senha
   ↓
2. signInAdmin() procura o CNPJ em admin_users
   ↓
3. Se encontrado, faz signInWithEmailAndPassword() com o email armazenado
   ↓
4. Se sucesso, onAuthStateChanged() verifica se é admin
   ↓
5. Se confirmado admin, redireciona para /(admin)/dashboard
```

## 💡 Para Produção

Para um admin real (não de teste):
1. Crie um email corporativo (ex: `admin@prefeitura.sp.gov.br`)
2. Defina uma senha segura
3. Obtenha o CNPJ real da prefeitura
4. Crie o documento em `admin_users` com os dados corretos
5. Configure as regras de segurança do Firestore apropriadamente
