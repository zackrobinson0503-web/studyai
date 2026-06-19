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

const TAG: any = {
  videos: { bg: '#FAECE7', color: '#993C1D', label: 'YouTube' },
  pdfs: { bg: '#E1F5EE', color: '#085041', label: 'PDF' },
  quizlet: { bg: '#FAEEDA', color: '#633806', label: 'Quizlet' },
  problems: { bg: '#EEEDFE', color: '#3C3489', label: 'Problems' },
  reddit: { bg: '#FAECE7', color: '#993C1D', label: 'Reddit' },
  textbooks: { bg: '#E6F1FB', color: '#0C447C', label: 'Textbook' },
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('videos');
  const { data: session } = useSession();
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

  const ytBase = 'https://youtube.com/watch?v=';

  const renderResults = () => {
    if (!results) return null;
    if (activeTab === 'videos') {
      const videos = results.videos || [];
      return videos.map((v: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '12px', background: '#fff', border: '0.5px solid #e0dff8', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px' }}>
          <img src={v.snippet.thumbnails.medium.url} style={{ width: '88px', height: '58px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} alt="" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#26215C', marginBottom: '3px' }}>{v.snippet.title}</div>
            <div style={{ fontSize: '12px', color: '#7F77DD', marginBottom: '6px' }}>{v.snippet.channelTitle}</div>
            <a href={ytBase + v.id.videoId} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#534AB7' }}>Watch on YouTube</a>
          </div>
        </div>
      ));
    }
    const items = results[activeTab] || [];
    const tag = TAG[activeTab];
    return items.map((item: any, i: number) => (
      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#fff', border: '0.5px solid #e0dff8', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px', textDecoration: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#26215C', flex: 1, marginRight: '8px' }}>{item.title}</div>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: tag.bg, color: tag.color, fontWeight: 500, flexShrink: 0 }}>{tag.label}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#7F77DD', marginBottom: '4px' }}>{item.source}</div>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{item.snippet}</div>
      </a>
    ));
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid #e0dff8', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 500, color: '#3C3489' }}>
          <div style={{ width: '28px', height: '28px', background: '#534AB7', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px' }}>S</div>
          StudyAI
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {session ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '13px', color: '#534AB7' }}>{session.user?.name}</span>
    <button onClick={() => signOut()} style={{ fontSize: '13px', color: '#534AB7', padding: '5px 12px', border: '1px solid #534AB7', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}>Sign out</button>
  </div>
) : (
  <button onClick={() => signIn('google')} style={{ fontSize: '13px', color: '#534AB7', padding: '5px 12px', border: '1px solid #534AB7', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}>Sign in with Google</button>
)}
        </div>
      </nav>

      <div style={{ textAlign: 'center', padding: '36px 24px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 500, color: '#26215C', marginBottom: '6px' }}>Find study materials instantly</h1>
        <p style={{ fontSize: '14px', color: '#7F77DD', marginBottom: '20px' }}>AI-powered search across YouTube, PDFs, Quizlet, and more</p>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '560px', margin: '0 auto' }}>
          <input
            style={{ flex: 1, padding: '10px 14px', border: '0.5px solid #AFA9EC', borderRadius: '8px', fontSize: '14px', background: '#fff', color: '#26215C' }}
            placeholder="e.g. Organic Chemistry, Calc 2..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={{ padding: '10px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px 40px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #EEEDFE', borderTopColor: '#534AB7', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: '14px', color: '#534AB7', fontWeight: 500 }}>{loadingStep}</div>
          </div>
        )}

        {results && !loading && (
          <div>
            {results.summary && (
              <div style={{ background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', background: '#534AB7', borderRadius: '50%', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#3C3489', lineHeight: 1.55 }}>{results.summary}</div>
              </div>
            )}

            <div style={{ display: 'flex', borderBottom: '0.5px solid #e0dff8', marginBottom: '16px', background: '#fff', borderRadius: '10px 10px 0 0', padding: '0 8px', overflowX: 'auto' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 12px', fontSize: '13px', color: activeTab === tab.id ? '#534AB7' : '#7F77DD', cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #534AB7' : '2px solid transparent', fontWeight: activeTab === tab.id ? 500 : 400, whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {renderResults()}
          </div>
        )}
      </div>
    </main>
  );
}
