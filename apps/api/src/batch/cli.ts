#!/usr/bin/env node
/**
 * InterviewKit Batch CLI
 * Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
 *
 * Processes a batch of input cases through the full InterviewKit generation
 * pipeline with complete failure isolation per case and exact JSON output structure.
 */
import 'dotenv/config';
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  BatchInputSchema,
  BatchOutputSchema,
  type BatchCaseOutput,
  type BatchOutput,
} from '@interviewkit/schemas';
import { generateKitPipeline } from '../modules/kits/kit.orchestrator.js';
import { getLLMProvider } from '../services/ai.service.js';

const require = createRequire(import.meta.url);
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .option('input', {
      type: 'string',
      demandOption: true,
      describe: 'Path to input cases JSON file',
    })
    .option('output', {
      type: 'string',
      demandOption: true,
      describe: 'Path to write output kits JSON file',
    })
    .help()
    .parseSync();

  const inputPath = path.resolve(argv.input);
  const outputPath = path.resolve(argv.output);

  console.log('='.repeat(60));
  console.log('InterviewKit Batch Runner');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log('='.repeat(60));

  let rawData: unknown;
  try {
    rawData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  } catch (err) {
    console.error(`Error reading input file: ${String(err)}`);
    process.exit(1);
  }

  const parseResult = BatchInputSchema.safeParse(rawData);
  if (!parseResult.success) {
    console.error('Invalid input cases format:');
    console.error(parseResult.error.format());
    process.exit(1);
  }

  const cases = parseResult.data;
  console.log(`Found ${cases.length} cases to process.\n`);

  const llm = getLLMProvider();
  const kitOutputs: BatchCaseOutput[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    console.log(`[${i + 1}/${cases.length}] Processing case "${c.id}" (${c.company_url})...`);

    try {
      const kit = await generateKitPipeline({
        input: {
          jd: c.jd,
          company_url: c.company_url,
          days: c.days,
        },
        llm,
        onProgress: (step, percent) => {
          console.log(`   [${percent}%] ${step}`);
        },
      });

      kitOutputs.push({
        id: c.id,
        status: 'ok',
        kit,
        error: null,
      });
      console.log(`   ✓ Case "${c.id}" succeeded.\n`);
    } catch (err: unknown) {
      const anyErr = err as { code?: string; message?: string };
      const errorCode = anyErr.code ?? 'PIPELINE_ERROR';
      const errorMessage = anyErr.message ?? String(err);

      console.warn(`   ✗ Case "${c.id}" failed: [${errorCode}] ${errorMessage}\n`);

      // Failure isolation: record failure and continue with remaining cases
      kitOutputs.push({
        id: c.id,
        status: 'failed',
        kit: null,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      });
    }
  }

  const finalOutput: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: kitOutputs,
  };

  // Validate the final batch output against the strict contract
  BatchOutputSchema.parse(finalOutput);

  writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf-8');

  const succeeded = kitOutputs.filter((k) => k.status === 'ok').length;
  const failed = kitOutputs.filter((k) => k.status === 'failed').length;

  console.log('='.repeat(60));
  console.log(`Batch complete. Succeeded: ${succeeded} | Failed: ${failed}`);
  console.log(`Output written to: ${outputPath}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal batch runner error:', err);
  process.exit(1);
});
