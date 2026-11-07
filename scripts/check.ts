// Usage: npm run check -- "paste a text message or link here"
import { checkMessage } from "../src/lib/checker";

const input = process.argv.slice(2).join(" ");
if (!input) {
  console.error('Usage: npm run check -- "message or link"');
  process.exit(1);
}
const r = checkMessage(input);
console.log(`\n${r.headline}  (risk ${r.score}/100${r.scamType ? `, ${r.scamType.label}` : ""})`);
console.log(r.summary);
console.log("\nWhy:");
for (const e of r.evidence) console.log(`  ${e.good ? "[good]" : `[+${e.weight}]`} ${e.title}: ${e.detail}`);
console.log("\nWhat to do:");
for (const s of r.nextSteps) console.log(`  - ${s}`);
