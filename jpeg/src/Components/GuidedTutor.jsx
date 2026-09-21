import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MARGIN = 10;
const TOOLTIP_WIDTH = 340;

function getRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Reusable step-by-step Guided Tutor overlay.
 *
 * steps: [{ title, text, target: "<css selector>" | null, placement: "top"|"bottom"|"left"|"right"|"center" }]
 * open: boolean
 * onClose(): called on Exit / after the last step
 * muted: boolean — whether narration is currently muted
 * onToggleMute(): toggles narration on/off
 */
function GuidedTutor({
  steps,
  open,
  onClose,
  muted,
  onToggleMute,
  actionContext = {},
  onRequireSidebar,
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [actionRequired, setActionRequired] = useState(false);
  const tooltipRef = useRef(null);

  const total = steps.length;
  const step = steps[index] || null;
  const isCenter = !step?.target || !rect;

  // Reset to the first step whenever the tutor is (re)opened.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setActionRequired(false);
    }
  }, [open]);

  // Clear any pending "action required" state when moving to a new step.
  useEffect(() => {
    setActionRequired(false);
  }, [index]);

  // Some targets (e.g. the mobile step list) live inside the collapsible
  // sidebar. Open/close it automatically so the highlighted element is
  // actually visible instead of sitting off-screen behind the ☰ menu.
  // Only reacts to real open/close transitions and to the *value* of
  // requiresSidebar (not the `steps`/`step` object identity, which is
  // rebuilt on every parent render) — otherwise this would keep firing
  // onRequireSidebar(false) on every re-render while the tutor is closed
  // and fight the user's own ☰ button.
  const wasOpenRef = useRef(false);
  const needsSidebar = !!step?.requiresSidebar;

  useEffect(() => {
    if (typeof onRequireSidebar !== "function") return;

    if (open) {
      onRequireSidebar(needsSidebar);
    } else if (wasOpenRef.current) {
      // Tutor just closed — put the sidebar back to its default (closed).
      onRequireSidebar(false);
    }

    wasOpenRef.current = open;
  }, [open, needsSidebar, onRequireSidebar]);

  // If the required action gets completed while we're showing the
  // "Action Required" message, silently move the tutor forward — same
  // as the reference tutor auto-continuing once the user does the step.
  useEffect(() => {
    if (!open || !step || !actionRequired) return;
    if (!step.requiresAction || step.requiresAction(actionContext)) {
      setActionRequired(false);
      if (index >= total - 1) {
        onClose();
      } else {
        setIndex((prev) => prev + 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionContext, actionRequired, open, step, index, total]);

  // Speak / stop speaking as the step, mute state, or action-required state changes.
  useEffect(() => {
    if (!open || !step) return;

    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    if (!muted) {
      const text = actionRequired
        ? `Action required. ${
            step.actionMessage || "Please complete this action before continuing."
          }`
        : `${step.title}. ${step.text}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [open, index, muted, step, actionRequired]);

  // Stop narration entirely once the tutor closes.
  useEffect(() => {
    if (!open && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;

    function measure() {
      const targetRect = getRect(step.target);
      setRect(targetRect);

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      if (!targetRect) {
        setTooltipPos({
          top: viewportH / 2,
          left: viewportW / 2,
          isCenterMode: true,
        });
        return;
      }

      const placement = step.placement || "bottom";
      const tooltipHeight = tooltipRef.current?.offsetHeight || 180;
      let top;
      let left;

      if (placement === "bottom") {
        top = targetRect.bottom + MARGIN;
        left = targetRect.left;
      } else if (placement === "top") {
        top = targetRect.top - tooltipHeight - MARGIN;
        left = targetRect.left;
      } else if (placement === "right") {
        top = targetRect.top;
        left = targetRect.right + MARGIN;
      } else if (placement === "left") {
        top = targetRect.top;
        left = targetRect.left - TOOLTIP_WIDTH - MARGIN;
      } else {
        top = targetRect.bottom + MARGIN;
        left = targetRect.left;
      }

      // If it doesn't fit above/below, flip.
      if (top + tooltipHeight > viewportH - MARGIN && placement === "bottom") {
        top = targetRect.top - tooltipHeight - MARGIN;
      }
      if (top < MARGIN && placement === "top") {
        top = targetRect.bottom + MARGIN;
      }

      top = clamp(top, MARGIN, Math.max(MARGIN, viewportH - tooltipHeight - MARGIN));
      left = clamp(left, MARGIN, Math.max(MARGIN, viewportW - TOOLTIP_WIDTH - MARGIN));

      setTooltipPos({ top, left, isCenterMode: false });
    }

    const targetEl = step.target ? document.querySelector(step.target) : null;
    if (targetEl && typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Measure now and once more after the smooth-scroll has had time to settle.
    measure();
    // 320ms comfortably covers the 220ms sidebar slide-in transition too,
    // for steps whose target lives inside the mobile ☰ menu.
    const timer = setTimeout(measure, 320);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, index, step, actionRequired]);

  if (!open || !step) return null;

  function goNext() {
    if (step.requiresAction && !step.requiresAction(actionContext)) {
      setActionRequired(true);
      return;
    }

    setActionRequired(false);

    if (index >= total - 1) {
      onClose();
      return;
    }
    setIndex((prev) => prev + 1);
  }

  function goBack() {
    setActionRequired(false);
    setIndex((prev) => Math.max(0, prev - 1));
  }

  const maskRects = rect
    ? {
        top: { top: 0, left: 0, width: "100%", height: Math.max(0, rect.top - 6) },
        bottom: {
          top: rect.bottom + 6,
          left: 0,
          width: "100%",
          height: Math.max(0, window.innerHeight - rect.bottom - 6),
        },
        left: {
          top: Math.max(0, rect.top - 6),
          left: 0,
          width: Math.max(0, rect.left - 6),
          height: rect.height + 12,
        },
        right: {
          top: Math.max(0, rect.top - 6),
          left: rect.right + 6,
          width: Math.max(0, window.innerWidth - rect.right - 6),
          height: rect.height + 12,
        },
      }
    : null;

  return (
    <>
      {maskRects ? (
        <>
          <div className="guidedTutorMask" style={maskRects.top} />
          <div className="guidedTutorMask" style={maskRects.bottom} />
          <div className="guidedTutorMask" style={maskRects.left} />
          <div className="guidedTutorMask" style={maskRects.right} />
          <div
            className="guidedTutorHighlightRing"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />
        </>
      ) : (
        <div className="guidedTutorMask guidedTutorMaskFull" />
      )}

      <div
        ref={tooltipRef}
        className={`guidedTutorTooltip ${isCenter ? "guidedTutorTooltipCenter" : ""}`}
        style={
          isCenter
            ? {}
            : { top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }
        }
      >
        <div className="guidedTutorTooltipHead">
          {actionRequired ? (
            <span className="guidedTutorStepBadge guidedTutorActionBadge">
              ⚠ Action Required
            </span>
          ) : (
            <span className="guidedTutorStepBadge">
              Step {index + 1} / {total}
            </span>
          )}

          <button
            type="button"
            className={`guidedTutorSpeakerBtn ${muted ? "guidedTutorSpeakerMuted" : ""}`}
            onClick={onToggleMute}
            title={muted ? "Unmute narration" : "Mute narration"}
            aria-label={muted ? "Unmute narration" : "Mute narration"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>

        {actionRequired ? (
          <p className="guidedTutorActionMsg">
            {step.actionMessage || "Please complete this action before continuing."}
          </p>
        ) : (
          <>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </>
        )}

        <div className="guidedTutorTooltipNav">
          <button type="button" className="guidedTutorExitBtn" onClick={onClose}>
            Exit
          </button>

          <div className="guidedTutorNavRight">
            {index > 0 && (
              <button type="button" className="guidedTutorBackBtn" onClick={goBack}>
                Back
              </button>
            )}

            {!actionRequired && (
              <button type="button" className="guidedTutorNextBtn" onClick={goNext}>
                {index >= total - 1 ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default GuidedTutor;
