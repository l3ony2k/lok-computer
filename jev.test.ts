import { describe, expect, test } from "bun:test";
import {
  JevError,
  LIMITS,
  ORDER_CHECK_SUFFIX,
  buildJevQuestions,
  buildSuppliedState,
  choiceConfidence,
  extractJsonObject,
  formResult,
  normalizePlan,
  normalizePlannerReply,
  optionLabel,
  planQuestions,
  runJevRequest,
  toPropertyName,
  withAsOfDate,
} from "./jev.js";
import worker from "./worker.js";

const plannerReply = (content: unknown) => new Response(JSON.stringify({
  model: "planner-test",
  choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
}));

const jevReply = (answers: Record<string, unknown>) => new Response(JSON.stringify({
  model: "jev-1.13.0",
  answers,
  usage: { input_tokens: 300, output_tokens: 40 },
}));

const env = { TYPESAFE_API_KEY: "ts-key", AI_BASE_URL: "https://planner.test", AI_API_KEY: "ai-key", AI_MODEL: "fast" };

/** A planner reply as the prompt asks for it: an answer question plus analytics. */
const plannerPlan = {
  kind: "plan",
  summary: "Judging a review.",
  rationale: "Sentiment is one of a few categories.",
  state: { review: "Battery died after two days, gorgeous screen." },
  answer: {
    key: "sentiment",
    label: "Overall sentiment",
    type: "choice",
    instructions: "What is the overall sentiment of `review`?",
    criteria: { positive: "Mostly praise", mixed: null, negative: "Mostly complaints" },
  },
  analytics: [
    { key: "battery_complaint", label: "Battery complaint", type: "noul", instructions: "Does `review` complain about the battery?", criteria: { true: "Yes", false: "No" } },
    { key: "satisfaction", label: "Satisfaction", type: "score", instructions: "How satisfied is the reviewer?", criteria: ["Unhappy", "Neutral", "Happy"] },
  ],
};

const jevAnswers = {
  sentiment: { type: "choice", choice: "mixed", confidence: 0.9, probabilities: { positive: 0.04, mixed: 0.95, negative: 0.01 } },
  [`sentiment${ORDER_CHECK_SUFFIX}`]: { type: "choice", choice: "mixed", confidence: 0.86, probabilities: { negative: 0.02, mixed: 0.91, positive: 0.07 } },
  battery_complaint: { type: "noul", noul: 0.981 },
  satisfaction: { type: "score", score: 0.62, confidence: 0.61, legend: { 0: "Unhappy", 1: "Neutral", 2: "Happy" }, probabilities: { 0: 0.4, 1: 0.58, 2: 0.02 } },
};

const expectInvalid = (run: () => unknown) => {
  try {
    run();
    throw new Error("expected rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(JevError);
    expect((error as JevError).code).toBe("invalid_plan");
  }
};

describe("Jev plan validation", () => {
  test("normalizes property names and option keys", () => {
    expect(toPropertyName("isUrgent")).toBe("is_urgent");
    expect(toPropertyName("Café Rating!")).toBe("cafe_rating");
    expect(toPropertyName("2nd pass")).toBe("p_2nd_pass");
    expect(toPropertyName("  ")).toBeNull();

    const plan = normalizePlan({
      state: "Hi",
      questions: { "Tone Check": { type: "CHOICE", instructions: "Tone?", criteria: ["Very Formal", "casual"] } },
    });
    expect(Object.keys(plan.questions)).toEqual(["tone_check"]);
    expect(plan.questions.tone_check.criteria).toEqual({ very_formal: null, casual: null });
    expect(plan.primary).toBe("tone_check");
    expect(plan.labels.tone_check).toBe("Tone check");
  });

  test("puts the planner's answer question first and keeps labels and rationale", () => {
    const plan = normalizePlan(plannerPlan);
    expect(plan.primary).toBe("sentiment");
    expect(Object.keys(plan.questions)).toEqual(["sentiment", "battery_complaint", "satisfaction"]);
    expect(plan.labels).toEqual({ sentiment: "Overall sentiment", battery_complaint: "Battery complaint", satisfaction: "Satisfaction" });
    expect(plan.rationale).toBe("Sentiment is one of a few categories.");
  });

  test("accepts an edited plan with a named primary question", () => {
    const edited = normalizePlan({
      state: "x",
      primary: "second",
      labels: { second: "The answer" },
      questions: { first: { type: "noul", instructions: "A?" }, second: { type: "noul", instructions: "B?" } },
    });
    expect(edited.primary).toBe("second");
    expect(Object.keys(edited.questions)).toEqual(["second", "first"]);
    expect(edited.labels.second).toBe("The answer");
    expectInvalid(() => normalizePlan({ state: "x", primary: "missing", questions: { a: { type: "noul", instructions: "?" } } }));
  });

  test("rejects malformed questions with an invalid_plan code", () => {
    const attempts = [
      { state: "x", questions: {} },
      { state: "", questions: { a: { type: "noul", instructions: "?" } } },
      { state: "x", questions: { a: { type: "choice", instructions: "?", criteria: { only: null } } } },
      { state: "x", questions: { a: { type: "score", instructions: "?", criteria: ["one"] } } },
      { state: "x", questions: { a: { type: "rank", instructions: "?" } } },
      { state: "x", answer: "not a question" },
    ];
    for (const attempt of attempts) expectInvalid(() => normalizePlan(attempt));
  });

  test("keeps supplied material verbatim, merges background, and enforces limits", () => {
    expect(normalizePlan({ ...plannerPlan, state: "planner text" }, { review: "mine" }).state).toEqual({ review: "mine" });

    // Background fields survive; a copy of the supplied text is dropped as a distractor.
    const merged = normalizePlan(
      { ...plannerPlan, state: { platform: "Online store", quoted: "Mine, verbatim." } },
      { review: "Mine, verbatim." },
    );
    expect(merged.state).toEqual({ platform: "Online store", review: "Mine, verbatim." });

    const tooMany = Object.fromEntries(
      Array.from({ length: LIMITS.questions + 1 }, (_, index) => [`q${index}`, { type: "noul", instructions: "?" }]),
    );
    expect(() => normalizePlan({ state: "x", questions: tooMany })).toThrow(JevError);

    // Planner analytics beyond the supporting-question budget are dropped, not rejected.
    const chatty = normalizePlan({
      ...plannerPlan,
      analytics: Array.from({ length: LIMITS.supportingQuestions + 2 }, (_, index) => ({ key: `extra_${index}`, type: "noul", instructions: "?" })),
    });
    expect(Object.keys(chatty.questions)).toHaveLength(LIMITS.supportingQuestions + 1);

    const hugeLevel = { label: "x".repeat(LIMITS.levelChars + 1) };
    expect(() => normalizePlan({
      state: "x",
      questions: { q: { type: "score", instructions: "?", criteria: [hugeLevel, "Low"] } },
    })).toThrow(/level longer/);

    const longInstructions = (index: number) => ({ type: "noul", instructions: `${index}${"?".repeat(LIMITS.instructionChars)}` });
    const bulky = Object.fromEntries(Array.from({ length: LIMITS.questions }, (_, index) => [`q${index}`, longInstructions(index)]));
    expect(() => normalizePlan({ state: "x", questions: bulky })).toThrow(/in total/);
  });

  test("extracts JSON from fenced or chatty replies", () => {
    expect(extractJsonObject("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(extractJsonObject("Here you go: {\"a\":2} thanks")).toEqual({ a: 2 });
    expect(() => extractJsonObject("no json")).toThrow(JevError);
  });
});

describe("Jev planner replies", () => {
  test("validates needs_input fields", () => {
    const reply = normalizePlannerReply({
      kind: "needs_input",
      message: "Paste the email.",
      fields: [
        { key: "Email Text", label: "Email", placeholder: "Paste it", multiline: true },
        { key: "sender", label: "Sender", required: false },
        { key: "email_text", label: "Duplicate" },
        { key: "a" }, { key: "b" },
      ],
    });
    expect(reply).toEqual({
      kind: "needs_input",
      message: "Paste the email.",
      optional: false,
      fields: [
        { key: "email_text", label: "Email", placeholder: "Paste it", multiline: true, required: true },
        { key: "sender", label: "Sender", placeholder: "", multiline: false, required: false },
        { key: "a", label: "A", placeholder: "", multiline: false, required: true },
      ],
    });
    expect(normalizePlannerReply({ kind: "needs_input", fields: [{ key: "notes", required: false }] }).optional).toBe(true);
    expectInvalid(() => normalizePlannerReply({ kind: "needs_input", message: "More?", fields: [] }));
  });

  test("rejects needs_input once the person chose to answer anyway", () => {
    expectInvalid(() => normalizePlannerReply(
      { kind: "needs_input", fields: [{ key: "notes" }] },
      { answerAnyway: true },
    ));
  });

  test("passes refusals through, including the older error shape", () => {
    expect(normalizePlannerReply({ kind: "refuse", message: "Jev does not write.", suggestion: "Is autumn a popular theme?" }))
      .toEqual({ kind: "refuse", message: "Jev does not write.", suggestion: "Is autumn a popular theme?" });
    expect(normalizePlannerReply({ error: "Ask about a specific text instead." }))
      .toEqual({ kind: "refuse", message: "Ask about a specific text instead.", suggestion: null });
  });

  test("returns plans and rejects unknown kinds", () => {
    const reply = normalizePlannerReply(plannerPlan);
    expect(reply.kind).toBe("plan");
    expectInvalid(() => normalizePlannerReply({ kind: "essay", text: "..." }));
  });

  test("combines supplied state with follow-up inputs", () => {
    expect(buildSuppliedState({ inputs: { Email: " Hi ", sender: "", note: null } })).toEqual({ email: "Hi" });
    expect(buildSuppliedState({ state: "Body", inputs: { sender: "a@b.c" } })).toEqual({ content: "Body", sender: "a@b.c" });
    expect(buildSuppliedState({ state: { a: 1 }, inputs: { b: "2" } })).toEqual({ a: 1, b: "2" });
    expect(buildSuppliedState({})).toBeNull();
    expect(() => buildSuppliedState({ inputs: "text" })).toThrow(JevError);
    expect(() => buildSuppliedState({ inputs: { a: "x".repeat(LIMITS.inputChars + 1) } })).toThrow(JevError);
  });
});

describe("Jev result forming", () => {
  test("asks the primary choice again with reversed options", () => {
    const questions = buildJevQuestions(normalizePlan(plannerPlan));
    expect(Object.keys(questions)).toEqual(["sentiment", "battery_complaint", "satisfaction", `sentiment${ORDER_CHECK_SUFFIX}`]);
    expect(Object.keys(questions[`sentiment${ORDER_CHECK_SUFFIX}`].criteria)).toEqual(["negative", "mixed", "positive"]);
    // Non-choice primaries are asked once.
    const noul = normalizePlan({ state: "x", questions: { a: { type: "noul", instructions: "?" } } });
    expect(Object.keys(buildJevQuestions(noul))).toEqual(["a"]);
  });

  test("forms the best answer and per-question evidence", () => {
    const plan = normalizePlan(plannerPlan);
    const { best, result, properties, notes } = formResult(plan, jevAnswers);

    expect(result).toEqual({ sentiment: "mixed", battery_complaint: true, satisfaction: 0.62 });
    expect(best).toMatchObject({ key: "sentiment", title: "Overall sentiment", answer: "Mixed", type: "choice", probability: 0.93, certainty: "high" });
    expect(Object.keys(properties.sentiment.probabilities)).toEqual(["mixed", "positive", "negative"]);
    expect(properties.sentiment.orderCheck).toMatchObject({ consistent: true });
    expect(properties.sentiment.confidence).toBe(Number(choiceConfidence({ positive: 0.055, mixed: 0.93, negative: 0.015 }).toFixed(3)));
    expect(properties.battery_complaint).toMatchObject({ value: true, probability: 0.981, confidence: 0.962, primary: false });
    expect(properties.satisfaction).toMatchObject({ level: 1, levelText: "Neutral", max: 2, scale: ["Unhappy", "Neutral", "Happy"] });
    expect(notes).toContainEqual({ tone: "ok", text: "Same answer with the options listed in reverse order." });
    expect(notes.some((note) => note.text.includes("Satisfaction"))).toBe(false);
  });

  test("flags order flips, close calls, and coin-flip yes/no answers", () => {
    const plan = normalizePlan(plannerPlan);
    const flipped = formResult(plan, {
      ...jevAnswers,
      sentiment: { type: "choice", choice: "positive", confidence: 0.3, probabilities: { positive: 0.55, mixed: 0.4, negative: 0.05 } },
      [`sentiment${ORDER_CHECK_SUFFIX}`]: { type: "choice", choice: "mixed", confidence: 0.3, probabilities: { negative: 0.05, mixed: 0.6, positive: 0.35 } },
    });
    expect(flipped.best?.certainty).toBe("low");
    expect(flipped.best?.answer).toBe("Mixed");
    expect(flipped.notes.map((note) => note.text).join(" ")).toContain("changed when the options were reversed");
    expect(flipped.notes.map((note) => note.text).join(" ")).toContain("Close call");

    const yesNo = normalizePlan({ state: "x", questions: { safe: { type: "noul", instructions: "Safe?", criteria: { true: "It is safe", false: "It is not" } } } });
    const coinFlip = formResult(yesNo, { safe: { type: "noul", noul: 0.45 } });
    expect(coinFlip.best).toMatchObject({ answer: "No", detail: "It is not", probability: 0.55, certainty: "low" });
    expect(coinFlip.notes.map((note) => note.text).join(" ")).toContain("coin flip");
  });
});

describe("Jev answer presentation", () => {
  test("names options with the casing their descriptions use", () => {
    expect(optionLabel("donald_trump", "The president is Donald Trump.")).toBe("Donald Trump");
    expect(optionLabel("usa", "The USA")).toBe("USA");
    expect(optionLabel("dwarf_planet", "A dwarf planet")).toBe("Dwarf planet");
    // No matching words: the key is humanized.
    expect(optionLabel("split_roll", "A single roll, split lengthwise")).toBe("Split roll");
    expect(optionLabel("other", null)).toBe("Other");

    const plan = normalizePlan({ state: "x", questions: { who: { type: "choice", instructions: "Who?", criteria: { joe_biden: "Joe Biden", donald_trump: "Donald Trump" } } } });
    const { best, properties } = formResult(plan, {
      who: { type: "choice", choice: "donald_trump", confidence: 0.6, probabilities: { joe_biden: 0.2, donald_trump: 0.8 } },
      [`who${ORDER_CHECK_SUFFIX}`]: { type: "choice", choice: "donald_trump", confidence: 0.6, probabilities: { donald_trump: 0.8, joe_biden: 0.2 } },
    });
    expect(best?.answer).toBe("Donald Trump");
    expect(properties.who.optionLabels).toEqual({ joe_biden: "Joe Biden", donald_trump: "Donald Trump" });
  });

  test("dates present-tense questions that Jev cannot place in time", () => {
    const plan = { state: { subject: "The US presidency" } };
    expect(withAsOfDate(plan, "Who is the president right now?", "2026-10-08").state).toEqual({ subject: "The US presidency", as_of: "2026-10-08" });
    expect(withAsOfDate({ state: null }, "What's the latest iPhone?", "2026-10-08").state).toEqual({ as_of: "2026-10-08" });
    // Timeless questions, existing dates, and whole-string states are left alone.
    expect(withAsOfDate(plan, "Is Pluto a planet?", "2026-10-08")).toBe(plan);
    const dated = { state: { date: "2024-01-01" } };
    expect(withAsOfDate(dated, "Who is president now?", "2026-10-08")).toBe(dated);
    const text = { state: "an email" };
    expect(withAsOfDate(text, "Is this current?", "2026-10-08")).toBe(text);
  });
});

describe("Jev pipeline", () => {
  test("retries a malformed plan once with feedback, then asks Jev", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const replies = [
      plannerReply({ kind: "plan", state: "x", answer: { key: "a", type: "choice", instructions: "?", criteria: { one: null } } }),
      plannerReply(plannerPlan),
      jevReply(jevAnswers),
    ];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return replies.shift()!;
    };

    const output = await runJevRequest({ question: "Is this review positive?" }, env, fetchImpl);
    expect(calls).toHaveLength(3);
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
    expect(calls[0].body.reasoning_effort).toBe("none");
    expect(JSON.stringify(calls[0].body.messages)).toContain("Is this review positive?");
    expect(JSON.stringify(calls[1].body.messages)).toContain("needs at least two options");
    expect(calls[2].url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(calls[2].body.model).toBe("jev-latest");
    expect(Object.keys(calls[2].body.questions as object)).toContain(`sentiment${ORDER_CHECK_SUFFIX}`);
    expect(output.kind).toBe("answer");
    expect(output.best?.answer).toBe("Mixed");
    expect(output.jev.request).toEqual(calls[2].body);
    expect(output.jev.response.model).toBe("jev-1.13.0");
    expect(output.planner).toEqual({ model: "planner-test" });
    expect(output.timing.plannerMs).toBeGreaterThanOrEqual(0);
  });

  test("returns needs_input and refusals without calling Jev", async () => {
    const ask = (reply: unknown) => runJevRequest({ question: "Is this email phishing?" }, env, async (url: string) => {
      if (!url.includes("chat/completions")) throw new Error("Jev should not run");
      return plannerReply(reply);
    });
    const needs = await ask({ kind: "needs_input", message: "Paste it.", fields: [{ key: "email", multiline: true }] });
    expect(needs).toMatchObject({ kind: "needs_input", fields: [{ key: "email" }], planner: { model: "planner-test" } });
    const refused = await ask({ kind: "refuse", message: "No.", suggestion: "Try this." });
    expect(refused).toMatchObject({ kind: "refuse", message: "No.", suggestion: "Try this." });
  });

  test("sends follow-up inputs to the planner as supplied state", async () => {
    let userMessage = "";
    const fetchImpl = async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      userMessage = body.messages[1].content;
      return plannerReply({ ...plannerPlan, state: null });
    };
    const outcome = await planQuestions({ question: "Is this email phishing?", inputs: { email: "Verify your account now." }, answerAnyway: true }, env, fetchImpl);
    expect(userMessage).toContain("SUPPLIED STATE");
    expect(userMessage).toContain("Verify your account now.");
    expect(userMessage).toContain("continue without giving more input");
    expect(outcome.kind).toBe("plan");
    expect(outcome.kind === "plan" && outcome.plan.state).toEqual({ email: "Verify your account now." });
  });

  test("skips the planner for a supplied plan and retries Jev rate limits", async () => {
    let jevCalls = 0;
    const fetchImpl = async (url: string) => {
      if (url.includes("chat/completions")) throw new Error("planner should not run");
      jevCalls += 1;
      return jevCalls === 1
        ? new Response("{}", { status: 429, headers: { "retry-after": "0" } })
        : jevReply({ sentiment: { type: "choice", choice: "positive", confidence: 1, probabilities: { positive: 1 } } });
    };
    const output = await runJevRequest({ plan: plannerPlan }, env, fetchImpl);
    expect(jevCalls).toBe(2);
    expect(output.planner).toBeNull();
    expect(output.result).toEqual({ sentiment: "positive" });
  });

  test("retries Jev gateway errors and reports exhausted retries as busy", async () => {
    let jevCalls = 0;
    const flaky = async () => {
      jevCalls += 1;
      return jevCalls === 1
        ? new Response("upstream unavailable", { status: 503 })
        : jevReply({ sentiment: { type: "choice", choice: "mixed", confidence: 1, probabilities: { mixed: 1 } } });
    };
    const output = await runJevRequest({ plan: plannerPlan }, env, flaky);
    expect(jevCalls).toBe(2);
    expect(output.result).toEqual({ sentiment: "mixed" });

    const down = async () => new Response("bad gateway", { status: 502 });
    const error = await runJevRequest({ plan: plannerPlan }, env, down).catch((caught) => caught);
    expect(error).toBeInstanceOf(JevError);
    expect(error).toMatchObject({ status: 503, message: "Jev is busy right now. Try again in a moment." });
  });

  test("falls back when a provider rejects JSON mode or reasoning_effort", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchImpl = async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      return body.response_format || body.reasoning_effort
        ? new Response(JSON.stringify({ error: { message: "unsupported parameter" } }), { status: 400 })
        : plannerReply(plannerPlan);
    };
    const outcome = await planQuestions({ question: "Judge" }, env, fetchImpl);
    expect(bodies).toHaveLength(2);
    expect(outcome.kind === "plan" && Object.keys(outcome.plan.questions)).toEqual(["sentiment", "battery_complaint", "satisfaction"]);

    const configured: Array<Record<string, unknown>> = [];
    await planQuestions({ question: "Judge" }, { ...env, JEV_PLANNER_REASONING_EFFORT: "" }, async (_url: string, init: RequestInit) => {
      configured.push(JSON.parse(String(init.body)));
      return plannerReply(plannerPlan);
    });
    expect("reasoning_effort" in configured[0]).toBe(false);
  });

  test("reports configuration and input problems with HTTP statuses", async () => {
    await expect(runJevRequest({ plan: plannerPlan }, {}, async () => jevReply({}))).rejects.toMatchObject({ status: 503 });
    await expect(planQuestions({ question: "" }, env, async () => plannerReply(plannerPlan))).rejects.toMatchObject({ status: 400 });
    await expect(planQuestions({ question: "x".repeat(LIMITS.promptChars + 1) }, env, async () => plannerReply(plannerPlan)))
      .rejects.toMatchObject({ status: 400 });
    // `prompt` still works for older clients.
    const legacy = await planQuestions({ prompt: "Judge" }, env, async () => plannerReply(plannerPlan));
    expect(legacy.kind).toBe("plan");
  });

  test("maps unreachable or unreadable upstreams to 502", async () => {
    const offline = async () => { throw new TypeError("network down"); };
    await expect(runJevRequest({ plan: plannerPlan }, env, offline)).rejects.toMatchObject({ status: 502, message: "Jev is unreachable right now." });
    await expect(planQuestions({ question: "Judge" }, env, offline)).rejects.toMatchObject({ status: 502 });
    await expect(runJevRequest({ plan: plannerPlan }, env, async () => new Response("<html>")))
      .rejects.toMatchObject({ status: 502, message: "Jev returned an unreadable reply." });
  });
});

describe("Jev Worker routes", () => {
  const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://lok.computer${path}`, init), {}, {});

  test("accept only POST", async () => {
    for (const path of ["/api/jev", "/api/jev/plan"]) {
      const response = await request(path);
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    }
  });

  test("reject invalid JSON and missing configuration without calling upstream", async () => {
    const invalid = await request("/api/jev", { method: "POST", body: "{" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Request body must be JSON." });

    const unconfigured = await request("/api/jev/plan", { method: "POST", body: JSON.stringify({ question: "Is this spam?" }) });
    expect(unconfigured.status).toBe(503);
  });

  test("rate limit each client IP before doing any work", async () => {
    const keys: string[] = [];
    const limiter = { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: false }; } };
    for (const path of ["/api/jev", "/api/jev/plan"]) {
      const response = await worker.fetch(new Request(`https://lok.computer${path}`, {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.7" },
        body: "{",
      }), { JEV_RATE_LIMITER: limiter }, {});
      expect(response.status).toBe(429);
    }
    expect(keys).toEqual(["203.0.113.7", "203.0.113.7"]);
  });
});
