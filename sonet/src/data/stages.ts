export type StageId = 'industrial' | 'station' | 'temple';

export interface StageDef {
  id: StageId;
  name: string;
  blurb: string;
  musicRoot: number;
  accent: string;
  mood: string;
}

export const STAGES: StageDef[] = [
  {
    id: 'industrial', name: 'Abandoned Industrial District', blurb: 'Rain-lashed steel towers, dead pipelines and a city that stopped answering.',
    musicRoot: 38, accent: '#d51f2b', mood: 'Oppressive · Neon rain',
  },
  {
    id: 'station', name: 'Cyberpunk Underground Station', blurb: 'A condemned metro platform. Trains still run, but nobody is aboard.',
    musicRoot: 45, accent: '#35e0ff', mood: 'Cold · Fluorescent',
  },
  {
    id: 'temple', name: 'Ruined Temple', blurb: 'A shattered sanctum under a bleeding moon. The braziers never went out.',
    musicRoot: 42, accent: '#ff8a2a', mood: 'Mythic · Ember-lit',
  },
];

export function getStage(id: StageId): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
