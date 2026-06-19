import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function serpSearch(query: string, extra: string, page: number = 1) {
  const q = encodeURIComponent(query + ' ' + extra);
  const key = process.env.SERP_API_KEY;
  const start = (page - 1) * 5;
  const res = await fetch(`https://serpapi.com/search?q=${q}&api_key=${key}&num=5&start=${start}`);
  const data = await res.json();
  return (data.organic_results || []).slice(0, 5).map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    source: item.displayed_link || item.link,
  }));
}

export async function POST(request: Request) {
  try {
    const { className, page = 1, tab } = await request.json();

    // If paginating a specific tab, only fetch that tab
    if (page > 1 && tab) {
      const extraMap: Record<string, string> = {
        pdfs: 'free PDF study guide filetype:pdf',
        quizlet: 'quizlet flashcards',
        problems: 'practice problems with solutions',
        reddit: 'site:reddit.com',
        textbooks: 'free textbook solutions',
      };

      if (tab === 'videos') {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(className)}&type=video&maxResults=6&key=${process.env.YOUTUBE_API_KEY}&pageToken=`);
        const ytData = await ytRes.json();
        return NextResponse.json({ videos: ytData.items || [] });
      }

      const results = await serpSearch(className, extraMap[tab] || '', page);
      return NextResponse.json({ [tab]: results });
    }

    // Initial search — fetch everything
    const claudeRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `A college student needs help with: "${className}". Respond ONLY with raw JSON, no markdown: {"summary": "2 sentences about what students struggle with", "queries": ["specific search 1", "specific search 2", "specific search 3"]}` }]
    });

    let text = (claudeRes.content[0] as any).text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    const mainQuery = parsed.queries[0];

    const [videos, pdfs, quizlet, problems, reddit, textbooks] = await Promise.all([
      (async () => {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(mainQuery)}&type=video&maxResults=6&key=${process.env.YOUTUBE_API_KEY}`);
        const ytData = await ytRes.json();
        return ytData.items || [];
      })(),
      serpSearch(mainQuery, 'free PDF study guide filetype:pdf', 1),
      serpSearch(mainQuery, 'quizlet flashcards', 1),
      serpSearch(mainQuery, 'practice problems with solutions', 1),
      serpSearch(mainQuery, 'site:reddit.com', 1),
      serpSearch(mainQuery, 'free textbook solutions', 1),
    ]);

    return NextResponse.json({
      summary: parsed.summary,
      videos,
      pdfs,
      quizlet,
      problems,
      reddit,
      textbooks,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}