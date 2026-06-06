import { LOCALE } from './i18n';

export const CLUSTER_META = {
  'Cycling':           { icon: '🚴', color: '#f97316' },
  'Running & Walking': { icon: '🏃', color: '#22c55e' },
  'Swimming':          { icon: '🏊', color: '#3b82f6' },
  'Gym & Fitness':     { icon: '💪', color: '#a855f7' },
  'Racket Sports':     { icon: '🎾', color: '#ec4899' },
};

export const ALL_CLUSTERS = Object.keys(CLUSTER_META);

export const CURRENT_MONTH_LABEL = new Date().toLocaleString(LOCALE, {
  month: 'long', year: 'numeric',
});
