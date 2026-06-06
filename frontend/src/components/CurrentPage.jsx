import { useState, useEffect, useCallback } from 'react';
import LeaderboardTabs from './LeaderboardTabs';

export default function CurrentPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(() => {
    fetch('/api/dashboard-data')
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json);         setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return null;
  if (error)   return <p style={{ padding: '1rem', color: '#ef4444' }}>{error}</p>;

  const { overallLeaderboard, categoryLeaderboards } = data;

  return (
    <LeaderboardTabs
      overallLeaderboard={overallLeaderboard}
      categoryLeaderboards={categoryLeaderboards}
      embed
    />
  );
}
