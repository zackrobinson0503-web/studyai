'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

const TABS = [
  { id: 'videos', label: 'Videos' },
  { id: 'pdfs', label: 'PDFs' },
  { id: 'quizlet', label: 'Quizlet' },
  { id: 'problems', label: 'Problems' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'tutor', label: '✦ AI Tutor' },
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
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    tutorBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setActiveTab('videos');
    setTutorMessages([]);
    setTutorInitialized(false);
    setLoadingStep('Asking AI to understand your class...');
    await new Promise(r => setTimeout(r, 800));
    setLoadingStep('Searching YouTube, PDFs, Quizlet and more...');
    await new Promise(r => setTimeout(r, 800));
    setLoadingStep('Ranking the best results for you...');
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ className: query }),
    });
    const data = await res.json();
    setResults(data);
    setCurrentTopic(query);
    setLoading(false);
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

  const renderResults = () => {
    if (!results) return null;

    if (activeTab === 'tutor') {
      return (
        <div style={{ background: 'white', border: '0.5px solid #D3F0E6', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1D9E75, #085041)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'white' }}>AI Tutor</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>Topic: {currentTopic}</p>
            </div>
          </div>

          <div style={{ height: '520px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tutorMessages.length === 0 && !tutorLoading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.6 }}>
                <span style={{ fontSize: '32px' }}>📚</span>
                <p style={{ fontSize: '13px', color: '#0F6E56', textAlign: 'center', margin: 0 }}>Search for a topic to start your tutoring session</p>
              </div>
            )}
            {tutorMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? '#1D9E75' : '#F4FAF7',
                  color: msg.role === 'user' ? 'white' : '#085041',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '0.5px solid #D3F0E6' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {tutorLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#F4FAF7', border: '0.5px solid #D3F0E6' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={tutorBottomRef} />
          </div>

          <div style={{ borderTop: '0.5px solid #D3F0E6', padding: '12px', display: 'flex', gap: '8px' }}>
            <input
              value={tutorInput}
              onChange={e => setTutorInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendTutorMessage()}
              placeholder={currentTopic ? 'Ask your tutor anything...' : 'Search for a topic first'}
              disabled={!currentTopic}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #D3F0E6', background: currentTopic ? 'white' : '#F9FFFE', color: '#085041', fontSize: '13px', outline: 'none' }}
            />
            <button
              onClick={sendTutorMessage}
              disabled={!currentTopic || tutorLoading}
              style={{ background: currentTopic ? '#1D9E75' : '#D3F0E6', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', cursor: currentTopic ? 'pointer' : 'not-allowed', fontWeight: 500 }}
            >
              Send
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === 'videos') {
      const videos = results.videos || [];
      return videos.map((v: any, i: number) => (
        <a key={i} href={ytBase + v.id.videoId} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', border: '0.5px solid #D3F0E6', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
            <img src={v.snippet.thumbnails.medium.url} style={{ width: '88px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#085041', margin: '0 0 4px' }}>{v.snippet.title}</p>
              <p style={{ fontSize: '12px', color: '#0F6E56', margin: '0 0 4px' }}>{v.snippet.channelTitle}</p>
              <span style={{ fontSize: '11px', background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: '4px' }}>YouTube</span>
            </div>
          </div>
        </a>
      ));
    }

    const items = results[activeTab] || [];
    return items.map((item: any, i: number) => (
      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'white', border: '0.5px solid #D3F0E6', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#085041', margin: 0 }}>{item.title}</p>
            <span style={{ fontSize: '11px', background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', flexShrink: 0 }}>{item.source}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#0F6E56', margin: 0, lineHeight: 1.5 }}>{item.snippet}</p>
        </div>
      </a>
    ));
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #c8ead9 0%, #e8f5f0 25%, #f4faf7 50%, #ffffff 75%)', fontFamily: 'var(--font-sans)' }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      `}</style>

      {/* Navbar */}
      <nav style={{ background: 'rgba(200, 234, 217, 0.7)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #9FE1CB', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px' }}>✦</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#085041' }}>StudyAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {session ? (
            <>
              <span style={{ fontSize: '13px', color: '#0F6E56' }}>{session.user?.name}</span>
              <button onClick={() => signOut()} style={{ fontSize: '13px', color: '#0F6E56', background: 'transparent', border: '1.5px solid #1D9E75', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Sign out</button>
              <button style={{ fontSize: '13px', background: '#1D9E75', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>✦ Go Premium</button>
            </>
          ) : (
            <>
              <button onClick={() => signIn('google')} style={{ fontSize: '13px', color: '#0F6E56', background: 'transparent', border: '1.5px solid #1D9E75', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Sign in</button>
              <button style={{ fontSize: '13px', background: '#1D9E75', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>✦ Go Premium</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '72px 24px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20px', left: '5%', width: '100px', height: '100px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: '60px', left: '18%', width: '50px', height: '50px', borderRadius: '50%', background: '#5DCAA5', opacity: 0.2 }} />
        <div style={{ position: 'absolute', top: '10px', right: '8%', width: '80px', height: '80px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: '30px', right: '22%', width: '40px', height: '40px', borderRadius: '50%', background: '#5DCAA5', opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '40px', left: '8%', width: '70px', height: '70px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.25 }} />
        <div style={{ position: 'absolute', bottom: '20px', left: '30%', width: '30px', height: '30px', borderRadius: '50%', background: '#1D9E75', opacity: 0.1 }} />
        <div style={{ position: 'absolute', bottom: '50px', right: '10%', width: '60px', height: '60px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.2 }} />
        <div style={{ position: 'absolute', bottom: '30px', right: '28%', width: '20px', height: '20px', borderRadius: '50%', background: '#5DCAA5', opacity: 0.2 }} />
        <div style={{ position: 'absolute', top: '45%', left: '3%', width: '35px', height: '35px', borderRadius: '50%', background: '#5DCAA5', opacity: 0.15 }} />
        <div style={{ position: 'absolute', top: '40%', right: '3%', width: '45px', height: '45px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.2 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '12px', color: '#1D9E75', fontWeight: 500, letterSpacing: '0.08em', margin: '0 0 14px', textTransform: 'uppercase' }}>✦ Powered by AI</p>
          <h1 style={{ fontSize: '42px', fontWeight: 500, color: '#085041', margin: '0 0 12px', lineHeight: 1.2 }}>The smartest way to<br />find study materials</h1>
          <p style={{ fontSize: '15px', color: '#0F6E56', margin: '0 0 40px', opacity: 0.8 }}>YouTube · PDFs · Quizlet · Reddit · Textbooks — all in one search</p>
          <div style={{ maxWidth: '580px', margin: '0 auto', display: 'flex', gap: '10px', background: 'white', padding: '8px', borderRadius: '16px', boxShadow: '0 4px 32px rgba(29,158,117,0.15)', border: '1px solid #9FE1CB' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Try 'Organic Chemistry Chapter 5'..."
                style={{ width: '100%', padding: '14px 18px 14px 44px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#085041', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <button onClick={handleSearch} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {loading ? 'Searching...' : 'Search →'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '60px', right: '-30px', width: '60px', height: '60px', borderRadius: '50%', background: '#E1F5EE', opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '200px', left: '-30px', width: '45px', height: '45px', borderRadius: '50%', background: '#9FE1CB', opacity: 0.2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '400px', right: '-20px', width: '35px', height: '35px', borderRadius: '50%', background: '#5DCAA5', opacity: 0.15, pointerEvents: 'none' }} />

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', color: '#1D9E75', fontWeight: 500 }}>{loadingStep}</p>
          </div>
        )}

        {results && !loading && (
          <>
            {results.summary && (
              <div style={{ background: 'white', border: '0.5px solid #9FE1CB', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', background: '#1D9E75', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#085041', lineHeight: 1.6, margin: 0 }}>{results.summary}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'tutor') initializeTutor();
                  }}
                  style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: activeTab === tab.id ? 'none' : '0.5px solid #9FE1CB', background: activeTab === tab.id ? '#1D9E75' : 'transparent', color: activeTab === tab.id ? 'white' : '#0F6E56', cursor: 'pointer', fontWeight: activeTab === tab.id ? 500 : 400 }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div>{renderResults()}</div>
          </>
        )}
      </div>

      {/* Floating Chat Bubble */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        {chatOpen && (
          <div style={{ position: 'absolute', bottom: '64px', right: 0, width: '320px', background: 'white', borderRadius: '16px', boxShadow: '0 8px 40px rgba(8,80,65,0.18)', border: '0.5px solid #9FE1CB', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #1D9E75, #085041)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'white' }}>Study Assistant</p>
                  {currentTopic && <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>on: {currentTopic}</p>}
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ height: '280px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatMessages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6 }}>
                  <span style={{ fontSize: '28px' }}>💬</span>
                  <p style={{ fontSize: '12px', color: '#0F6E56', textAlign: 'center', margin: 0 }}>
                    {currentTopic ? `Ask me anything about "${currentTopic}"` : 'Ask me anything about your studies'}
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? '#1D9E75' : '#F4FAF7',
                    color: msg.role === 'user' ? 'white' : '#085041',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    border: msg.role === 'assistant' ? '0.5px solid #D3F0E6' : 'none',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '8px 12px', borderRadius: '12px 12px 12px 2px', background: '#F4FAF7', border: '0.5px solid #D3F0E6' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div style={{ borderTop: '0.5px solid #D3F0E6', padding: '10px', display: 'flex', gap: '6px' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Ask anything..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '0.5px solid #D3F0E6', color: '#085041', fontSize: '12px', outline: 'none' }}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading}
                style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
              >
                →
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setChatOpen(o => !o)}
          style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #085041)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', transition: 'transform 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {chatOpen ? '×' : '✦'}
        </button>
      </div>

    </main>
  );
}