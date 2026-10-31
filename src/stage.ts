/**
 * headlessstage core: the seven browser tools over an injectable
 * BrowserExecutor, plus the safety and bookkeeping logic that does
 * not depend on a browser at all:
 *  - URL validation (http, https and file URLs only)
 *  - the dangerous-launch-options guard: Chromium flags that weaken
 *    security are rejected unless allowDangerous is true
 *  - screenshot bookkeeping (name -> result, mirroring the original
 *    server's screenshot:// resources) and a console-log buffer
 *    (mirroring its console://logs resource)
 *
 * The default executor bundles no browser and downloads nothing:
 * every call fails with a clear "no browser configured" error,
 * exactly as the reference server fails when its browser cannot
 * start. Configure a real executor by injecting one, or point
 * HEADLESSSTAGE_BROWSER_WS at a DevTools endpoint in a deployment
 * that provides one (not implemented here; injection is the seam).
 */
import type {
  BrowserExecutor,
  LaunchOptions,
  NavigateRequest,
  ScreenshotRequest,
  ScreenshotResult,
} from "./types.js";

export const VERSION = "0.1.0";

const DANGEROUS_ARGS = ["--no-sandbox", "--disable-web-security", "--allow-insecure-localhost"];

export function findDangerousArgs(opts?: LaunchOptions): string[] {
  const args = opts?.args ?? [];
  return args.filter((a) => DANGEROUS_ARGS.some((d) => a === d || a.startsWith(d + "=")));
}

export class UnavailableBrowserExecutor implements BrowserExecutor {
  private fail(): never {
    throw new Error(
      "Browser unavailable: headlessstage bundles no browser and downloads none. " +
        "Inject a Puppeteer-compatible BrowserExecutor, or run in an environment that provides one.",
    );
  }
  async navigate(): Promise<string> { return this.fail(); }
  async screenshot(): Promise<ScreenshotResult> { return this.fail(); }
  async click(): Promise<string> { return this.fail(); }
  async hover(): Promise<string> { return this.fail(); }
  async fill(): Promise<string> { return this.fail(); }
  async select(): Promise<string> { return this.fail(); }
  async evaluate(): Promise<unknown> { return this.fail(); }
}

export class HeadlessStage {
  private readonly executor: BrowserExecutor;
  private currentUrl: string | null = null;
  private readonly screenshots = new Map<string, ScreenshotResult>();
  private readonly consoleLogs: string[] = [];

  constructor(executor: BrowserExecutor = new UnavailableBrowserExecutor()) {
    this.executor = executor;
  }

  get url(): string | null { return this.currentUrl; }
  getConsoleLogs(): string[] { return [...this.consoleLogs]; }
  logConsole(line: string): void { this.consoleLogs.push(line); }
  getScreenshot(name: string): ScreenshotResult | undefined { return this.screenshots.get(name); }
  listScreenshots(): string[] { return [...this.screenshots.keys()]; }

  async navigate(req: NavigateRequest): Promise<{ url: string; message: string }> {
    let parsed: URL;
    try { parsed = new URL(req.url); } catch { throw new Error(`Invalid URL: ${req.url}`); }
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
      throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
    }
    const dangerous = findDangerousArgs(req.launchOptions);
    if (dangerous.length > 0 && req.allowDangerous !== true) {
      throw new Error(
        `Dangerous launch options rejected (${dangerous.join(", ")}). ` +
          "Pass allowDangerous: true to allow them.",
      );
    }
    const message = await this.executor.navigate(req);
    this.currentUrl = req.url;
    return { url: req.url, message };
  }

  async screenshot(req: ScreenshotRequest): Promise<ScreenshotResult> {
    if (!req.name) throw new Error("Screenshot name is required");
    const full = { width: 800, height: 600, ...req };
    const result = await this.executor.screenshot(full);
    const stored = { ...result, name: req.name };
    this.screenshots.set(req.name, stored);
    return stored;
  }

  async click(selector: string): Promise<string> {
    if (!selector) throw new Error("selector is required");
    return this.executor.click(selector);
  }
  async hover(selector: string): Promise<string> {
    if (!selector) throw new Error("selector is required");
    return this.executor.hover(selector);
  }
  async fill(selector: string, value: string): Promise<string> {
    if (!selector) throw new Error("selector is required");
    return this.executor.fill(selector, value);
  }
  async select(selector: string, value: string): Promise<string> {
    if (!selector) throw new Error("selector is required");
    return this.executor.select(selector, value);
  }
  async evaluate(script: string): Promise<unknown> {
    if (!script) throw new Error("script is required");
    return this.executor.evaluate(script);
  }
}
