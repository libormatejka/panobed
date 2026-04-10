const Anthropic = require('@anthropic-ai/sdk');
const { toolDefinitions, executeTool } = require('./tools');
const { logChat } = require('./queries');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Jsi Pan Oběd – přátelský asistent mužského rodu, který pomáhá najít oběd v restauracích. Vždy o sobě mluv v mužském rodě (jsem rád, našel jsem, doporučuji).
Odpovídáš vždy česky, stručně a přehledně.
Dnešní datum je ${new Date().toISOString().slice(0, 10)}.
Pokud uživatel neuvede datum, použij dnešní datum.
Pokud uživatel neuvede město, zeptej se ho.
Výsledky prezentuj přehledně – každou restauraci na nový řádek s jejím menu.
Pokud je výsledků více než 10, zobraz pouze 10 nejzajímavějších a uveď celkový počet dostupných restaurací. Nabídni upřesnění (typ kuchyně, cenová kategorie apod.).
Při výpisu restaurací vždy formátuj název restaurace jako markdown odkaz na detail: [Název restaurace](/r/ID) kde ID je číslo z výsledků search_menus.
Pokud se uživatel ptá na konkrétní typ jídla (tradiční, vegetariánské, ryby, apod.), použij search_menus pro dané město a datum, a z výsledků vyber pouze restaurace které mají v menu odpovídající jídla. Buď stručný.
Na konec každé odpovědi přidej přesně tento řádek s 3 krátkými návrhy dalších dotazů ve formátu:
[NÁVRHY: "první návrh", "druhý návrh", "třetí návrh"]`;

const PRICE_INPUT  = 0.80 / 1_000_000;
const PRICE_OUTPUT = 4.00 / 1_000_000;

function logUsage(usage, label = '') {
  const input  = usage.input_tokens  || 0;
  const output = usage.output_tokens || 0;
  const cost   = (input * PRICE_INPUT + output * PRICE_OUTPUT).toFixed(6);
  console.log(`[usage${label}] input=${input} output=${output} cost=$${cost}`);
}

// Streaming verze – volá onToken(text) pro každý token, onDone(result) na konci
async function chatStream(userMessage, history = [], clientId = null, onToken, onDone) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const startTime = Date.now();
  let collectedText = '';

  while (true) {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    stream.on('text', (text) => {
      collectedText += text;
      onToken(text);
    });

    const finalMsg = await stream.finalMessage();
    totalInput  += finalMsg.usage?.input_tokens  || 0;
    totalOutput += finalMsg.usage?.output_tokens || 0;

    if (finalMsg.stop_reason === 'end_turn') {
      const costUsd = totalInput * PRICE_INPUT + totalOutput * PRICE_OUTPUT;

      const suggestionsMatch = collectedText.match(/\[NÁVRHY:\s*(.*?)\]\s*$/s);
      const suggestions = suggestionsMatch
        ? suggestionsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || []
        : [];
      const reply = collectedText.replace(/\[NÁVRHY:.*?\]\s*$/s, '').trimEnd();
      const responseTimeMs = Date.now() - startTime;

      logChat({ user_message: userMessage, bot_reply: reply, input_tokens: totalInput, output_tokens: totalOutput, cost_usd: costUsd, client_id: clientId, response_time_ms: responseTimeMs });

      const updatedHistory = [...messages, { role: 'assistant', content: reply }];
      onDone({ reply, history: updatedHistory, suggestions, responseTimeMs });
      return;
    }

    if (finalMsg.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: finalMsg.content });

      const toolResults = [];
      for (const block of finalMsg.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`[tool] ${block.name}`, JSON.stringify(block.input));
        const result = executeTool(block.name, block.input);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      messages.push({ role: 'user', content: toolResults });
      collectedText = '';
      continue;
    }

    throw new Error(`Neočekávaný stop_reason: ${finalMsg.stop_reason}`);
  }
}

// history – pole { role: 'user'|'assistant', content: string }
// Vrátí { reply, history } kde history obsahuje celou aktualizovanou konverzaci
async function chat(userMessage, history = [], clientId = null) {
  // Sestavíme messages: předchozí historie + nová zpráva uživatele
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const startTime = Date.now();

  while (true) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    totalInput  += response.usage?.input_tokens  || 0;
    totalOutput += response.usage?.output_tokens || 0;

    if (response.stop_reason === 'end_turn') {
      const costUsd = totalInput * PRICE_INPUT + totalOutput * PRICE_OUTPUT;
      logUsage({ input_tokens: totalInput, output_tokens: totalOutput }, ' total');

      const textBlock = response.content.find(b => b.type === 'text');
      const rawReply  = textBlock ? textBlock.text : '';

      // Parsuj a odděl návrhy od textu
      const suggestionsMatch = rawReply.match(/\[NÁVRHY:\s*(.*?)\]\s*$/s);
      const suggestions = suggestionsMatch
        ? suggestionsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || []
        : [];
      const reply = rawReply.replace(/\[NÁVRHY:.*?\]\s*$/s, '').trimEnd();

      const responseTimeMs = Date.now() - startTime;

      logChat({
        user_message: userMessage,
        bot_reply: reply,
        input_tokens: totalInput,
        output_tokens: totalOutput,
        cost_usd: costUsd,
        client_id: clientId,
        response_time_ms: responseTimeMs,
      });

      // Vrátíme odpověď + aktualizovanou historii (jen text zprávy pro klienta)
      const updatedHistory = [
        ...messages,
        { role: 'assistant', content: reply },
      ];

      return { reply, history: updatedHistory, suggestions, responseTimeMs: responseTimeMs };
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`[tool] ${block.name}`, JSON.stringify(block.input));
        const result = executeTool(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    throw new Error(`Neočekávaný stop_reason: ${response.stop_reason}`);
  }
}

module.exports = { chat, chatStream };
