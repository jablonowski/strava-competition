import { t } from '../i18n';

export default function Header({ totalActivities, topCategory, topAthlete }) {
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
        {/* {totalActivities != null && (
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
        )} */}
      </div>
    </header>
  );
}
