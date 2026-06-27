'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import MathText from './components/MathText';
import { saveItem, unsaveItem, isItemSaved, getSavedItems, logSearch, getRecentSearches } from '../lib/supabase';

const TABS = [
  { id: 'videos', label: 'Videos', iconColor: '#1D9E75', icon: '▶' },
  { id: 'pdfs', label: 'PDFs', iconColor: '#e05c2a', icon: '📄' },
  { id: 'quizlet', label: 'Quizlet', iconColor: '#7c63e8', icon: '📚' },
  { id: 'problems', label: 'Problems', iconColor: '#d4a017', icon: '✏️' },
  { id: 'reddit', label: 'Reddit', iconColor: '#e05c2a', icon: '💬' },
  { id: 'textbooks', label: 'Textbooks', iconColor: '#2a7cd4', icon: '📖' },
];

const CARD_COLORS = [
  { bg: 'linear-gradient(135deg,#e8f5ee,#c5e8d4)', circle: '#1D9E75' },
  { bg: 'linear-gradient(135deg,#ede8ff,#c4b5fd)', circle: '#7c3aed' },
  { bg: 'linear-gradient(135deg,#fff3e8,#fdcba8)', circle: '#ea6c00' },
  { bg: 'linear-gradient(135deg,#e8f0ff,#b5d0f5)', circle: '#2a7cd4' },
  { bg: 'linear-gradient(135deg,#fff0f5,#fdb8cc)', circle: '#d4376e' },
  { bg: 'linear-gradient(135deg,#f0fff0,#b5f0c4)', circle: '#15803d' },
];

type Message = { role: 'user' | 'assistant'; content: string };

export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('videos');
  const [loadingStep, setLoadingStep] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [pages, setPages] = useState<Record<string, number>>({
    videos: 1, pdfs: 1, quizlet: 1, problems: 1, reddit: 1, textbooks: 1,
  });
  const [pageResults, setPageResults] = useState<Record<string, any[]>>({});
  const [pageLoading, setPageLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [tutorMessages, setTutorMessages] = useState<Message[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorInitialized, setTutorInitialized] = useState(false);
  const tutorBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.email) {
      getRecentSearches(session.user.email).then(setRecentSearches);
      getSavedItems(session.user.email).then(items => {
        setSavedItems(items);
        setSavedUrls(new Set(items.map((i: any) => i.url)));
      });
    }
  }, [session]);
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    setQuery(q);
    handleSearch(q);
  }
}, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    tutorBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages]);

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setResults(null);
    setHasSearched(true);
    setShowSaved(false);
    setActiveTab('videos');
    setTutorMessages([]);
    setTutorInitialized(false);
    setPages({ videos: 1, pdfs: 1, quizlet: 1, problems: 1, reddit: 1, textbooks: 1 });
    setPageResults({});
    setLoadingStep('Asking AI to understand your class...');
    await new Promise(r => setTimeout(r, 800));
    setLoadingStep('Searching YouTube, PDFs, Quizlet and more...');
    await new Promise(r => setTimeout(r, 800));
    setLoadingStep('Ranking the best results for you...');
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: q }),
    });
    const data = await res.json();
    setResults(data);
    setCurrentTopic(q);
    window.history.pushState({}, '', `?q=${encodeURIComponent(q)}`);
    setLoading(false);
    if (session?.user?.email) {
      const updated = await getRecentSearches(session.user.email);
      await logSearch(session.user.email, q);
      const fresh = await getRecentSearches(session.user.email);
      setRecentSearches(fresh);
    }
  }

async function handleSave(item: { title: string; url: string; source: string; type: string; thumbnail?: string; description?: string }) {
  if (!session?.user?.email) { signIn('google'); return; }
  setSavingUrl(item.url);
  if (savedUrls.has(item.url)) {
    await unsaveItem(session.user.email, item.url);
    setSavedUrls(prev => { const n = new Set(prev); n.delete(item.url); return n; });
    setSavedItems(prev => prev.filter(i => i.url !== item.url));
  } else {
    await saveItem(session.user.email, { ...item, search_topic: currentTopic });
    setSavedUrls(prev => new Set(prev).add(item.url));
    // Refresh saved items from Supabase immediately
    const fresh = await getSavedItems(session.user.email);
    setSavedItems(fresh);
  }
  setSavingUrl(null);
}

  async function loadMoreResults(tabId: string, nextPage: number) {
    if (pageLoading) return;
    setPageLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const extraMap: Record<string, string> = {
      pdfs: 'free PDF study guide filetype:pdf site:edu OR site:mit.edu OR site:stanford.edu',
      quizlet: `site:quizlet.com ${currentTopic} flashcards study`,
      problems: `${currentTopic} practice problems with solutions worksheet`,
      reddit: `site:reddit.com ${currentTopic} help study tips`,
      textbooks: `${currentTopic} textbook openstax OR libretexts OR scribd free`,
    };
    if (tabId === 'videos') {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: query, page: nextPage }),
      });
      const data = await res.json();
      setPageResults(prev => ({ ...prev, [`videos_${nextPage}`]: data.videos || [] }));
    } else {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: query, page: nextPage, tab: tabId }),
      });
      const data = await res.json();
      setPageResults(prev => ({ ...prev, [`${tabId}_${nextPage}`]: data[tabId] || [] }));
    }
    setPages(prev => ({ ...prev, [tabId]: nextPage }));
    setPageLoading(false);
  }

  async function initializeTutor() {
    if (tutorInitialized || !currentTopic) return;
    setTutorInitialized(true);
    setTutorLoading(true);
    const initPrompt = `I just searched for "${currentTopic}". Give me 3 short, specific questions I should be able to answer to truly understand this topic. Number them 1, 2, 3. Then ask me which one I want to start with.`;
    const initMessages: Message[] = [{ role: 'user', content: initPrompt }];
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: initMessages, topic: currentTopic, mode: 'tutor' }),
    });
    const data = await res.json();
    setTutorMessages([{ role: 'assistant', content: data.reply }]);
    setTutorLoading(false);
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: Message = { role: 'user', content: chatInput };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updated, topic: currentTopic, mode: 'chat' }),
    });
    const data = await res.json();
    setChatMessages([...updated, { role: 'assistant', content: data.reply }]);
    setChatLoading(false);
  }

  async function sendTutorMessage() {
    if (!tutorInput.trim() || tutorLoading) return;
    const userMsg: Message = { role: 'user', content: tutorInput };
    const updated = [...tutorMessages, userMsg];
    setTutorMessages(updated);
    setTutorInput('');
    setTutorLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updated, topic: currentTopic, mode: 'tutor' }),
    });
    const data = await res.json();
    setTutorMessages([...updated, { role: 'assistant', content: data.reply }]);
    setTutorLoading(false);
  }

  const ytBase = 'https://www.youtube.com/watch?v=';

  const getResultCount = (tabId: string) => {
    if (!results) return 0;
    if (tabId === 'videos') return (results.videos || []).length;
    return (results[tabId] || []).length;
  };

  const getCurrentItems = (tabId: string) => {
    const page = pages[tabId] || 1;
    if (page > 1 && pageResults[`${tabId}_${page}`]) return pageResults[`${tabId}_${page}`];
    if (!results) return [];
    if (tabId === 'videos') return results.videos || [];
    return results[tabId] || [];
  };

  const getSubjectTags = (topic: string) => {
    const lower = topic.toLowerCase();
    const tags: { label: string; bg: string; color: string; border: string }[] = [];
    if (lower.includes('calc') || lower.includes('math') || lower.includes('algebra') || lower.includes('trig'))
      tags.push({ label: 'Mathematics', bg: '#e8f5ee', color: '#085041', border: '#c5e8d4' });
    if (lower.includes('calc 2') || lower.includes('calculus 2'))
      tags.push({ label: 'Calculus II', bg: '#ede8ff', color: '#5b21b6', border: '#c4b5fd' });
    else if (lower.includes('calc 1') || lower.includes('calculus 1'))
      tags.push({ label: 'Calculus I', bg: '#ede8ff', color: '#5b21b6', border: '#c4b5fd' });
    if (lower.includes('integrat') || lower.includes('derivative') || lower.includes('limit'))
      tags.push({ label: 'Integration', bg: '#fff3e8', color: '#9a3412', border: '#fdcba8' });
    if (lower.includes('chem'))
      tags.push({ label: 'Chemistry', bg: '#e8f0ff', color: '#1e3a8a', border: '#b5d0f5' });
    if (lower.includes('phys'))
      tags.push({ label: 'Physics', bg: '#fff0f5', color: '#9d174d', border: '#fdb8cc' });
    if (lower.includes('bio'))
      tags.push({ label: 'Biology', bg: '#f0fff0', color: '#14532d', border: '#b5f0c4' });
    if (lower.includes('econ'))
      tags.push({ label: 'Economics', bg: '#fefce8', color: '#713f12', border: '#fde68a' });
    if (tags.length === 0) tags.push({ label: topic, bg: '#e8f5ee', color: '#085041', border: '#c5e8d4' });
    return tags.slice(0, 3);
  };

  const SaveButton = ({ item }: { item: any }) => {
    const isSaved = savedUrls.has(item.url);
    const isSaving = savingUrl === item.url;
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); handleSave(item); }}
        disabled={isSaving}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', border: isSaved ? '1.5px solid #1D9E75' : '1.5px solid #e0ede6', background: isSaved ? '#e8f5ee' : 'white', color: isSaved ? '#085041' : '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
      >
        {isSaving ? '...' : isSaved ? '✓ Saved' : '+ Save'}
      </button>
    );
  };

  const renderPagination = (tabId: string) => {
    const page = pages[tabId] || 1;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px', paddingBottom: '24px' }}>
        <button onClick={() => loadMoreResults(tabId, page - 1)} disabled={page <= 1 || pageLoading}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e0ede6', background: 'white', color: page <= 1 ? '#ccc' : '#4a7c5f', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}>← Prev</button>
        {[1, 2, 3, 4, 5].map(p => (
          <button key={p} onClick={() => p !== page && loadMoreResults(tabId, p)}
            style={{ width: '36px', height: '36px', borderRadius: '8px', border: p === page ? 'none' : '1.5px solid #e0ede6', background: p === page ? '#1D9E75' : 'white', color: p === page ? 'white' : '#4a7c5f', cursor: p === page ? 'default' : 'pointer', fontSize: '13px', fontWeight: p === page ? 700 : 400 }}>
            {p}
          </button>
        ))}
        <button onClick={() => loadMoreResults(tabId, page + 1)} disabled={page >= 5 || pageLoading}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #c5e8d4', background: 'white', color: page >= 5 ? '#ccc' : '#1D9E75', cursor: page >= 5 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>Next →</button>
      </div>
    );
  };

  const renderSavedItems = () => {
    if (savedItems.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔖</div>
          <p style={{ fontSize: '15px', color: '#4a7c5f' }}>No saved items yet — hit + Save on any result</p>
        </div>
      );
    }
    const grouped: Record<string, any[]> = {};
    savedItems.forEach(item => {
      if (!grouped[item.search_topic]) grouped[item.search_topic] = [];
      grouped[item.search_topic].push(item);
    });
    return (
      <div>
        {Object.entries(grouped).map(([topic, items]) => (
          <div key={topic} style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a1a12', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
              {topic}
            </div>
            {items.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', border: '1.5px solid #eef5f1', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0a1a12', margin: '0 0 4px' }}>{item.title}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px', lineHeight: 1.5 }}>{item.description?.slice(0, 100)}...</p>
                    <span style={{ fontSize: '11px', background: '#e8f5ee', color: '#085041', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, border: '1px solid #c5e8d4' }}>{item.source}</span>
                  </div>
                  <SaveButton item={item} />
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderResults = () => {
    if (showSaved) return renderSavedItems();
    if (!results) return null;

    if (activeTab === 'tutor') {
      return (
        <div style={{ background: 'white', border: '1.5px solid #e8f2ec', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#1D9E75,#085041)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white' }}>AI Tutor</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>Topic: {currentTopic}</p>
            </div>
          </div>
          <div style={{ height: '520px', overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tutorMessages.length === 0 && !tutorLoading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.5 }}>
                <span style={{ fontSize: '36px' }}>📚</span>
                <p style={{ fontSize: '15px', color: '#4a7c5f', textAlign: 'center', margin: 0 }}>Search for a topic to start your tutoring session</p>
              </div>
            )}
            {tutorMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: msg.role === 'user' ? '#1D9E75' : '#f7faf8', border: msg.role === 'assistant' ? '1.5px solid #e8f2ec' : 'none' }}>
                  {msg.role === 'assistant'
                    ? <MathText content={msg.content} color="#0a1a12" />
                    : <span style={{ color: 'white', fontSize: '15px', lineHeight: 1.6 }}>{msg.content}</span>}
                </div>
              </div>
            ))}
            {tutorLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 2px', background: '#f7faf8', border: '1.5px solid #e8f2ec' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={tutorBottomRef} />
          </div>
          <div style={{ borderTop: '1.5px solid #e8f2ec', padding: '14px', display: 'flex', gap: '10px' }}>
            <input value={tutorInput} onChange={e => setTutorInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendTutorMessage()}
              placeholder={currentTopic ? 'Ask your tutor anything...' : 'Search for a topic first'}
              disabled={!currentTopic}
              style={{ flex: 1, padding: '11px 16px', borderRadius: '10px', border: '1.5px solid #d4ede2', background: currentTopic ? 'white' : '#f7faf8', color: '#0a1a12', fontSize: '14px', outline: 'none' }} />
            <button onClick={sendTutorMessage} disabled={!currentTopic || tutorLoading}
              style={{ background: currentTopic ? '#1D9E75' : '#d4ede2', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '10px', fontSize: '14px', cursor: currentTopic ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
              Send
            </button>
          </div>
        </div>
      );
    }

    const items = getCurrentItems(activeTab);

    if (pageLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e8f2ec', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '14px', color: '#1D9E75' }}>Loading more results...</p>
        </div>
      );
    }

    if (activeTab === 'videos') {
      return (
        <>
          {items.map((v: any, i: number) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            const url = ytBase + v.id.videoId;
            return (
              <div key={i} style={{ background: 'white', border: '1.5px solid #eef5f1', borderRadius: '14px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', gap: '16px', flex: 1, alignItems: 'flex-start' }}>
                  <div style={{ width: '120px', height: '72px', borderRadius: '10px', background: color.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {v.snippet.thumbnails?.medium?.url
                      ? <img src={v.snippet.thumbnails.medium.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                      : <div style={{ width: '36px', height: '36px', background: color.circle, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: '14px', marginLeft: '2px' }}>▶</span></div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#0a1a12', margin: '0 0 4px', letterSpacing: '-0.2px', lineHeight: 1.3 }}>{v.snippet.title}</p>
                    <p style={{ fontSize: '12px', color: '#1D9E75', margin: '0 0 6px', fontWeight: 700 }}>{v.snippet.channelTitle}</p>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', lineHeight: 1.5 }}>
                      {v.snippet.description ? v.snippet.description.slice(0, 120) + '...' : 'Click to watch on YouTube.'}
                    </p>
                    <span style={{ fontSize: '11px', background: '#e8f5ee', color: '#085041', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid #c5e8d4' }}>YouTube</span>
                  </div>
                </a>
                <SaveButton item={{ title: v.snippet.title, url, source: 'YouTube', type: 'video', thumbnail: v.snippet.thumbnails?.medium?.url, description: v.snippet.description }} />
              </div>
            );
          })}
          {renderPagination('videos')}
        </>
      );
    }

    return (
      <>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ background: 'white', border: '1.5px solid #eef5f1', borderRadius: '14px', padding: '16px 18px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <p style={{ fontSize: '15px', fontWeight: 800, color: '#0a1a12', margin: 0, letterSpacing: '-0.2px' }}>{item.title}</p>
                <span style={{ fontSize: '11px', background: '#e8f5ee', color: '#085041', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid #c5e8d4', marginLeft: '12px', flexShrink: 0 }}>{item.source}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: 1.6 }}>{item.snippet}</p>
            </a>
            <SaveButton item={{ title: item.title, url: item.link, source: item.source, type: activeTab, description: item.snippet }} />
          </div>
        ))}
        {renderPagination(activeTab)}
      </>
    );
  };

  const tags = currentTopic ? getSubjectTags(currentTopic) : [];

  return (
    <main style={{ minHeight: '100vh', background: '#f5f8f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      `}</style>

      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '2px solid #f0f7f3', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '14px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', fontWeight: 700 }}>✦</div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0a1a12', letterSpacing: '-0.4px' }}>Study<span style={{ color: '#1D9E75' }}>AI</span></span>
        </div>
        <div style={{ flex: 1, background: '#f7faf8', border: '1.5px solid #c5e8d4', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '8px 14px', gap: '8px' }}>
          <span style={{ fontSize: '15px', color: '#1D9E75' }}>🔍</span>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search any class, topic, or concept..."
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#0a1a12', fontSize: '14px', outline: 'none' }} />
          <span style={{ fontSize: '11px', color: '#bbb', background: '#eef5f1', padding: '2px 8px', borderRadius: '5px', border: '1px solid #d4ede2' }}>⌘K</span>
        </div>
        <button onClick={() => handleSearch()} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {loading ? 'Searching...' : 'Search →'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff8f2', border: '1.5px solid #fddcb8', borderRadius: '10px', padding: '6px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px' }}>🔥</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#ea6c00' }}>7</span>
          <span style={{ fontSize: '11px', color: '#c4835a', fontWeight: 500 }}>day streak</span>
        </div>
        {session ? (
          <>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#085041)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: 800, flexShrink: 0 }}>
              {session.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <button onClick={() => signOut()} style={{ fontSize: '12px', color: '#1D9E75', background: 'transparent', border: '1.5px solid #1D9E75', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Sign out</button>
            <button style={{ fontSize: '12px', background: '#0a1a12', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>✦ Premium</button>
          </>
        ) : (
          <>
            <button onClick={() => signIn('google')} style={{ fontSize: '12px', color: '#1D9E75', background: 'transparent', border: '1.5px solid #1D9E75', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
            <button style={{ fontSize: '12px', background: '#0a1a12', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>✦ Premium</button>
          </>
        )}
      </nav>

      {/* Hero */}
      {!hasSearched && (
        <div style={{ padding: '90px 24px 72px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(to bottom,#c8ead9 0%,#e8f5f0 40%,#f5f8f6 100%)' }}>
          <div style={{ position: 'absolute', top: '20px', left: '5%', width: '100px', height: '100px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.25 }} />
          <div style={{ position: 'absolute', top: '60px', left: '18%', width: '50px', height: '50px', borderRadius: '50%', background: '#7c63e8', opacity: 0.1 }} />
          <div style={{ position: 'absolute', top: '10px', right: '8%', width: '80px', height: '80px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.25 }} />
          <div style={{ position: 'absolute', top: '30px', right: '22%', width: '40px', height: '40px', borderRadius: '50%', background: '#ea6c00', opacity: 0.08 }} />
          <div style={{ position: 'absolute', bottom: '40px', left: '8%', width: '70px', height: '70px', borderRadius: '50%', background: '#2a7cd4', opacity: 0.08 }} />
          <div style={{ position: 'absolute', bottom: '50px', right: '10%', width: '60px', height: '60px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.2 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e8f5ee', border: '1.5px solid #c5e8d4', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: 700, letterSpacing: '0.06em' }}>✦ POWERED BY AI</span>
            </div>
            <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#0a1a12', margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-1px' }}>The smartest way to<br /><span style={{ color: '#1D9E75' }}>find study materials</span></h1>
            <p style={{ fontSize: '16px', color: '#4a7c5f', margin: '0 0 40px', fontWeight: 500 }}>YouTube · PDFs · Quizlet · Reddit · Textbooks — all in one search</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Organic Chemistry Ch.5', 'Calculus 2 Integration', 'Micro Economics', 'Physics Kinematics'].map(s => (
                <button key={s} onClick={() => handleSearch(s)} style={{ fontSize: '13px', background: 'white', color: '#0a1a12', border: '1.5px solid #d4ede2', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 500 }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      {hasSearched && (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 62px)' }}>
          {/* Sidebar */}
          <div style={{ width: '220px', flexShrink: 0, background: 'white', borderRight: '1.5px solid #e8f2ec' }}>
            <div style={{ padding: '16px 10px', position: 'sticky', top: '62px', overflowY: 'auto', maxHeight: 'calc(100vh - 62px)' }}>
              <div style={{ fontSize: '10px', color: '#aac8b8', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', marginBottom: '6px' }}>STUDY TOOLS</div>
              {TABS.map(tab => {
                const count = getResultCount(tab.id);
                const isActive = activeTab === tab.id && !showSaved;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowSaved(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', border: 'none', background: isActive ? '#f0faf5' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 700 : 400, color: isActive ? '#085041' : '#4a7c5f', textAlign: 'left', marginBottom: '2px', borderLeft: isActive ? '3px solid #1D9E75' : '3px solid transparent' } as any}>
                    <span style={{ fontSize: '14px', color: tab.iconColor }}>{tab.icon}</span>
                    <span style={{ flex: 1 }}>{tab.label}</span>
                    {count > 0 && <span style={{ fontSize: '11px', background: isActive ? '#1D9E75' : '#e8f5ee', color: isActive ? 'white' : '#085041', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>{count}</span>}
                  </button>
                );
              })}

              <div style={{ borderTop: '1.5px solid #eef5f1', margin: '10px 4px' }} />
              <div style={{ fontSize: '10px', color: '#aac8b8', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', marginBottom: '6px' }}>AI FEATURES</div>

              <button onClick={() => { setActiveTab('tutor'); setShowSaved(false); initializeTutor(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', background: activeTab === 'tutor' && !showSaved ? '#fdf3ff' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === 'tutor' && !showSaved ? 700 : 500, color: '#7c3aed', textAlign: 'left', marginBottom: '2px', border: 'none', borderLeft: activeTab === 'tutor' && !showSaved ? '3px solid #a855f7' : '3px solid transparent' } as any}>
                <span style={{ fontSize: '14px' }}>✦</span>
                <span style={{ flex: 1 }}>AI Tutor</span>
              </button>

              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#4a7c5f', textAlign: 'left', marginBottom: '2px', border: 'none', borderLeft: '3px solid transparent' } as any}>
                <span style={{ fontSize: '14px', color: '#1D9E75' }}>📝</span>
                <span style={{ flex: 1 }}>Study Guide</span>
                <span style={{ background: '#fb923c', color: 'white', borderRadius: '4px', padding: '1px 7px', fontSize: '9px', fontWeight: 700 }}>PRO</span>
              </button>

              <div style={{ borderTop: '1.5px solid #eef5f1', margin: '10px 4px' }} />
              <div style={{ fontSize: '10px', color: '#aac8b8', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', marginBottom: '6px' }}>PLANNING</div>

              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#4a7c5f', textAlign: 'left', marginBottom: '2px', border: 'none', borderLeft: '3px solid transparent' } as any}>
                <span style={{ fontSize: '14px', color: '#2a7cd4' }}>🎓</span>
                <span style={{ flex: 1 }}>Degree Planner</span>
                <span style={{ background: '#1D9E75', color: 'white', borderRadius: '4px', padding: '1px 7px', fontSize: '9px', fontWeight: 700 }}>NEW</span>
              </button>

              <div style={{ borderTop: '1.5px solid #eef5f1', margin: '10px 4px' }} />
              <div style={{ fontSize: '10px', color: '#aac8b8', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', marginBottom: '6px' }}>SAVED</div>

              <button onClick={() => setShowSaved(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', background: showSaved ? '#f0faf5' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: showSaved ? 700 : 400, color: showSaved ? '#085041' : '#4a7c5f', textAlign: 'left', marginBottom: '2px', border: 'none', borderLeft: showSaved ? '3px solid #1D9E75' : '3px solid transparent' } as any}>
                <span style={{ fontSize: '14px', color: '#1D9E75' }}>🔖</span>
                <span style={{ flex: 1 }}>Saved Items</span>
                {savedItems.length > 0 && <span style={{ fontSize: '11px', background: showSaved ? '#1D9E75' : '#e8f5ee', color: showSaved ? 'white' : '#085041', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>{savedItems.length}</span>}
              </button>

              {recentSearches.length > 0 && (
                <>
                  <div style={{ borderTop: '1.5px solid #eef5f1', margin: '10px 4px' }} />
                  <div style={{ fontSize: '10px', color: '#aac8b8', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 12px', marginBottom: '6px' }}>RECENTLY VIEWED</div>
                  {recentSearches.map((s, i) => (
                    <button key={i} onClick={() => handleSearch(s)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '7px', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#888', textAlign: 'left', border: 'none', overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', color: '#ccc' }}>🕐</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, padding: '20px 28px', minWidth: 0 }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ width: '38px', height: '38px', border: '3px solid #e8f2ec', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 18px', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '15px', color: '#1D9E75', fontWeight: 600 }}>{loadingStep}</p>
              </div>
            )}

            {showSaved && (
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0a1a12', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Saved Items</h2>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{savedItems.length} item{savedItems.length !== 1 ? 's' : ''} saved across all your searches</p>
              </div>
            )}

            {results && !loading && !showSaved && (
              <>
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: '12px', background: tag.bg, color: tag.color, padding: '4px 14px', borderRadius: '20px', fontWeight: 600, border: `1.5px solid ${tag.border}` }}>{tag.label}</span>
                    ))}
                  </div>
                )}
                {results.summary && (
                  <div style={{ background: 'white', border: '1.5px solid #c5e8d4', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '14px' }}>
                    <div style={{ width: '4px', borderRadius: '2px', background: '#1D9E75', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#1D9E75', letterSpacing: '0.08em', marginBottom: '6px' }}>✦ AI SUMMARY</div>
                      <p style={{ fontSize: '14px', color: '#222', lineHeight: 1.7, margin: 0 }}>{results.summary}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            <div>{renderResults()}</div>
          </div>
        </div>
      )}

      {/* Floating Chat */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        {chatOpen && (
          <div style={{ position: 'absolute', bottom: '68px', right: 0, width: '340px', background: 'white', borderRadius: '18px', boxShadow: '0 12px 48px rgba(10,26,18,0.15)', border: '1.5px solid #d4ede2', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg,#1D9E75,#085041)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>✦</div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'white' }}>Study Assistant</p>
                  {currentTopic && <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>on: {currentTopic}</p>}
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ height: '300px', overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatMessages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: 0.5 }}>
                  <span style={{ fontSize: '30px' }}>💬</span>
                  <p style={{ fontSize: '13px', color: '#4a7c5f', textAlign: 'center', margin: 0 }}>
                    {currentTopic ? `Ask me anything about "${currentTopic}"` : 'Ask me anything about your studies'}
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '13px 13px 2px 13px' : '13px 13px 13px 2px', background: msg.role === 'user' ? '#1D9E75' : '#f7faf8', color: msg.role === 'user' ? 'white' : '#0a1a12', fontSize: '13px', lineHeight: 1.5, border: msg.role === 'assistant' ? '1.5px solid #e8f2ec' : 'none', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '9px 13px', borderRadius: '13px 13px 13px 2px', background: '#f7faf8', border: '1.5px solid #e8f2ec' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div style={{ borderTop: '1.5px solid #e8f2ec', padding: '12px', display: 'flex', gap: '8px' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask anything..."
                style={{ flex: 1, padding: '9px 13px', borderRadius: '9px', border: '1.5px solid #d4ede2', color: '#0a1a12', fontSize: '13px', outline: 'none' }} />
              <button onClick={sendChatMessage} disabled={chatLoading}
                style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '9px', fontSize: '14px', cursor: 'pointer', fontWeight: 700 }}>→</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(o => !o)}
          style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#085041)', border: 'none', cursor: 'pointer', boxShadow: '0 6px 24px rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', transition: 'transform 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
          {chatOpen ? '×' : '✦'}
        </button>
      </div>
    </main>
  );
}