#!/usr/bin/env node
/**
 * InterviewKit Batch CLI
 * Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
 *
 * Full implementation in Phase 18.
 */
import 'dotenv/config';
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('input', { type: 'string', demandOption: true, describe: 'Path to input cases JSON file' })
  .option('output', { type: 'string', demandOption: true, describe: 'Path to write output kits JSON file' })
  .parseSync();

console.log(`InterviewKit batch runner`);
console.log(`Input:  ${argv.input}`);
console.log(`Output: ${argv.output}`);

// Stub output — full implementation in Phase 18
const inputPath = path.resolve(argv.input);
const outputPath = path.resolve(argv.output);

const cases = JSON.parse(readFileSync(inputPath, 'utf-8')) as unknown[];

const result = {
  version: '1.0',
  generated_at: new Date().toISOString(),
  kits: cases.map((c: unknown) => ({
    id: (c as { id: string }).id,
    status: 'failed',
    kit: null,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Batch pipeline not yet implemented (Phase 18)',
    },
  })),
};

writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Output written to ${outputPath}`);
