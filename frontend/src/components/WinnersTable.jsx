import { t } from '../i18n';
import { CLUSTER_META, ALL_CLUSTERS } from '../constants';
import { fmtTime } from '../formatters';

function WinnerCell({ entry, color }) {
  if (!entry) return <td className="winner-cell empty">—</td>;
  return (
    <td className="winner-cell">
      <span className="winner-name">{entry.name}</span>
      <span className="winner-time" style={{ color }}>{fmtTime(entry.totalMovingTime)}</span>
    </td>
  );
}

export default function WinnersTable({ monthlyWinners }) {
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
                  <th key={c}>{CLUSTER_META[c].icon} {t.clusterNames[c] || c}</th>
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
