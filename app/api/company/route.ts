import { enrichDomain } from "@/lib/crustdata";

export async function POST(req: Request) {
  const { domain } = await req.json();
  if (!domain || typeof domain !== "string") {
    return Response.json({ found: false, error: "Domain required" }, { status: 400 });
  }

  try {
    const result = await enrichDomain(domain.trim().toLowerCase());
    if (!result) return Response.json({ found: false });

    const b = result.company.basic_info ?? {};
    return Response.json({
      found: true,
      confidence: result.confidence,
      company: {
        name: b.name,
        website: b.website,
        description: b.description,
        yearFounded: b.year_founded,
        employees: result.company.employee_count_range,
        type: result.company.company_type,
      },
    });
  } catch (err) {
    console.error("LOOKUP ERROR:", err);
    return Response.json({ found: false, error: "Lookup failed" }, { status: 502 });
  }
}