import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HeadlessStage, findDangerousArgs } from "../src/stage.js";
import type { BrowserExecutor, NavigateRequest, ScreenshotRequest, ScreenshotResult } from "../src/types.js";

class FakeBrowser implements BrowserExecutor {
  calls: string[] = [];
  async navigate(req: NavigateRequest): Promise<string> { this.calls.push(`navigate:${req.url}`); return `Navigated to ${req.url}`; }
  async screenshot(req: ScreenshotRequest): Promise<ScreenshotResult> { this.calls.push(`screenshot:${req.name}:${req.width}x${req.height}`); return { name: req.name, data: "aGVsbG8=", text: `Screenshot '${req.name}' taken` }; }
  async click(s: string): Promise<string> { this.calls.push(`click:${s}`); return `Clicked ${s}`; }
  async hover(s: string): Promise<string> { this.calls.push(`hover:${s}`); return `Hovered ${s}`; }
  async fill(s: string, v: string): Promise<string> { this.calls.push(`fill:${s}=${v}`); return `Filled ${s}`; }
  async select(s: string, v: string): Promise<string> { this.calls.push(`select:${s}=${v}`); return `Selected ${v}`; }
  async evaluate(script: string): Promise<unknown> { this.calls.push(`evaluate:${script}`); return 42; }
}

describe("headlessstage core", () => {
  it("navigates and records the current URL", async () => {
    const fake = new FakeBrowser(); const stage = new HeadlessStage(fake);
    const r = await stage.navigate({ url: "https://example.com/" });
    assert.equal(r.url, "https://example.com/"); assert.equal(stage.url, "https://example.com/");
    assert.deepEqual(fake.calls, ["navigate:https://example.com/"]);
  });
  it("rejects invalid and non-web URLs before touching the browser", async () => {
    const fake = new FakeBrowser(); const stage = new HeadlessStage(fake);
    await assert.rejects(() => stage.navigate({ url: "not a url" }), /Invalid URL/);
    await assert.rejects(() => stage.navigate({ url: "javascript:alert(1)" }), /Unsupported URL protocol/);
    assert.deepEqual(fake.calls, []);
  });
  it("rejects dangerous launch args unless explicitly allowed", async () => {
    const stage = new HeadlessStage(new FakeBrowser());
    await assert.rejects(
      () => stage.navigate({ url: "https://x.test/", launchOptions: { args: ["--no-sandbox"] } }),
      /Dangerous launch options rejected/,
    );
    const ok = await stage.navigate({ url: "https://x.test/", launchOptions: { args: ["--no-sandbox"] }, allowDangerous: true });
    assert.equal(ok.url, "https://x.test/");
  });
  it("findDangerousArgs flags exact and =-suffixed flags only", () => {
    assert.deepEqual(findDangerousArgs({ args: ["--headless", "--disable-web-security=false"] }), ["--disable-web-security=false"]);
    assert.deepEqual(findDangerousArgs({ args: ["--window-size=800,600"] }), []);
    assert.deepEqual(findDangerousArgs(undefined), []);
  });
  it("screenshot applies the 800x600 defaults and stores by name", async () => {
    const fake = new FakeBrowser(); const stage = new HeadlessStage(fake);
    const r = await stage.screenshot({ name: "home" });
    assert.equal(r.name, "home"); assert.deepEqual(fake.calls, ["screenshot:home:800x600"]);
    assert.deepEqual(stage.listScreenshots(), ["home"]);
    assert.equal(stage.getScreenshot("home")?.data, "aGVsbG8=");
  });
  it("screenshot requires a name", async () => {
    const stage = new HeadlessStage(new FakeBrowser());
    await assert.rejects(() => stage.screenshot({ name: "" }), /name is required/);
  });
  it("click, hover, fill and select delegate with their arguments", async () => {
    const fake = new FakeBrowser(); const stage = new HeadlessStage(fake);
    assert.equal(await stage.click("#go"), "Clicked #go");
    assert.equal(await stage.hover("#menu"), "Hovered #menu");
    assert.equal(await stage.fill("#q", "hi"), "Filled #q");
    assert.equal(await stage.select("#country", "fr"), "Selected fr");
    assert.deepEqual(fake.calls, ["click:#go", "hover:#menu", "fill:#q=hi", "select:#country=fr"]);
  });
  it("empty selectors are rejected", async () => {
    const stage = new HeadlessStage(new FakeBrowser());
    await assert.rejects(() => stage.click(""), /selector is required/);
    await assert.rejects(() => stage.fill("", "x"), /selector is required/);
  });
  it("evaluate returns the executor's value", async () => {
    const stage = new HeadlessStage(new FakeBrowser());
    assert.equal(await stage.evaluate("6*7"), 42);
    await assert.rejects(() => stage.evaluate(""), /script is required/);
  });
  it("the default executor fails honestly with no browser configured", async () => {
    const stage = new HeadlessStage();
    await assert.rejects(() => stage.navigate({ url: "https://example.com/" }), /Browser unavailable/);
  });
  it("console log buffer mirrors the console resource", () => {
    const stage = new HeadlessStage(new FakeBrowser());
    stage.logConsole("hello"); stage.logConsole("world");
    assert.deepEqual(stage.getConsoleLogs(), ["hello", "world"]);
  });
});
