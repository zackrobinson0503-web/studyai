'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

const TABS = [
  { id: 'videos', label: 'Videos' },
  { id: 'pdfs', label: 'PDFs' },
  { id: 'quizlet', label: 'Quizlet' },
  { id: 'problems', label: 'Problems' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'textbooks', label: 'Textbooks' },
];

export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('videos');
  const [loadingStep, setLoadingStep] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setActiveTab('videos');
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
    setLoading(false);
  }

  const ytBase = 'https://www.youtube.com/watch?v=';

  const renderResults = () => {
    if (!results) return null;
    if (activeTab === 'videos') {
      const videos = results.videos || [];
      return videos.map((v: any, i: number) => (
        <a key={i} href={ytBase + v.id.videoId} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
            <img src={v.snippet.thumbnails.medium.url} style={{ width: '88px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{v.snippet.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>{v.snippet.channelTitle}</p>
              <span style={{ fontSize: '11px', background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: '4px' }}>YouTube</span>
            </div>
          </div>
        </a>
      ));
    }
    const items = results[activeTab] || [];
    return items.map((item: any, i: number) => (
      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{item.title}</p>
            <span style={{ fontSize: '11px', background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', flexShrink: 0 }}>{item.source}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{item.snippet}</p>
        </div>
      </a>
    ));
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-background-secondary)', fontFamily: 'var(--font-sans)' }}>

      {/* Navbar */}
      <nav style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px' }}>✦</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>StudyAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {session ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{session.user?.name}</span>
              <button onClick={() => signOut()} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Sign out</button>
              <button style={{ fontSize: '13px', background: '#1D9E75', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>✦ Go Premium</button>
            </>
          ) : (
            <>
              <button onClick={() => signIn('google')} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Sign in</button>
              <button style={{ fontSize: '13px', background: '#1D9E75', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>✦ Go Premium</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '64px 24px 48px', textAlign: 'center', background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <p style={{ fontSize: '12px', color: '#1D9E75', fontWeight: 500, letterSpacing: '0.05em', margin: '0 0 12px', textTransform: 'uppercase' }}>Powered by AI</p>
        <h1 style={{ fontSize: '36px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 10px', lineHeight: 1.2 }}>The smartest way to<br />find study materials</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 32px' }}>YouTube · PDFs · Quizlet · Reddit · Textbooks — all in one search</p>
        <div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative', display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-text-secondary)' }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Try 'Organic Chemistry Chapter 5'..."
              style={{ width: '100%', padding: '14px 18px 14px 42px', borderRadius: '12px', border: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={handleSearch} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E1F5EE', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '14px', color: '#1D9E75', fontWeight: 500 }}>{loadingStep}</p>
          </div>
        )}

        {results && !loading && (
          <>
            {results.summary && (
              <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid #9FE1CB', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', background: '#1D9E75', borderRadius: '50%', marginTop: '6px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>{results.summary}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', border: activeTab === tab.id ? 'none' : '0.5px solid var(--color-border-tertiary)', background: activeTab === tab.id ? '#1D9E75' : 'transparent', color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: activeTab === tab.id ? 500 : 400 }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div>{renderResults()}</div>
          </>
        )}
      </div>
    </main>
  );
}