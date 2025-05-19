// Arquivo para manter o bot ativo com um servidor HTTP simples
const http = require('http');
const fs = require('fs');
const path = require('path');

// Porta para o servidor HTTP (use a porta fornecida pelo ambiente ou 3000 como padrão)
const PORT = process.env.PORT || 3000;

// Criar servidor HTTP simples
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    // Página inicial simples
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp Chatbot - Status</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #075e54;
              text-align: center;
            }
            .status {
              padding: 15px;
              background-color: #dcf8c6;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .info {
              margin-top: 30px;
            }
            .info p {
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>WhatsApp Chatbot</h1>
            <div class="status">
              <h2>Status: Online ✅</h2>
              <p>O bot está em execução desde: ${new Date(process.uptime() * 1000).toISOString().substr(11, 8)}</p>
            </div>
            <div class="info">
              <h3>Informações:</h3>
              <p>Este é um servidor simples para manter seu chatbot WhatsApp ativo.</p>
              <p>Para manter o bot sempre ativo, configure um serviço de ping como UptimeRobot para acessar este endereço a cada 5 minutos.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } else if (req.url === '/status') {
    // Endpoint de status para serviços de ping
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/qrcode' && req.method === 'GET') {
    // Endpoint para verificar o QR code (se disponível)
    const qrCodePath = path.join(__dirname, '../data/last_qrcode.txt');
    
    if (fs.existsSync(qrCodePath)) {
      try {
        const qrCode = fs.readFileSync(qrCodePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(qrCode);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao ler QR code' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'QR code não disponível' }));
    }
  } else {
    // Rota não encontrada
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Página não encontrada');
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor HTTP iniciado na porta ${PORT}`);
  console.log(`Para manter o bot ativo, configure um serviço de ping para acessar: http://seu-dominio/status`);
});

module.exports = server;
