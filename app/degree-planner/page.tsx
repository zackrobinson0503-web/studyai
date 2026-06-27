'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Specialization = { id: string; name: string; description: string };
type Course = { code: string; name: string; credits: number };
type Year = { year: number; label: string; courses: Course[] };
type ElectiveCategory = { category: string; courses: Course[] };
type Topic = string;
type Unit = { unit: number; title: string; weeks: string; topics: Topic[] };

export default function DegreePlanner() {
  const { data: session } = useSession();
  const router = useRouter();

  const [majorInput, setMajorInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<Specialization | null>(null);

  const [years, setYears] = useState<Year[]>([]);
  const [electives, setElectives] = useState<ElectiveCategory[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [courseDuration, setCourseDuration] = useState('');
  const [loadingCourse, setLoadingCourse] = useState(false);

  async function searchMajor() {
    if (!majorInput.trim()) return;
    setLoading(true);
    setSpecializations([]);
    setSelectedSpec(null);
    setYears([]);
    setElectives([]);
    setSelectedCourse(null);
    setUnits([]);
    setLoadingStep('Finding specializations...');
    const res = await fetch('/api/degree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'specializations', major: majorInput }),
    });
    const data = await res.json();
    setSpecializations(data.specializations || []);
    setLoading(false);
  }

  async function selectSpecialization(spec: Specialization) {
    setSelectedSpec(spec);
    setYears([]);
    setElectives([]);
    setSelectedCourse(null);
    setUnits([]);
    setLoading(true);
    setLoadingStep(`Loading ${spec.name} courses...`);
    const res = await fetch('/api/degree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'courses', specialization: spec.name }),
    });
    const data = await res.json();
    setYears(data.years || []);
    setElectives(data.electives || []);
    setTotalCredits(data.totalCredits || 120);
    setLoading(false);
  }

  async function selectCourse(course: Course) {
    setSelectedCourse(course);
    setUnits([]);
    setLoadingCourse(true);
    const res = await fetch('/api/degree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'topics', course: course.name }),
    });
    const data = await res.json();
    setUnits(data.units || []);
    setCourseDuration(data.duration || '16 weeks');
    setLoadingCourse(false);
  }

  function searchTopic(topic: string) {
    router.push(`/?q=${encodeURIComponent(topic)}`);
  }

  const yearColors = ['#1D9E75', '#7c3aed', '#ea6c00', '#2a7cd4'];

  return (
    <main style={{ minHeight: '100vh', background: '#f5f8f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav style={{ background: 'white', borderBottom: '2px solid #f0f7f3', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '14px', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'white', fontWeight: 700 }}>✦</div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0a1a12', letterSpacing: '-0.4px' }}>Study<span style={{ color: '#1D9E75' }}>AI</span></span>
        </a>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ fontSize: '13px', color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>← Back to Search</a>
        {session ? (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#085041)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: 800 }}>
            {session.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <button onClick={() => signIn('google')} style={{ fontSize: '12px', color: '#1D9E75', background: 'transparent', border: '1.5px solid #1D9E75', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
        )}
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e8f5ee', border: '1.5px solid #c5e8d4', borderRadius: '20px', padding: '4px 14px', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: 700, letterSpacing: '0.06em' }}>🎓 DEGREE PLANNER</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0a1a12', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Plan your degree,<br /><span style={{ color: '#1D9E75' }}>find every resource.</span></h1>
          <p style={{ fontSize: '15px', color: '#4a7c5f', margin: 0 }}>Search your major to get your full course roadmap, semester breakdowns, and study materials for every topic.</p>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '36px' }}>
          <div style={{ flex: 1, background: 'white', border: '1.5px solid #c5e8d4', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🎓</span>
            <input
              value={majorInput}
              onChange={e => setMajorInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMajor()}
              placeholder="Enter your major (e.g. Engineering, Computer Science, Business...)"
              style={{ flex: 1, border: 'none', background: 'transparent', color: '#0a1a12', fontSize: '15px', outline: 'none' }}
            />
          </div>
          <button onClick={searchMajor} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Loading...' : 'Plan My Degree →'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e8f2ec', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '15px', color: '#1D9E75', fontWeight: 600 }}>{loadingStep}</p>
          </div>
        )}

        {/* Specializations tree */}
        {!loading && specializations.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'inline-block', background: '#085041', color: 'white', borderRadius: '12px', padding: '12px 28px', fontSize: '15px', fontWeight: 700 }}>{majorInput}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '2px', height: '24px', background: '#c5e8d4' }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: 0, height: '2px', background: '#c5e8d4', width: `${Math.min(specializations.length * 16, 90)}%` }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
              {specializations.map((spec, i) => (
                <div key={spec.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '2px', height: '22px', background: '#c5e8d4' }} />
                  <button
                    onClick={() => selectSpecialization(spec)}
                    style={{
                      padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', minWidth: '120px', maxWidth: '160px',
                      background: selectedSpec?.id === spec.id ? '#1D9E75' : 'white',
                      color: selectedSpec?.id === spec.id ? 'white' : '#0a1a12',
                      border: selectedSpec?.id === spec.id ? '1.5px solid #1D9E75' : '1.5px solid #c5e8d4',
                    }}
                  >
                    {spec.name}
                    <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '3px', opacity: 0.8 }}>{spec.description}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course progression */}
        {!loading && years.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0a1a12', margin: 0 }}>{selectedSpec?.name} — Course Progression</h2>
              <span style={{ fontSize: '12px', background: '#e8f5ee', color: '#085041', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid #c5e8d4' }}>{totalCredits} credit hours</span>
            </div>

            {years.map((year, yi) => (
              <div key={year.year} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: yearColors[yi] || '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: 700 }}>{year.year}</div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0a1a12' }}>Year {year.year} — {year.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingLeft: '38px' }}>
                  {year.courses.map((course, ci) => (
                    <button
                      key={ci}
                      onClick={() => selectCourse(course)}
                      style={{
                        background: selectedCourse?.code === course.code ? '#1D9E75' : 'white',
                        color: selectedCourse?.code === course.code ? 'white' : '#0a1a12',
                        border: selectedCourse?.code === course.code ? '1.5px solid #1D9E75' : '1.5px solid #e0ede6',
                        borderRadius: '10px', padding: '10px 14px', fontSize: '13px', cursor: 'pointer', textAlign: 'left', minWidth: '150px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: selectedCourse?.code === course.code ? 'rgba(255,255,255,0.8)' : '#1D9E75', fontWeight: 700, marginBottom: '3px' }}>{course.code}</div>
                      <div style={{ fontWeight: 600 }}>{course.name}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{course.credits} credits</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Electives */}
            {electives.length > 0 && (
              <div style={{ marginTop: '32px', borderTop: '1.5px solid #e8f2ec', paddingTop: '28px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0a1a12', margin: '0 0 6px' }}>Potential Classes You May Encounter</h3>
                <p style={{ fontSize: '13px', color: '#4a7c5f', margin: '0 0 20px' }}>Common electives and additional courses that appear in this major — varies by school and track.</p>
                {electives.map((cat, ci) => (
                  <div key={ci} style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D9E75', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{cat.category}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {cat.courses.map((course, cj) => (
                        <button
                          key={cj}
                          onClick={() => selectCourse(course)}
                          style={{
                            background: selectedCourse?.code === course.code ? '#1D9E75' : 'white',
                            color: selectedCourse?.code === course.code ? 'white' : '#0a1a12',
                            border: selectedCourse?.code === course.code ? '1.5px solid #1D9E75' : '1.5px solid #e0ede6',
                            borderRadius: '10px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{ fontSize: '10px', color: selectedCourse?.code === course.code ? 'rgba(255,255,255,0.8)' : '#1D9E75', fontWeight: 700, marginBottom: '2px' }}>{course.code}</div>
                          <div style={{ fontWeight: 600 }}>{course.name}</div>
                          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{course.credits} credits</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Course topic breakdown */}
        {selectedCourse && (
          <div style={{ background: 'white', border: '1.5px solid #c5e8d4', borderRadius: '16px', overflow: 'hidden', marginBottom: '36px' }}>
            <div style={{ background: 'linear-gradient(135deg,#1D9E75,#085041)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>{selectedCourse.code} · {selectedCourse.credits} credits</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'white' }}>{selectedCourse.name}</div>
                {courseDuration && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>{courseDuration}</div>}
              </div>
              <button onClick={() => { setSelectedCourse(null); setUnits([]); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>×</button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              {loadingCourse && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: '32px', height: '32px', border: '3px solid #e8f2ec', borderTop: '3px solid #1D9E75', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '14px', color: '#1D9E75' }}>Building semester breakdown...</p>
                </div>
              )}

              {!loadingCourse && units.length > 0 && (
                <div>
                  <p style={{ fontSize: '13px', color: '#4a7c5f', margin: '0 0 20px' }}>Click any topic to search StudyAI for the best study materials.</p>
                  {units.map((unit, ui) => (
                    <div key={ui} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: ui < units.length - 1 ? '1px solid #e8f2ec' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#1D9E75', flexShrink: 0 }}>{unit.unit}</div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a1a12' }}>{unit.title}</div>
                          <div style={{ fontSize: '11px', color: '#4a7c5f' }}>{unit.weeks}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '34px' }}>
                        {unit.topics.map((topic, ti) => (
                          <button
                            key={ti}
                            onClick={() => searchTopic(`${selectedCourse.name} ${topic}`)}
                            style={{ background: '#f5f8f6', border: '1.5px solid #e0ede6', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', color: '#0a1a12', cursor: 'pointer', fontWeight: 500 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8f5ee'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1D9E75'; (e.currentTarget as HTMLButtonElement).style.color = '#085041'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f8f6'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e0ede6'; (e.currentTarget as HTMLButtonElement).style.color = '#0a1a12'; }}
                          >
                            {topic} →
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}