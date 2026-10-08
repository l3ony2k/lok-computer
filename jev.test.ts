import { describe, expect, test } from "bun:test";
import {
  JevError,
  LIMITS,
  extractJsonObject,
  formResult,
  normalizePlan,
  planQuestions,
  runJevRequest,
  toPropertyName,
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

const validPlan = {
  summary: "Judging a review.",
  state: { review: "Battery died after two days, gorgeous screen." },
  questions: {
    sentiment: { type: "choice", instructions: "What is the sentiment of `review`?", criteria: { positive: "Praise", mixed: null, negative: "Complaints" } },
    battery_complaint: { type: "noul", instructions: "Does `review` complain about the battery?", criteria: { true: "Yes", false: "No" } },
    satisfaction: { type: "score", instructions: "How satisfied is the reviewer?", criteria: ["Unhappy", "Neutral", "Happy"] },
  },
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
  });

  test("rejects malformed questions with an invalid_plan code", () => {
    const attempts = [
      { state: "x", questions: {} },
      { state: "", questions: { a: { type: "noul", instructions: "?" } } },
      { state: "x", questions: { a: { type: "choice", instructions: "?", criteria: { only: null } } } },
      { state: "x", questions: { a: { type: "score", instructions: "?", criteria: ["one"] } } },
      { state: "x", questions: { a: { type: "rank", instructions: "?" } } },
    ];
    for (const attempt of attempts) {
      try {
        normalizePlan(attempt);
        throw new Error("expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(JevError);
        expect((error as JevError).code).toBe("invalid_plan");
      }
    }
  });

  test("lets supplied content override the planner and enforces limits", () => {
    const plan = normalizePlan({ ...validPlan, state: "planner text" }, { review: "mine" });
    expect(plan.state).toEqual({ review: "mine" });

    const tooMany = Object.fromEntries(
      Array.from({ length: LIMITS.questions + 1 }, (_, index) => [`q${index}`, { type: "noul", instructions: "?" }]),
    );
    expect(() => normalizePlan({ state: "x", questions: tooMany })).toThrow(JevError);

    const hugeLevel = { label: "x".repeat(LIMITS.levelChars + 1) };
    expect(() => normalizePlan({
      state: "x",
      questions: { q: { type: "score", instructions: "?", criteria: [hugeLevel, "Low"] } },
    })).toThrow(/level longer/);

    const longInstructions = (index: number) => ({ type: "noul", instructions: `${index}${"?".repeat(LIMITS.instructionChars)}` });
    const bulky = Object.fromEntries(Array.from({ length: LIMITS.questions }, (_, index) => [`q${index}`, longInstructions(index)]));
    expect(() => normalizePlan({ state: "x", questions: bulky })).toThrow(/in total/);
  });

  test("surfaces planner refusals verbatim", () => {
    try {
      normalizePlan({ error: "Ask about a specific text instead." });
      throw new Error("expected refusal");
    } catch (error) {
      expect((error as JevError).code).toBe("refused");
      expect((error as JevError).message).toBe("Ask about a specific text instead.");
    }
  });

  test("extracts JSON from fenced or chatty replies", () => {
    expect(extractJsonObject("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(extractJsonObject("Here you go: {\"a\":2} thanks")).toEqual({ a: 2 });
    expect(() => extractJsonObject("no json")).toThrow(JevError);
  });
});

describe("Jev result forming", () => {
  test("maps answers to requested properties with evidence", () => {
    const plan = normalizePlan(validPlan);
    const { result, properties } = formResult(plan, {
      sentiment: { type: "choice", choice: "mixed", confidence: 0.9, probabilities: { positive: 0.04, mixed: 0.95, negative: 0.01 } },
      battery_complaint: { type: "noul", noul: 0.981 },
      satisfaction: { type: "score", score: 0.62, confidence: 0.61, legend: { 0: "Unhappy", 1: "Neutral", 2: "Happy" }, probabilities: { 0: 0.4, 1: 0.58, 2: 0.02 } },
    });

    expect(result).toEqual({ sentiment: "mixed", battery_complaint: true, satisfaction: 0.62 });
    expect(Object.keys(properties.sentiment.probabilities)).toEqual(["mixed", "positive", "negative"]);
    expect(properties.battery_complaint).toMatchObject({ value: true, probability: 0.981 });
    expect(properties.satisfaction).toMatchObject({ level: 1, label: "Neutral", max: 2, scale: ["Unhappy", "Neutral", "Happy"] });
  });
});

describe("Jev pipeline", () => {
  test("retries a malformed plan once with feedback, then asks Jev", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const replies = [
      plannerReply({ state: "x", questions: { a: { type: "choice", instructions: "?", criteria: { one: null } } } }),
      plannerReply(validPlan),
      jevReply({ battery_complaint: { type: "noul", noul: 0.2 } }),
    ];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return replies.shift()!;
    };

    const output = await runJevRequest({ prompt: "Judge this review" }, env, fetchImpl);
    expect(calls).toHaveLength(3);
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
    expect(JSON.stringify(calls[1].body.messages)).toContain("needs at least two options");
    expect(calls[2].url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(calls[2].body.model).toBe("jev-latest");
    expect(output.result).toEqual({ battery_complaint: false });
    expect(output.planner).toEqual({ model: "planner-test" });
    expect(output.timing.plannerMs).toBeGreaterThanOrEqual(0);
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
    const output = await runJevRequest({ plan: validPlan }, env, fetchImpl);
    expect(jevCalls).toBe(2);
    expect(output.planner).toBeNull();
    expect(output.result).toEqual({ sentiment: "positive" });
  });

  test("falls back when a provider rejects JSON mode", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchImpl = async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      return body.response_format
        ? new Response(JSON.stringify({ error: { message: "response_format unsupported" } }), { status: 400 })
        : plannerReply(validPlan);
    };
    const { plan } = await planQuestions({ prompt: "Judge" }, env, fetchImpl);
    expect(bodies).toHaveLength(2);
    expect(Object.keys(plan.questions)).toEqual(["sentiment", "battery_complaint", "satisfaction"]);
  });

  test("reports configuration and input problems with HTTP statuses", async () => {
    await expect(runJevRequest({ plan: validPlan }, {}, async () => jevReply({}))).rejects.toMatchObject({ status: 503 });
    await expect(planQuestions({ prompt: "" }, env, async () => plannerReply(validPlan))).rejects.toMatchObject({ status: 400 });
    await expect(planQuestions({ prompt: "x".repeat(LIMITS.promptChars + 1) }, env, async () => plannerReply(validPlan)))
      .rejects.toMatchObject({ status: 400 });
  });

  test("maps unreachable or unreadable upstreams to 502", async () => {
    const offline = async () => { throw new TypeError("network down"); };
    await expect(runJevRequest({ plan: validPlan }, env, offline)).rejects.toMatchObject({ status: 502, message: "Jev is unreachable right now." });
    await expect(planQuestions({ prompt: "Judge" }, env, offline)).rejects.toMatchObject({ status: 502 });
    await expect(runJevRequest({ plan: validPlan }, env, async () => new Response("<html>")))
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

    const unconfigured = await request("/api/jev/plan", { method: "POST", body: JSON.stringify({ prompt: "Is this spam?" }) });
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
