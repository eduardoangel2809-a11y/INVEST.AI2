# INVEST.AI (Firebase Hosting + Cloud Functions)

Painel de investimentos. Hosting serve `public/index.html`; a função `api` consulta a brapi (plano gratuito) com o token guardado no Secret Manager. Dados reais de cotação e histórico; dividendos e fundamentos continuam "indisponíveis" (exigem plano pago da brapi).

## 1. Instalar
    npm i -g firebase-tools
    firebase login
    cd functions && npm install && cd ..

## 2. Configurar
1. Crie um projeto no console do Firebase e ative **Hosting** e **Functions**. Functions exige o plano **Blaze** (pay-as-you-go, com cota gratuita); confirme as regras atuais no console.
2. Edite `.firebaserc` e troque `SEU-PROJETO-ID` pelo ID do projeto.
3. Crie a conta em brapi.dev, gere o token e grave como secret (a chave nunca vai para o código):
       firebase functions:secrets:set BRAPI_TOKEN

## 3. Rodar localmente
Crie `functions/.secret.local` com `BRAPI_TOKEN=seu_token` (já está no .gitignore) e rode:
    firebase emulators:start --only functions,hosting
Abra http://localhost:5000. Sem token, a brapi atende só PETR4, VALE3, ITUB4 e MGLU3 (sandbox).

## 4. Colocar online
    firebase deploy --only functions,hosting
O app fica em https://SEU-PROJETO-ID.web.app

## 5. Trocar o provedor de dados
- Cotações: edite `functions/index.js` (URL e formato) mantendo a resposta `{results:[{symbol, regularMarketPrice, regularMarketChangePercent, historicalDataPrice:[{close}]}]}`.
- No front, a camada `Providers` (em `public/index.html`) concentra `market`, `dividend`, `news`. Sem proxy (`CFG.proxy=''`) o app volta ao mock.

## 6. Ativar dados reais
Na primeira carga, o selo do topo muda para "Dados reais · atraso ~30 min". Remova a carteira de exemplo (aba Carteira) e cadastre seus ativos ou importe CSV (aba Mais).

## 7. Depende de serviços externos ou planos pagos
- Dividendos, JCP, P/L, ROE, margens e valuation reais: plano Startup da brapi ou superior.
- Radar com score completo: precisa dos fundamentos acima.
- Notícias reais, vacância/cotistas de FIIs, importação da B3 e das corretoras: sem fonte ligada ainda.
- Cloud Functions: plano Blaze do Firebase.

Os dados são informativos e não constituem recomendação de investimento.
