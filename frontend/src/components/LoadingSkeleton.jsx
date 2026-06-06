import Header from './Header';

function Skeleton({ height = 16, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />;
}

export default function LoadingSkeleton() {
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
