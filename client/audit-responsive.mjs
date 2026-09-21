import { chromium } from 'playwright';

const breakpoints = [
  { name: 'Mobile Mini', width: 320, height: 640 },
  { name: 'Mobile Standard (iPhone SE/older)', width: 375, height: 667 },
  { name: 'Mobile Modern (iPhone 14/15)', width: 390, height: 844 },
  { name: 'Mobile Max (Pro Max/Plus)', width: 430, height: 932 },
  { name: 'Tablet Portrait (iPad Mini/Air)', width: 768, height: 1024 },
  { name: 'Tablet (iPad Pro 11)', width: 820, height: 1180 },
  { name: 'Laptop Small', width: 1024, height: 768 },
  { name: 'Desktop Standard', width: 1280, height: 800 },
  { name: 'Large Desktop', width: 1440, height: 900 }
];

const tabs = [
  { id: 'dashboard', label: 'Time Clock' },
  { id: 'history', label: 'Attendance History' },
  { id: 'activities', label: 'Activity Logs' },
  { id: 'reports', label: 'AI Reports' },
  { id: 'documents', label: 'DTR Documents' },
  { id: 'settings', label: 'Settings' },
  { id: 'account', label: 'Account / Login' }
];

async function runAudit() {
  console.log('🚀 Launching automated responsive audit...');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 14.5547, longitude: 121.0244 }
  });
  const page = await context.newPage();

  console.log('🌐 Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  let totalTests = 0;
  let passedTests = 0;
  const issues = [];

  for (const bp of breakpoints) {
    console.log(`\n📱 Testing Viewport: ${bp.name} (${bp.width}x${bp.height})`);
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(200);

    for (const tab of tabs) {
      totalTests++;
      
      // Select tab by directly triggering click via evaluate for 100% instant reliability
      await page.evaluate((tabId) => {
        const buttons = Array.from(document.querySelectorAll(`button[data-tab="${tabId}"]`));
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          // Find visible button
          if (rect.width > 0 && rect.height > 0) {
            btn.click();
            return;
          }
        }
      }, tab.id);

      await page.waitForTimeout(100);

      // Check for horizontal overflow
      const result = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const clientWidth = docEl.clientWidth;
        const hasHorizontalScroll = scrollWidth > clientWidth + 1;

        let offender = null;
        if (hasHorizontalScroll) {
          const elements = document.querySelectorAll('*');
          for (const el of elements) {
            if (el.scrollWidth > clientWidth + 2 && !['PRE', 'CODE'].includes(el.tagName)) {
              const style = window.getComputedStyle(el);
              if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
                offender = {
                  tag: el.tagName,
                  className: el.className ? String(el.className).slice(0, 50) : '',
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth
                };
                break;
              }
            }
          }
        }

        return {
          hasHorizontalScroll,
          scrollWidth,
          clientWidth,
          offender
        };
      });

      if (!result.hasHorizontalScroll) {
        passedTests++;
        console.log(`  ✓ [${tab.id}] width: ${result.clientWidth}px | scrollWidth: ${result.scrollWidth}px (OK)`);
      } else {
        const issueMsg = `  ✗ [${tab.id}] Overflow: scrollWidth ${result.scrollWidth}px > clientWidth ${result.clientWidth}px`;
        console.warn(issueMsg);
        if (result.offender) {
          console.warn(`    Offender: <${result.offender.tag} class="${result.offender.className}"> (${result.offender.scrollWidth}px)`);
        }
        issues.push({
          viewport: `${bp.name} (${bp.width}px)`,
          tab: tab.id,
          scrollWidth: result.scrollWidth,
          clientWidth: result.clientWidth,
          offender: result.offender
        });
      }
    }
  }

  await browser.close();

  console.log('\n===========================================');
  console.log(`Responsive Audit Results: ${passedTests}/${totalTests} checks passed.`);
  if (issues.length === 0) {
    console.log('🎉 ALL BREAKPOINTS AND ALL VIEWS ARE 100% RESPONSIVE (0 OVERFLOW DETECTED)!');
  } else {
    console.log(`⚠️ Issues found: ${issues.length}`);
  }
  console.log('===========================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
