import OpenAI from 'openai';
import env from '../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * AI Chat Service
 *
 * Handles post-generation AI chat for editing slides.
 */
export class AIChatService {

  async chat(params: {
    pitchBookId: string;
    message: string;
    slidesData: any[];
    history: Array<{ role: string; content: string }>;
  }): Promise<string> {
    const { message, slidesData, history } = params;

    const systemPrompt = `You are an expert investment banking presentation editor. You help users refine and improve their pitch book slides.

Current pitch book has ${slidesData.length} slides:
${slidesData.map((s: any, i: number) => `Slide ${i + 1}: "${s.title}" (${s.layout})`).join('\n')}

When the user asks for changes, provide specific instructions on what to modify.
Format your response as clear, actionable suggestions.
If they ask to modify specific slide content, provide the updated text.

Be concise and professional. Use investment banking terminology where appropriate.`;

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 4096,
        messages,
      });

      return response.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
    } catch (error: any) {
      console.error('[AIChat] OpenAI error:', error?.message || error);
      return 'I ran into an issue talking to the AI service. Please try again in a moment.';
    }
  }
}

export const aiChat = new AIChatService();
