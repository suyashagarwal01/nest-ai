import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const AGGREGATION_API_KEY = Deno.env.get("AGGREGATION_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DomainStats {
  domain: string;
  save_count: number;
  default_category: string;
  common_topics: string[];
}

interface PathPattern {
  domain: string;
  path_segment: string;
  topics: string[];
  sample_count: number;
}

/**
 * Confidence scales from 0.6 at count=0 to 0.95 at count=100+.
 */
function computeConfidence(sampleCount: number): number {
  return Math.min(0.95, 0.6 + (sampleCount / 100) * 0.35);
}

serve(async (req: Request) => {
  // Validate API key (passed via x-api-key header; Authorization is used by Supabase gateway)
  const apiKey = req.headers.get("x-api-key");
  if (!AGGREGATION_API_KEY || apiKey !== AGGREGATION_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get domain-level stats
    const { data: domainStats, error: statsError } = await supabase.rpc(
      "aggregate_domain_stats"
    );
    if (statsError) {
      throw new Error(`aggregate_domain_stats failed: ${statsError.message}`);
    }

    // 2. Get path patterns
    const { data: pathPatterns, error: pathError } = await supabase.rpc(
      "aggregate_path_patterns"
    );
    if (pathError) {
      throw new Error(`aggregate_path_patterns failed: ${pathError.message}`);
    }

    // 3. Build path_patterns JSONB per domain
    const pathByDomain = new Map<
      string,
      Record<string, { topics: string[]; confidence: number; count: number }>
    >();

    for (const pp of (pathPatterns as PathPattern[]) ?? []) {
      if (!pathByDomain.has(pp.domain)) {
        pathByDomain.set(pp.domain, {});
      }
      pathByDomain.get(pp.domain)![pp.path_segment] = {
        topics: pp.topics,
        confidence: computeConfidence(pp.sample_count),
        count: pp.sample_count,
      };
    }

    // 4. Merge and upsert into domain_intelligence
    let domainsUpdated = 0;

    for (const ds of (domainStats as DomainStats[]) ?? []) {
      const segments = pathByDomain.get(ds.domain) ?? {};
      const { error: upsertError } = await supabase
        .from("domain_intelligence")
        .upsert(
          {
            domain: ds.domain,
            default_category: ds.default_category,
            common_topics: ds.common_topics,
            path_patterns: { segments },
            save_count: ds.save_count,
          },
          { onConflict: "domain" }
        );

      if (upsertError) {
        console.error(
          `Upsert failed for ${ds.domain}: ${upsertError.message}`
        );
        continue;
      }
      domainsUpdated++;
    }

    // 5. Also upsert path patterns for domains not in domainStats
    // (domains with path patterns but < 2 total saves — unlikely but handle it)
    for (const [domain, segments] of pathByDomain) {
      const alreadyHandled = (domainStats as DomainStats[])?.some(
        (ds) => ds.domain === domain
      );
      if (alreadyHandled) continue;

      const { error: upsertError } = await supabase
        .from("domain_intelligence")
        .upsert(
          {
            domain,
            path_patterns: { segments },
          },
          { onConflict: "domain" }
        );

      if (!upsertError) domainsUpdated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        domains_updated: domainsUpdated,
        stats_count: (domainStats as DomainStats[])?.length ?? 0,
        path_patterns_count: (pathPatterns as PathPattern[])?.length ?? 0,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Aggregation failed:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
