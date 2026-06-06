import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { t } from './i18n';
import Header from './components/Header';
import CategoryBar from './components/CategoryBar';
import LeaderboardTabs from './components/LeaderboardTabs';
import WinnersTable from './components/WinnersTable';
import FeedCard from './components/FeedCard';
import LoadingSkeleton from './components/LoadingSkeleton';

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/dashboard-data')
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json);         setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="app">
        <Header />
        <main className="main">
          <div className="card error-card">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h2>{t.errorTitle}</h2>
            <p>{error}</p>
            <p className="error-hint">{t.errorHint}</p>
          </div>
        </main>
      </div>
    );
  }

  const { categoryCounts, overallLeaderboard, categoryLeaderboards, monthlyWinners, recentActivities } = data;
  const totalActivities  = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const topCategory      = sortedCategories[0]?.[0] ?? '—';

  return (
    <div className="app">
      <Header
        totalActivities={totalActivities}
        topCategory={topCategory}
        topAthlete={overallLeaderboard[0]?.name}
      />
      <main className="main">

        {/* ── Category breakdown ── */}
        <section className="card" aria-labelledby="section-categories">
          <h2 className="section-title" id="section-categories">{t.sectionCategories}</h2>
          <p className="section-sub">{t.categoriesSubtitle}</p>
          <div className="categories-list">
            {sortedCategories.map(([name, count]) => (
              <CategoryBar key={name} name={name} count={count} total={totalActivities} />
            ))}
          </div>
        </section>

        {/* ── Tabbed leaderboards ── */}
        <LeaderboardTabs
          overallLeaderboard={overallLeaderboard}
          categoryLeaderboards={categoryLeaderboards}
        />

        {/* ── Monthly winners ── */}
        <WinnersTable
          monthlyWinners={monthlyWinners}
        />

        {/* ── Recent feed ── */}
        <section className="card" aria-labelledby="section-feed">
          <h2 className="section-title" id="section-feed">{t.sectionFeed}</h2>
          <p className="section-sub">{t.feedSubtitle(Math.min(recentActivities.length, 20))}</p>
          <div className="feed-list">
            {recentActivities.length === 0 && <p className="empty-state">{t.feedEmpty}</p>}
            {recentActivities.slice(0, 20).map((act, i) => (
              <FeedCard key={i} activity={act} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
