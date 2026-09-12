const DEFAULT_CONFETTI = {
  particleCount: 350,
  spread: 120,
  origin: { y: 0.6 },
  angle: 90,
};

const POSITION_SPECIFIC_CONFETTI: { [key: string]: object } = {
  TOP_RIGHT: {
    angle: 225,
    origin: { x: 0.9, y: 0 },
  },
  BOTTOM_RIGHT: {
    angle: 100,
    origin: { x: 0.9, y: 0.9 },
  },
};

const getConfetti = async () => {
  const { fireConfetti } = await import("~/utils/vendor/confetti");
  return fireConfetti;
};

/**
 *
 * @param position
 * @description Throw confetti based position or default
 */
export const throwConfetti = (position: string | undefined) => {
  let positionSpecific = POSITION_SPECIFIC_CONFETTI[position as string];
  if (!positionSpecific) positionSpecific = {};

  const confettiOptions = { ...DEFAULT_CONFETTI, ...positionSpecific };
  getConfetti().then((confetti) => confetti(confettiOptions));
};
