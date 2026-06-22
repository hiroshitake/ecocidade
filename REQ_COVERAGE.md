# Cobertura de Requisitos — ECOcidade

Este arquivo lista os Requisitos Funcionais (RF) e Não Funcionais (RNF) do documento fornecido e indica se cada item está implementado no código atual do app (`c:\Users\Breno\Desktop\TCC\ecocidade-app`).

Legenda: **OK** = implementado, **PARCIAL** = parcialmente implementado, **MISSING** = não implementado

## 1. Login e Cadastro
- RF-01 Permitir login com Email e senha: OK
- RF-02 Permitir login com Google: OK
- RF-03 Seleciona a cidade no cadastro: OK (`app/select-city.tsx`)
- RF-04 Login administrativo com CNPJ e senha: PARCIAL (existe `app/admin-login.tsx` usando CPF; trocar para CNPJ/integração RBAC)
- RF-05 Exibir/ocultar senha com toggle: OK
- RF-06 Esqueci minha senha: MISSING (UI link existe, fluxo de reset não implementado)
- RF-07 Links Termos de Uso / Política: MISSING

- RNF-01 Feedback de erro em 500ms: PARCIAL (usa Alert, sem medição)
- RNF-02 Dados de perfil persistentes via Firebase: OK (`services/auth.js` + `getCurrentUserData`)
- RNF-03 Layout responsivo: PARCIAL

## 2. Mapa Urbano Interativo
- RF-01 Renderizar mapa com zoom/pan: OK (`components/map.*`)
- RF-02 Marcadores por categoria: OK
- RF-03 Alerta de Zona Perigosa ao entrar: MISSING (zones exist but alerta automático não há)
- RF-04 Detalhes ao tocar marcador: OK (callout / modal)
- RF-05 Pontos de interesse e 'Ver horários': MISSING
- RF-06 FAB visível para reportar: MISSING (há botão/aba, mas não FAB)
- RF-07 Barra de pesquisa no mapa: PARTIAL (endereço no novo relatório apenas)
- RF-08 Navegação abas: OK
- RF-09 Área marcada em vermelho (zona perigosa): PARTIAL (zones drawing exists in web/native admin components)

- RNF-01 Atualização em tempo real ≤30s: MISSING
- RNF-02 Interface otimizada para uma mão: PARTIAL
- RNF-03 Contraste dos marcadores WCAG: MISSING (sem auditoria)
- RNF-04 Compatibilidade Leaflet: OK (web) / react-native-maps (mobile)

## 3. Reportar Problema de Zeladoria
- RF-01 Selecionar categoria: OK
- RF-02 Upload foto/vídeo: PARTIAL (foto OK; vídeo e drag-drop MISSING)
- RF-03 Campo descrição com limite visível: MISSING (campo existe; limite visível não)
- RF-04 Captura automática/manual localização: OK
- RF-05 Notificar departamento ao submeter: PARTIAL (criação em Firestore e timeline; integração de notificação externa não evidente)

- RNF-01 Envio ≤5s com foto: MISSING (não há medição/otimização garantida)
- RNF-02 Validação client-side inline: PARTIAL (usa Alert; não inline)
- RNF-03 Consentimento LGPD para geolocalização: PARTIAL (pedido de permissão presente)
- RNF-04 Suporte JPG/PNG: PARTIAL (expo-image-picker aceita, mas validação explícita MISSING)

## 4. Reportar Zona Perigosa
- RF-01 Mapa pino ajustável: MISSING in security flow (map shown but pino ajustável não implementado)
- RF-02 Selecionar tipo de risco: PARTIAL (categorias existem; labels podem diferir)
- RF-03 Campo detalhes: OK
- RF-04 Submeter reporte: OK (createSecurityReport exists)
- RF-05 Navegação inferior: OK

- RNF-01 Anonimização opcional: PARTIAL (security reports saved anonymously in folder, but UI toggle optional missing)
- RNF-02 Geolocalização precisa ≤20m: MISSING
- RNF-03 Confirmação ≤3s: MISSING
- RNF-04 Interface simplificada: PARTIAL

## 5. Minhas Solicitações
- RF-01 Listar solicitações do usuário: OK
- RF-02 Exibir status atual: OK
- RF-03 Filtrar por status ou categoria: PARTIAL (filtros por status implementados; por categoria MISSING)
- RF-04 Navegar via barra inferior: OK

- RNF-01 Lista carregada ≤2s para 100 itens: MISSING
- RNF-02 Atualização de status em tempo real ou polling 60s: MISSING
- RNF-03 Dados acessíveis apenas autent. OK (autenticação exigida)
- RNF-04 Histórico 12 meses: MISSING (política de armazenamento não no app)
- RNF-05 Leitura por leitores de tela: MISSING

## 6. Painel Administrativo
- RF-01 KPIs: PARTIAL (dashboard com estatísticas básicas existe)
- RF-02 Listar ocorrências recentes: OK
- RF-03 Gerenciamento de zonas perigosas: OK (admin components)
- RF-04 Navegação lateral: MISSING (navegação por botões/rota existente mas não menu lateral tradicional)
- RF-05 Atribuir/atualizar status: PARTIAL (UI simula alteração; não persistida no backend)
- RF-06 Filtrar/buscar ocorrências: MISSING

- RNF-01 RBAC: MISSING (admin access currently simulated by fixed CPF check)
- RNF-02 Dashboard carregado ≤3s: MISSING
- RNF-03 Atualização a cada 60s: MISSING
- RNF-04 Interface desktop adaptada: PARTIAL
- RNF-05 Exportação CSV/PDF: MISSING

---

## Próximos passos sugeridos
1. Implementar fluxo de recuperação de senha em `services/auth.js` e ligar ao botão no `app/login.tsx`.
2. Adicionar links para Termos de Uso e Política em `app/login.tsx` / footer.
3. Implementar FAB, busca no mapa e POIs com ação 'Ver horários'.
4. Adicionar suporte a vídeo e limite visível de caracteres no `new-report`.
5. Implementar polling/WebSocket para atualização em tempo real (mapa e painel admin).
6. Persistir alterações de status no backend (atualizar `manage-reports` para chamar API `updateReportStatus`).
7. Implementar RBAC para admin (CNPJ + roles) e exportação CSV/PDF.

Guardei comentários TODO nos arquivos principais apontando as lacunas.
