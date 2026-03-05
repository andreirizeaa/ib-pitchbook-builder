import env from '../config/env';

/**
 * AI Chat Service
 *
 * Handles post-generation AI chat for editing slides.
 * Uses Gemini VLM for understanding slide content and making edits.
 */
export class AIChatService {

  /**
   * Send a chat message about a pitch book and get AI suggestions.
   */
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

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';
    } catch (error: any) {
      console.error('[AIChat] Error:', error.message);
      return `I encountered an error: ${error.message}. Please check your Gemini API key configuration.`;
    }
  }
}

export const aiChat = new AIChatService();
