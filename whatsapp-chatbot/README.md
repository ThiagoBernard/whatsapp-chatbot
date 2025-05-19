# Guia de Instalação e Uso do Chatbot WhatsApp

Este guia explica como configurar e manter seu chatbot WhatsApp sempre ativo usando hospedagem gratuita.

## Requisitos

- Node.js 14 ou superior
- Conta no WhatsApp
- Smartphone com WhatsApp instalado para escanear o QR code
- Conta em um serviço de hospedagem gratuita (recomendações abaixo)

## Instalação Local (para testes)

1. Clone ou baixe este repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Inicie o bot:
   ```
   npm start
   ```
4. Escaneie o QR code que aparece no terminal com seu WhatsApp
5. Pronto! Seu bot está funcionando

## Hospedagem em Serviço Gratuito

### Opção 1: Render (recomendado para iniciantes)

1. Crie uma conta em [render.com](https://render.com)
2. Clique em "New" e selecione "Web Service"
3. Conecte sua conta GitHub ou faça upload do código
4. Configure o serviço:
   - Nome: whatsapp-chatbot (ou outro de sua preferência)
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plano: Free
5. Clique em "Create Web Service"
6. Após o deploy, acesse a URL fornecida para ver o QR code
7. Escaneie o QR code com seu WhatsApp

### Opção 2: Oracle Cloud Free Tier (recomendado para uso contínuo)

1. Crie uma conta em [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Configure uma instância Compute (VM) com Ubuntu
3. Conecte-se via SSH e instale Node.js:
   ```
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Clone este repositório:
   ```
   git clone https://github.com/seu-usuario/whatsapp-chatbot.git
   cd whatsapp-chatbot
   npm install
   ```
5. Instale o PM2 para manter o bot sempre ativo:
   ```
   npm install -g pm2
   pm2 start src/index.js --name whatsapp-bot
   pm2 startup
   pm2 save
   ```
6. Acesse o servidor via navegador para ver o QR code

## Mantendo o Bot Sempre Ativo

Para garantir que seu bot permaneça ativo em plataformas com hibernação:

1. Cadastre-se em [UptimeRobot](https://uptimerobot.com) (gratuito)
2. Adicione um novo monitor do tipo HTTP
3. Configure para acessar a URL do seu bot + "/status" (exemplo: https://seu-bot.onrender.com/status)
4. Configure o intervalo para 5 minutos

## Configuração do Número de Administrador

Edite o arquivo `src/chatbot.js` e altere a linha:

```javascript
const adminNumber = '553798118770@c.us';
```

Substitua pelo seu número no formato internacional, sem '+' ou espaços, seguido de @c.us.
Exemplo: '5511987654321@c.us' para um número brasileiro (55) de São Paulo (11).

## Solução de Problemas

### O bot desconecta frequentemente

- Verifique se o serviço de ping está configurado corretamente
- Em hospedagens gratuitas, pode ser necessário reconectar manualmente após longos períodos

### Erro ao iniciar o bot

- Verifique se todas as dependências foram instaladas
- Certifique-se de que a versão do Node.js é compatível (14+)
- Verifique os logs do serviço de hospedagem

### QR Code não aparece

- Acesse a URL do seu bot + "/qrcode" para ver o QR code
- Reinicie o serviço se necessário

## Backup e Segurança

- Faça backup regular da pasta `.wwebjs_auth` para não perder a sessão
- Nunca compartilhe os arquivos de autenticação
- Considere usar variáveis de ambiente para informações sensíveis

## Suporte

Para dúvidas ou problemas, entre em contato com o desenvolvedor.
