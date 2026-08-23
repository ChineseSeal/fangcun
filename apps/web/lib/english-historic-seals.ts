export type EnglishHistoricSealCopy = {
  displayTitle: string;
  period: string;
  type: string;
  material: string;
  knob: string;
  dimensions: string;
  institution: string;
  script: string;
  mode: string;
  reading: string;
  summary: string;
  history: readonly string[];
  analysis: readonly { title: string; body: string }[];
};

export const englishHistoricSealCopy: Record<string, EnglishHistoricSealCopy> = {
  "ying-qu": {
    displayTitle: "Ying Qu jade seal",
    period: "Han dynasty",
    type: "Private seal",
    material: "white jade",
    knob: "sheep knob",
    dimensions: "face 1.4 x 1.4cm; overall height 2.0cm",
    institution: "The Palace Museum, Beijing",
    script: "Han seal",
    mode: "Baiwen",
    reading: "right-to-left horizontal",
    summary: "A compact two-character Han private seal, arranged in a balanced square face and carved in white jade.",
    history: [
      "The Palace Museum catalogues this as a Han-dynasty private seal. Its two-character Baiwen inscription uses Han seal script and reads from right to left.",
      "The object is carved in white jade with a sheep-shaped knob. Fangcun uses the published catalogue facts without reproducing the artifact photograph.",
    ],
    analysis: [
      { title: "Right-start reading", body: "The first character sits on the right, so the horizontal reading order is the reverse of modern left-to-right placement." },
      { title: "Full Baiwen field", body: "The intaglio inscription appears pale in the impression while both characters occupy the square face with balanced weight." },
      { title: "Stable square boundary", body: "The square border stabilizes the center of gravity and keeps the two-character arrangement compact." },
    ],
  },
  "da-fu-xi": {
    displayTitle: "Da Fu bronze xi",
    period: "Warring States · Chu",
    type: "Official xi",
    material: "bronze",
    knob: "column knob",
    dimensions: "face 5.4 x 6.1cm; overall height 11.7cm",
    institution: "The Palace Museum, Beijing",
    script: "Guxi",
    mode: "Baiwen",
    reading: "left-to-right horizontal",
    summary: "A wide two-character Chu official xi with a left-start reading order and a broad rectangular face.",
    history: [
      "The Palace Museum catalogues this bronze column-knob object as an official xi from the Chu state in the Warring States period.",
      "The catalogue records an incised border and a central divider. Fangcun abstracts the reading order and broad face without copying the original strokes.",
    ],
    analysis: [
      { title: "Left-start reading", body: "The published interpretation explicitly starts on the left, so the teaching reconstruction places the first character there." },
      { title: "Central division", body: "The original uses a vertical division between the characters; this fact remains in the explanation rather than being invented in the generated geometry." },
      { title: "Broad Baiwen strokes", body: "Wide intaglio strokes keep the two characters visually full across the large face." },
    ],
  },
  "xin-cheng-jia": {
    displayTitle: "Xin Cheng Jia jade seal",
    period: "Han dynasty",
    type: "Private seal",
    material: "white jade",
    knob: "nose knob",
    dimensions: "face 2.3 x 2.3cm; overall height 1.9cm",
    institution: "The Palace Museum, Beijing",
    script: "Bird-and-worm",
    mode: "Baiwen",
    reading: "traditional right-start order",
    summary: "A three-character Han private seal whose decorative bird-and-worm script pulls against the square face.",
    history: [
      "The Palace Museum catalogues this as a Han private seal carved in white jade with a nose knob and a three-character bird-and-worm inscription.",
      "The generated image presents only a teaching abstraction of script, Baiwen, and three-character composition; it does not reproduce the artifact strokes or jade color.",
    ],
    analysis: [
      { title: "Decorative script", body: "Bird-and-worm forms give the strokes a more ornamental rhythm than standard Han seal script." },
      { title: "Three-character composition", body: "Three characters spread across the square face while density and border maintain overall stability." },
      { title: "Baiwen negative form", body: "The pale inscription against the red field makes negative shape part of the composition." },
    ],
  },
};
