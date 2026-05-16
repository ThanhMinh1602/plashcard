const backgroundModules = import.meta.glob('../assets/bgr/*.{jpg,webp}', {
  eager: true,
  import: 'default',
});

const backgroundByNumber = Object.entries(backgroundModules).reduce(
  (acc, [path, src]) => {
    const match = path.match(/\/([0-9]+)\.(?:jpg|webp)$/);
    if (match) {
      acc[Number(match[1])] = src;
    }
    return acc;
  },
  {},
);

export const DEFAULT_CARD_BACKGROUND_PAIR_ID = '1';

export const CARD_BACKGROUND_PAIRS = Array.from({ length: 15 }, (_, index) => {
  const id = String(index + 1);
  const frontNumber = index * 2 + 1;
  const backNumber = frontNumber + 1;

  return {
    id,
    label: `Nền ${id}`,
    frontNumber,
    backNumber,
    front: backgroundByNumber[frontNumber],
    back: backgroundByNumber[backNumber],
  };
}).filter((pair) => pair.front && pair.back);

export const getCardBackgroundPair = (backgroundPairId) => {
  const pairId = String(backgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID);

  return (
    CARD_BACKGROUND_PAIRS.find((pair) => pair.id === pairId) ||
    CARD_BACKGROUND_PAIRS[0]
  );
};
