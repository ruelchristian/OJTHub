// tests/e2e/playwright-e2e.test.mjs
// Comprehensive Browser End-to-End (E2E) Test Suite for OJTHub using Playwright
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '../../client/node_modules/playwright/index.mjs';

const APP_URL = process.env.APP_URL || 'http://localhost:5209';

// One Corporate Centre (OCC) Coordinates
const OCC_LAT = 14.583916;
const OCC_LNG = 121.063291;

test('OJTHub Playwright Browser E2E Test Suite', async (t) => {
  let browser;

  test.before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  test.after(async () => {
    if (browser) await browser.close();
  });

  // =========================================================================
  // Scenario 1: Trainee Student Full Workflow
  // =========================================================================
  await t.test('Scenario 1: Student Trainee E2E Journey', async (s1) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['geolocation'],
      geolocation: { latitude: OCC_LAT, longitude: OCC_LNG }
    });

    const page = await context.newPage();

    // 1. Visit landing page
    await s1.test('1.1 Should display landing / AuthModal with demo buttons', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      const title = await page.title();
      assert.ok(title.includes('OJTHub'));

      const studentDemoBtn = page.locator('button:has-text("Student Demo")');
      await studentDemoBtn.waitFor({ state: 'visible', timeout: 8000 });
      assert.ok(await studentDemoBtn.isVisible());
    });

    // 2. Perform 1-Click Student Demo Login
    await s1.test('1.2 Should login via Student Demo and navigate to Trainee Dashboard', async () => {
      const studentDemoBtn = page.locator('button:has-text("Student Demo")');
      await studentDemoBtn.click();

      // Wait for navigation to /dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      assert.ok(page.url().includes('/dashboard'));

      // Verify dashboard greetings / student name & company
      await page.waitForSelector('text=ONE CORPORATE CENTRE (OCC)', { timeout: 8000 });
      const pageText = await page.innerText('body');
      assert.ok(pageText.includes('One Corporate Centre') || pageText.includes('ONE CORPORATE CENTRE'));
      assert.ok(pageText.includes('Ruel'));
    });

    // 3. Verify Geofence Status Badge & Proximity
    await s1.test('1.3 Should verify Geofence status and workplace parameters', async () => {
      await page.waitForTimeout(1000);
      const pageText = await page.innerText('body');
      assert.ok(pageText.includes('Inside Workplace Perimeter') || pageText.includes('Within Geofence') || pageText.includes('Geofenced Attendance Console'));
    });

    // 4. Navigate to Daily Journal & Test AI Polish
    await s1.test('1.4 Should navigate to Daily Journal and test AI Polish', async () => {
      // Click Journal tab using desktop navbar button
      const journalTab = page.locator('button[data-tab="journal"]').first();
      await journalTab.waitFor({ state: 'visible', timeout: 8000 });
      await journalTab.click();
      await page.waitForURL('**/journal', { timeout: 8000 });

      // Check Journal UI loaded
      const taskInput = page.locator('input[placeholder*="Fixed customer login bug"]');
      await taskInput.waitFor({ state: 'visible', timeout: 8000 });

      // Enter Task Title & rough details
      await taskInput.fill('Automated End-to-End Testing Verification');

      const detailsTextarea = page.locator('textarea[placeholder*="Describe what you worked on"]');
      await detailsTextarea.fill('wrote full playwright tests and checked all api routes');

      // Click "AI Polish" button
      const aiPolishBtn = page.locator('button:has-text("AI Polish")');
      assert.ok(await aiPolishBtn.isVisible());
      await aiPolishBtn.click();

      // Wait for the textarea to be updated with polished content
      await page.waitForFunction(
        () => {
          const ta = document.querySelector('textarea[placeholder*="Describe what you worked on"]');
          return ta && ta.value.length > 0 && ta.value.includes('Tested and confirmed');
        },
        { timeout: 10000 }
      );

      const polishedValue = await detailsTextarea.inputValue();
      assert.ok(polishedValue.length > 10, 'Polished text should be non-empty');
      assert.ok(!polishedValue.toLowerCase().includes('spearheaded'), 'Must not contain corporate jargon');

      // Save the journal entry
      const saveBtn = page.locator('button:has-text("Save Journal Entry")');
      await saveBtn.click();

      // Verify entry appears in list
      await page.waitForSelector('text=Automated End-to-End Testing Verification', { timeout: 8000 });
      assert.ok(await page.locator('text=Automated End-to-End Testing Verification').first().isVisible());
    });

    // 5. Practicum Milestone Synthesis & Submission
    await s1.test('1.5 Should synthesize milestone narrative and submit to teacher', async () => {
      // Find milestone button in Journal (e.g. 243h or Midterm or 100h)
      const milestoneBtn = page.locator('button:has-text("243h"), button:has-text("Midterm"), button:has-text("100h")').first();
      await milestoneBtn.waitFor({ state: 'visible', timeout: 8000 });
      await milestoneBtn.click();

      // Verify milestone modal opened
      await page.waitForSelector('text=OJT Milestone Summary', { timeout: 8000 });

      // Verify submit or already submitted button
      const submitBtn = page.locator('button:has-text("Submit to Teacher"), button:has-text("Submitted")').first();
      await submitBtn.waitFor({ state: 'visible', timeout: 8000 });

      if ((await submitBtn.innerText()).includes('Submit to Teacher')) {
        await submitBtn.click();
        await page.waitForSelector('button:has-text("Submitted")', { timeout: 8000 });
      }

      // Close modal
      const closeBtn = page.locator('button:has-text("Close")').last();
      await closeBtn.click();
    });

    // 6. Navigate to Attendance History & Test Interactive PDF Preview
    await s1.test('1.6 Should navigate to History and open Interactive DTR PDF Preview', async () => {
      const historyTab = page.locator('button[data-tab="history"]').first();
      await historyTab.waitFor({ state: 'visible', timeout: 8000 });
      await historyTab.click();
      await page.waitForURL('**/history', { timeout: 8000 });

      // Find "Preview DTR" button
      const previewPdfBtn = page.locator('button:has-text("Preview DTR")');
      await previewPdfBtn.waitFor({ state: 'visible', timeout: 8000 });
      await previewPdfBtn.click();

      // Verify PDF Preview modal opened
      await page.waitForSelector('text=Official DTR PDF', { timeout: 10000 });
      assert.ok(await page.locator('text=Official DTR PDF').first().isVisible());

      // Close modal with Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    });

    // 7. Logout
    await s1.test('1.7 Should logout cleanly', async () => {
      const logoutBtn = page.locator('button[title="Log out"]');
      await logoutBtn.waitFor({ state: 'visible', timeout: 8000 });
      await logoutBtn.click();

      // Should return to login state
      await page.waitForSelector('button:has-text("Student Demo")', { timeout: 8000 });
      assert.ok(await page.locator('button:has-text("Student Demo")').isVisible());
    });

    await context.close();
  });

  // =========================================================================
  // Scenario 2: Teacher / Supervisor Portal Full Workflow
  // =========================================================================
  await t.test('Scenario 2: Teacher / Supervisor Coordinator E2E Journey', async (s2) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // 1. Visit app and login via Teacher Demo
    await s2.test('2.1 Should login as Supervisor / Teacher demo account', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      const teacherDemoBtn = page.locator('button:has-text("Teacher Demo")');
      await teacherDemoBtn.waitFor({ state: 'visible', timeout: 8000 });
      await teacherDemoBtn.click();

      // Wait for navigation to /supervisor
      await page.waitForURL('**/supervisor', { timeout: 10000 });
      assert.ok(page.url().includes('/supervisor'));
    });

    // 2. Verify Supervisor Code Display
    await s2.test('2.2 Should display Supervisor Invite Code ICCT-2026', async () => {
      await page.waitForSelector('text=ICCT-2026', { timeout: 8000 });
      const content = await page.content();
      assert.ok(content.includes('ICCT-2026'), 'Supervisor code ICCT-2026 must be present');
    });

    // 3. Verify Trainee Roster
    await s2.test('2.3 Should display Trainee Roster with student card', async () => {
      await page.waitForSelector('text=Ruel Christian Umel', { timeout: 8000 });
      const traineeName = page.locator('text=Ruel Christian Umel').first();
      assert.ok(await traineeName.isVisible());
    });

    // 4. Click Inspect & Verify and Check Trainee Details Modal
    await s2.test('2.4 Should inspect trainee and verify milestone evaluation bar', async () => {
      const inspectBtn = page.locator('button:has-text("Inspect & Verify")').first();
      await inspectBtn.waitFor({ state: 'visible', timeout: 8000 });
      await inspectBtn.click();

      // Verify modal opened and wait for submitted badge to load
      await page.waitForSelector('text=Internship Activity Milestones', { timeout: 8000 });
      await page.waitForSelector('text=Submitted', { timeout: 8000 });
      const pageText = await page.innerText('body');
      assert.ok(pageText.includes('Ruel Christian Umel'));
      assert.ok(pageText.includes('Internship Activity Milestones'));
      assert.ok(pageText.toUpperCase().includes('SUBMITTED'), 'Should display green Submitted badge from student submission');
    });

    // 5. Test Manual Shift Entry / Excuse Slip Modal
    await s2.test('2.5 Should open and verify Manual Attendance Entry modal', async () => {
      const addHoursBtn = page.locator('button:has-text("Add Manual Hours")').first();
      await addHoursBtn.waitFor({ state: 'visible', timeout: 8000 });
      await addHoursBtn.click();

      // Verify manual entry fields are visible
      await page.waitForSelector('input[type="time"]', { timeout: 8000 });
      const modalText = await page.innerText('body');
      assert.ok(modalText.includes('Credit official hours manually') || modalText.includes('Add Manual Hours'));
    });

    await context.close();
  });

  // =========================================================================
  // Scenario 3: Geofence Out-of-Bounds Detection
  // =========================================================================
  await t.test('Scenario 3: Geofence Out-of-Bounds Detection', async (s3) => {
    // Set location 15 km away from One Corporate Centre (e.g. Quezon City / Marikina)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['geolocation'],
      geolocation: { latitude: 14.650000, longitude: 121.150000 }
    });

    const page = await context.newPage();

    await s3.test('3.1 Should display Outside Workplace Boundary status when far from workplace', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      const studentDemoBtn = page.locator('button:has-text("Student Demo")');
      await studentDemoBtn.waitFor({ state: 'visible', timeout: 8000 });
      await studentDemoBtn.click();

      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // In out-of-bounds coordinates, UI displays Outside Workplace Boundary
      await page.waitForSelector('text=Outside Workplace Boundary', { timeout: 10000 });
      const pageText = await page.innerText('body');
      assert.ok(pageText.includes('Outside Workplace Boundary'));
    });

    await context.close();
  });
});
