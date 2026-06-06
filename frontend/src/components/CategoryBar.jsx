import { t } from '../i18n';
import { CLUSTER_META } from '../constants';

export default function CategoryBar({ name, count, total }) {
  const pct  = total > 0 ? (count / total) * 100 : 0;
  const meta = CLUSTER_META[name] || { icon: '🏅', color: '#6b7280' };
  return (
    <div className="category-row">
      <div className="category-header">
        <span className="category-icon" aria-hidden="true">{meta.icon}</span>
        <span className="category-name">{t.clusterNames[name] || name}</span>
        <span className="category-count">{count} {count === 1 ? t.activitySingular : t.activityPlural}</span>
        <span className="category-pct">{pct.toFixed(1)}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
      </div>
    </div>
  );
}
