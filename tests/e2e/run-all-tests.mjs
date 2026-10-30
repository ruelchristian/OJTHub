// tests/e2e/run-all-tests.mjs
// Master Black-Box and End-to-End Test Runner for OJTHub
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTestFile(file, name) {
  console.log(`\n======================================================`);
  console.log(`▶ Running: ${name} (${file})`);
  console.log(`======================================================`);

  return new Promise((resolve) => {
    const child = spawn('node', ['--test', path.join(__dirname, file)], {
      stdio: 'inherit',
      env: { ...process.env, APP_URL: 'http://localhost:5209', BASE_URL: 'http://localhost:5209' }
    });

    child.on('close', (code) => {
      resolve({ file, name, code, passed: code === 0 });
    });
  });
}

async function main() {
  console.log('🚀 Starting OJTHub Comprehensive Black Box & E2E Test Suite...');

  const results = [];
  results.push(await runTestFile('blackbox-api.test.mjs', '1. Black Box API & Security Contract Tests'));
  results.push(await runTestFile('playwright-e2e.test.mjs', '2. Playwright Browser End-to-End (E2E) Tests'));

  console.log(`\n======================================================`);
  console.log(`📊 FINAL TEST EXECUTION SUMMARY`);
  console.log(`======================================================`);

  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${r.name}`);
    if (!r.passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 ALL BLACK BOX AND E2E TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('\n⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
    process.exit(1);
  }
}

main();
