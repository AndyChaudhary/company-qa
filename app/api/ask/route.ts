import { enrichDomain } from "@/lib/crustdata";

const NOT_FOUND = "That information isn't available in this company's data.";

// Question words -> company field to answer from
const RULES = [
  { words: ["website", "url", "site", "link"], field: "website", reply: (v: string) => `Website: ${v}` },
  { words: ["founded", "founding", "started", "began", "year"], field: "year_founded", reply: (v: string) => `The company was founded in ${v}.` },
  { words: ["employee", "employees", "staff", "headcount", "how many people", "team size"], field: "employee_count_range", reply: (v: string) => `The company has about ${v} employees.` },
  { words: ["public", "private", "listed", "ipo", "type"], field: "company_type", reply: (v: string) => `The company is ${v}.` },
  { words: ["do", "does", "about", "company", "business", "make", "build", "product"], field: "description", reply: (v: string) => v },
];

function getField(company: any, field: string) {
  return company?.basic_info?.[field] ?? company?.[field];
}

function matches(question: string, words: string[]) {
  const tokens = question.split(/[^a-z]+/).filter(Boolean);
  return words.some((w) => (w.includes(" ") ? question.includes(w) : tokens.includes(w)));
}

export async function POST(req: Request) {
  const { domain, question } = await req.json();
  if (!domain || !question) {
    return Response.json({ error: "domain and question required" }, { status: 400 });
  }

  try {
    const result = await enrichDomain(String(domain).trim().toLowerCase());
    if (!result) {
      return Response.json({ answer: "No company found for this domain.", fieldsUsed: [] }, { status: 404 });
    }

    const q = String(question).toLowerCase();
    const rule = RULES.find((r) => matches(q, r.words));
    const value = rule ? getField(result.company, rule.field) : undefined;

    if (!rule || !value) {
      return Response.json({ answer: NOT_FOUND, fieldsUsed: [] });
    }
    return Response.json({ answer: rule.reply(String(value)), fieldsUsed: [rule.field] });
  } catch (err) {
    console.error("ASK ERROR:", err);
    return Response.json({ answer: "Something went wrong. Try again.", fieldsUsed: [] }, { status: 502 });
  }
}