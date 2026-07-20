import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit to support image/PDF uploads in JSON base64
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy init Gemini SDK
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('A variável de ambiente GEMINI_API_KEY não está configurada.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// AI Agent System Instruction & Tools
const AGENT_SYSTEM_INSTRUCTION = `Você é o "OrganizaAI", o agente financeiro inteligente integrado diretamente ao sistema de controle financeiro do usuário.
Você tem total controle e capacidade para ajudar o usuário a gerenciar suas finanças pessoais e comerciais (Caixa Comercial).

Você tem acesso aos seguintes dados em tempo real enviados em cada requisição (no objeto context):
1. Bancos e Contas (banks): Saldos atuais de cada banco cadastrado.
2. Categorias (categories): Lista de categorias de receitas e despesas disponíveis no sistema.
3. Transações (transactions): Histórico de todos os lançamentos de receitas e despesas já realizados (incluindo descrição, valor, data, fluxo pessoal/comercial, banco e categoria).

Instruções importantes de comportamento:
- Responda sempre em português brasileiro de forma amigável, prestativa, objetiva e profissional.
- Use emojis moderadamente para tornar a leitura agradável.
- Se o usuário pedir um relatório, análise ou resumo financeiro (pessoal, comercial ou ambos), use os dados do contexto para fazer os cálculos e fornecer uma análise rica e precisa em formato Markdown (com tabelas, listas e destaques). Não invente dados; use estritamente o histórico enviado no contexto.
- Se o usuário solicitar a criação de um novo lançamento de receita ou despesa (ex: "lança um gasto de R$ 50 no banco Nubank em alimentação", "recebi R$ 1500 de salário no Itaú"), você DEVE usar a ferramenta 'add_transaction' com os parâmetros correspondentes.
  - Tente mapear o nome do banco fornecido pelo usuário para um dos bancos existentes no contexto (ex: "ita" -> "Itaú", "nu" -> "Nubank"). Se o banco não existir, use o nome que o usuário digitou e o sistema lidará com isso ou criará se necessário, mas prefira associar a um existente.
  - Tente mapear a categoria para uma das categorias existentes de acordo com o flowType (pessoal ou comercial). Por exemplo, se for pessoal e o usuário disser "almoço", mapeie para "Alimentação".
  - Identifique corretamente o 'flowType' ('pessoal' se for gasto pessoal do usuário, ou 'comercio' se for gasto/receita do comércio/empresa).
  - Identifique o 'type' ('receita' para entradas/recebimentos ou 'despesa' para saídas/pagamentos).
  - O valor (amount) deve ser sempre um número positivo.
  - A data deve ser no formato YYYY-MM-DD. Se o usuário falar "hoje", "ontem" ou não especificar, use a data atual (ou calcule a partir dela). A data local atual é enviada na requisição.
  - Após chamar a ferramenta 'add_transaction', informe ao usuário que você está solicitando o lançamento ao sistema e que a transação será executada imediatamente e atualizada na tela!
`;

const addTransactionTool = {
  name: "add_transaction",
  description: "Registra uma nova transação (receita ou despesa) nas finanças pessoais ou comerciais do usuário.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "Nome ou descrição do lançamento (ex: 'Aluguel comercial', 'Venda de produto A', 'Supermercado')"
      },
      amount: {
        type: Type.NUMBER,
        description: "Valor numérico positivo da transação (ex: 150.00)"
      },
      type: {
        type: Type.STRING,
        enum: ["receita", "despesa"],
        description: "Tipo de lançamento: 'receita' (entrada de dinheiro) ou 'despesa' (saída de dinheiro)"
      },
      categoryName: {
        type: Type.STRING,
        description: "Nome da categoria desejada (ex: 'Alimentação', 'Combustível', 'Estoque', 'Salário'). Tente associar a uma categoria existente no sistema."
      },
      flowType: {
        type: Type.STRING,
        enum: ["pessoal", "comercio"],
        description: "Se o lançamento é de finanças Pessoais ('pessoal') ou de Caixa Comercial ('comercio')"
      },
      bankName: {
        type: Type.STRING,
        description: "Nome da conta bancária / banco associado (ex: 'Itaú', 'Nubank', 'Caixa'). Tente associar a uma conta existente."
      },
      date: {
        type: Type.STRING,
        description: "Data do lançamento no formato YYYY-MM-DD. Opcional, se não informada assuma a data corrente de hoje."
      },
      paymentMethod: {
        type: Type.STRING,
        enum: ["dinheiro", "pix", "credito", "debito", "outro"],
        description: "Método de pagamento usado. Opcional."
      }
    },
    required: ["description", "amount", "type", "categoryName", "flowType", "bankName"]
  }
};

// API Routes
app.post('/api/agent/chat', async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { message, history, context, currentDate } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'O parâmetro "message" é obrigatório.' });
    }

    const ai = getGeminiClient();

    // Construct enriched context prompt for the model
    const contextPrompt = `
[CONTEXTO ATUAL DO SISTEMA]
Data e Hora Locais Atuais: ${currentDate || new Date().toISOString()}

BANCOS CADASTRADOS (Contas):
${JSON.stringify(context?.banks || [], null, 2)}

CATEGORIAS DISPONÍVEIS:
${JSON.stringify(context?.categories || [], null, 2)}

ÚLTIMAS TRANSAÇÕES REGISTRADAS:
${JSON.stringify((context?.transactions || []).slice(0, 30), null, 2)}

[FIM DO CONTEXTO]
Com base no contexto acima e no histórico da conversa, responda à seguinte mensagem do usuário ou execute um lançamento se solicitado:
"${message}"
`;

    // Map history to the format required by `@google/genai`
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      }
    }
    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: contextPrompt }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: AGENT_SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [addTransactionTool] }]
      }
    });

    const text = response.text || '';
    const functionCalls = response.functionCalls || null;

    return res.json({
      text,
      functionCalls
    });

  } catch (error: any) {
    console.error('Erro no chat do Agente de IA:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar chat do Agente de IA.',
      details: error.message || error
    });
  }
});

app.post('/api/parse-receipt', async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { fileBase64, mimeType, fileName, existingCategories } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'Os parâmetros fileBase64 e mimeType são obrigatórios.' });
    }

    const ai = getGeminiClient();

    // Clean base64 prefix if present
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

    const categoriesPrompt = existingCategories && existingCategories.length > 0
      ? `Tente mapear para uma das seguintes categorias existentes se fizer sentido: ${existingCategories.join(', ')}.`
      : '';

    const prompt = `Analise este comprovante, recibo, nota fiscal ou fatura.
Extraia os dados estruturados do gasto de forma precisa:
1. "title": Nome do estabelecimento, empresa ou descrição simples do item (ex: "Posto Shell", "Supermercado Dia", "Fornecedor XYZ").
2. "amount": O valor total pago ou cobrado (como número decimal, ex: 124.50).
3. "date": A data de emissão ou pagamento no formato YYYY-MM-DD. Se faltar o ano, assuma o ano corrente (2026).
4. "categoryName": Uma categoria adequada. ${categoriesPrompt} Caso contrário, sugira uma categoria comum em português (ex: Alimentação, Transporte, Saúde, Estoque, Aluguel, Marketing, Impostos).
5. "flowType": Identifique se o gasto pertence à vida pessoal ("pessoal") ou se é claramente um gasto comercial/empresarial ("comercio"). Por exemplo, compras de estoque, insumos para produção, ferramentas industriais, serviços comerciais ou notas fiscais emitidas para CNPJ devem ser "comercio". Supermercados normais, lazer, saúde pessoal, moradia familiar devem ser "pessoal".
6. "notes": Resumo curto dos itens ou detalhes importantes (ex: "Compra de 3kg de café", "Mensalidade de internet").
7. "confidence": Sua confiança na extração dos dados (número de 0 a 100).

Responda rigorosamente no formato JSON de acordo com o esquema solicitado.`;

    const modelName = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            amount: { type: 'NUMBER' },
            date: { type: 'STRING' },
            categoryName: { type: 'STRING' },
            flowType: { type: 'STRING', enum: ['pessoal', 'comercio'] },
            notes: { type: 'STRING' },
            confidence: { type: 'NUMBER' }
          },
          required: ['title', 'amount', 'date', 'categoryName', 'flowType', 'confidence']
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error('Gemini retornou uma resposta vazia.');
    }

    const parsedResult = JSON.parse(textResponse);
    return res.json(parsedResult);

  } catch (error: any) {
    console.error('Erro ao analisar comprovante via Gemini:', error);
    return res.status(500).json({
      error: 'Erro ao processar o comprovante',
      details: error.message || error
    });
  }
});

// App environment and routing
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving static files from dist in production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
