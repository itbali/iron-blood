/** Imperative HUD updater. React renders the markup once; during a fight only this class touches the DOM. */

export interface HudBarData {
  name: string;
  hp: number;
  maxHp: number;
  meter: number;
  wins: number;
  superReady: boolean;
}

export interface HudData {
  p1: HudBarData;
  p2: HudBarData;
  timer: number | null;
  roundLabel: string;
  roundsToWin: number;
  bossPhase2: boolean;
  infiniteTimer: boolean;
}

type Q = Record<string, HTMLElement | null>;

export interface BannerOpts {
  sub?: string;
  kind?: 'round' | 'fight' | 'ko' | 'win' | 'perfect' | 'phase' | 'info';
  duration?: number;
}

export class HudController {
  private root: HTMLElement | null = null;
  private q: Q = {};
  private trail = [1, 1];
  private cache = new Map<string, string>();
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private comboTimers: (ReturnType<typeof setTimeout> | null)[] = [null, null];
  private subTimer: ReturnType<typeof setTimeout> | null = null;

  bind(root: HTMLElement | null): void {
    this.root = root;
    this.q = {};
    this.cache.clear();
    this.trail = [1, 1];
    if (!root) return;
    const names = [
      'name1', 'name2', 'hp1', 'hp2', 'trail1', 'trail2', 'meter1', 'meter2', 'timer', 'round', 'pips1', 'pips2',
      'banner', 'bannerMain', 'bannerSub', 'combo1', 'combo2', 'super1', 'super2', 'subtitle', 'subName', 'subText',
      'finisher', 'finisherCmds', 'skipHint', 'phase', 'debug', 'hpnum1', 'hpnum2', 'skipBtn',
    ];
    for (const n of names) this.q[n] = root.querySelector<HTMLElement>(`[data-hud="${n}"]`);
  }

  private setText(key: string, value: string): void {
    const el = this.q[key];
    if (!el) return;
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    el.textContent = value;
  }

  private setScale(key: string, ratio: number): void {
    const el = this.q[key];
    if (!el) return;
    const v = Math.max(0, Math.min(1, ratio)).toFixed(4);
    if (this.cache.get(key) === v) return;
    this.cache.set(key, v);
    el.style.transform = `scaleX(${v})`;
  }

  private setClass(key: string, cls: string, on: boolean): void {
    const el = this.q[key];
    if (!el) return;
    const k = `${key}.${cls}`;
    const v = on ? '1' : '0';
    if (this.cache.get(k) === v) return;
    this.cache.set(k, v);
    el.classList.toggle(cls, on);
  }

  update(d: HudData): void {
    if (!this.root) return;
    const bars: [HudBarData, number][] = [[d.p1, 1], [d.p2, 2]];
    for (const [b, n] of bars) {
      const ratio = b.hp / b.maxHp;
      this.setText(`name${n}`, b.name.toUpperCase());
      this.setScale(`hp${n}`, ratio);
      const i = n - 1;
      if (this.trail[i] > ratio) this.trail[i] = Math.max(ratio, this.trail[i] - 0.006);
      else this.trail[i] = ratio;
      this.setScale(`trail${n}`, this.trail[i]);
      this.setScale(`meter${n}`, b.meter / 100);
      this.setText(`hpnum${n}`, String(Math.ceil(b.hp)));
      this.setClass(`hp${n}`, 'low', ratio < 0.25);
      this.setClass(`super${n}`, 'on', b.superReady);
      this.setClass(`meter${n}`, 'full', b.superReady);
      const pips = this.q[`pips${n}`];
      if (pips) {
        const key = `pips${n}:${b.wins}/${d.roundsToWin}`;
        if (this.cache.get(`pips${n}`) !== key) {
          this.cache.set(`pips${n}`, key);
          pips.innerHTML = '';
          for (let k = 0; k < d.roundsToWin; k++) {
            const s = document.createElement('span');
            s.className = k < b.wins ? 'pip on' : 'pip';
            pips.appendChild(s);
          }
        }
      }
    }
    this.setText('timer', d.timer === null ? '∞' : String(d.timer).padStart(2, '0'));
    this.setClass('timer', 'urgent', d.timer !== null && d.timer <= 10);
    this.setText('round', d.roundLabel);
    this.setClass('phase', 'on', d.bossPhase2);
  }

  banner(text: string, opts: BannerOpts = {}): void {
    const b = this.q.banner;
    const main = this.q.bannerMain;
    if (!b || !main) return;
    main.textContent = text;
    if (this.q.bannerSub) this.q.bannerSub.textContent = opts.sub ?? '';
    b.className = `hud-banner show ${opts.kind ?? 'info'}`;
    // restart CSS animation
    void b.offsetWidth;
    b.classList.add('anim');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      b.classList.remove('show', 'anim');
    }, opts.duration ?? 1500);
  }

  hideBanner(): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.q.banner?.classList.remove('show', 'anim');
  }

  combo(slot: number, hits: number, damage: number, maxCombo: number): void {
    const el = this.q[`combo${slot + 1}`];
    if (!el) return;
    if (hits < 2) return;
    const t = this.comboTimers[slot];
    if (t) clearTimeout(t);
    el.className = 'hud-combo show';
    el.innerHTML = `<div class="combo-num">${hits}<span>${hits >= 10 ? 'HIT COMBO' : 'HITS'}</span></div><div class="combo-line">DAMAGE <b>${damage}</b></div><div class="combo-line dim">MAX COMBO <b>${Math.max(maxCombo, hits)}</b></div>`;
    if (hits >= 2) {
      el.classList.add('pop');
      void el.offsetWidth;
    }
    if (hits >= 6) el.classList.add('big');
    if (hits >= 10) el.classList.add('huge');
  }

  comboEnd(slot: number, dropped: boolean): void {
    const el = this.q[`combo${slot + 1}`];
    if (!el || !el.classList.contains('show')) return;
    if (dropped) {
      el.classList.add('broken');
      const flag = document.createElement('div');
      flag.className = 'combo-break';
      flag.textContent = 'COMBO BREAK';
      el.appendChild(flag);
    }
    const t = this.comboTimers[slot];
    if (t) clearTimeout(t);
    this.comboTimers[slot] = setTimeout(() => el.classList.remove('show', 'broken', 'big', 'huge'), dropped ? 1500 : 1200);
  }

  clearCombos(): void {
    for (let i = 0; i < 2; i++) this.q[`combo${i + 1}`]?.classList.remove('show', 'broken', 'big', 'huge');
  }

  subtitle(name: string, text: string, ms = 2600): void {
    const el = this.q.subtitle;
    if (!el) return;
    if (this.q.subName) this.q.subName.textContent = name.toUpperCase();
    if (this.q.subText) this.q.subText.textContent = `"${text}"`;
    el.classList.add('show');
    if (this.subTimer) clearTimeout(this.subTimer);
    this.subTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  hideSubtitle(): void {
    if (this.subTimer) clearTimeout(this.subTimer);
    this.q.subtitle?.classList.remove('show');
  }

  finisherPrompt(show: boolean, cmds = ''): void {
    const el = this.q.finisher;
    if (!el) return;
    el.classList.toggle('show', show);
    if (this.q.finisherCmds && cmds) this.q.finisherCmds.innerHTML = cmds;
  }

  skipHint(show: boolean, text = 'PRESS ENTER TO SKIP'): void {
    const el = this.q.skipHint;
    if (!el) return;
    el.classList.toggle('show', show);
    el.textContent = text;
  }

  setDebug(text: string | null): void {
    const el = this.q.debug;
    if (!el) return;
    el.style.display = text === null ? 'none' : 'block';
    if (text !== null) el.textContent = text;
  }

  reset(): void {
    this.hideBanner();
    this.hideSubtitle();
    this.clearCombos();
    this.finisherPrompt(false);
    this.skipHint(false);
    this.trail = [1, 1];
  }
}
