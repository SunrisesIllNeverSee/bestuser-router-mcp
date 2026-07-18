import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, callTool } from "../tools.mjs";

test("TOOLS exports 6 intent tools", () => {
  assert.equal(TOOLS.length, 6);
  const names = TOOLS.map((t) => t.name);
  assert.ok(names.includes("get_best_operator"));
  assert.ok(names.includes("get_prompt_of_the_day"));
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
  assert.equal(out.metric, "yield");
  assert.equal(out.platform, "all");
});

test("get_best_operator with metric=leverage sorts by leverage", async () => {
  const out = await callTool("get_best_operator", { n: 3, metric: "leverage" });
  assert.ok(out.top_operators);
  assert.equal(out.top_operators.length, 3);
  assert.equal(out.metric, "leverage");
  // Leverage should be descending
  const leverages = out.top_operators.map((o) => o.leverage || 0);
  assert.ok(leverages[0] >= leverages[1], "leverage should be descending");
});

test("get_best_operator with metric=cost_per_million sorts cheapest first", async () => {
  const out = await callTool("get_best_operator", { n: 3, metric: "cost_per_million" });
  assert.ok(out.top_operators);
  assert.equal(out.metric, "cost_per_million");
  // Cheapest (lowest $/M) should be first
  const costs = out.top_operators.map((o) => o.cost_per_million).filter((c) => typeof c === "number");
  if (costs.length >= 2) {
    assert.ok(costs[0] <= costs[1], "cost_per_million should be ascending (cheapest first)");
  }
});

test("get_best_operator with platform=claude filters to claude", async () => {
  const out = await callTool("get_best_operator", { n: 5, platform: "claude" });
  assert.ok(out.top_operators);
  assert.equal(out.platform, "claude");
  // All returned operators should be on claude
  for (const op of out.top_operators) {
    assert.equal(op.platform, "claude", `operator ${op.codename} should be on claude`);
  }
});

test("get_best_operator with invalid metric defaults to yield", async () => {
  const out = await callTool("get_best_operator", { n: 1, metric: "bogus_metric" });
  assert.equal(out.metric, "yield");
});

test("get_prompt_of_the_day returns today's prompt", async () => {
  const out = await callTool("get_prompt_of_the_day", {});
  assert.ok(out.question, "should have a question");
  assert.ok(out.slug, "should have a slug");
  assert.ok(out.metric, "should have a metric");
  assert.ok(out.metric_label, "should have a metric_label");
  assert.ok(out.metric_formula, "should have a metric_formula");
  assert.ok(out.current_leader, "should have a current_leader");
  assert.ok(out.shareable_url, "should have a shareable_url");
  assert.ok(out.shareable_url.includes("signaaf.com"), "url should point to signaaf.com");
  assert.equal(out.cta, "See the full ranking");
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
