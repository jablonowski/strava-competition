import { t } from '../i18n';
import { CLUSTER_META } from '../constants';
import { fmtDistance } from '../formatters';

export default function FeedCard({ activity }) {
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
        <span className="feed-category" style={{ color: meta.color }}>{t.clusterNames[activity.normalized_category] || activity.normalized_category}</span>
        {dist && <span className="feed-distance">{dist}</span>}
      </div>
    </div>
  );
}
