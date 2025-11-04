export interface CalendarContextInfo {
  value: string;
  label: string;
  icon: any; // require() image source
}

export const CALENDAR_CONTEXTS: CalendarContextInfo[] = [
  {
    value: 'declaration_anomalie',
    label: "Déclaration d'anomalies",
    icon: require('../assets/icons/declaration_anomalie.png'),
  },
  {
    value: 'action_corrective',
    label: 'Actions correctives',
    icon: require('../assets/icons/action_corrective.png'),
  },
  {
    value: 'audit_zone',
    label: 'Audit de zone',
    icon: require('../assets/icons/audit_zone.png'),
  },
  {
    value: 'prelevement_echantillon',
    label: "Prélèvement d'échantillons",
    icon: require('../assets/icons/prelevement_echantillon.png'),
  },
  {
    value: 'inventaire_article',
    label: 'Inventaire / Article',
    icon: require('../assets/icons/inventaire_article.png'),
  },
];

export const CALENDAR_DATE_PLACEHOLDER = 'YYYY-MM-DD';
export const CALENDAR_TIME_PLACEHOLDER = 'HH:MM or HH:MM:SS';


