import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, callTool } from "../tools.mjs";

test("TOOLS exports 5 intent tools", () => {
  assert.equal(TOOLS.length, 5);
  const names = TOOLS.map((t) => t.name);
  assert.ok(names.includes("get_best_operator"));
  assert.ok(names.includes("compare_self"));
  assert.ok(names.includes("compare_operators"));
  assert.ok(names.includes("describe_power_user"));
  assert.ok(names.includes("optimize_efficiency"));
});

test("describe_power_user returns static response with CTA", async () => {
  const out = await callTool("describe_power_user", {});
  assert.ok(out.description);
  assert.ok(out.metrics_explained);
  assert.ok(out.class_tiers);
  assert.equal(out.cta, "Learn the scoring");
  assert.ok(out.link.includes("signalaf.com"));
});

test("get_best_operator with n=1 returns top operator", async () => {
  const out = await callTool("get_best_operator", { n: 1 });
  assert.ok(out.top_operators);
  assert.equal(out.top_operators.length, 1);
  assert.ok(out.summary);
  assert.equal(out.cta, "Check my rank");
  assert.ok(out.total_operators > 0);
});

test("compare_self with text scores locally", async () => {
  // MOSES seed: (1_251_211, 11_296_121, 128_196_310, 2_555_179_769) → Υ 18436.98
  const out = await callTool("compare_self", {
    text: "1251211 11296121 128196310 2555179769",
  });
  assert.equal(out.your_metrics.codename, "you (local)");
  assert.ok(out.your_metrics.yield_ > 1000, "MOSES yield should be high");
  assert.ok(out.power_user_assessment);
  assert.ok(out.comparison);
  assert.equal(out.cta, "See where I stand");
});

test("compare_self requires codename or text", async () => {
  await assert.rejects(
    () => callTool("compare_self", {}),
    /requires either/,
  );
});

test("compare_operators requires both codenames", async () => {
  await assert.rejects(
    () => callTool("compare_operators", { codename_a: "test" }),
    /requires both/,
  );
});

test("optimize_efficiency with text returns suggestions", async () => {
  const out = await callTool("optimize_efficiency", {
    text: "100000 50000 10000 5000",
  });
  assert.ok(out.your_metrics);
  assert.ok(Array.isArray(out.suggestions));
  assert.ok(out.suggestions.length > 0);
  assert.equal(out.cta, "Improve my score");
});

test("optimize_efficiency requires codename or text", async () => {
  await assert.rejects(
    () => callTool("optimize_efficiency", {}),
    /requires either/,
  );
});

test("unknown tool throws", async () => {
  await assert.rejects(
    () => callTool("nonexistent_tool", {}),
    /Unknown tool/,
  );
});
