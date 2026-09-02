/**
 * Free Web Search Engine using DuckDuckGo Instant Answer API & Wikipedia API.
 * Requires 0 API keys and 0 external npm dependencies.
 */

/**
 * Searches DuckDuckGo for quick facts & instant answer summaries.
 * @param {string} query
 * @returns {Promise<string>}
 */
export async function searchDuckDuckGo(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();

    const results = [];
    if (data.AbstractText) {
      results.push(`Summary (${data.Heading || query}): ${data.AbstractText}`);
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 3).forEach((topic) => {
        if (topic.Text) {
          results.push(`• ${topic.Text}`);
        }
      });
    }

    return results.join('\n');
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo search failed:', err);
    return '';
  }
}

/**
 * Searches Wikipedia REST API for topic summaries.
 * @param {string} query
 * @returns {Promise<string>}
 */
export async function searchWikipedia(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return '';
    const data = await res.json();

    const searchResults = data?.query?.search;
    if (!searchResults || searchResults.length === 0) return '';

    const topResults = searchResults.slice(0, 2).map((item) => {
      // Strip HTML tags from Wikipedia snippet
      const cleanSnippet = item.snippet.replace(/<[^>]*>/g, '');
      return `[Wikipedia: ${item.title}] ${cleanSnippet}`;
    });

    return topResults.join('\n');
  } catch (err) {
    console.warn('[WebSearch] Wikipedia search failed:', err);
    return '';
  }
}

/**
 * Detects if query warrants a web search based on keywords.
 * @param {string} text
 * @returns {boolean}
 */
export function isWebSearchQuery(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  const searchTriggers = [
    'search', 'google', 'look up', 'find out', 'who is', 'what is',
    'where is', 'latest', 'news', 'weather', 'current', 'today', 'price',
    'definition', 'wikipedia', 'tell me about', 'information on'
  ];
  return searchTriggers.some((trigger) => t.includes(trigger));
}

/**
 * Executes multi-source web search (DuckDuckGo + Wikipedia) and returns combined research context.
 * @param {string} query
 * @returns {Promise<{ hasResults: boolean, context: string, sources: string[] }>}
 */
export async function performWebSearch(query) {
  const cleanQuery = query
    .replace(/^(search|look up|find out|google|tell me about)\s+/i, '')
    .trim();

  const [ddgResult, wikiResult] = await Promise.all([
    searchDuckDuckGo(cleanQuery || query),
    searchWikipedia(cleanQuery || query),
  ]);

  const combinedParts = [];
  const sources = [];

  if (ddgResult) {
    combinedParts.push(`--- DuckDuckGo Results ---\n${ddgResult}`);
    sources.push('DuckDuckGo');
  }

  if (wikiResult) {
    combinedParts.push(`--- Wikipedia Results ---\n${wikiResult}`);
    sources.push('Wikipedia');
  }

  const context = combinedParts.join('\n\n');

  return {
    hasResults: combinedParts.length > 0,
    context,
    sources,
  };
}
