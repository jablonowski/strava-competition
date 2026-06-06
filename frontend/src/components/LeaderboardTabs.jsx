import { useState } from 'react';
import { t } from '../i18n';
import { CLUSTER_META, ALL_CLUSTERS, CURRENT_MONTH_LABEL } from '../constants';
import { fmtDistance, fmtTime } from '../formatters';

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

export default function LeaderboardTabs({ overallLeaderboard, categoryLeaderboards, embed = false }) {
  const [activeTab, setActiveTab] = useState('overall');

  const tabs = [
    { key: 'overall', label: t.tabOverall, icon: '🏆', color: '#f97316' },
    ...ALL_CLUSTERS.map(c => ({ key: c, label: t.clusterNames[c] || c, icon: CLUSTER_META[c].icon, color: CLUSTER_META[c].color })),
  ];

  const list = activeTab === 'overall'
    ? overallLeaderboard
    : (categoryLeaderboards[activeTab] || []);

  return (
    <section className={embed ? '' : 'card'} aria-labelledby="section-leaderboard">
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
