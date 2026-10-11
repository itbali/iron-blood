import type { StageId } from '@/core/types';

export interface StageConfig {
  id: StageId;
  name: string;
  subtitle: string;
  /** Mood palette consumed by the procedural stage renderer. */
  sky: [string, string];
  fog: string;
  accent: string;
  accent2: string;
  floor: [string, string];
  rain: boolean;
  embers: boolean;
  snow: boolean;
  musicVariant: 'industrial' | 'station' | 'temple';
}

export const STAGES: Record<StageId, StageConfig> = {
  industrial: {
    id: 'industrial',
    name: 'Abandoned Industrial District',
    subtitle: 'Sector 9 — Lower Foundry',
    sky: ['#06070a', '#1a1215'],
    fog: 'rgba(120, 30, 40, 0.18)',
    accent: '#ff2a3c',
    accent2: '#ff8c1a',
    floor: ['#1a1c22', '#07080a'],
    rain: true,
    embers: true,
    snow: false,
    musicVariant: 'industrial',
  },
  station: {
    id: 'station',
    name: 'Cyberpunk Underground Station',
    subtitle: 'Line 0 — Abandoned Platform',
    sky: ['#05060c', '#0d1030'],
    fog: 'rgba(40, 80, 160, 0.16)',
    accent: '#38d6ff',
    accent2: '#ff3fa7',
    floor: ['#141826', '#06070c'],
    rain: false,
    embers: false,
    snow: false,
    musicVariant: 'station',
  },
  temple: {
    id: 'temple',
    name: 'Ruined Temple',
    subtitle: 'The Hollow Sanctum',
    sky: ['#070508', '#201020'],
    fog: 'rgba(140, 60, 180, 0.14)',
    accent: '#b56bff',
    accent2: '#ffb347',
    floor: ['#1d1620', '#080508'],
    rain: false,
    embers: true,
    snow: true,
    musicVariant: 'temple',
  },
};

export const STAGE_ORDER: StageId[] = ['industrial', 'station', 'temple'];
