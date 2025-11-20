const { chromium } = require('playwright');

(async () => {
  const url = process.env.TARGET_URL;
  const credentialsPath = process.env.CREDENTIALS_PATH;

  if (!url) {
    console.error('Error: TARGET_URL environment variable is required');
    process.exit(1);
  }

  if (!credentialsPath) {
    console.error('Error: CREDENTIALS_PATH environment variable is required');
    process.exit(1);
  }

  console.log(`🚀 Launching Chromium browser...`);
  console.log(`🌐 Navigating to: ${url}`);
  console.log(`📁 Using credentials path: ${credentialsPath}`);

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const context = await browser.newContext({
    userDataDir: credentialsPath,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    // Use a realistic user agent to avoid detection
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Remove automation indicators
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation', 'notifications'],
    // Add extra HTTP headers to appear more legitimate
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  
  // Remove webdriver property that identifies automation
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // Override plugins to appear more realistic
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  // Try to navigate, but don't fail if it doesn't work
  try {
    console.log(`⏳ Attempting to navigate to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('✅ Successfully navigated to target URL');
  } catch (error) {
    console.error(`⚠️  Navigation failed: ${error.message}`);
    console.log('🔄 Browser will remain open - you can navigate manually via VNC');
    // Navigate to a blank page or about:blank so the browser is visible
    try {
      await page.goto('about:blank');
    } catch (e) {
      // Ignore errors on about:blank
    }
  }
  
  console.log('🔄 Browser is open and ready for interaction via VNC');
  
  // Keep browser open indefinitely
  await new Promise(() => {});
})().catch((error) => {
  console.error('❌ Fatal error launching browser:', error);
  console.error('Stack:', error.stack);
  // Don't exit - let the container keep running so user can debug
  process.exit(1);
});

