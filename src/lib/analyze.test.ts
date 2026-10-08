import { describe, it, expect } from "vitest";
import { analyzePlan } from "./analyze";

describe("analyzePlan", () => {
  it("flags flight and layover risks for a travel plan", () => {
    const result = analyzePlan(
      "Flying from NYC to Tokyo with a 45 minute layover in LA, no travel insurance, budget is $2000",
      "travel"
    );
    const ids = result.risks.map((r) => r.id);
    expect(ids).toContain("flight-delay");
    expect(result.riskScore).toBeGreaterThan(0);
    expect(["Low", "Moderate", "High", "Severe"]).toContain(result.riskLevel);
  });

  it("flags venue and vendor risks for an event plan", () => {
    const result = analyzePlan(
      "Wedding reception at a rented hall, caterer booked, 150 guests expected, budget $20000",
      "event"
    );
    const ids = result.risks.map((r) => r.id);
    expect(ids).toContain("venue-fallthrough");
    expect(ids).toContain("vendor-noshow");
  });

  it("flags scope and deadline risks for a project plan", () => {
    const result = analyzePlan(
      "Solo project, I need to ship this new feature by next Friday, deadline is tight",
      "project"
    );
    const ids = result.risks.map((r) => r.id);
    expect(ids).toContain("deadline-slip");
  });

  it("still returns general risks for a very short/vague plan", () => {
    const result = analyzePlan("do the thing", "general");
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.blindSpots.length).toBeGreaterThan(0);
  });

  it("is deterministic: same input gives same risk score", () => {
    const a = analyzePlan("Road trip to Chicago next month, driving alone", "travel");
    const b = analyzePlan("Road trip to Chicago next month, driving alone", "travel");
    expect(a.riskScore).toBe(b.riskScore);
    expect(a.risks.map((r) => r.id)).toEqual(b.risks.map((r) => r.id));
  });

  it("risk score stays within 0-100 bounds", () => {
    const result = analyzePlan(
      "Flight, venue, caterer, deadline, budget, moving, loan, project all at once",
      "general"
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("surfaces a budget blind spot when no cost is mentioned", () => {
    const result = analyzePlan("We will have a party next weekend with friends", "event");
    expect(result.blindSpots.some((b) => /budget|cost/i.test(b))).toBe(true);
  });
});
