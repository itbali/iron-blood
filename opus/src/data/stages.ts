import { IndustrialStage } from '../render/stages/IndustrialStage';
import type { Stage } from '../render/stages/StageBase';
import { SubwayStage } from '../render/stages/SubwayStage';
import { TempleStage } from '../render/stages/TempleStage';

export interface StageDef {
  id: string;
  name: string;
  subtitle: string;
  /** Colour used for menu thumbnails and the loading screen. */
  accent: string;
  create: () => Stage;
}

export const STAGES: readonly StageDef[] = [
  { id: 'industrial', name: 'Abandoned Industrial District', subtitle: 'Sector 9 · Forge Row', accent: '#d51f2b', create: () => new IndustrialStage() },
  { id: 'subway', name: 'Underground Station', subtitle: 'Line Zero · Platform 4', accent: '#29d3ff', create: () => new SubwayStage() },
  { id: 'temple', name: 'Ruined Temple', subtitle: 'Sanctum of the Hollow Crown', accent: '#ff7a1a', create: () => new TempleStage() },
];

export const getStage = (id: string): StageDef => {
  const s = STAGES.find((st) => st.id === id);
  if (!s) {
    console.error(`Unknown stage "${id}", falling back to industrial`);
    return STAGES[0];
  }
  return s;
};
