import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LANDING_COPY, PRICING_PLANS } from "../src/components/LandingPage/landingContent.js";
import { landingShellPlugin, renderLandingShell } from "./landing-shell.js";

test("landing shell exposes the primary content without JavaScript", () => {
  const shell = renderLandingShell();

  assert.equal((shell.match(/<h1>/g) || []).length, 1);
  assert.match(shell, new RegExp(LANDING_COPY.heading));
  assert.match(shell, /href="\/solutions\/owner\/"/);
  assert.match(shell, /href="\/resources\/"/);
  assert.match(shell, /<section id="static-pricing"/);
  assert.match(shell, /<section class="landing-static-shell__faq">/);

  for (const plan of PRICING_PLANS) {
    assert.match(shell, new RegExp(plan.name));
    assert.match(shell, new RegExp(plan.price.replace(" ", "\\s")));
  }
});

test("landing plugin injects a styled shell and preserves the application entry", () => {
  const input =
    '<html><head></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>';
  const output = landingShellPlugin().transformIndexHtml(input);

  assert.match(output, /<div id="root">\s*<div class="landing-static-shell">/);
  assert.match(output, /<style data-landing-shell>/);
  assert.match(output, /src="\/src\/main\.jsx"/);
});

test("source metadata stays aligned with landing copy", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.ok(html.includes(`<title>${LANDING_COPY.title}</title>`));
  assert.ok(html.includes(`content="${LANDING_COPY.description}"`));

  for (const plan of PRICING_PLANS) {
    assert.ok(html.includes(`"name": "${plan.name}", "price": "${plan.numericPrice}"`));
  }
});
