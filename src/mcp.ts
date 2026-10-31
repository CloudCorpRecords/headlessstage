/**
 * headlessstage MCP server. Tools: puppeteer_navigate,
 * puppeteer_screenshot, puppeteer_click, puppeteer_hover,
 * puppeteer_fill, puppeteer_select, puppeteer_evaluate.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects two keys
 * that are not in this toolset's public spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file therefore serves tools/list with
 * the spec's exact input schemas, while zod still validates every
 * tools/call argument set.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { HeadlessStage, VERSION } from "./stage.js";

const NavigateArgs = z.object({
  url: z.string(),
  launchOptions: z.record(z.string(), z.unknown()).optional(),
  allowDangerous: z.boolean().optional(),
});
const ScreenshotArgs = z.object({
  name: z.string(),
  selector: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  encoded: z.boolean().optional(),
});
const SelectorArgs = z.object({ selector: z.string() });
const FillArgs = z.object({ selector: z.string(), value: z.string() });
const EvaluateArgs = z.object({ script: z.string() });

const TOOLS = [
  {
    name: "puppeteer_navigate",
    description: "Navigate to any URL in the browser",
    inputSchema: {
      type: "object" as const,
      properties: {
        allowDangerous: { type: "boolean", description: "Whether to allow dangerous launch options such as disabling the browser sandbox" },
        launchOptions: { type: "object", description: "Optional Puppeteer launch options object for the browser instance" },
        url: { type: "string", description: "The URL to navigate the browser to" },
      },
      required: ["url"],
    },
  },
  {
    name: "puppeteer_screenshot",
    description: "Capture screenshots of the entire page or specific elements",
    inputSchema: {
      type: "object" as const,
      properties: {
        encoded: { type: "boolean", description: "Whether to return the screenshot as a base64 encoded data URL" },
        height: { type: "number", description: "Optional viewport height in pixels for the screenshot" },
        name: { type: "string", description: "The name to store the screenshot under" },
        selector: { type: "string", description: "Optional CSS selector of the element to screenshot; the full page is captured when omitted" },
        width: { type: "number", description: "Optional viewport width in pixels for the screenshot" },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_click",
    description: "Click elements on the page",
    inputSchema: {
      type: "object" as const,
      properties: { selector: { type: "string", description: "The CSS selector of the element to click" } },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_hover",
    description: "Hover elements on the page",
    inputSchema: {
      type: "object" as const,
      properties: { selector: { type: "string", description: "The CSS selector of the element to hover over" } },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_fill",
    description: "Fill out input fields",
    inputSchema: {
      type: "object" as const,
      properties: { selector: { type: "string", description: "The CSS selector of the input field to fill" }, value: { type: "string", description: "The value to enter into the field" } },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_select",
    description: "Select an element with a SELECT tag",
    inputSchema: {
      type: "object" as const,
      properties: { selector: { type: "string", description: "The CSS selector of the SELECT element" }, value: { type: "string", description: "The option value to select" } },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_evaluate",
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object" as const,
      properties: { script: { type: "string", description: "The JavaScript code to execute in the browser console" } },
      required: ["script"],
    },
  },
];

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}
function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }], isError: true };
}

const stage = new HeadlessStage();
const server = new Server({ name: "headlessstage", version: VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "puppeteer_navigate": {
        const p = NavigateArgs.parse(args ?? {});
        return textResult(await stage.navigate(p as never));
      }
      case "puppeteer_screenshot": {
        const p = ScreenshotArgs.parse(args ?? {});
        const r = await stage.screenshot(p);
        if (p.encoded && r.data) return textResult(`data:image/png;base64,${r.data}`);
        return textResult(r);
      }
      case "puppeteer_click": return textResult(await stage.click(SelectorArgs.parse(args ?? {}).selector));
      case "puppeteer_hover": return textResult(await stage.hover(SelectorArgs.parse(args ?? {}).selector));
      case "puppeteer_fill": { const p = FillArgs.parse(args ?? {}); return textResult(await stage.fill(p.selector, p.value)); }
      case "puppeteer_select": { const p = FillArgs.parse(args ?? {}); return textResult(await stage.select(p.selector, p.value)); }
      case "puppeteer_evaluate": return textResult(await stage.evaluate(EvaluateArgs.parse(args ?? {}).script));
    }
  } catch (err) { return errorResult(err); }
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main(): Promise<void> { await server.connect(new StdioServerTransport()); }
void main();
