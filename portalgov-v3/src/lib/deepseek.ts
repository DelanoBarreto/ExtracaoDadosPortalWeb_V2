import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function generateContent(prompt: string, maxTokens = 2000) {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return response.choices[0].message.content;
}

export async function generateHTMLPage(description: string) {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `Você é um designer UI/UX expert. Gere código HTML/CSS responsivo e moderno. Use Tailwind CSS via CDN. Inclua header com navegação, hero section, seções de conteúdo e footer. Responda apenas com código HTML válido completo.`
      },
      {
        role: 'user',
        content: `Crie uma página web: ${description}`
      }
    ],
    max_tokens: 4000,
  });
  return response.choices[0].message.content;
}

export default deepseek;