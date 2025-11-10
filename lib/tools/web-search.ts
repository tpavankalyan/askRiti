import { tool, generateObject, generateText } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '../types';
import Parallel from 'parallel-web';
import FirecrawlApp, { SearchResultWeb, SearchResultNews, SearchResultImages, Document } from '@mendable/firecrawl-js';
import { tavily, type TavilyClient } from '@tavily/core';
import { ritivel } from '@/ai/providers';

const extractDomain = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const cleanTitle = (title: string): string => {
  // Remove content within square brackets and parentheses, then trim whitespace
  return title
    .replace(/\[.*?\]/g, '') // Remove [content]
    .replace(/\(.*?\)/g, '') // Remove (content)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

// Helper function to check if an item is SearchResultWeb
const isSearchResultWeb = (item: SearchResultWeb | Document): item is SearchResultWeb => {
  return 'url' in item && typeof item.url === 'string';
};

// Helper function to check if an item is SearchResultNews with valid URL
const isSearchResultNewsWithUrl = (item: SearchResultNews | Document): item is SearchResultNews & { url: string } => {
  return 'url' in item && typeof item.url === 'string' && item.url.length > 0;
};

// Helper function to check if an item is SearchResultImages
const isSearchResultImages = (item: SearchResultImages | Document): item is SearchResultImages => {
  return ('url' in item && typeof item.url === 'string') || ('imageUrl' in item && typeof item.imageUrl === 'string');
};

// Helper function to get URL from SearchResultImages
const getImageUrl = (item: SearchResultImages): string | undefined => {
  return item.imageUrl || item.url;
};

const processDomains = (domains?: (string | null)[]): string[] | undefined => {
  if (!domains || domains.length === 0) return undefined;

  const processedDomains = domains.map((domain) => extractDomain(domain)).filter((domain) => domain.trim() !== '');
  return processedDomains.length === 0 ? undefined : processedDomains;
};

const queryComponentExtractionSchema = z.object({
  topic: z.array(z.string().trim().min(1)).max(5).optional(),
  productCategory: z.array(z.string().trim().min(1)).max(5).optional(),
  country: z.string().trim().min(1).optional(),
});

type QueryComponents = z.infer<typeof queryComponentExtractionSchema>;

type FilledQueryComponents = {
  topic: string[];
  productCategory: string[];
  country: string;
};

const REQUIRED_COMPONENT_LABELS: Record<keyof QueryComponents, string> = {
  topic: 'topic(s) (e.g. regulatory focus)',
  productCategory: 'product category/categories',
  country: 'country or market',
};

const formatMissingComponentPrompt = (query: string, missing: (keyof QueryComponents)[]) => {
  const labels = missing
    .map((field) => REQUIRED_COMPONENT_LABELS[field])
    .filter(Boolean);

  if (labels.length === 0) return '';

  const labelText =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

  const countryNotice = missing.includes('country')
    ? ' If your market is not yet supported, no worries—we are indexing new countries soon and will prioritise your request.'
    : '';

  return `To proceed with a regulatory search for "${query}", please confirm the ${labelText} (cover drug/product category, regulatory topic, and country where applicable).${countryNotice}`;
};

const normalizeComponentList = (value?: unknown): string[] | undefined => {
  if (!value) return undefined;
  const arrayValue = Array.isArray(value) ? value : [value];
  const normalized = arrayValue
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
};

const normalizeCountry = (value?: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const firstValid = value.map((item) => (typeof item === 'string' ? item.trim() : '')).find((item) => item.length > 0);
    return firstValid || undefined;
  }
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const extractQueryComponents = async (query: string): Promise<QueryComponents> => {
  try {
    const { object } = await generateObject({
      model: ritivel.languageModel('ritivel-gpt5-mini'),
      schema: queryComponentExtractionSchema,
      prompt: `You are preparing a regulatory intelligence search query for life-sciences compliance teams.
Break the user's request into up to three high-value components:
- topic (regulatory focus such as submission pathway, vigilance, labelling, renewals, pricing, post-market commitments)
- productCategory (drug class, biologic type, medical device category, diagnostic, vaccine, etc.)
- country (specific market or competent authority jurisdiction; only choose from Uganda, Tanzania, Azerbaijan, Chile, Vietnam, Philippines, Global)

Use concise phrases (≤6 words) and include only details that are explicitly stated or strongly implied. If a component is missing, omit it rather than guessing.

User query: "${query}"`,
      temperature: 0,
    });

    return {
      topic: normalizeComponentList(object.topic),
      productCategory: normalizeComponentList(object.productCategory),
      country: normalizeCountry(object.country),
    };
  } catch (error) {
    console.error('Failed to extract query components:', error);
    return {};
  }
};

const reformulateQueryWithComponents = async (
  originalQuery: string,
  components: FilledQueryComponents,
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: ritivel.languageModel('ritivel-gpt5-mini'),
      prompt: `Reformulate a regulatory affairs search query for life-science compliance teams.
Incorporate every confirmed component:
- Product category: ${components.productCategory.join('; ') || 'unspecified'}
- Regulatory topic: ${components.topic.join('; ') || 'unspecified'}
- Country/market: ${components.country}

Include the current year (${new Date().getFullYear()}) or language like "latest"/"current" to set temporal context. Use ≤25 words, stay neutral, and avoid speculation or adjectives. Return only the final query text.`,
      temperature: 0.2,
    });

    return text.trim();
  } catch (error) {
    console.error('Failed to reformulate search query:', error);
    return originalQuery;
  }
};

// Helper functions for Tavily image processing
const sanitizeUrl = (url: string): string => {
  try {
    // Remove any additional URL parameters that might cause issues
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
};

const isValidImageUrl = async (url: string): Promise<{ valid: boolean; redirectedUrl?: string }> => {
  try {
    // Just return valid for now - we can add more sophisticated validation later
    return { valid: true, redirectedUrl: url };
  } catch {
    return { valid: false };
  }
};

const regulatoryAuthorities: Record<string, string> = {
  Uganda: 'NDA',
  Tanzania: 'TDMA home',
  Azerbaijan: 'AEM',
  Chile: 'ISP',
  Vietnam: 'DAV Home',
  Philippines: 'FDA Philippines',
  Global: 'ICH',
};

const getRegulatoryAuthorityForCountry = (country: string): string | undefined => {
  if (!country) return undefined;
  const normalizedCountry = country.trim().toLowerCase();

  const matchedEntry = Object.entries(regulatoryAuthorities).find(([key]) => key.toLowerCase() === normalizedCountry);
  if (matchedEntry) {
    return matchedEntry[1];
  }

  return undefined;
};

// Search provider strategy interface
interface SearchStrategy {
  search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'fda' | 'regulatory' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ): Promise<{ searches: Array<{ query: string; results: any[]; images: any[] }> }>;
}

// Parallel AI search strategy
class ParallelSearchStrategy implements SearchStrategy {
  constructor(
    private parallel: Parallel,
    private firecrawl: FirecrawlApp,
  ) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'fda' | 'regulatory' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    // Limit queries to first 5 for Parallel AI
    const limitedQueries = queries.slice(0, 5);
    console.log('Using Parallel AI batch processing for queries:', limitedQueries);

    // Send start notifications for all queries
    limitedQueries.forEach((query, index) => {
      options.dataStream?.write({
        type: 'data-query_completion',
        data: {
          query,
          index,
          total: limitedQueries.length,
          status: 'started',
          resultsCount: 0,
          imagesCount: 0,
        },
      });
    });

    try {
      const perQueryPromises = limitedQueries.map(async (query, index) => {
        const currentQuality = options.quality[index] || options.quality[0] || 'default';
        const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;

        try {
          // Run Parallel AI search and Firecrawl images concurrently per query
          const [singleResponse, firecrawlImages] = await Promise.all([
            this.parallel.beta.search({
              objective: query,
              search_queries: [query],
              processor: currentQuality === 'best' ? 'pro' : 'base',
              max_results: Math.max(currentMaxResults, 10),
              max_chars_per_result: 1000,
            }),
            this.firecrawl.search(query, {
              sources: ['images'],
              limit: 3,
            }).catch((error) => {
              console.error(`Firecrawl error for query "${query}":`, error);
              return { images: [] } as Partial<Document> as any;
            }),
          ]);

          const results = (singleResponse?.results || []).map((result: any) => ({
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: Array.isArray(result.excerpts)
              ? result.excerpts.join(' ').substring(0, 1000)
              : (result.content || '').substring(0, 1000),
            published_date: undefined,
            author: undefined,
          }));

          const images = ((firecrawlImages as any)?.images || [])
            .filter(isSearchResultImages)
            .map((item: any) => ({
              url: getImageUrl(item) || '',
              description: cleanTitle(item.title || ''),
            }))
            .filter((item: any) => item.url);

          // Send completion notification
          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'completed',
              resultsCount: results.length,
              imagesCount: images.length,
            },
          });

          return {
            query,
            results: deduplicateByDomainAndUrl(results),
            images: deduplicateByDomainAndUrl(images),
          };
        } catch (error) {
          console.error(`Parallel AI search error for query "${query}":`, error);

          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'error',
              resultsCount: 0,
              imagesCount: 0,
            },
          });

          return { query, results: [], images: [] };
        }
      });

      const searchResults = await Promise.all(perQueryPromises);
      return { searches: searchResults };
    } catch (error) {
      console.error('Parallel AI batch orchestration error:', error);

      // Send error notifications for all queries
      limitedQueries.forEach((query, index) => {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: limitedQueries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });
      });

      return {
        searches: limitedQueries.map((query) => ({ query, results: [], images: [] })),
      };
    }
  }
}

// Regulatory search strategy for ROW markets (using FastAPI server)
class CDSCOSearchStrategy implements SearchStrategy {
  constructor(private apiUrl: string) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'regulatory' | 'fda' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const limitedQueries = queries.slice(0, 5);
    console.log('Using Regulatory Search (ROW markets - FastAPI) batch processing for queries:', limitedQueries);

    // Start notifications
    limitedQueries.forEach((query, index) => {
      options.dataStream?.write({
        type: 'data-query_completion',
        data: {
          query,
          index,
          total: limitedQueries.length,
          status: 'started',
          resultsCount: 0,
          imagesCount: 0,
        },
      });
    });

    try {
      const perQueryPromises = limitedQueries.map(async (query, index) => {
        try {
          const components = await extractQueryComponents(query);
          const clarificationKeys: (keyof QueryComponents)[] = ['topic', 'productCategory', 'country'];
          console.log('components', components);
          console.log('requiredKeys', clarificationKeys);
          const missingComponents = clarificationKeys.filter((key) => {
            const value = components[key];
            if (Array.isArray(value)) {
              return value.length === 0;
            }
            return !value || value.trim().length === 0;
          });
          console.log('missingComponents', missingComponents);

          if (missingComponents.length > 0) {
            const clarificationPrompt = formatMissingComponentPrompt(query, missingComponents);

            if (clarificationPrompt) {
              options.dataStream?.write({
                type: 'data-appendMessage',
                data: JSON.stringify({
                  id: `clarification-${Date.now()}-${index}`,
                  role: 'assistant',
                  metadata: null,
                  parts: [
                    {
                      type: 'text',
                      text: clarificationPrompt,
                    },
                  ],
                  createdAt: new Date().toISOString(),
                }),
                transient: true,
              });
            }
          }

          if (missingComponents.includes('country')) {
            options.dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: limitedQueries.length,
                status: 'error',
                resultsCount: 0,
                imagesCount: 0,
              },
            });

            console.warn(`Skipping regulatory search for "${query}" due to missing country component.`);
            return { query, results: [], images: [] };
          }

          const filledComponents: FilledQueryComponents = {
            topic: components.topic && components.topic.length > 0 ? components.topic : ['regulatory requirements'],
            productCategory:
              components.productCategory && components.productCategory.length > 0
                ? components.productCategory
                : ['all product categories'],
            country: components.country!,
          };
          const reformulatedQuery = await reformulateQueryWithComponents(query, filledComponents);

          console.log('Regulatory search reformulated query:', {
            originalQuery: query,
            reformulatedQuery,
            components: filledComponents,
          });

          const regulatoryAuthority =
            options.market === 'fda' ? 'fda' : getRegulatoryAuthorityForCountry(filledComponents.country);

          if (!regulatoryAuthority) {
            const messageText = `We do not currently serve ${filledComponents.country} yet. We are indexing this market soon and will notify you once it is available.`;
            options.dataStream?.write({
              type: 'data-appendMessage',
              data: JSON.stringify({
                id: `no-data-${Date.now()}-${index}`,
                role: 'assistant',
                metadata: null,
                parts: [
                  {
                    type: 'text',
                    text: messageText,
                  },
                ],
                createdAt: new Date().toISOString(),
              }),
              transient: true,
            });

            options.dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: limitedQueries.length,
                status: 'error',
                resultsCount: 0,
                imagesCount: 0,
              },
            });
            console.warn(
              `Skipping regulatory search for "${query}" because ${filledComponents.country} is not yet supported.`,
            );
            return { query, results: [], images: [] };
          }

          const response = await fetch(`${this.apiUrl}/regsearch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              query: reformulatedQuery,
              market: regulatoryAuthority
            }),
          });

          // console.log('request', requestBody);
          // console.log('response', response);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const results = await response.json();

          // Transform the results to match the expected format
          const transformedResults = results.map((doc: any) => ({
            url: doc.url,
            title: cleanTitle(doc.title || ''),
            content: doc.content || '',
            published_date: doc.published_date || undefined,
            author: doc.author || undefined,
          }));

          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'completed',
              resultsCount: transformedResults.length,
              imagesCount: 0,
            },
          });

          console.log('Regulatory Search (ROW markets) results:', transformedResults);

          return {
            query,
            results: deduplicateByDomainAndUrl(transformedResults),
            images: [],
          };
        } catch (error) {
          console.error(`Regulatory Search (ROW markets) error for query "${query}":`, error);
          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'error',
              resultsCount: 0,
              imagesCount: 0,
            },
          });
          return { query, results: [], images: [] };
        }
      });

      const searchResults = await Promise.all(perQueryPromises);
      return { searches: searchResults };
    } catch (error) {
      console.error('Regulatory Search (ROW markets) batch orchestration error:', error);
      limitedQueries.forEach((query, index) => {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: limitedQueries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });
      });

      return {
        searches: limitedQueries.map((query) => ({ query, results: [], images: [] })),
      };
    }
  }
}

// Tavily search strategy
class TavilySearchStrategy implements SearchStrategy {
  constructor(private tvly: TavilyClient) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'regulatory' | 'fda' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const tavilyData = await this.tvly.search(query, {
          topic: currentTopic || 'general',
          days: currentTopic === 'news' ? 7 : undefined,
          maxResults: currentMaxResults,
          searchDepth: currentQuality === 'best' ? 'advanced' : 'basic',
          includeAnswer: true,
          includeImages: true,
          includeImageDescriptions: true,
        });

        const results = deduplicateByDomainAndUrl(tavilyData.results).map((obj: any) => ({
          url: obj.url,
          title: cleanTitle(obj.title || ''),
          content: obj.content,
          published_date: currentTopic === 'news' ? obj.published_date : undefined,
          author: undefined,
        }));

        // Process Tavily images with validation
        const images = await Promise.all(
          deduplicateByDomainAndUrl(tavilyData.images || []).map(
            async ({ url, description }: { url: string; description?: string }) => {
              const sanitizedUrl = sanitizeUrl(url);
              const imageValidation = await isValidImageUrl(sanitizedUrl);
              return imageValidation.valid
                ? {
                  url: imageValidation.redirectedUrl || sanitizedUrl,
                  description: description || '',
                }
                : null;
            },
          ),
        ).then((results) =>
          results.filter(
            (image): image is { url: string; description: string } =>
              image !== null &&
              typeof image === 'object' &&
              typeof image.description === 'string' &&
              image.description !== '',
          ),
        );

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
          images: images.filter((img) => img.url && img.description),
        };
      } catch (error) {
        console.error(`Tavily search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    return { searches: searchResults };
  }
}

// Firecrawl search strategy
class FirecrawlSearchStrategy implements SearchStrategy {
  constructor(private firecrawl: FirecrawlApp) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'regulatory' | 'fda' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const sources = [] as ('web' | 'news' | 'images')[];

        // Map topics to Firecrawl sources
        if (currentTopic === 'news') {
          sources.push('news', 'web');
        } else {
          sources.push('web');
        }
        sources.push('images'); // Always include images

        const firecrawlData = await this.firecrawl.search(query, {
          sources,
          limit: currentMaxResults,
        });

        let results: any[] = [];

        // Process web results
        if (firecrawlData?.web && Array.isArray(firecrawlData.web)) {
          const webResults = firecrawlData.web.filter(isSearchResultWeb);
          results = deduplicateByDomainAndUrl(webResults).map((result) => ({
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: result.description || '',
            published_date: undefined,
            author: undefined,
          }));
        }

        // Process news results if available
        if (firecrawlData?.news && Array.isArray(firecrawlData.news) && currentTopic === 'news') {
          const newsResults = firecrawlData.news.filter(isSearchResultNewsWithUrl);
          const processedNewsResults = deduplicateByDomainAndUrl(newsResults).map((result) => ({
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: result.snippet || '',
            published_date: result.date || undefined,
            author: undefined,
          }));

          // Combine news and web results, prioritizing news
          results = [...processedNewsResults, ...results];
        }

        // Process images with deduplication
        let images: { url: string; description: string }[] = [];
        if (firecrawlData?.images && Array.isArray(firecrawlData.images)) {
          const imageResults = firecrawlData.images.filter(isSearchResultImages);
          const processedImages = imageResults
            .map((image) => ({
              url: getImageUrl(image) || '',
              description: cleanTitle(image.title || ''),
            }))
            .filter((img) => img.url);
          images = deduplicateByDomainAndUrl(processedImages);
        }

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
          images: images.filter((img) => img.url && img.description),
        };
      } catch (error) {
        console.error(`Firecrawl search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    return { searches: searchResults };
  }
}

// Exa search strategy
class ExaSearchStrategy implements SearchStrategy {
  constructor(private exa: Exa) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      market?: 'regulatory' | 'fda' | 'cdsco';
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const searchOptions: any = {
          text: true,
          type: currentQuality === 'best' ? 'hybrid' : 'auto',
          numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
          livecrawl: 'preferred',
          useAutoprompt: true,
          category: currentTopic === 'news' ? 'news' : '',
        };

        // Domain include/exclude behavior removed

        const data = await this.exa.searchAndContents(query, searchOptions);

        // Collect all images first
        const collectedImages: { url: string; description: string }[] = [];

        const results = data.results.map((result) => {
          if (result.image) {
            collectedImages.push({
              url: result.image,
              description: cleanTitle(result.title || result.text?.substring(0, 100) + '...' || ''),
            });
          }

          return {
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: (result.text || '').substring(0, 1000),
            published_date: currentTopic === 'news' && result.publishedDate ? result.publishedDate : undefined,
            author: result.author || undefined,
          };
        });

        // Apply deduplication to images
        const images = deduplicateByDomainAndUrl(collectedImages);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
          images: images.filter((img) => img.url && img.description),
        };
      } catch (error) {
        console.error(`Exa search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    return { searches: searchResults };
  }
}

// Search provider factory - Regulatory Search for ROW markets only
const createSearchStrategy = (
  provider: 'regulatory' | 'cdsco',
  clients: {
    fastapi?: string;
  },
): SearchStrategy => {
  // Only Regulatory Search (ROW markets) strategy is active - all other providers are inactive
  return new CDSCOSearchStrategy(clients.fastapi || 'https://askriti-gateway-6e9owv9n.uc.gateway.dev');
};

export function webSearchTool(
  dataStream?: UIMessageStreamWriter<ChatMessage> | undefined,
  searchProvider: 'regulatory' | 'cdsco' = 'cdsco',
) {
  return tool({
    description: `Use this regulatory intelligence search tool to retrieve authoritative documentation for life-science products across supported global markets.

Critical guidance:
- Always craft 3–5 focused queries in the user's language.
- Each query should reference the product category, regulatory topic, and country/market whenever supplied or strongly implied.
- Embed temporal context (e.g., "${new Date().getFullYear()}", "latest", specific date ranges) to reflect current requirements.
- Default to market="cdsco" for ROW jurisdictions (India, Tanzania, Uganda, Philippines, Vietnam, Azerbaijan, Chile, and related authorities). Use market="fda" only for U.S. FDA matters.
- Never fabricate results. If evidence is thin, return what is available and note the limitation.`,
    inputSchema: z.object({
      queries: z.array(
        z.string().describe('Array of 3-5 search queries to look up on the web. Default is 5. Minimum is 3.'),
      ).min(3),
      maxResults: z.array(
        z
          .number()
          .describe(
            'Array of maximum number of results to return per query. Default is 10. Minimum is 8. Maximum is 15.',
          ),
      ).optional(),
      topics: z.array(
        z
          .enum(['general', 'news'])
          .describe(
            'Array of topic types to search for. Default is general. Other options are news and finance. No other options are available.',
          ),
      ).optional(),
      quality: z.array(
        z
          .enum(['default', 'best'])
          .describe(
            'Array of quality levels for the search. Default is default. Other option is best. DO NOT use best unless necessary.',
          ),
      ).optional(),
      market: z
        .enum(['regulatory', 'cdsco', 'fda'])
        .optional()
        .describe(
          'Market to search in: "fda" for US/FDA regulatory information, "cdsco" (or "regulatory") for ROW (Rest of World) markets regulatory information including India, Tanzania, Uganda, Philippines, Vietnam, Azerbaijan, Chile, and other ROW markets. Defaults to "cdsco" (ROW markets) if not specified.',
        ),
    }),
    execute: async ({
      queries,
      maxResults,
      topics,
      quality,
      market,
    }: {
      queries: string[];
      maxResults?: (number | undefined)[];
      topics?: ('general' | 'news' | undefined)[];
      quality?: ('default' | 'best' | undefined)[];
      market?: 'fda' | 'regulatory' | 'cdsco';
    }) => {
      // Initialize Regulatory Search (ROW markets) client only - all other providers are inactive
      const clients = {
        fastapi: serverEnv.FASTAPI_URL || 'https://askriti-gateway-6e9owv9n.uc.gateway.dev',
      };

      console.log('Queries:', queries);
      console.log('Max Results:', maxResults);
      console.log('Topics:', topics);
      console.log('Quality:', quality);
      console.log('Search Provider:', searchProvider);
      console.log('Market:', market);

      // Create and use the appropriate search strategy
      const strategy = createSearchStrategy(searchProvider, clients);
      if (!maxResults) {
        maxResults = new Array(queries.length).fill(10);
      }
      if (!topics) {
        topics = new Array(queries.length).fill('general');
      }
      if (!quality) {
        quality = new Array(queries.length).fill('default');
      }
      return await strategy.search(queries, {
        maxResults: maxResults as number[],
        topics: topics as ('general' | 'news')[],
        quality: quality as ('default' | 'best')[],
        market: (market === 'regulatory' ? 'cdsco' : market) || 'cdsco',
        dataStream,
      });
    },
  });
}
