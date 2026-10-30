import {
  searchTavily,
  getTavilyBudgetStatus,
  type TavilySearchResultItem,
  TavilyClientError,
} from "./tavily.ts";
import type { QueryPlan } from "../ai/query-planner.ts";

export interface RetrievedSource {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  score?: number;
  targetedStance: "SUPPORTING" | "CHALLENGING" | "BOTH";
  retrievedAt: string;
}

export interface RetrievalResult {
  sources: RetrievedSource[];
  searchesConducted: number;
}

/**
 * Normalize URL for deterministic deduplication (strips fragments, trailing slashes, tracking query params).
 */
export function normalizeSourceUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    // Remove common tracking params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    let clean = parsed.toString();
    if (clean.endsWith("/") && parsed.pathname !== "/") {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Pure function to deduplicate search results across bidirectional queries.
 */
export function deduplicateSearchResults(
  supportingResults: TavilySearchResultItem[],
  challengingResults: TavilySearchResultItem[],
  retrievedAt: string = new Date().toISOString()
): RetrievedSource[] {
  const map = new Map<string, RetrievedSource>();

  for (const item of supportingResults) {
    if (!item.url) continue;
    const normUrl = normalizeSourceUrl(item.url);
    map.set(normUrl, {
      url: item.url,
      title: item.title || "Untitled Source",
      content: item.content || "",
      publishedDate: item.published_date || undefined,
      score: item.score,
      targetedStance: "SUPPORTING",
      retrievedAt,
    });
  }

  for (const item of challengingResults) {
    if (!item.url) continue;
    const normUrl = normalizeSourceUrl(item.url);
    const existing = map.get(normUrl);

    if (existing) {
      // Merged source found in both queries
      existing.targetedStance = "BOTH";
      // If the challenging snippet is longer/richer, update content
      if ((item.content || "").length > existing.content.length) {
        existing.content = item.content;
      }
      if (!existing.publishedDate && item.published_date) {
        existing.publishedDate = item.published_date;
      }
    } else {
      map.set(normUrl, {
        url: item.url,
        title: item.title || "Untitled Source",
        content: item.content || "",
        publishedDate: item.published_date || undefined,
        score: item.score,
        targetedStance: "CHALLENGING",
        retrievedAt,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Execute dual bidirectional retrieval using Tavily.
 * Strictly respects credit-budget and does not retry beyond available quota.
 */
export async function executeDualRetrieval(queryPlan: QueryPlan): Promise<RetrievalResult> {
  const budget = getTavilyBudgetStatus();

  // Each investigation needs 2 search calls (supporting + challenging)
  if (budget.remaining < 2) {
    throw new TavilyClientError(
      `Insufficient Tavily search budget for dual retrieval. Required: 2 searches, remaining: ${budget.remaining}.`,
      "BUDGET_EXHAUSTED",
      429
    );
  }

  // Execute both searches sequentially to strictly guard atomic counters
  const supportingSearch = await searchTavily(queryPlan.supportingQuery, "basic");
  const challengingSearch = await searchTavily(queryPlan.challengingQuery, "basic");

  const sources = deduplicateSearchResults(
    supportingSearch.results || [],
    challengingSearch.results || []
  );

  return {
    sources,
    searchesConducted: 2,
  };
}

