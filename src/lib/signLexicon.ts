import * as THREE from 'three';

export interface HandPose {
  thumb: number; index: number; middle: number; ring: number; pinky: number;
}

export interface SignPose {
  leftArm?: { upper?: [number,number,number]; lower?: [number,number,number]; hand?: [number,number,number]; };
  rightArm?: { upper?: [number,number,number]; lower?: [number,number,number]; hand?: [number,number,number]; };
  handShape?: { left?: HandPose; right?: HandPose; };
  head?: [number,number,number];
  mouth?: number;
  duration?: number;
}

const O: HandPose = { thumb:0.1, index:0.1, middle:0.1, ring:0.1, pinky:0.1 };
const F: HandPose = { thumb:1.2, index:1.3, middle:1.3, ring:1.3, pinky:1.3 };
const P: HandPose = { thumb:1.2, index:0.1, middle:1.3, ring:1.3, pinky:1.3 };
const FL: HandPose = { thumb:0, index:0, middle:0, ring:0, pinky:0 };
const ILY: HandPose = { thumb:0, index:0, middle:1.3, ring:1.3, pinky:0 };
const PC: HandPose = { thumb:1.2, index:0, middle:0, ring:1.3, pinky:1.3 };

export const HAND_SHAPES: Record<string, HandPose> = { OPEN:O, FIST:F, POINT:P, FLAT:FL, ILY, PEACE:PC };

// Helper to make sign definitions compact
const s = (r?: SignPose['rightArm'], l?: SignPose['leftArm'], rh?: HandPose, lh?: HandPose, head?: [number,number,number], dur?: number): SignPose => ({
  ...(r ? { rightArm: r } : {}),
  ...(l ? { leftArm: l } : {}),
  ...(rh || lh ? { handShape: { ...(rh ? { right: rh } : {}), ...(lh ? { left: lh } : {}) } } : {}),
  ...(head ? { head } : {}),
  duration: dur || 0.8,
});

export const SIGN_LEXICON: Record<string, SignPose> = {
  'HELLO': s({upper:[-0.5,0,0.3],lower:[-1.2,0.4,0],hand:[0,0,0.2]}, undefined, FL, undefined, [0.1,0,0], 1.0),
  'WELCOME': s({upper:[-0.8,0.2,0.5],lower:[-1.0,0.6,0]}, {upper:[-0.8,-0.2,-0.5],lower:[-1.0,-0.6,0]}, FL, FL, undefined, 1.2),
  'AI': s({upper:[-0.6,0,0.2],lower:[-1.4,0,0]}, undefined, P, undefined, undefined, 0.8),
  'BRIDGE': s({upper:[-0.7,0,0.2],lower:[-1.0,0,0]}, {upper:[-0.5,0,-0.2],lower:[-1.2,0,0],hand:[0,0,-0.5]}, FL, FL, undefined, 1.5),
  'YOU': s({upper:[-0.4,0,0.1],lower:[-0.8,0.2,0]}, undefined, P, undefined, undefined, 0.6),
  'HELP': s({upper:[-0.8,0,0.3],lower:[-1.5,0,0]}, {upper:[-0.5,0,-0.3],lower:[-1.2,0,0]}, F, FL, undefined, 1.3),
  'WATCH': s({upper:[-0.6,0,0.2],lower:[-1.4,0.5,0]}, undefined, PC, undefined, undefined, 1.0),
  'SIGN': s({upper:[-0.7,0.2,0.3],lower:[-1.2,0.4,0]}, {upper:[-0.7,-0.2,-0.3],lower:[-1.2,-0.4,0]}, O, O, undefined, 1.4),
  'GOODBYE': s({upper:[-0.5,0,0.3],lower:[-1.0,0.5,0],hand:[0,0.3,0]}, undefined, O, undefined, [0.05,0,0], 1.0),
  'THANK-YOU': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0.1]}, undefined, FL, undefined, [0.1,0,0], 0.9),
  'THANKS': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0.1]}, undefined, FL, undefined, [0.1,0,0], 0.9),
  'PLEASE': s({upper:[-0.4,0,0.1],lower:[-0.8,0,0.2]}, undefined, FL, undefined, undefined, 0.7),
  'SORRY': s({upper:[-0.4,0,0.1],lower:[-0.6,0,0.1]}, undefined, F, undefined, [0.1,0,0], 0.8),
  'YES': s({upper:[-0.4,0,0.2],lower:[-0.8,0.3,0]}, undefined, F, undefined, [0.1,0,0], 0.6),
  'NO': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, undefined, P, undefined, [-0.05,0.1,0], 0.6),
  'I': s({upper:[-0.3,0,0.1],lower:[-0.5,0,0]}, undefined, P, undefined, undefined, 0.5),
  'ME': s({upper:[-0.3,0,0.1],lower:[-0.5,0,0.1]}, undefined, P, undefined, undefined, 0.5),
  'MY': s({upper:[-0.3,0,0.1],lower:[-0.5,0,0.2]}, undefined, FL, undefined, undefined, 0.5),
  'YOUR': s({upper:[-0.4,0,0.2],lower:[-0.8,0.2,0]}, undefined, FL, undefined, undefined, 0.5),
  'HE': s({upper:[-0.4,0,0.3],lower:[-0.8,0.3,0]}, undefined, P, undefined, undefined, 0.5),
  'SHE': s({upper:[-0.4,0,0.3],lower:[-0.8,0.3,0]}, undefined, P, undefined, undefined, 0.5),
  'WE': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, undefined, P, undefined, undefined, 0.6),
  'THEY': s({upper:[-0.5,0,0.3],lower:[-1.0,0.4,0]}, undefined, P, undefined, undefined, 0.6),
  'WANT': s({upper:[-0.6,0,0.2],lower:[-1.2,0,0]}, {upper:[-0.6,0,-0.2],lower:[-1.2,0,0]}, O, O, undefined, 0.8),
  'NEED': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, undefined, P, undefined, [0.05,0,0], 0.7),
  'LIKE': s({upper:[-0.4,0,0.1],lower:[-0.7,0,0.1]}, undefined, O, undefined, undefined, 0.7),
  'LOVE': s({upper:[-0.4,0,0.1],lower:[-0.5,0,0.1]}, {upper:[-0.4,0,-0.1],lower:[-0.5,0,-0.1]}, F, F, undefined, 1.0),
  'KNOW': s({upper:[-0.4,0,0.1],lower:[-0.8,0.3,0]}, undefined, FL, undefined, undefined, 0.6),
  'THINK': s({upper:[-0.4,0,0.1],lower:[-0.9,0.4,0]}, undefined, P, undefined, undefined, 0.7),
  'SEE': s({upper:[-0.4,0,0.2],lower:[-0.9,0.4,0]}, undefined, PC, undefined, undefined, 0.7),
  'HEAR': s({upper:[-0.3,0,0.1],lower:[-0.6,0.4,0]}, undefined, P, undefined, undefined, 0.6),
  'EAT': s({upper:[-0.4,0,0.1],lower:[-0.7,0.3,0]}, undefined, O, undefined, undefined, 0.7),
  'DRINK': s({upper:[-0.4,0,0.1],lower:[-0.8,0.4,0]}, undefined, {thumb:0.5,index:0.8,middle:0.8,ring:0.8,pinky:0.8}, undefined, [0.05,0,0], 0.8),
  'GO': s({upper:[-0.5,0,0.3],lower:[-1.2,0.3,0]}, undefined, P, undefined, undefined, 0.6),
  'COME': s({upper:[-0.6,0,0.2],lower:[-1.0,0,0]}, undefined, P, undefined, undefined, 0.7),
  'LEARN': s({upper:[-0.5,0,0.1],lower:[-1.0,0.2,0]}, {upper:[-0.3,0,-0.1],lower:[-0.5,0,0]}, O, FL, undefined, 0.9),
  'UNDERSTAND': s({upper:[-0.4,0,0.1],lower:[-0.8,0.4,0],hand:[0,0,0.2]}, undefined, P, undefined, undefined, 0.8),
  'WORK': s({upper:[-0.6,0,0.2],lower:[-1.2,0,0]}, {upper:[-0.6,0,-0.2],lower:[-1.2,0,0]}, F, F, undefined, 0.9),
  'PLAY': s({upper:[-0.5,0,0.3],lower:[-1.0,0.3,0]}, {upper:[-0.5,0,-0.3],lower:[-1.0,-0.3,0]}, ILY, ILY, undefined, 0.8),
  'PERSON': s({upper:[-0.4,0,0.2],lower:[-0.8,0.2,0]}, {upper:[-0.4,0,-0.2],lower:[-0.8,-0.2,0]}, FL, FL, undefined, 0.7),
  'FRIEND': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.3,0]}, P, P, undefined, 0.9),
  'FAMILY': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, F, F, undefined, 1.0),
  'HOME': s({upper:[-0.4,0,0.1],lower:[-0.7,0.3,0]}, undefined, O, undefined, undefined, 0.7),
  'SCHOOL': s({upper:[-0.6,0,0.2],lower:[-1.2,0.3,0]}, {upper:[-0.5,0,-0.1],lower:[-0.8,0,0]}, FL, FL, undefined, 0.9),
  'FOOD': s({upper:[-0.4,0,0.1],lower:[-0.7,0.3,0]}, undefined, O, undefined, undefined, 0.7),
  'WATER': s({upper:[-0.4,0,0.1],lower:[-0.8,0.4,0]}, undefined, {thumb:0,index:0,middle:0,ring:1.3,pinky:1.3}, undefined, undefined, 0.7),
  'TIME': s({upper:[-0.4,0,0.2],lower:[-0.8,0.2,0]}, undefined, P, undefined, undefined, 0.6),
  'DAY': s({upper:[-0.6,0,0.3],lower:[-1.0,0.4,0]}, undefined, P, undefined, undefined, 0.7),
  'NAME': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, PC, PC, undefined, 0.8),
  'WHAT': s({upper:[-0.5,0,0.3],lower:[-1.0,0.3,0]}, {upper:[-0.5,0,-0.3],lower:[-1.0,-0.3,0]}, O, O, [-0.05,0,0], 0.6),
  'WHERE': s({upper:[-0.5,0,0.3],lower:[-1.2,0.3,0]}, undefined, P, undefined, [-0.05,0.05,0], 0.6),
  'WHEN': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, undefined, P, undefined, [-0.05,0,0], 0.6),
  'WHY': s({upper:[-0.4,0,0.1],lower:[-0.8,0.4,0]}, undefined, O, undefined, [-0.05,0,0], 0.6),
  'HOW': s({upper:[-0.6,0,0.2],lower:[-1.0,0,0]}, {upper:[-0.6,0,-0.2],lower:[-1.0,0,0]}, F, F, [-0.05,0,0], 0.7),
  'WHO': s({upper:[-0.4,0,0.1],lower:[-0.8,0.4,0]}, undefined, P, undefined, [-0.05,0,0], 0.6),
  'GOOD': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, undefined, FL, undefined, [0.05,0,0], 0.7),
  'BAD': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, undefined, FL, undefined, [-0.05,0,0], 0.7),
  'BIG': s({upper:[-0.7,0,0.4],lower:[-1.2,0.3,0]}, {upper:[-0.7,0,-0.4],lower:[-1.2,-0.3,0]}, O, O, undefined, 0.8),
  'SMALL': s({upper:[-0.4,0,0.1],lower:[-0.7,0.1,0]}, {upper:[-0.4,0,-0.1],lower:[-0.7,-0.1,0]}, FL, FL, undefined, 0.7),
  'HAPPY': s({upper:[-0.4,0,0.1],lower:[-0.6,0,0.1]}, undefined, FL, undefined, [0.05,0,0], 0.8),
  'SAD': s({upper:[-0.4,0,0.1],lower:[-0.6,0.3,0]}, undefined, O, undefined, [-0.05,0,0], 0.8),
  'NEW': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.4,0,-0.1],lower:[-0.7,0,0]}, FL, FL, undefined, 0.7),
  'OLD': s({upper:[-0.4,0,0.1],lower:[-0.7,0.3,0]}, undefined, F, undefined, undefined, 0.7),
  'BEAUTIFUL': s({upper:[-0.4,0,0.1],lower:[-0.7,0.4,0]}, undefined, O, undefined, undefined, 0.9),
  'WORLD': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, O, O, undefined, 1.0),
  'PEOPLE': s({upper:[-0.5,0,0.3],lower:[-1.0,0.3,0]}, {upper:[-0.5,0,-0.3],lower:[-1.0,-0.3,0]}, P, P, undefined, 0.8),
  'TODAY': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, FL, FL, undefined, 0.7),
  'SUPPORT': s({upper:[-0.6,0,0.2],lower:[-1.2,0,0]}, {upper:[-0.5,0,-0.1],lower:[-0.8,0,0]}, F, FL, undefined, 0.9),
  'GAP': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, FL, FL, undefined, 0.8),
  'ACCESS': s({upper:[-0.6,0,0.2],lower:[-1.2,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,0,0]}, O, F, undefined, 0.9),
  'AVATAR': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.3,0]}, O, O, undefined, 0.8),
  'VIDEO': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, undefined, O, undefined, undefined, 0.7),
  'HEART': s({upper:[-0.4,0,0.1],lower:[-0.5,0,0.1]}, {upper:[-0.4,0,-0.1],lower:[-0.5,0,-0.1]}, O, O, undefined, 1.0),
  'ALL': s({upper:[-0.7,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.7,0,-0.3],lower:[-1.0,-0.2,0]}, O, O, undefined, 0.8),
  'ALWAYS': s({upper:[-0.5,0,0.3],lower:[-1.2,0.3,0]}, undefined, P, undefined, undefined, 0.8),
  'ACTIVE': s({upper:[-0.6,0,0.2],lower:[-1.2,0.2,0]}, {upper:[-0.6,0,-0.2],lower:[-1.2,-0.2,0]}, O, O, undefined, 0.8),
  'CONTINUE': s({upper:[-0.6,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.2],lower:[-1.0,-0.2,0]}, F, F, undefined, 0.9),
  'TRANSLATE': s({upper:[-0.6,0,0.3],lower:[-1.2,0.3,0]}, {upper:[-0.6,0,-0.3],lower:[-1.2,-0.3,0]}, FL, FL, undefined, 1.0),
  'LANGUAGE': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, ILY, ILY, undefined, 0.9),
  'STOP': s({upper:[-0.6,0,0.2],lower:[-1.2,0.3,0]}, {upper:[-0.5,0,-0.1],lower:[-0.8,0,0]}, FL, FL, undefined, 0.7),
  'START': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, P, O, undefined, 0.7),
  'MORE': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, O, O, undefined, 0.6),
  'AGAIN': s({upper:[-0.6,0,0.2],lower:[-1.2,0.3,0]}, {upper:[-0.5,0,-0.1],lower:[-0.8,0,0]}, O, FL, undefined, 0.7),
  'DIFFERENT': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, P, P, undefined, 0.8),
  'SAME': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, P, P, undefined, 0.7),
  'TRUE': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, undefined, P, undefined, [0.05,0,0], 0.6),
  'CAN': s({upper:[-0.5,0,0.2],lower:[-1.0,0.2,0]}, {upper:[-0.5,0,-0.2],lower:[-1.0,-0.2,0]}, F, F, undefined, 0.6),
  'NOT': s({upper:[-0.5,0,0.2],lower:[-1.0,0.3,0]}, undefined, O, undefined, [-0.05,0.05,0], 0.5),
  'DONE': s({upper:[-0.6,0,0.3],lower:[-1.0,0.2,0]}, {upper:[-0.6,0,-0.3],lower:[-1.0,-0.2,0]}, O, O, undefined, 0.7),
};

// Fingerspelling alphabet - compact single-hand poses
const fsBase = (h: HandPose, dur = 0.4): SignPose => s({upper:[-0.5,0,0.2],lower:[-1.2,0.3,0]}, undefined, h, undefined, undefined, dur);
const alpha: Record<string, HandPose> = {
  A: {thumb:0.3,index:1.3,middle:1.3,ring:1.3,pinky:1.3},
  B: {thumb:1.2,index:0,middle:0,ring:0,pinky:0},
  C: {thumb:0.5,index:0.5,middle:0.5,ring:0.5,pinky:0.5},
  D: {thumb:0.8,index:0,middle:1.3,ring:1.3,pinky:1.3},
  E: {thumb:0.8,index:0.8,middle:0.8,ring:0.8,pinky:0.8},
  F: {thumb:0.3,index:0.3,middle:0,ring:0,pinky:0},
  G: {thumb:0,index:0.1,middle:1.3,ring:1.3,pinky:1.3},
  H: {thumb:1.2,index:0,middle:0,ring:1.3,pinky:1.3},
  I: {thumb:1.2,index:1.3,middle:1.3,ring:1.3,pinky:0},
  J: {thumb:1.2,index:1.3,middle:1.3,ring:1.3,pinky:0},
  K: {thumb:0.3,index:0,middle:0,ring:1.3,pinky:1.3},
  L: {thumb:0,index:0,middle:1.3,ring:1.3,pinky:1.3},
  M: {thumb:0.5,index:1.0,middle:1.0,ring:1.0,pinky:1.3},
  N: {thumb:0.5,index:1.0,middle:1.0,ring:1.3,pinky:1.3},
  O: {thumb:0.5,index:0.5,middle:0.5,ring:0.5,pinky:0.5},
  P: {thumb:0.3,index:0,middle:0,ring:1.3,pinky:1.3},
  Q: {thumb:0,index:0.1,middle:1.3,ring:1.3,pinky:1.3},
  R: {thumb:1.2,index:0,middle:0,ring:1.3,pinky:1.3},
  S: {thumb:0.5,index:1.3,middle:1.3,ring:1.3,pinky:1.3},
  T: {thumb:0.3,index:1.0,middle:1.3,ring:1.3,pinky:1.3},
  U: {thumb:1.2,index:0,middle:0,ring:1.3,pinky:1.3},
  V: {thumb:1.2,index:0,middle:0,ring:1.3,pinky:1.3},
  W: {thumb:1.2,index:0,middle:0,ring:0,pinky:1.3},
  X: {thumb:1.2,index:0.6,middle:1.3,ring:1.3,pinky:1.3},
  Y: {thumb:0,index:1.3,middle:1.3,ring:1.3,pinky:0},
  Z: {thumb:1.2,index:0,middle:1.3,ring:1.3,pinky:1.3},
};

// Register fingerspelling
for (const [letter, hand] of Object.entries(alpha)) {
  SIGN_LEXICON[`FS:${letter}`] = fsBase(hand);
}

// Number signs 1-10
const nums: HandPose[] = [
  {thumb:1.2,index:0,middle:1.3,ring:1.3,pinky:1.3},
  {thumb:1.2,index:0,middle:0,ring:1.3,pinky:1.3},
  {thumb:1.2,index:0,middle:0,ring:0,pinky:1.3},
  {thumb:1.2,index:0,middle:0,ring:0,pinky:0},
  {thumb:0,index:0,middle:0,ring:0,pinky:0},
  {thumb:0,index:1.3,middle:1.3,ring:1.3,pinky:0},
  {thumb:0,index:1.3,middle:1.3,ring:0,pinky:0},
  {thumb:0,index:1.3,middle:0,ring:0,pinky:0},
  {thumb:0,index:0,middle:0,ring:0,pinky:1.3},
  {thumb:0.3,index:1.3,middle:1.3,ring:1.3,pinky:1.3},
];
for (let i = 0; i < nums.length; i++) {
  SIGN_LEXICON[`${i+1}`] = fsBase(nums[i], 0.5);
}

export const getPoseForGloss = (gloss: string): SignPose | null => {
  const n = gloss.toUpperCase().trim();
  return SIGN_LEXICON[n] || null;
};
