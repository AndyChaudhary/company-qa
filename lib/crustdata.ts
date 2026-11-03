const CRUSTDATA_URL = "https://api.crustdata.com/company/enrich";

export async function enrichDomain(domain: string) {
  const key = process.env.CRUSTDATA_API_KEY;
  if (!key) throw new Error("CRUSTDATA_API_KEY is missing");

  const res = await fetch(CRUSTDATA_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "x-api-version": "2025-11-01",
    },
    body: JSON.stringify({ domains: [domain] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Crustdata error ${res.status}`);

  const data = await res.json();
  const match = data?.[0]?.matches?.[0];
  if (!match) return null;

  return {
    confidence: match.confidence_score as number,
    company: match.company_data as Record<string, any>,
  };
}