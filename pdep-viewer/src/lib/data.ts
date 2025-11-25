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

export function getAllPreps(): string[] {
  return preps as string[];
}

export function getDefsForPrep(prep: string): PrepDef[] {
  return (prepdefs as PrepDef[]).filter((d) => d.prep === prep);
}

export function getPropsForPrep(prep: string): PrepProp[] {
  return (prepprops as PrepProp[]).filter((p) => p.prep === prep);
}

export function getCorpusForPrepSense(prep: string, sense?: string): PrepCorp[] {
  const corpus = prepcorp as PrepCorp[];
  if (sense) {
    return corpus.filter((c) => c.prep === prep && c.sense === sense);
  }
  return corpus.filter((c) => c.prep === prep);
}

export function getPropForSense(prep: string, sense: string): PrepProp | undefined {
  return (prepprops as PrepProp[]).find((p) => p.prep === prep && p.sense === sense);
}

export function getDefForSense(prep: string, sense: string): PrepDef | undefined {
  return (prepdefs as PrepDef[]).find((d) => d.prep === prep && d.sense === sense);
}

// Stats helpers
export function getSenseCountForPrep(prep: string): number {
  return (prepdefs as PrepDef[]).filter((d) => d.prep === prep).length;
}

export function getExampleCountForPrep(prep: string): number {
  return (prepcorp as PrepCorp[]).filter((c) => c.prep === prep).length;
}

// Quiz helpers
export function getPrepsWithMultipleSenses(): string[] {
  const counts = new Map<string, number>();
  for (const def of prepdefs as PrepDef[]) {
    counts.set(def.prep, (counts.get(def.prep) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([prep]) => prep);
}

export function getRandomCorpusExample(prep: string): PrepCorp | undefined {
  const examples = (prepcorp as PrepCorp[]).filter(
    (c) => c.prep === prep && c.sense !== ""
  );
  if (examples.length === 0) return undefined;

  // Group by sense
  const bySense = new Map<string, PrepCorp[]>();
  for (const ex of examples) {
    const list = bySense.get(ex.sense) || [];
    list.push(ex);
    bySense.set(ex.sense, list);
  }

  // Pick a random sense first, then a random example from that sense
  const senses = Array.from(bySense.keys());
  const randomSense = senses[Math.floor(Math.random() * senses.length)];
  const sensExamples = bySense.get(randomSense)!;
  return sensExamples[Math.floor(Math.random() * sensExamples.length)];
}
