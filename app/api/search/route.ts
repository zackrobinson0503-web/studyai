import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function serpSearch(query: string, page: number = 1) {
  const q = encodeURIComponent(query);
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

    if (page > 1 && tab) {
      const queryMap: Record<string, string> = {
        pdfs: `${className} lecture notes filetype:pdf site:edu OR site:mit.edu OR site:stanford.edu`,
        quizlet: `site:quizlet.com ${className} flashcards study`,
        problems: `${className} practice problems solutions worksheet`,
        reddit: `site:reddit.com/r/learnmath OR site:reddit.com/r/college OR site:reddit.com/r/AskAcademia ${className}`,
        textbooks: `${className} textbook solutions openstax OR libretexts OR scribd`,
        videos: className,
      };

      if (tab === 'videos') {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(className)}&type=video&maxResults=6&key=${process.env.YOUTUBE_API_KEY}`);
        const ytData = await ytRes.json();
        return NextResponse.json({ videos: ytData.items || [] });
      }

      const results = await serpSearch(queryMap[tab] || className, page);
      return NextResponse.json({ [tab]: results });
    }

    // Initial full search
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
      serpSearch(`${mainQuery} lecture notes filetype:pdf site:edu OR site:mit.edu OR site:stanford.edu`),
      serpSearch(`site:quizlet.com ${mainQuery} flashcards study`),
      serpSearch(`${mainQuery} practice problems with solutions worksheet`),
      serpSearch(`site:reddit.com ${mainQuery} help study tips`),
      serpSearch(`${mainQuery} textbook openstax OR libretexts OR scribd free`),
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