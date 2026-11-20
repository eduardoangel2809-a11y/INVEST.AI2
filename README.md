# INVEST.AI — projeto Firebase

Estrutura:

```
invest-ai/
├─ public/index.html        ← o app (HTML único)
├─ functions/index.js       ← proxy da brapi (GET /api/quote?symbols=PETR4,VALE3)
├─ functions/package.json
├─ firestore.rules          ← cada usuário só acessa users/{seu uid}
├─ firestore.indexes.json
├─ firebase.json            ← Hosting + rewrite /api/** → função "api"
└─ .firebaserc              ← projeto invest-ai-87843
```

## Deploy (uma vez)

1. Instale o CLI e entre na conta:
   ```
   npm install -g firebase-tools
   firebase login
   ```
2. No console do Firebase (projeto **invest-ai-87843**):
   - **Build → Authentication → Sign-in method**: ative **E-mail/senha** e **Google**.
   - **Build → Firestore Database**: crie o banco (modo produção).
   - **Authentication → Settings → Authorized domains**: confirme que `invest-ai-87843.web.app`
     e `invest-ai-87843.firebaseapp.com` estão na lista (e seu domínio próprio, se tiver).
   - Para usar Cloud Functions, o projeto precisa estar no plano **Blaze** (pay-as-you-go).
     O uso deste app costuma ficar dentro da cota gratuita.
3. Token da brapi (fica no Secret Manager, nunca no navegador):
   ```
   cd invest-ai
   firebase functions:secrets:set BRAPI_TOKEN
   ```
   Cole o token gerado em brapi.dev quando o CLI pedir.
4. Publique tudo:
   ```
   cd functions && npm install && cd ..
   firebase deploy
   ```

Depois do deploy o app abre em `https://invest-ai-87843.web.app`.

## Como funciona

- Sem login o app funciona com os dados salvos no navegador. Com login (Google ou e-mail),
  a carteira (`pos`, `own`) sincroniza no Firestore em `users/{uid}`.
- O selo no topo mostra **"Dados reais · atraso ~30 min"** quando o proxy responde; se a
  função estiver fora do ar, o app cai automaticamente para os dados fictícios (mock).
- A função busca 1 ativo por chamada (limite do plano gratuito da brapi), valida o ticker,
  limita a 15 ativos por consulta e guarda cada cotação em cache por 15 min.
- Dividendos e fundamentos (P/L, P/VP, ROE, DY) não vêm do plano gratuito e aparecem como
  "indisponível" no modo real, como o app já trata.

## Testar local

```
firebase emulators:start --only functions,hosting,firestore
```
(No emulador, defina o secret em `functions/.secret.local` com a linha `BRAPI_TOKEN=seu_token`.)
