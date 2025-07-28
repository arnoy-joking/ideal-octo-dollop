'use server';
/**
 * @fileOverview A simple AI chat flow.
 *
 * - continueChat - A function that continues a conversation.
 * - ChatMessage - The type for a single chat message.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatHistorySchema = z.array(ChatMessageSchema);

export async function continueChat(history: ChatMessage[], newMessage: string): Promise<string> {
  const validatedHistory = ChatHistorySchema.parse(history);

  const response = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: newMessage,
    history: validatedHistory.map(msg => ({
      role: msg.role,
      content: [{text: msg.content}],
    })),
  });

  return response.text;
}
