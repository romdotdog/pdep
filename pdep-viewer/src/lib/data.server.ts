"use server";

import preps from "../data/preps.json";
import prepdefs from "../data/prepdefs.json";
import prepprops from "../data/prepprops.json";
import prepcorp from "../data/prepcorp.json";

export type PrepDef = {
  prep: string;
  sense: string;
  def: string;
};

export type PrepProp = {
  prep: string;
  sense: string;
  cprop: string;
  aprop: string;
  sup: string;
  srtype: string;
  tratz: string | null;
  srikumar: string | null;
  opreps: string | null;
  srel: string | null;
  qsyn: string | null;
  qpar: string | null;
  com: string | null;
  cnn: number | null;
  cnnp: number | null;
  cwh: number | null;
  cing: number | null;
  clexset: string | null;
  gnoun: number | null;
  gverb: number | null;
  gadj: number | null;
  csel: string | null;
  gsel: string | null;
  conto: string | null;
  ssense: string | null;
  clanal: number | null;
  subc: string;
};

export type PrepCorp = {
  prep: string;
  source: string;
  sense: string;
  inst: number;
  preploc: number;
  sentence: string;
};

export type PrepStats = {
  prep: string;
  senses: number;
  examples: number;
};

// Server functions
export async function getAllPreps(): Promise<string[]> {
  return preps as string[];
}

export async function getAllPrepStats(): Promise<PrepStats[]> {
  const prepList = preps as string[];
  const defsList = prepdefs as PrepDef[];
  const corpList = prepcorp as PrepCorp[];

  // Pre-compute counts
  const senseCounts = new Map<string, number>();
  const exampleCounts = new Map<string, number>();

  for (const def of defsList) {
    senseCounts.set(def.prep, (senseCounts.get(def.prep) || 0) + 1);
  }

  for (const corp of corpList) {
    exampleCounts.set(corp.prep, (exampleCounts.get(corp.prep) || 0) + 1);
  }

  return prepList.map((prep) => ({
    prep,
    senses: senseCounts.get(prep) || 0,
    examples: exampleCounts.get(prep) || 0,
  }));
}

export async function getDefsForPrep(prep: string): Promise<PrepDef[]> {
  return (prepdefs as PrepDef[]).filter((d) => d.prep === prep);
}

export async function getPropsForPrep(prep: string): Promise<PrepProp[]> {
  return (prepprops as PrepProp[]).filter((p) => p.prep === prep);
}

export async function getCorpusForPrepSense(prep: string, sense?: string): Promise<PrepCorp[]> {
  const corpus = prepcorp as PrepCorp[];
  if (sense) {
    return corpus.filter((c) => c.prep === prep && c.sense === sense);
  }
  return corpus.filter((c) => c.prep === prep);
}

export async function getPropForSense(prep: string, sense: string): Promise<PrepProp | undefined> {
  return (prepprops as PrepProp[]).find((p) => p.prep === prep && p.sense === sense);
}

export async function getDefForSense(prep: string, sense: string): Promise<PrepDef | undefined> {
  return (prepdefs as PrepDef[]).find((d) => d.prep === prep && d.sense === sense);
}

// Quiz helpers
export async function getPrepsWithMultipleSenses(): Promise<string[]> {
  const counts = new Map<string, number>();
  for (const def of prepdefs as PrepDef[]) {
    counts.set(def.prep, (counts.get(def.prep) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([prep]) => prep);
}

export async function getRandomQuizQuestion(availablePreps: string[]): Promise<{
  example: PrepCorp;
  options: PrepDef[];
} | null> {
  const MAX_OPTIONS = 4;

  // Pick a random preposition
  const prep = availablePreps[Math.floor(Math.random() * availablePreps.length)];

  // Get examples with non-empty sense
  const examples = (prepcorp as PrepCorp[]).filter(
    (c) => c.prep === prep && c.sense !== ""
  );
  if (examples.length === 0) return null;

  // Group by sense and pick random
  const bySense = new Map<string, PrepCorp[]>();
  for (const ex of examples) {
    const list = bySense.get(ex.sense) || [];
    list.push(ex);
    bySense.set(ex.sense, list);
  }

  const senses = Array.from(bySense.keys());
  const randomSense = senses[Math.floor(Math.random() * senses.length)];
  const senseExamples = bySense.get(randomSense)!;
  const example = senseExamples[Math.floor(Math.random() * senseExamples.length)];

  // Get definitions
  const defs = (prepdefs as PrepDef[]).filter((d) => d.prep === prep);

  // Limit to MAX_OPTIONS: always include correct answer + random distractors
  let finalOptions: PrepDef[];
  if (defs.length <= MAX_OPTIONS) {
    finalOptions = [...defs];
  } else {
    const correctDef = defs.find((d) => d.sense === example.sense);
    const distractors = defs
      .filter((d) => d.sense !== example.sense)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_OPTIONS - 1);
    finalOptions = correctDef ? [correctDef, ...distractors] : distractors;
  }

  // Shuffle the options
  const shuffled = finalOptions.sort(() => Math.random() - 0.5);

  return { example, options: shuffled };
}
