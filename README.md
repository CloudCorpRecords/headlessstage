# headlessstage

Browser automation through a headless browser page, as a CLI and a
stdio MCP server in one bin. Navigate to a URL, click, hover, fill
and select form elements, take named screenshots and evaluate
JavaScript in the page.

The browser itself sits behind an injectable executor interface
(`BrowserExecutor` in `src/types.ts`). This package bundles no
browser and downloads none: with no executor configured, browser
commands fail with a clear "Browser unavailable" error. Deployments
inject a Puppeteer-compatible executor to drive a real browser.
Launch options that weaken browser security (`--no-sandbox`,
`--disable-web-security`, `--allow-insecure-localhost`) are
rejected unless a call explicitly passes `allowDangerous: true`.

## Install

```bash
npx -y @reneturcios/headlessstage mcp
```

## CLI

```bash
headlessstage mcp                     # stdio MCP server
headlessstage navigate <url>
headlessstage screenshot <name> [selector]
headlessstage click <selector>
headlessstage fill <selector> <value>
headlessstage evaluate <script>
headlessstage --version
```

Exit codes: 0 success, 1 browser error, 2 usage error.

## MCP tools

| Tool | Purpose |
|---|---|
| `puppeteer_navigate` | Navigate to any URL in the browser |
| `puppeteer_screenshot` | Capture screenshots of the entire page or specific elements |
| `puppeteer_click` | Click elements on the page |
| `puppeteer_hover` | Hover elements on the page |
| `puppeteer_fill` | Fill out input fields |
| `puppeteer_select` | Select an element with a SELECT tag |
| `puppeteer_evaluate` | Execute JavaScript in the browser console |

MCP client config:

```json
{
  "mcpServers": {
    "headlessstage": {
      "command": "npx",
      "args": ["-y", "@reneturcios/headlessstage", "mcp"]
    }
  }
}
```

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/headlessstage          # MCP server
docker run --rm ghcr.io/cloudcorprecords/headlessstage --version
```

## Development

```bash
npm install
npm run build
npm test
```

MIT license.
