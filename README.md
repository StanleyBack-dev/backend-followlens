# FollowLens — Backend

API NestJS que processa o arquivo oficial de exportação do Instagram, detecta
quem deixou de seguir e envia alertas por e-mail (Brevo). Não usa login nem
cookies do Instagram.

## Arquitetura

DDD modular com Ports & Adapters. Cada módulo tem suas próprias camadas:

```
src/modules/<módulo>/
├── domain/          regras puras (sem Nest, TypeORM, HTTP) — lint bloqueia imports
├── application/     casos de uso + ports (interfaces) — só depende de ports
├── infrastructure/  adapters (TypeORM, leitura do arquivo, Brevo)
└── presentation/    controllers REST + DTOs
```

| Módulo | Responsabilidade |
| --- | --- |
| `auth` | Login do dono (scrypt + JWT), bloqueio após tentativas inválidas |
| `followers` | Estado dos seguidores (por @username), diff entre importações, histórico de eventos |
| `imports` | Recebe o upload, lê o arquivo (.json/.zip), orquestra o diff e os alertas |
| `mails` | Provider Brevo + template de alerta de unfollow |

O `imports` fala com `followers` e `mails` pelas ports `ApplyFollowerSnapshotUseCase`
e `ImportNotifierPort`, cujos adapters ficam em `imports/infrastructure/adapters`.

### Fluxo de uma importação

1. Upload chega em `POST /imports/upload` como bytes crus (sem lib de upload).
2. Adquire o lock por lease no Postgres e checa o limite diário.
3. Lê o arquivo: se for `.zip`, extrai o `followers_*.json`; faz o parse da lista.
4. Recusa um arquivo de "Seguindo" ou vazio (não apaga a lista).
5. Calcula o diff por @username, validado pela política de integridade (perda em massa → rejeita).
6. Persiste o snapshot e os eventos numa transação.
7. Envia por e-mail os unfollows pendentes; se o envio falhar, ficam pendentes para a próxima importação.

A primeira importação é a **lista base**: registra quem segue hoje, sem gerar eventos.

## Rodando localmente

```bash
npm install
cp .env.example .env.local        # preencha os valores
npm run secrets:generate          # JWT_SECRET, INTERNAL_API_KEY
npm run owner:hash-password       # OWNER_PASSWORD_HASH
npm run migration:run
npm run start:dev                 # http://localhost:4000
```

## Deploy (Vercel + Neon)

1. Crie o banco no Neon e copie a connection string **pooled**.
2. Importe este repositório na Vercel e configure todas as variáveis do `.env.example` com `NODE_ENV=production`.
3. Rode as migrations apontando para o Neon: `npm run migration:run:prod`.

## Endpoints

Todos exigem `X-Internal-Api-Key`, e todos exceto o login exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/` | Health check (aberto) |
| POST | `/auth/login` | Login do dono |
| GET | `/auth/me` | Dono autenticado |
| GET | `/followers/overview` | Indicadores |
| GET | `/followers` | Lista (`status`, `search`, `username`, paginação) |
| GET | `/followers/filter-options` | Opções do filtro (`status`, `search`) |
| GET | `/followers/events` | Histórico (`type`, `username`, paginação) |
| GET | `/followers/events/filter-options` | Opções do filtro de eventos |
| POST | `/imports/upload` | Envia o arquivo de seguidores (bytes crus, `x-filename`) |
| GET | `/imports/status` | Última importação e uso diário |
| GET | `/imports` | Histórico de importações |

## Scripts

`npm test` · `npm run lint:check` · `npm run typecheck` · `npm run build` · `npm run migration:create`
