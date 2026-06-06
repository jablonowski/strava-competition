// ─── Locale & translations (Polish) ───────────────────────────────────────
export const LOCALE = 'pl-PL';

export const t = {
  // ── Header ────────────────────────────────────────────────────────────
  appTitle:        'Finat - klub sportowy',
  appSubtitle:     'firmowa rywalizacja sportowa',
  pillActivities:  'Aktywności',
  pillTopCategory: 'Top kategoria',
  pillLeading:     'Lider',

  // ── Cluster display names (keys match CLUSTER_META) ───────────────────
  clusterNames: {
    'Cycling':           'Kolarstwo',
    'Running & Walking': 'Bieganie i chodzenie',
    'Swimming':          'Pływanie',
    'Gym & Fitness':     'Siłownia i fitness',
    'Racket Sports':     'Sporty rakietowe',
  },

  // ── Activity count (singular / plural) ───────────────────────────────
  activitySingular: 'aktywność',
  activityPlural:   'aktywności',

  // ── Leaderboard ───────────────────────────────────────────────────────
  sectionLeaderboards:  'Rankingi',
  leaderboardSubtitle:  (month) => `Rankingowane wg łącznego czasu · ${month}`,
  tabOverall:           'Ogólny',
  emptyCategory:        'Brak danych dla tej kategorii.',
  rankLabel:            (rank) => `Pozycja ${rank}`,

  // ── Monthly winners ───────────────────────────────────────────────────
  sectionWinners:     'Miesięczni zwycięzcy',
  winnersSubtitle:    'Tablica chwały — #1 sportowiec w kategorii wg łącznego czasu',
  winnersEmptyBefore: 'Brak zapisanych zwycięzców. Kliknij ',
  winnersCloseMonth:  'Zamknij miesiąc',
  winnersEmptyAfter:  ' na końcu każdego miesiąca, aby zapisać wyniki.',
  colMonth:           'Miesiąc',
  colOverall:         '🏆 Ogólny',

  // ── Category breakdown ────────────────────────────────────────────────
  sectionCategories:  'Najpopularniejsze kategorie',
  categoriesSubtitle: 'Łączna liczba aktywności w grupie',

  // ── Recent feed ───────────────────────────────────────────────────────
  sectionFeed:   'Ostatnie aktywności firmowe',
  feedSubtitle:  (n) => `Ostatnie ${n} prawidłowych aktywności`,
  feedEmpty:     'Brak aktywności.',
  untitled:      'Bez tytułu',

  // ── Error card ────────────────────────────────────────────────────────
  errorTitle: 'Nie można załadować dashboardu',
  errorHint:  'Upewnij się, że backend działa na porcie 4000 i dane uwierzytelniające są w pliku .env.',
};
