import { memo } from 'react';

interface Props {
  onSkip: () => void;
}

/** Rendered once. During a fight HudController mutates these nodes directly, so React never re-renders. */
function HudMarkup({ onSkip }: Props): JSX.Element {
  return (
    <div className="hud" data-hud-root>
      <div className="hud-top">
        <div className="hud-side left">
          <div className="hud-name"><span className="hud-tag p1">▲ P1</span><span data-hud="name1" /></div>
          <div className="hud-bar hp p1">
            <div className="trail" data-hud="trail1" />
            <div className="fill" data-hud="hp1" />
            <span className="num" data-hud="hpnum1" />
          </div>
          <div className="hud-meter">
            <div className="fill" data-hud="meter1" />
            <span className="super" data-hud="super1">SUPER READY</span>
          </div>
          <div className="hud-pips" data-hud="pips1" />
        </div>
        <div className="hud-center">
          <div className="hud-timer" data-hud="timer">99</div>
          <div className="hud-round" data-hud="round">ROUND 1</div>
        </div>
        <div className="hud-side right">
          <div className="hud-name"><span data-hud="name2" /><span className="hud-tag p2">■ P2</span></div>
          <div className="hud-bar hp p2">
            <div className="trail" data-hud="trail2" />
            <div className="fill" data-hud="hp2" />
            <span className="num" data-hud="hpnum2" />
          </div>
          <div className="hud-meter p2">
            <div className="fill" data-hud="meter2" />
            <span className="super" data-hud="super2">SUPER READY</span>
          </div>
          <div className="hud-pips right" data-hud="pips2" />
        </div>
      </div>
      <div className="hud-combo left" data-hud="combo1" />
      <div className="hud-combo right" data-hud="combo2" />
      <div className="hud-banner" data-hud="banner">
        <div className="banner-main" data-hud="bannerMain" />
        <div className="banner-sub" data-hud="bannerSub" />
      </div>
      <div className="hud-phase" data-hud="phase">PHASE 2</div>
      <div className="hud-subtitle" data-hud="subtitle">
        <b data-hud="subName" />
        <span data-hud="subText" />
      </div>
      <div className="hud-finisher" data-hud="finisher">
        <div className="fin-cmds" data-hud="finisherCmds" />
        <button className="btn small" data-hud="skipBtn" onClick={onSkip}>SKIP</button>
      </div>
      <div className="hud-skip" data-hud="skipHint" />
      <pre className="hud-debug" data-hud="debug" />
    </div>
  );
}

export const HUD = memo(HudMarkup);
