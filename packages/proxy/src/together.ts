// Together.ai HTTP client. OpenAI-compatible chat completions.

interface TogetherMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TogetherOptions {
  apiKey: string;
  model: string;
  messages: TogetherMessage[];
  maxTokens?: number;
  temperature?: number;
}

export async function callTogether(opts: TogetherOptions): Promise<string> {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 800,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Together.ai ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Together.ai returned no content');
  return content;
}
