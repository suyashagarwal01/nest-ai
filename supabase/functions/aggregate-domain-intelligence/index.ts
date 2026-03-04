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

interface ConsensusRow {
  url: string;
  tag_name: string;
  user_count: number;
  total_saves: number;
  frequency: number;
}

interface KeywordRow {
  keyword: string;
  tag_name: string;
  user_count: number;
  adoption_rate: number;
}

interface FeedbackRow {
  url: string;
  tag_name: string;
  net_score: number;
}

/**
 * Confidence scales from 0.6 at count=0 to 0.95 at count=100+.
 */
function computeConfidence(sampleCount: number): number {
  return Math.min(0.95, 0.6 + (sampleCount / 100) * 0.35);
}

/**
 * Consensus confidence: 0.6 for 3+ users, scaling to 0.85 for 10+ users.
 * Boosted by +0.05 if frequency ≥ 0.8.
 */
function computeConsensusConfidence(userCount: number, frequency: number): number {
  const base = Math.min(0.85, 0.6 + ((userCount - 3) / 7) * 0.25);
  return frequency >= 0.8 ? Math.min(0.95, base + 0.05) : base;
}

/**
 * Keyword pattern confidence: 0.7 for 50%+ adoption, scaling to 0.9 for 80%+.
 */
function computeKeywordConfidence(adoptionRate: number): number {
  if (adoptionRate >= 0.8) return 0.9;
  return Math.min(0.9, 0.7 + ((adoptionRate - 0.5) / 0.3) * 0.2);
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

    // ──────────────────────────────────────────────────────
    // Phase 3: Collective Intelligence Aggregation
    // ──────────────────────────────────────────────────────

    // 6. Update profile save counts (reputation for anti-spam)
    const { error: saveCountError } = await supabase.rpc(
      "update_profile_save_counts"
    );
    if (saveCountError) {
      console.error(`update_profile_save_counts failed: ${saveCountError.message}`);
    }

    // 7. Aggregate URL consensus tags
    let consensusUpdated = 0;
    const { data: consensusRows, error: consensusError } = await supabase.rpc(
      "aggregate_url_consensus"
    );
    if (consensusError) {
      console.error(`aggregate_url_consensus failed: ${consensusError.message}`);
    } else {
      for (const row of (consensusRows as ConsensusRow[]) ?? []) {
        const confidence = computeConsensusConfidence(row.user_count, row.frequency);
        const { error: upsertError } = await supabase
          .from("url_tag_consensus")
          .upsert(
            {
              url: row.url,
              tag_name: row.tag_name,
              user_count: row.user_count,
              total_saves: row.total_saves,
              frequency: row.frequency,
              confidence,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "url,tag_name" }
          );
        if (!upsertError) consensusUpdated++;
      }
    }

    // 8. Aggregate keyword-tag patterns
    let keywordsUpdated = 0;
    const { data: keywordRows, error: keywordError } = await supabase.rpc(
      "aggregate_keyword_patterns"
    );
    if (keywordError) {
      console.error(`aggregate_keyword_patterns failed: ${keywordError.message}`);
    } else {
      for (const row of (keywordRows as KeywordRow[]) ?? []) {
        const confidence = computeKeywordConfidence(row.adoption_rate);
        const { error: upsertError } = await supabase
          .from("keyword_tag_patterns")
          .upsert(
            {
              keyword: row.keyword,
              tag_name: row.tag_name,
              user_count: row.user_count,
              adoption_rate: row.adoption_rate,
              confidence,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "keyword,tag_name" }
          );
        if (!upsertError) keywordsUpdated++;
      }
    }

    // 9. Apply feedback adjustments to consensus confidence
    let feedbackAdjusted = 0;
    const { data: feedbackRows, error: feedbackError } = await supabase.rpc(
      "compute_feedback_adjustments"
    );
    if (feedbackError) {
      console.error(`compute_feedback_adjustments failed: ${feedbackError.message}`);
    } else {
      for (const row of (feedbackRows as FeedbackRow[]) ?? []) {
        // Only act on significant feedback signals
        if (row.net_score <= 5 && row.net_score >= -5) continue;

        const { data: existing } = await supabase
          .from("url_tag_consensus")
          .select("confidence")
          .eq("url", row.url)
          .eq("tag_name", row.tag_name)
          .single();

        if (!existing) continue;

        let newConfidence = existing.confidence;
        if (row.net_score > 5) {
          newConfidence = Math.min(0.95, newConfidence + 0.05);
        } else {
          newConfidence = newConfidence - 0.1;
        }

        if (newConfidence < 0.4) {
          await supabase
            .from("url_tag_consensus")
            .delete()
            .eq("url", row.url)
            .eq("tag_name", row.tag_name);
        } else {
          await supabase
            .from("url_tag_consensus")
            .update({ confidence: newConfidence })
            .eq("url", row.url)
            .eq("tag_name", row.tag_name);
        }
        feedbackAdjusted++;
      }
    }

    // 10. Prune old feedback (>90 days)
    const { error: pruneError } = await supabase
      .from("tag_feedback")
      .delete()
      .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    if (pruneError) {
      console.error(`Feedback pruning failed: ${pruneError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        domains_updated: domainsUpdated,
        stats_count: (domainStats as DomainStats[])?.length ?? 0,
        path_patterns_count: (pathPatterns as PathPattern[])?.length ?? 0,
        consensus_updated: consensusUpdated,
        keywords_updated: keywordsUpdated,
        feedback_adjusted: feedbackAdjusted,
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
