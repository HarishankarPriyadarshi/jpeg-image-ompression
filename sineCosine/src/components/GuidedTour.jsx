import { useEffect, useState } from "react";
import "./GuidedTour.css";

// Reusable, element-anchored guided tour engine.
//   steps   -> array from src/data/guidedTourSteps.js for the active pipeline step
//   ctx     -> the useMatrix() context value, passed through to each step's check()
//   muted   -> whether narration (speech synthesis) is muted
//   onToggleMute -> () => void
//   onClose -> () => void, called on Exit or after the last step's Next
function GuidedTour({ steps, ctx, muted, onToggleMute, onClose }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const [waiting, setWaiting] = useState(false);

  const step = steps[idx];
  // Purely reactive: once the gate's condition is true, the tooltip shows
  // it as done and the NEXT button becomes clickable. There is no
  // auto-advance anywhere in this component — moving to the next sub-step
  // ALWAYS requires the person to click NEXT (or BACK/EXIT) themselves,
  // whether the action was just performed live or was already done before
  // the tour got here. This is intentionally the simplest possible rule:
  // it can't race, skip, or misfire, because nothing here ever calls
  // setIdx except the three button handlers below.
  const satisfied = !step.requireAction || step.check(ctx);

  const activeTarget = satisfied ? step.target : step.waitingTarget || step.target;
  const activeTitle = step.title;
  const activeBody = satisfied ? step.body : step.waitingBody;
  const isWaiting = step.requireAction && !satisfied;

  // Track the highlighted element's position, and keep it live (element can
  // move/resize as the app re-renders, or not exist yet until an action).
  // Whenever the target first appears for a given sub-step, scroll it into
  // view too — otherwise a target further down the scrollable panel would
  // anchor the tooltip off-screen.
  useEffect(() => {
    let scrolledFor = null;
    function update() {
      if (!activeTarget) {
        setRect(null);
        return;
      }
      const el = document.querySelector(activeTarget);
      if (el && scrolledFor !== activeTarget) {
        scrolledFor = activeTarget;
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      setRect(el ? el.getBoundingClientRect() : null);
    }
    update();
    const poll = setInterval(update, 250);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearInterval(poll);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTarget, idx]);

  useEffect(() => {
    setWaiting(isWaiting);
  }, [isWaiting]);

  // Narrate the current sub-step out loud (unless muted).
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (!muted && activeBody) {
      const utter = new SpeechSynthesisUtterance(activeBody);
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    }
    return () => window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, muted, activeBody]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const goNext = () => {
    if (idx < steps.length - 1) {
      setIdx((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    if (idx > 0) setIdx((i) => i - 1);
  };

  const tooltipStyle = getTooltipStyle(rect);

  return (
    <>
      <div className="tourDim" />
      {rect && (
        <div
          className="tourHighlightBox"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <div className={waiting ? "tourTooltip tourTooltipWaiting" : "tourTooltip"} style={tooltipStyle}>
        <div className="tourTooltipHeader">
          <span className="tourStepCount">{idx + 1} / {steps.length}</span>
          <button
            className="tourMuteBtn"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute narration" : "Mute narration"}
            title={muted ? "Unmute narration" : "Mute narration"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
        <h4 className={waiting ? "tourTitle tourTitleWaiting" : "tourTitle"}>
          {waiting ? "Action Required" : activeTitle}
        </h4>
        <p>{activeBody}</p>
        <div className="tourButtons">
          <button className="tourExitBtn" onClick={onClose}>EXIT</button>
          {idx > 0 && <button className="tourBackBtn" onClick={goBack}>BACK</button>}
          {!isWaiting && (
            <button className="tourNextBtn" onClick={goNext}>
              {idx === steps.length - 1 ? "FINISH" : "NEXT"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function getTooltipStyle(rect) {
  // Mirror GuidedTour.css's own responsive width so the clamping math below
  // always matches what actually gets rendered (mobile switches to a
  // near-full-width tooltip via a media query).
  const boxWidth = window.innerWidth <= 480 ? window.innerWidth - 24 : 300;
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 14;

  let left = rect.left;
  if (left + boxWidth + 10 > vw) left = vw - boxWidth - 10;
  if (left < 10) left = 10;

  const spaceBelow = vh - rect.bottom;
  if (spaceBelow > 200) {
    return { top: rect.bottom + margin, left };
  }
  const spaceAbove = rect.top;
  // 260px covers this tooltip's tallest realistic content plus the margin,
  // so translateY(-100%) never pushes it above the header bar.
  if (spaceAbove > 260) {
    return { top: rect.top - margin, left, transform: "translateY(-100%)" };
  }
  // Not enough room above or below (the target fills most of the viewport
  // height — e.g. a tall card list on a phone screen). Pinning at rect.top
  // would sit the tooltip directly on top of the very element the person
  // needs to tap for an "Action Required" step, blocking it entirely. Anchor
  // near the bottom of the screen instead, so the target's upper portion
  // (already brought into view by the scrollIntoView above) stays visible
  // and tappable above the tooltip.
  return { top: Math.max(10, vh - 260), left };
}

export default GuidedTour;
