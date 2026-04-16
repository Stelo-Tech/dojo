/**
 * CLI Level Validator
 *
 * Run with: npx tsx tools/level-validator.ts
 *
 * Imports all registered levels and validates each one, printing results.
 * Exits with code 1 if any level is invalid.
 */

// Node-compatible relative imports (tools/ is outside tsconfig include)
import { LevelValidator } from '../src/levels/LevelValidator';
import { level01 } from '../src/levels/data/level01';
import { level02 } from '../src/levels/data/level02';
import { level03 } from '../src/levels/data/level03';
import { level04 } from '../src/levels/data/level04';
import { level05 } from '../src/levels/data/level05';
import type { LevelData } from '../src/levels/LevelTypes';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';

const levels: readonly LevelData[] = [level01, level02, level03, level04, level05];

let overallValid = true;

console.log(`${BOLD}Lemmings — Level Validator${RESET}`);
console.log('='.repeat(50));

for (const level of levels) {
  const result = LevelValidator.validate(level);
  const status = result.valid ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;

  console.log(`\n[${status}] Level ${level.id}: "${level.name}" (${level.difficulty})`);
  console.log(
    `       par=${level.par}/${level.spawn.count}  tools=${Object.keys(level.tools).join(', ') || 'none'}`,
  );

  if (result.errors.length > 0) {
    overallValid = false;
    result.errors.forEach((e) => {
      console.log(`  ${RED}ERROR${RESET}  ${e}`);
    });
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => {
      console.log(`  ${YELLOW}WARN${RESET}   ${w}`);
    });
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('         No issues found');
  }
}

console.log('\n' + '='.repeat(50));

if (overallValid) {
  console.log(`${GREEN}${BOLD}All ${levels.length} levels passed validation.${RESET}`);
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}Validation failed — fix errors above before merging.${RESET}`);
  process.exit(1);
}
