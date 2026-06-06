import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { t, LOCALE } from './i18n';

// ─── Visual metadata per cluster ──────────────────────────────────────────
const CLUSTER_META = {
  'Cycling':           { icon: '🚴', color: '#f97316' },
  'Running & Walking': { icon: '🏃', color: '#22c55e' },
  'Swimming':          { icon: '🏊', color: '#3b82f6' },
  'Gym & Fitness':     { icon: '💪', color: '#a855f7' },
};
const ALL_CLUSTERS = Object.keys(CLUSTER_META);

const CURRENT_MONTH_LABEL = new Date().toLocaleString(LOCALE, {
  month: 'long', year: 'numeric',
});

// ─── Formatters ────────────────────────────────────────────────────────────
function fmtDistance(metres) {
  if (!metres) return null;
  return (metres / 1000).toFixed(1) + ' km';
}

function fmtTime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Category progress bar ────────────────────────────────────────────────
function CategoryBar({ name, count, total }) {
  const pct  = total > 0 ? (count / total) * 100 : 0;
  const meta = CLUSTER_META[name] || { icon: '🏅', color: '#6b7280' };
  return (
    <div className="category-row">
      <div className="category-header">
        <span className="category-icon" aria-hidden="true">{meta.icon}</span>
        <span className="category-name">{name}</span>
        <span className="category-count">{count} {count === 1 ? t.activitySingular : t.activityPlural}</span>
        <span className="category-pct">{pct.toFixed(1)}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
      </div>
    </div>
  );
}

// ─── Leaderboard row — primary metric is time ────────────────────────────
function LeaderboardRow({ athlete, rank }) {
  const isTop = rank <= 3;
  const dist  = fmtDistance(athlete.totalDistance);
  return (
    <div className={`leaderboard-row${isTop ? ' top-three' : ''}`}>
      <span className={`rank rank-${rank}`} aria-label={t.rankLabel(rank)}>{rank}</span>
      <div className="athlete-info">
        <span className="athlete-name">{athlete.name}</span>
        <span className="athlete-sub">
          {athlete.activityCount} {athlete.activityCount === 1 ? t.activitySingular : t.activityPlural}
          {dist && <> · {dist}</>}
        </span>
      </div>
      <span className="athlete-time">{fmtTime(athlete.totalMovingTime)}</span>
    </div>
  );
}

// ─── Tabbed leaderboard ───────────────────────────────────────────────────
function LeaderboardTabs({ overallLeaderboard, categoryLeaderboards }) {
  const [activeTab, setActiveTab] = useState('overall');

  const tabs = [
    { key: 'overall', label: t.tabOverall, icon: '🏆', color: '#f97316' },
    ...ALL_CLUSTERS.map(c => ({ key: c, label: t.clusterNames[c] || c, icon: CLUSTER_META[c].icon, color: CLUSTER_META[c].color })),
  ];

  const list = activeTab === 'overall'
    ? overallLeaderboard
    : (categoryLeaderboards[activeTab] || []);

  return (
    <section className="card" aria-labelledby="section-leaderboard">
      <h2 className="section-title" id="section-leaderboard">{t.sectionLeaderboards}</h2>
      <p className="section-sub">{t.leaderboardSubtitle(CURRENT_MONTH_LABEL)}</p>

      <div className="tabs" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
            style={activeTab === tab.key ? { '--tab-color': tab.color } : {}}
            onClick={() => setActiveTab(tab.key)}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="leaderboard-list" role="tabpanel">
        {list.length === 0
          ? <p className="empty-state">{t.emptyCategory}</p>
          : list.slice(0, 15).map((athlete, i) => (
              <LeaderboardRow key={athlete.name} athlete={athlete} rank={i + 1} />
            ))
        }
      </div>
    </section>
  );
}

// ─── Monthly winners table ────────────────────────────────────────────────
function WinnerCell({ entry, color }) {
  if (!entry) return <td className="winner-cell empty">—</td>;
  return (
    <td className="winner-cell">
      <span className="winner-name">{entry.name}</span>
      <span className="winner-time" style={{ color }}>{fmtTime(entry.totalMovingTime)}</span>
    </td>
  );
}

function WinnersTable({ monthlyWinners }) {
  return (
    <section className="card" aria-labelledby="section-winners">
      <div>
        <h2 className="section-title" id="section-winners">{t.sectionWinners}</h2>
        <p className="section-sub">{t.winnersSubtitle}</p>
      </div>

      {monthlyWinners.length === 0 ? (
        <p className="empty-state" style={{ marginTop: '1.5rem' }}>
          {t.winnersEmptyBefore}<strong>{t.winnersCloseMonth}</strong>{t.winnersEmptyAfter}
        </p>
      ) : (
        <div className="winners-table-wrap">
          <table className="winners-table">
            <thead>
              <tr>
                <th className="col-month">{t.colMonth}</th>
                <th>{t.colOverall}</th>
                {ALL_CLUSTERS.map(c => (
                  <th key={c}>{CLUSTER_META[c].icon} {c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyWinners.map(row => (
                <tr key={row.month}>
                  <td className="month-cell">{row.label}</td>
                  <WinnerCell entry={row.overall} color="#f97316" />
                  {ALL_CLUSTERS.map(c => (
                    <WinnerCell key={c} entry={row[c]} color={CLUSTER_META[c].color} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Recent feed card ─────────────────────────────────────────────────────
function FeedCard({ activity }) {
  const meta = CLUSTER_META[activity.normalized_category] || { color: '#6b7280' };
  const name = `${activity.athlete?.firstname ?? ''} ${activity.athlete?.lastname ?? ''}`.trim();
  const dist = fmtDistance(activity.distance);
  return (
    <div className="feed-item">
      <span className="feed-dot" style={{ backgroundColor: meta.color }} aria-hidden="true" />
      <div className="feed-info">
        <span className="feed-title">{activity.name || t.untitled}</span>
        <span className="feed-athlete">{name}</span>
      </div>
      <div className="feed-right">
        <span className="feed-category" style={{ color: meta.color }}>{activity.normalized_category}</span>
        {dist && <span className="feed-distance">{dist}</span>}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton({ height = 16, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />;
}

function LoadingSkeleton() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <div className="card skeleton-card">
          <Skeleton height={18} width="35%" />
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[80, 60, 40, 25].map(w => (
              <div key={w}>
                <Skeleton height={12} width={`${w}%`} />
                <div style={{ marginTop: '0.5rem' }}><Skeleton height={6} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card skeleton-card">
          <Skeleton height={18} width="30%" />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={34} width="120px" />)}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={42} />)}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Shared header ────────────────────────────────────────────────────────
function Header({ totalActivities, topCategory, topAthlete }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon" aria-hidden="true">⚡</span>
          <div>
            <h1>{t.appTitle}</h1>
            <p className="logo-sub">{t.appSubtitle}</p>
          </div>
        </div>
        {totalActivities != null && (
          <div className="stats-pills">
            <div className="pill">
              <span className="pill-value">{totalActivities}</span>
              <span className="pill-label">{t.pillActivities}</span>
            </div>
            <div className="pill pill-accent">
              <span className="pill-value">{topCategory}</span>
              <span className="pill-label">{t.pillTopCategory}</span>
            </div>
            {topAthlete && (
              <div className="pill pill-gold">
                <span className="pill-value">{topAthlete}</span>
                <span className="pill-label">{t.pillLeading}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('http://localhost:4000/api/dashboard-data')
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
