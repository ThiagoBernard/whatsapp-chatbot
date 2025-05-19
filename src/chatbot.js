// Leitor de QR Code
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Configuração do cliente com autenticação local para persistência da sessão
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.resolve(__dirname, '../.wwebjs_auth')
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    headless: true
  },
  restartOnAuthFail: true
});

// Diretório para armazenar dados de estado dos usuários
const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Arquivo para armazenar o estado dos usuários
const USER_STATE_FILE = path.join(DATA_DIR, 'userState.json');

// Objeto para armazenar o estado de cada usuário
// Estados possíveis:
//   - awaiting_delivery_confirmation
//   - awaiting_delivery_details
//   - awaiting_delivery_details_confirmation
//   - awaiting_other_subject
let userState = {};

// Carregar estado dos usuários do arquivo, se existir
function loadUserState() {
  try {
    if (fs.existsSync(USER_STATE_FILE)) {
      const data = fs.readFileSync(USER_STATE_FILE, 'utf8');
      const loadedState = JSON.parse(data);
      
      // Filtrar apenas os dados relevantes, excluindo timeouts que não podem ser serializados
      Object.keys(loadedState).forEach(key => {
        if (loadedState[key]) {
          const { stage, deliveryDetails } = loadedState[key];
          userState[key] = { stage, deliveryDetails };
        }
      });
      
      console.log('Estado dos usuários carregado com sucesso.');
    }
  } catch (error) {
    console.error('Erro ao carregar estado dos usuários:', error);
    userState = {};
  }
}

// Salvar estado dos usuários em arquivo
function saveUserState() {
  try {
    // Criar uma cópia do estado sem os timeouts
    const stateToPersist = {};
    Object.keys(userState).forEach(key => {
      if (userState[key]) {
        const { stage, deliveryDetails } = userState[key];
        stateToPersist[key] = { stage, deliveryDetails };
      }
    });
    
    fs.writeFileSync(USER_STATE_FILE, JSON.stringify(stateToPersist, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar estado dos usuários:', error);
  }
}

// Serviço de leitura do QR Code
client.on('qr', qr => {
  console.log('QR Code recebido, escaneie-o com seu WhatsApp:');
  qrcode.generate(qr, { small: true });
  
  // Salvar o QR code em um arquivo para acesso remoto
  fs.writeFileSync(path.join(DATA_DIR, 'last_qrcode.txt'), qr);
  console.log('QR Code salvo em arquivo para acesso remoto.');
});

// Mensagem de sucesso ao conectar
client.on('ready', () => {
  console.log('Tudo certo! WhatsApp conectado.');
  // Carregar estado dos usuários ao iniciar
  loadUserState();
});

// Tratamento de reconexão
client.on('disconnected', (reason) => {
  console.log('Cliente desconectado:', reason);
  // Salvar estado antes de desconectar
  saveUserState();
  
  console.log('Tentando reconectar...');
  // Tentar reconectar após 10 segundos
  setTimeout(() => {
    client.initialize();
  }, 10000);
});

// Inicializa o cliente
client.initialize().catch(err => {
  console.error('Erro ao inicializar cliente:', err);
  // Tentar novamente após 30 segundos em caso de erro
  setTimeout(() => {
    console.log('Tentando inicializar novamente...');
    client.initialize();
  }, 30000);
});

// Função delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Número do administrador (MB Lanches)
// Certifique-se de que o número esteja no formato correto e registrado no WhatsApp
const adminNumber = '553798118770@c.us';

// Função para agendar timeout de 10 minutos (600000 ms)
function scheduleTimeout(from) {
  if (userState[from] && userState[from].timeout) {
    clearTimeout(userState[from].timeout);
  }
  if (userState[from]) {
    userState[from].timeout = setTimeout(() => {
      client.sendMessage(
        from,
        "⏰ Sessão encerrada por inatividade. Para retomar, por favor envie uma mensagem contendo 'menu' ou 'oi'."
      );
      delete userState[from];
      saveUserState(); // Salvar estado após alteração
    }, 600000);
  }
}

// Função para exibir o menu principal
async function showMainMenu(from, contactName = 'cliente') {
  const menuMessage = `Olá, ${contactName}! 🤗
Bem-vindo ao *MB Lanches*.
Escolha uma opção:

1️⃣ - Prato do dia
2️⃣ - Entrega
3️⃣ - Outros assuntos

*Digite "voltar" a qualquer momento para retornar ao menu.*`;
  await client.sendMessage(from, menuMessage);
}

// Salvar estado periodicamente (a cada 5 minutos)
setInterval(() => {
  console.log('Salvando estado dos usuários...');
  saveUserState();
}, 300000);

client.on('message', async msg => {
  try {
    // Processa apenas contatos válidos (usuários individuais)
    if (!msg.from.endsWith('@c.us')) return;

    // Verifica se está dentro do horário de atendimento (segunda a sexta, das 08h às 14h)
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = domingo, 1 = segunda, ... 5 = sexta, 6 = sábado
    if (currentDay < 1 || currentDay > 5 || currentHour < 8 || currentHour >= 14) {
      await client.sendMessage(
        msg.from,
        "⏰ No momento, estamos fora do horário de atendimento. Nosso horário é de *Segunda a Sexta, das 08h às 14h*. Por favor, tente novamente nesse período. Obrigado!"
      );
      return;
    }

    const lowerMsg = msg.body.toLowerCase().trim();

    // Se o usuário digitar "voltar" em qualquer parte da mensagem, retorna ao menu principal
    if (lowerMsg.includes("voltar")) {
      if (userState[msg.from] && userState[msg.from].timeout) {
        clearTimeout(userState[msg.from].timeout);
      }
      delete userState[msg.from];
      saveUserState(); // Salvar estado após alteração
      
      const contact = await msg.getContact();
      const name = contact.pushname || 'cliente';
      await msg.reply("🔙 Voltando para o menu principal...");
      await delay(1500);
      await showMainMenu(msg.from, name.split(" ")[0]);
      return;
    }

    // Se o usuário estiver em algum fluxo específico, processa conforme o estado
    if (userState[msg.from]) {
      const state = userState[msg.from].stage;
      // Sempre atualiza o timeout a cada resposta
      scheduleTimeout(msg.from);

      // Fluxo: aguardando confirmação de solicitação de entrega (Sim/Não)
      if (state === 'awaiting_delivery_confirmation') {
        if (lowerMsg === 'sim' || lowerMsg === 's') {
          await msg.reply(
            'Ótimo! 🚀 Por favor, envie seus dados de entrega em um único texto, separados por vírgula, no seguinte formato:\n\n' +
            'Nome, Rua, Número, Bairro, Quantidade, Tamanho\n\n' +
            '*Exemplo:* João, Av. Paulista, 123, Bela Vista, 2, Grande'
          );
          userState[msg.from].stage = 'awaiting_delivery_details';
          saveUserState(); // Salvar estado após alteração
          scheduleTimeout(msg.from);
        } else if (lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'n') {
          await msg.reply('Tudo bem! 😊 Voltando para o menu principal.');
          clearTimeout(userState[msg.from].timeout);
          delete userState[msg.from];
          saveUserState(); // Salvar estado após alteração
          
          const contact = await msg.getContact();
          const name = contact.pushname || 'cliente';
          await delay(1500);
          await showMainMenu(msg.from, name.split(" ")[0]);
        } else {
          await msg.reply('❌ Opção inválida. Por favor, responda com *Sim* ou *Não*.\n(Digite "voltar" para retornar ao menu principal.)');
        }
        return;
      }
      // Fluxo: aguardando os dados de entrega
      else if (state === 'awaiting_delivery_details') {
        // Espera que o usuário envie os dados separados por vírgula.
        let parts = msg.body.split(',');
        if (parts.length !== 6) {
          await msg.reply('❌ Formato inválido. Por favor, envie os dados no seguinte formato:\n\n' +
                          'Nome, Rua, Número, Bairro, Quantidade, Tamanho\n\n' +
                          '*Exemplo:* João, Av. Paulista, 123, Bela Vista, 2, Grande');
          return;
        }
        let nome = parts[0].trim();
        let rua = parts[1].trim();
        let numero = parts[2].trim();
        let bairro = parts[3].trim();
        let quantidade = parseInt(parts[4].trim(), 10);
        let tamanho = parts[5].trim().toLowerCase();
        
        if (isNaN(quantidade) || (tamanho !== 'grande' && tamanho !== 'pequena')) {
          await msg.reply('❌ Dados inválidos. Certifique-se de informar a quantidade como número e o tamanho como "Grande" ou "Pequena".\n\n' +
                          'Envie novamente no formato:\nNome, Rua, Número, Bairro, Quantidade, Tamanho');
          return;
        }
        // Define o valor da marmita conforme o tamanho
        let valorMarmita = (tamanho === 'grande') ? 'R$16,00' : 'R$14,00';
        // Define a taxa de entrega: cobra R$5,00 para 1 ou 2 marmitas; para 3 ou mais, é gratuita
        let taxaEntrega = (quantidade < 3) ? 'R$5,00' : 'Gratuita';
        
        // Armazena os dados para confirmação posterior
        userState[msg.from].deliveryDetails = { nome, rua, numero, bairro, quantidade, tamanho, valorMarmita, taxaEntrega };
        saveUserState(); // Salvar estado após alteração
        
        const detailsMessage =
  `*Nome do destinatário:* ${nome}
  *Rua:* ${rua}
  *Número:* ${numero}
  *Bairro:* ${bairro}
  *Quantidade de Marmitas:* ${quantidade}
  *Tamanho:* ${tamanho.charAt(0).toUpperCase() + tamanho.slice(1)}
  *Valor da Marmita:* ${valorMarmita}
  *Taxa de Entrega:* ${taxaEntrega}`;
        await msg.reply('Por favor, confirme os dados abaixo:\n\n' + detailsMessage + '\n\nResponda com *Sim* para confirmar ou *Não* para reenvio.');
        userState[msg.from].stage = 'awaiting_delivery_details_confirmation';
        saveUserState(); // Salvar estado após alteração
        scheduleTimeout(msg.from);
        return;
      }
      // Fluxo: aguardando confirmação dos dados de entrega
      else if (state === 'awaiting_delivery_details_confirmation') {
        if (lowerMsg === 'sim' || lowerMsg === 's') {
          try {
            const orderTime = new Date().toLocaleString('pt-BR');
            const contact = await msg.getContact();
            const details = userState[msg.from].deliveryDetails;
            const detailsText =
  `*Nome:* ${details.nome}
  *Rua:* ${details.rua}
  *Número:* ${details.numero}
  *Bairro:* ${details.bairro}
  *Quantidade:* ${details.quantidade}
  *Tamanho:* ${details.tamanho.charAt(0).toUpperCase() + details.tamanho.slice(1)}
  *Valor da Marmita:* ${details.valorMarmita}
  *Taxa de Entrega:* ${details.taxaEntrega}`;
            const adminMessage =
  `📦 *Novo Pedido de Entrega* 📦
    
  *Horário:* ${orderTime}
  *Nome do Cliente:* ${contact.pushname}
  *Número do Cliente:* ${msg.from}
    
  *Dados da Entrega:*
  ${detailsText}`;
            await client.sendMessage(adminNumber, adminMessage);
            console.log('Mensagem enviada para o administrador:', adminMessage);
            await msg.reply(`✅ Pedido confirmado!
    
  Seus dados:
  ${detailsText}
    
  Seu pedido está sendo preparado e será entregue em *30 a 50 minutos*. Obrigado e bom apetite! 🍔`);
          } catch (error) {
            console.error("Erro ao enviar mensagem para o administrador:", error);
            await msg.reply("⚠️ Ocorreu um erro ao processar seu pedido. Por favor, tente novamente mais tarde.");
          }
          clearTimeout(userState[msg.from].timeout);
          delete userState[msg.from];
          saveUserState(); // Salvar estado após alteração
          
          const contact = await msg.getContact();
          const name = contact.pushname || 'cliente';
          await delay(1500);
          await showMainMenu(msg.from, name.split(" ")[0]);
          return;
        } else if (lowerMsg === 'não' || lowerMsg === 'nao' || lowerMsg === 'n') {
          await msg.reply('Vamos tentar novamente. Por favor, envie seus dados de entrega no formato correto:\n\n' +
                          'Nome, Rua, Número, Bairro, Quantidade, Tamanho');
          userState[msg.from].stage = 'awaiting_delivery_details';
          saveUserState(); // Salvar estado após alteração
          scheduleTimeout(msg.from);
          return;
        } else {
          await msg.reply('❌ Opção inválida. Por favor, responda com *Sim* para confirmar ou *Não* para reenvio.');
          return;
        }
      }
      // Fluxo: aguardando o assunto/dúvida em "Outros assuntos"
      else if (state === 'awaiting_other_subject') {
        try {
          const contact = await msg.getContact();
          const adminOtherMessage = `💬 *Nova Mensagem de Cliente* 💬
  
*Cliente:* ${contact.pushname || 'Cliente'}
*Número:* ${msg.from}
*Mensagem:* ${msg.body}`;
          
          await client.sendMessage(adminNumber, adminOtherMessage);
          console.log('Mensagem de "Outros assuntos" enviada para o administrador');
        } catch (error) {
          console.error("Erro ao enviar mensagem para o administrador:", error);
        }
        
        await msg.reply("✅ Recebemos sua mensagem! Em breve nossa equipe responderá sua dúvida. Obrigado!");
        clearTimeout(userState[msg.from].timeout);
        delete userState[msg.from];
        saveUserState(); // Salvar estado após alteração
        
        const contact = await msg.getContact();
        const name = contact.pushname || 'cliente';
        await delay(1500);
        await showMainMenu(msg.from, name.split(" ")[0]);
        return;
      }
    }

    // Se não estiver em nenhum fluxo, verifica se a mensagem contém palavras de ativação
    if (lowerMsg.match(/(menu|oi|olá|ola|Oi|OI|bom dia|boa tarde|Boa tarde|Bom dia|BOM DIA|BOA TARDE)/)) {
      const contact = await msg.getContact();
      const name = contact.pushname || 'cliente';
      await showMainMenu(msg.from, name.split(" ")[0]);
      return;
    }

    // Processa as opções do menu principal somente se o usuário não estiver em fluxo
    if (!userState[msg.from]) {
      const trimmedMsg = msg.body.trim();
      if (trimmedMsg === '1') {
        // Opção: Prato do dia (inclui valores das marmitas)
        const chat = await msg.getChat();
        await delay(1500);
        await chat.sendStateTyping();
        await delay(1500);
        const cardapio =
  `*🍽️ Cardápio do Prato do Dia (Segunda a Sexta):*
  *Segunda:* Arroz, feijão, bife e salada 🥗
  *Terça:* Frango grelhado, arroz, feijão e legumes 🍗
  *Quarta:* Macarrão ao molho com salada 🍝
  *Quinta:* Peixe assado, purê de batata e legumes 🐟
  *Sexta:* Strogonoff, arroz e batata palha 🍛

  *Valores:*
  Marmita Grande: R$16,00
  Marmita Pequena: R$14,00

  *Digite "voltar" a qualquer momento para retornar ao menu.*`;
        await client.sendMessage(msg.from, cardapio);
        return;
      } else if (trimmedMsg === '2') {
        // Opção: Entrega
        const chat = await msg.getChat();
        await delay(1500);
        await chat.sendStateTyping();
        await delay(1500);
        await client.sendMessage(
          msg.from,
          `🚚 *Entrega MB Lanches* 🚚
          
  *Condições de Entrega:*
  ✅ Taxa: R$5,00 para 1 ou 2 marmitas.
  ✅ Para 3 ou mais marmitas, a entrega é *sem taxa*!
  ⌛ Tempo estimado: *30 a 50 minutos*.

  Gostaria de solicitar a entrega? Responda com *Sim* ou *Não*.
  (Digite "voltar" para retornar ao menu principal.)`
        );
        // Define o estado para aguardar a confirmação de entrega
        userState[msg.from] = { stage: 'awaiting_delivery_confirmation' };
        saveUserState(); // Salvar estado após alteração
        scheduleTimeout(msg.from);
        return;
      } else if (trimmedMsg === '3') {
        // Opção: Outros assuntos
        const chat = await msg.getChat();
        await delay(1500);
        await chat.sendStateTyping();
        await delay(1500);
        await client.sendMessage(
          msg.from,
          `💬 *Outros Assuntos*
  Por favor, informe o assunto ou sua dúvida.
  (Digite "voltar" para retornar ao menu principal.)`
        );
        // Define o estado para aguardar o assunto
        userState[msg.from] = { stage: 'awaiting_other_subject' };
        saveUserState(); // Salvar estado após alteração
        scheduleTimeout(msg.from);
        return;
      } else {
        await msg.reply("❌ Opção inválida. Por favor, escolha uma das opções abaixo:\n\n1️⃣ - Prato do dia\n2️⃣ - Entrega\n3️⃣ - Outros assuntos\n\n(Digite 'voltar' para retornar ao menu.)");
        return;
      }
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    try {
      // Tentar enviar mensagem de erro para o usuário
      await client.sendMessage(
        msg.from,
        "⚠️ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde."
      );
    } catch (sendError) {
      console.error('Erro ao enviar mensagem de erro:', sendError);
    }
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  // Salvar estado antes de possível crash
  saveUserState();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  // Salvar estado antes de possível crash
  saveUserState();
});

// Salvar estado ao encerrar o processo
process.on('SIGINT', () => {
  console.log('Encerrando aplicação...');
  saveUserState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Processo terminado.');
  saveUserState();
  process.exit(0);
});

// Verificação de saúde periódica
setInterval(() => {
  console.log('Verificação de saúde: Bot em execução - ' + new Date().toLocaleString());
}, 1800000); // A cada 30 minutos
