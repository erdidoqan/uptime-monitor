import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface ScreenshotOptions {
  timeout?: number; // milliseconds
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

const DEFAULT_OPTIONS: Required<ScreenshotOptions> = {
  timeout: 45000, // 45 seconds
  viewport: {
    width: 1920,
    height: 1080,
  },
  fullPage: true,
  waitUntil: 'networkidle2',
};

/**
 * Take a screenshot of a URL using Puppeteer
 * Optimized for Vercel serverless environment with @sparticuz/chromium-min
 * @param url - The URL to screenshot
 * @param options - Screenshot options
 * @returns Buffer containing the PNG image data
 */
export async function takeScreenshot(
  url: string,
  options?: ScreenshotOptions
): Promise<Buffer> {
  // Validate URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  let browser: any = null;

  try {
    // Configure for Vercel/serverless
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    
    // Check if screenshot is disabled
    if (process.env.DISABLE_SCREENSHOTS === 'true') {
      throw new Error('Screenshot feature is disabled');
    }

    // Launch browser with Vercel-optimized Chromium
    browser = await puppeteer.launch({
      args: isProduction ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      executablePath: isProduction 
        ? await chromium.executablePath() 
        : undefined, // Use system browser in development
      headless: true,
      defaultViewport: config.viewport,
    });

    const page = await browser.newPage();

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: config.waitUntil,
      timeout: config.timeout,
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: config.fullPage,
    });

    // Convert to Buffer if needed
    if (Buffer.isBuffer(screenshot)) {
      return screenshot;
    } else if (screenshot instanceof Uint8Array) {
      return Buffer.from(screenshot);
    } else {
      throw new Error('Unexpected screenshot format');
    }
  } catch (error) {
    // Clean up browser on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        // Ignore close errors
      }
      browser = null;
    }

    // Retry once on failure
    try {
      const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

      browser = await puppeteer.launch({
        args: isProduction ? chromium.args : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        executablePath: isProduction 
          ? await chromium.executablePath() 
          : undefined,
        headless: true,
        defaultViewport: config.viewport,
      });

      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: config.waitUntil,
        timeout: config.timeout,
      });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: config.fullPage,
      });

      if (Buffer.isBuffer(screenshot)) {
        return screenshot;
      } else if (screenshot instanceof Uint8Array) {
        return Buffer.from(screenshot);
      } else {
        throw new Error('Unexpected screenshot format');
      }
    } catch (retryError) {
      throw new Error(
        `Failed to take screenshot after retry: ${
          retryError instanceof Error ? retryError.message : String(retryError)
        }`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
