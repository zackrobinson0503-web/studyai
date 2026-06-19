import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { messages, topic, mode } = await request.json();
    // mode: 'chat' (floating bubble) | 'tutor' (tutor tab)

    const systemPrompt = mode === 'tutor'
      ? `You are an expert AI tutor helping a college student study "${topic}". 
Ask probing questions, explain concepts clearly, give examples, and guide the student to understanding rather than just giving answers. 
Be encouraging and concise. Format responses with line breaks for readability but keep them focused.`
      : `You are a helpful AI study assistant embedded in StudyAI, a platform for college students.
The student is currently studying: "${topic || 'a college topic'}".
Answer questions clearly and concisely. If the question is related to their topic, tailor your answer to that context.
Be friendly, accurate, and to the point.`;

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const reply = (res.content[0] as any).text;
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}