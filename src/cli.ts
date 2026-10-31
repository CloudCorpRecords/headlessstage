#!/usr/bin/env node
/**
 * headlessstage CLI.
 *
 *   headlessstage mcp
 *   headlessstage navigate <url>
 *   headlessstage screenshot <name> [selector]
 *   headlessstage click <selector>
 *   headlessstage fill <selector> <value>
 *   headlessstage evaluate <script>
 *   headlessstage --version
 *
 * Exit codes: 0 success, 1 browser error, 2 usage error. Without a
 * configured browser executor the browser commands fail with the
 * core's "Browser unavailable" message (exit 1), never a fake page.
 */
import { HeadlessStage, VERSION } from "./stage.js";

function usage(): never {
  console.error(`Usage:
  headlessstage mcp
  headlessstage navigate <url>
  headlessstage screenshot <name> [selector]
  headlessstage click <selector>
  headlessstage fill <selector> <value>
  headlessstage evaluate <script>
  headlessstage --version`);
  process.exit(2);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") { console.log(VERSION); return; }
  if (cmd === "mcp") { await import("./mcp.js"); return; }
  if (!cmd) usage();
  try {
    const stage = new HeadlessStage();
    if (cmd === "navigate") {
      const [url] = rest; if (!url) usage();
      console.log((await stage.navigate({ url })).message);
    } else if (cmd === "screenshot") {
      const [name, selector] = rest; if (!name) usage();
      console.log(JSON.stringify(await stage.screenshot({ name, selector }), null, 2));
    } else if (cmd === "click") {
      const [sel] = rest; if (!sel) usage();
      console.log(await stage.click(sel));
    } else if (cmd === "fill") {
      const [sel, value] = rest; if (!sel || value === undefined) usage();
      console.log(await stage.fill(sel, value));
    } else if (cmd === "evaluate") {
      const script = rest.join(" "); if (!script) usage();
      console.log(JSON.stringify(await stage.evaluate(script)));
    } else usage();
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
void main();
