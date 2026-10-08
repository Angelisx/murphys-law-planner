// Pure, deterministic Murphy's Law plan stress-test logic — no network calls.
// Given free-text plan description + category, produce structured risks,
// mitigations, and an overall risk score.

export type Category =
  | "travel"
  | "event"
  | "project"
  | "move"
  | "finance"
  | "general";

export interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  severity: number; // likelihood * impact, 1-25
  trigger: string; // what in the plan text triggered this
  mitigation: string;
  contingency: string;
}

export interface AnalysisResult {
  riskScore: number; // 0-100
  riskLevel: "Low" | "Moderate" | "High" | "Severe";
  summary: string;
  risks: Risk[];
  blindSpots: string[];
  checklist: string[];
}

interface RiskRule {
  id: string;
  title: string;
  category: string;
  keywords: RegExp[];
  likelihood: number;
  impact: number;
  mitigation: string;
  contingency: string;
  // if true, this rule fires regardless of keyword match (universal risk)
  universal?: boolean;
}

const RULES: RiskRule[] = [
  // --- Travel ---
  {
    id: "flight-delay",
    title: "Flight delay or cancellation",
    category: "travel",
    keywords: [/flight/i, /airport/i, /fly(ing)?\b/i, /layover/i, /connect(ing)? flight/i],
    likelihood: 3,
    impact: 4,
    mitigation: "Book a layover of 2+ hours; avoid the last flight of the day; add trip insurance.",
    contingency: "Keep carry-on only essentials for a day; know the airline's rebooking policy and have a backup flight/hotel search ready.",
  },
  {
    id: "lost-documents",
    title: "Lost or forgotten travel documents (passport, visa, ID)",
    category: "travel",
    keywords: [/passport/i, /visa\b/i, /international/i, /abroad/i, /border/i],
    likelihood: 2,
    impact: 5,
    mitigation: "Photograph and cloud-store all documents; carry physical + digital copies separately from the originals.",
    contingency: "Know the nearest embassy/consulate location and emergency passport process for your destination.",
  },
  {
    id: "weather-travel",
    title: "Weather disruption at origin or destination",
    category: "travel",
    keywords: [/weather/i, /storm/i, /hurricane/i, /snow/i, /flight/i, /drive|driving|road trip/i],
    likelihood: 3,
    impact: 3,
    mitigation: "Check 7-day forecast before departure; build a 1-day buffer into the itinerary.",
    contingency: "Pre-identify an alternate route or a flexible/refundable booking you can shift into.",
  },
  {
    id: "lost-luggage",
    title: "Lost, delayed, or stolen luggage",
    category: "travel",
    keywords: [/luggage/i, /baggage/i, /suitcase/i, /pack(ing)?/i],
    likelihood: 2,
    impact: 3,
    mitigation: "Pack a change of clothes and any critical medication in your carry-on, not checked baggage.",
    contingency: "Note luggage tracker/tag info and the airline's baggage-claim process before you fly.",
  },
  // --- Event ---
  {
    id: "venue-fallthrough",
    title: "Venue cancels, double-books, or becomes unavailable",
    category: "event",
    keywords: [/venue/i, /location/i, /booked?/i, /hall|room|space/i, /wedding|party|event|conference|reception/i],
    likelihood: 2,
    impact: 4,
    mitigation: "Get a signed contract with cancellation terms; confirm booking in writing 1-2 weeks out.",
    contingency: "Identify one backup venue or an outdoor/indoor swap option in advance.",
  },
  {
    id: "vendor-noshow",
    title: "Vendor, caterer, or key supplier doesn't deliver",
    category: "event",
    keywords: [/caterer|catering/i, /vendor/i, /supplier/i, /dj|band|photographer|florist/i],
    likelihood: 3,
    impact: 4,
    mitigation: "Require deposits with cancellation clauses; confirm 48-72 hours ahead; get a secondary contact at each vendor.",
    contingency: "Keep a short list of backup vendors who could step in on short notice.",
  },
  {
    id: "low-turnout",
    title: "Attendance is much lower (or higher) than expected",
    category: "event",
    keywords: [/guests?/i, /attendees?/i, /rsvp/i, /turnout/i, /headcount/i],
    likelihood: 3,
    impact: 2,
    mitigation: "Over-communicate RSVP deadlines; build a +/-15% buffer into catering and seating counts.",
    contingency: "Pre-arrange a way to scale catering/seating up or down (flexible order with vendor).",
  },
  {
    id: "budget-overrun",
    title: "Costs exceed budget",
    category: "event",
    keywords: [/budget/i, /cost/i, /\$\d/, /money|spend|afford/i],
    likelihood: 4,
    impact: 3,
    mitigation: "Add a 15-20% contingency line to the budget up front, not after things go over.",
    contingency: "Identify which line items are cuttable first if money runs short.",
  },
  // --- Project ---
  {
    id: "scope-creep",
    title: "Scope creep expands the work beyond the original plan",
    category: "project",
    keywords: [/project/i, /feature/i, /deliverable/i, /scope/i, /requirement/i],
    likelihood: 4,
    impact: 3,
    mitigation: "Write down what's explicitly out of scope; require sign-off before adding new work mid-stream.",
    contingency: "Keep a running 'later' list so new ideas don't derail the current milestone.",
  },
  {
    id: "key-person-dependency",
    title: "A single key person becomes unavailable (illness, quits, overloaded)",
    category: "project",
    keywords: [/team|teammate|developer|engineer|person|people|staff/i, /i alone|just me|solo/i],
    likelihood: 3,
    impact: 4,
    mitigation: "Document decisions and access (passwords, accounts) somewhere a second person can reach.",
    contingency: "Identify who could step in temporarily, even imperfectly, for 1-2 weeks.",
  },
  {
    id: "deadline-slip",
    title: "Timeline slips due to underestimated task duration",
    category: "project",
    keywords: [/deadline/i, /timeline/i, /by (next|the)? ?\w+ \d|by \w+ \d{1,2}/i, /schedule/i, /launch|ship|deliver/i],
    likelihood: 4,
    impact: 3,
    mitigation: "Add 20-30% time buffer to every estimate; identify the single task most likely to run long.",
    contingency: "Decide now what you'd cut or de-scope to still hit the date if behind schedule.",
  },
  {
    id: "dependency-failure",
    title: "External dependency, vendor, or tool fails or changes",
    category: "project",
    keywords: [/api|integration|third.?party|vendor|tool|platform|service/i, /depend/i],
    likelihood: 3,
    impact: 3,
    mitigation: "Avoid hard-locking to a single vendor where feasible; read the SLA/cancellation terms.",
    contingency: "Know a fallback tool/provider you could switch to without losing all progress.",
  },
  // --- Move/relocation ---
  {
    id: "move-logistics",
    title: "Moving logistics fall through (movers, lease timing, utilities)",
    category: "move",
    keywords: [/mov(e|ing)/i, /relocat/i, /lease/i, /apartment|house|home/i, /pcs\b/i],
    likelihood: 3,
    impact: 3,
    mitigation: "Confirm move-out/move-in dates overlap by at least a day; book movers 3-4 weeks ahead.",
    contingency: "Identify a short-term storage or temporary housing option if dates don't line up.",
  },
  // --- Finance ---
  {
    id: "cashflow-gap",
    title: "Cash flow gap between expenses and income timing",
    category: "finance",
    keywords: [/invest|loan|mortgage|payment|income|savings/i, /\$\d/],
    likelihood: 3,
    impact: 4,
    mitigation: "Keep a liquid buffer (1-3 months of the gap amount) separate from the main plan funds.",
    contingency: "Know which expense you'd delay first and which credit line you'd use as a last resort.",
  },
  // --- Universal ---
  {
    id: "no-buffer-time",
    title: "No slack/buffer built into the plan anywhere",
    category: "general",
    keywords: [],
    likelihood: 3,
    impact: 3,
    mitigation: "Add explicit buffer (time and money) rather than assuming everything goes as scheduled.",
    contingency: "Pre-decide what gets cut first if the buffer is consumed.",
  },
  {
    id: "no-communication-plan",
    title: "No plan for communicating changes to everyone affected",
    category: "general",
    keywords: [],
    likelihood: 2,
    impact: 2,
    mitigation: "Set up one shared channel (group chat, doc) everyone affected checks for updates.",
    contingency: "Designate one person as the single point of truth if things change last-minute.",
  },
  {
    id: "single-point-of-failure",
    title: "Plan depends on one thing going right with no fallback",
    category: "general",
    keywords: [],
    likelihood: 3,
    impact: 4,
    universal: true,
    mitigation: "List every step where there's exactly one path to success and add a second option.",
    contingency: "For the riskiest single point of failure, decide the fallback now, not when it breaks.",
  },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function analyzePlan(description: string, category: Category): AnalysisResult {
  const text = description.trim();
  const risks: Risk[] = [];

  for (const rule of RULES) {
    const categoryMatches = rule.category === category || rule.category === "general";
    const keywordMatches =
      rule.universal ||
      rule.keywords.length === 0 ||
      rule.keywords.some((re) => re.test(text));

    if (categoryMatches && keywordMatches) {
      // Slight deterministic jitter based on text so re-running the same
      // input gives the same score, but different plans differ.
      const jitter = (hash(text + rule.id) % 3) - 1; // -1, 0, or 1
      const likelihood = clamp(rule.likelihood + (jitter === 1 ? 1 : 0), 1, 5);
      const impact = clamp(rule.impact, 1, 5);
      risks.push({
        id: rule.id,
        title: rule.title,
        category: rule.category,
        likelihood,
        impact,
        severity: likelihood * impact,
        trigger:
          rule.keywords.length > 0
            ? `Matched plan language related to: ${rule.title.toLowerCase()}`
            : "Structural risk present in most plans of this type",
        mitigation: rule.mitigation,
        contingency: rule.contingency,
      });
    }
  }

  // Always include at least the universal risks even for very short input.
  if (risks.length === 0) {
    for (const rule of RULES.filter((r) => r.category === "general")) {
      risks.push({
        id: rule.id,
        title: rule.title,
        category: rule.category,
        likelihood: rule.likelihood,
        impact: rule.impact,
        severity: rule.likelihood * rule.impact,
        trigger: "Default structural risk — plan description was too short to analyze deeply",
        mitigation: rule.mitigation,
        contingency: rule.contingency,
      });
    }
  }

  risks.sort((a, b) => b.severity - a.severity);

  const maxPossible = 25;
  const avgSeverity = risks.reduce((sum, r) => sum + r.severity, 0) / risks.length;
  const riskScore = Math.round((avgSeverity / maxPossible) * 100);

  let riskLevel: AnalysisResult["riskLevel"];
  if (riskScore >= 70) riskLevel = "Severe";
  else if (riskScore >= 45) riskLevel = "High";
  else if (riskScore >= 25) riskLevel = "Moderate";
  else riskLevel = "Low";

  const blindSpots: string[] = [];
  if (!/budget|\$\d|cost|money/i.test(text)) {
    blindSpots.push("No budget or cost figures mentioned — have you priced this out?");
  }
  if (!/\d{1,2}\/\d{1,2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|date|deadline|by \w+/i.test(text)) {
    blindSpots.push("No concrete dates mentioned — vague timing makes contingencies hard to plan.");
  }
  if (!/backup|alternative|fallback|plan b|contingency/i.test(text)) {
    blindSpots.push("No backup/fallback option mentioned anywhere in the plan as written.");
  }
  if (text.split(/\s+/).length < 15) {
    blindSpots.push("The plan description is quite short — more detail would surface more specific risks.");
  }

  const checklist = [
    "Write down the single step most likely to fail, and your fallback for it.",
    "Add a time buffer and a money buffer, not just one or the other.",
    "Tell the people affected by this plan what the backup plan is, before you need it.",
    "Set one trigger condition (a date, a missed step) that tells you to switch to the fallback.",
  ];

  const summary =
    risks.length > 0
      ? `${risks.length} risk${risks.length === 1 ? "" : "s"} identified. Top concern: "${risks[0].title}" (severity ${risks[0].severity}/25). Overall plan risk is ${riskLevel.toLowerCase()}.`
      : "No specific risks detected — add more detail to your plan for a deeper analysis.";

  return { riskScore, riskLevel, summary, risks, blindSpots, checklist };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
