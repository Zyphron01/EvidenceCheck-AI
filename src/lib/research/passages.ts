import type {
  EvidenceSource,
  EvidencePassage,
} from "../schemas/report.ts";
import type { RetrievedSource } from "./retrieval.ts";

export interface ProcessedEvidenceCollection {
  sources: EvidenceSource[];
  passages: EvidencePassage[];
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Segment raw text content into atomic passages with deterministic character offsets.
 * Preserves exact text without modifying punctuation, capitalization, or content.
 */
export function segmentContentIntoPassages(
  rawContent: string,
  sourceId: string,
  startPassageIndex: number = 1
): EvidencePassage[] {
  if (!rawContent || rawContent.trim() === "") {
    return [];
  }

  const passages: EvidencePassage[] = [];
  let passageCounter = startPassageIndex;

  // Split on paragraph breaks or multi-sentence blocks while recording offsets
  // We identify cohesive text segments (approx 100-500 chars)
  const paragraphRegex = /[^\r\n]+((\r?\n)[^\r\n]+)*/g;
  let match: RegExpExecArray | null;

  while ((match = paragraphRegex.exec(rawContent)) !== null) {
    const segment = match[0].trim();
    if (segment.length < 20) {
      // Skip trivial noise segments (< 20 chars)
      continue;
    }

    // If segment is very long (> 600 chars), split by sentences to keep passages atomic
    if (segment.length > 600) {
      const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
      let sentMatch: RegExpExecArray | null;
      let currentChunk = "";
      let chunkStart = match.index;

      while ((sentMatch = sentenceRegex.exec(segment)) !== null) {
        if ((currentChunk + sentMatch[0]).length > 500 && currentChunk.length > 0) {
          passages.push({
            id: `psg-${passageCounter++}`,
            sourceId,
            text: currentChunk.trim(),
            stance: "NEUTRAL",
            charOffsetStart: chunkStart,
            charOffsetEnd: chunkStart + currentChunk.length,
          });
          chunkStart = match.index + sentMatch.index;
          currentChunk = sentMatch[0];
        } else {
          currentChunk += sentMatch[0];
        }
      }

      if (currentChunk.trim().length >= 20) {
        passages.push({
          id: `psg-${passageCounter++}`,
          sourceId,
          text: currentChunk.trim(),
          stance: "NEUTRAL",
          charOffsetStart: chunkStart,
          charOffsetEnd: chunkStart + currentChunk.length,
        });
      }
    } else {
      passages.push({
        id: `psg-${passageCounter++}`,
        sourceId,
        text: segment,
        stance: "NEUTRAL",
        charOffsetStart: match.index,
        charOffsetEnd: match.index + match[0].length,
      });
    }
  }

  return passages;
}

/**
 * Process a list of retrieved sources into structured sources and atomic passages.
 * Never invents missing metadata or excerpts.
 */
export function processRetrievedSources(
  retrievedSources: RetrievedSource[]
): ProcessedEvidenceCollection {
  const sources: EvidenceSource[] = [];
  const passages: EvidencePassage[] = [];
  let passageIdCounter = 1;

  for (let i = 0; i < retrievedSources.length; i++) {
    const item = retrievedSources[i];
    const sourceId = `src-${i + 1}`;

    const source: EvidenceSource = {
      id: sourceId,
      url: item.url,
      title: item.title,
      domain: extractDomain(item.url),
      snippet: item.content ? item.content.slice(0, 240) : undefined,
      publishedDate: item.publishedDate,
      retrievedAt: item.retrievedAt,
    };
    sources.push(source);

    const sourcePassages = segmentContentIntoPassages(
      item.content,
      sourceId,
      passageIdCounter
    );
    passageIdCounter += sourcePassages.length;
    passages.push(...sourcePassages);
  }

  return {
    sources,
    passages,
  };
}

