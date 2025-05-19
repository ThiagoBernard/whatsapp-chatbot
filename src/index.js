// Arquivo principal que integra o chatbot e o servidor HTTP
const path = require('path');
const fs = require('fs');

// Criar diretório de dados se não existir
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Iniciar o servidor HTTP para manter o bot ativo
const server = require('./server');

// Iniciar o chatbot WhatsApp
require('./chatbot');

console.log('Aplicação iniciada com sucesso!');
console.log('Servidor HTTP e Chatbot WhatsApp estão em execução.');
