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
  console.log('💡 Close the browser window to signal completion');
  
  // Function to check if we should exit
  const checkAndExit = async () => {
    try {
      const pages = context.pages();
      if (pages.length === 0) {
        console.log('🔚 All browser pages closed - shutting down');
        try {
          await browser.close();
        } catch (e) {
          // Browser might already be closed
        }
        process.exit(0);
      }
    } catch (e) {
      // Context might be closed
      console.log('🔚 Browser context closed - shutting down');
      process.exit(0);
    }
  };
  
  // Set up close handler for the initial page
  page.on('close', () => {
    console.log('📄 Page closed, checking if should exit...');
    checkAndExit();
  });
  
  // Watch for browser disconnection
  browser.on('disconnected', () => {
    console.log('🔚 Browser disconnected - shutting down');
    process.exit(0);
  });
  
  // Watch for context closure
  context.on('close', () => {
    console.log('🔚 Browser context closed - shutting down');
    process.exit(0);
  });
  
  // Watch for new pages and set up close handlers
  context.on('page', (newPage) => {
    console.log('📄 New page opened');
    newPage.on('close', () => {
      console.log('📄 Page closed, checking if should exit...');
      checkAndExit();
    });
  });
  
  // Poll periodically to check if browser is still connected and pages exist
  // This handles cases where the browser window is closed but events don't fire
  const pollInterval = setInterval(() => {
    try {
      if (!browser.isConnected()) {
        console.log('🔚 Browser connection lost (polled) - shutting down');
        clearInterval(pollInterval);
        process.exit(0);
      }
      
      // Check if all pages are closed
      const pages = context.pages();
      if (pages.length === 0) {
        console.log('🔚 All pages closed (polled) - shutting down');
        clearInterval(pollInterval);
        checkAndExit();
      }
    } catch (e) {
      // Browser/context might be closed
      console.log('🔚 Browser check failed (polled) - shutting down');
      clearInterval(pollInterval);
      process.exit(0);
    }
  }, 2000); // Check every 2 seconds
  
  // Keep browser open until closed or completion signal
  await new Promise(() => {});
})().catch((error) => {
  console.error('❌ Fatal error launching browser:', error);
  console.error('Stack:', error.stack);
  // Don't exit - let the container keep running so user can debug
  process.exit(1);
});

