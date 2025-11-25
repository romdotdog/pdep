import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, "../../SQL");
const outDir = join(__dirname, "../src/data");

function parseSqlValues(sql, columns) {
  // Extract all VALUES sections and concatenate them
  // This handles SQL files with multiple INSERT INTO statements
  const valuesSections = [];
  const insertRegex = /VALUES\s*\n?([\s\S]*?)(?=;(?:\s*INSERT|\s*$)|$)/gi;
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    valuesSections.push(match[1]);
  }

  if (valuesSections.length === 0) return [];

  const valuesSection = valuesSections.join(",\n");
  const rows = [];

  // State machine to parse SQL values
  let i = 0;
  const len = valuesSection.length;

  while (i < len) {
    // Find start of tuple
    while (i < len && valuesSection[i] !== "(") i++;
    if (i >= len) break;
    i++; // skip (

    const values = [];
    let current = "";
    let inString = false;

    while (i < len) {
      const char = valuesSection[i];

      if (inString) {
        if (char === "'" && valuesSection[i + 1] === "'") {
          // Escaped quote
          current += "'";
          i += 2;
          continue;
        } else if (char === "\\") {
          // Backslash escape
          current += valuesSection[i + 1] || "";
          i += 2;
          continue;
        } else if (char === "'") {
          // End of string
          inString = false;
          values.push(current);
          current = "";
          i++;
          continue;
        } else {
          current += char;
          i++;
          continue;
        }
      }

      // Not in string
      if (char === "'") {
        inString = true;
        i++;
        continue;
      }

      if (char === ",") {
        // Check if we have a non-string value (NULL or number)
        const trimmed = current.trim();
        if (trimmed) {
          if (trimmed === "NULL") {
            values.push(null);
          } else {
            values.push(isNaN(Number(trimmed)) ? trimmed : Number(trimmed));
          }
          current = "";
        }
        i++;
        continue;
      }

      if (char === ")") {
        // End of tuple - handle any trailing value
        const trimmed = current.trim();
        if (trimmed) {
          if (trimmed === "NULL") {
            values.push(null);
          } else {
            values.push(isNaN(Number(trimmed)) ? trimmed : Number(trimmed));
          }
        }
        i++;
        break;
      }

      if (!/\s/.test(char)) {
        current += char;
      }
      i++;
    }

    if (values.length === columns.length) {
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

function importSqlFile(filename, columns) {
  console.log(`Importing ${filename}...`);
  const sql = readFileSync(join(sqlDir, filename), "utf-8");
  const rows = parseSqlValues(sql, columns);
  console.log(`  Parsed ${rows.length} rows`);
  return rows;
}

// Import all SQL files with their column definitions
const prepdefs = importSqlFile("prepdefs.sql", ["prep", "sense", "def"]);
const prepcorp = importSqlFile("prepcorp.sql", ["prep", "source", "sense", "inst", "preploc", "sentence"]);
const prepprops = importSqlFile("prepprops.sql", [
  "prep", "sense", "cprop", "aprop", "sup", "srtype", "tratz", "srikumar",
  "opreps", "srel", "qsyn", "qpar", "com", "cnn", "cnnp", "cwh", "cing",
  "clexset", "gnoun", "gverb", "gadj", "csel", "gsel", "conto", "ssense",
  "clanal", "subc"
]);

// Fix typos in source data
for (const row of prepprops) {
  if (row.opreps && typeof row.opreps === "string") {
    row.opreps = row.opreps.replace(/aprt from/g, "apart from");
  }
}

// Write JSON files
writeFileSync(join(outDir, "prepdefs.json"), JSON.stringify(prepdefs, null, 2));
writeFileSync(join(outDir, "prepcorp.json"), JSON.stringify(prepcorp, null, 2));
writeFileSync(join(outDir, "prepprops.json"), JSON.stringify(prepprops, null, 2));

// Create index of unique prepositions
const prepsSet = new Set(prepdefs.map(p => p.prep));
const preps = Array.from(prepsSet).sort();
writeFileSync(join(outDir, "preps.json"), JSON.stringify(preps, null, 2));

console.log(`\nDone! Exported:`);
console.log(`  ${prepdefs.length} definitions`);
console.log(`  ${prepcorp.length} corpus examples`);
console.log(`  ${prepprops.length} properties`);
console.log(`  ${preps.length} unique prepositions`);
