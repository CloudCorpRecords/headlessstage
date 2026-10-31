/**
 * headlessstage types.
 *
 * The MCP and CLI layers drive a browser only through the
 * BrowserExecutor interface, so every tool can be exercised with a
 * fake executor in tests. The default executor (in stage.ts) does
 * not bundle or download a browser: it reports a clear error until
 * a real Puppeteer-compatible browser is configured.
 */

/** Options accepted when (re)launching the browser for a navigation. */
export interface LaunchOptions {
  headless?: boolean;
  executablePath?: string;
  args?: string[];
  [key: string]: unknown;
}

export interface NavigateRequest {
  url: string;
  launchOptions?: LaunchOptions;
  allowDangerous?: boolean;
}

export interface ScreenshotRequest {
  name: string;
  selector?: string;
  width?: number;
  height?: number;
  encoded?: boolean;
}

/** What an executor returns for a screenshot. */
export interface ScreenshotResult {
  name: string;
  /** Base64 PNG data when the executor captured an image. */
  data?: string;
  /** Human-readable summary line. */
  text: string;
}

/**
 * A page driver: the smallest surface the seven tools need.
 * Implementations wrap a real browser (Puppeteer-style); tests use
 * an in-memory fake that records calls.
 */
export interface BrowserExecutor {
  navigate(req: NavigateRequest): Promise<string>;
  screenshot(req: Required<Pick<ScreenshotRequest, "name" | "width" | "height">> & ScreenshotRequest): Promise<ScreenshotResult>;
  click(selector: string): Promise<string>;
  hover(selector: string): Promise<string>;
  fill(selector: string, value: string): Promise<string>;
  select(selector: string, value: string): Promise<string>;
  evaluate(script: string): Promise<unknown>;
}
