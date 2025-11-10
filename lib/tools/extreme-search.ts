// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import Exa from 'exa-js';
import { Daytona } from '@daytonaio/sdk';
import { generateObject, generateText, stepCountIs, tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { ritivel } from '@/ai/providers';
import { SNAPSHOT_NAME } from '@/lib/constants';
import { ChatMessage } from '../types';
import FirecrawlApp from '@mendable/firecrawl-js';
import { getTweet } from 'react-tweet/api';
import { XaiProviderOptions, xai } from '@ai-sdk/xai';

const pythonLibsAvailable = [
  'pandas',
  'numpy',
  'scipy',
  'keras',
  'seaborn',
  'matplotlib',
  'transformers',
  'scikit-learn',
];

const daytona = new Daytona({
  apiKey: serverEnv.DAYTONA_API_KEY,
  target: 'us',
});

const runCode = async (code: string, installLibs: string[] = []) => {
  const sandbox = await daytona.create({
    snapshot: SNAPSHOT_NAME,
  });

  if (installLibs.length > 0) {
    await sandbox.process.executeCommand(`pip install ${installLibs.join(' ')}`);
  }

  const result = await sandbox.process.codeRun(code);
  sandbox.delete();
  return result;
};

const exa = new Exa(serverEnv.EXA_API_KEY);
const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  favicon: string;
};

export type Research = {
  text: string;
  toolResults: any[];
  sources: SearchResult[];
  charts: any[];
};

enum SearchCategory {
  NEWS = 'news',
  COMPANY = 'company',
  RESEARCH_PAPER = 'research paper',
  GITHUB = 'github',
  FINANCIAL_REPORT = 'financial report',
}

const searchWeb = async (query: string, category?: SearchCategory, include_domains?: string[]) => {
  console.log(`searchWeb called with query: "${query}", category: ${category}`);
  try {
    const { results } = await exa.searchAndContents(query, {
      numResults: 8,
      type: 'auto',
      ...(category
        ? {
            category: category as SearchCategory,
          }
        : {}),
      ...(include_domains
        ? {
            include_domains: include_domains,
          }
        : {}),
    });
    console.log(`searchWeb received ${results.length} results from Exa API`);

    const mappedResults = results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.text,
      publishedDate: r.publishedDate,
      favicon: r.favicon,
    })) as SearchResult[];

    console.log(`searchWeb returning ${mappedResults.length} results`);
    return mappedResults;
  } catch (error) {
    console.error('Error in searchWeb:', error);
    return [];
  }
};

const getContents = async (links: string[]) => {
  console.log(`getContents called with ${links.length} URLs:`, links);
  const results: SearchResult[] = [];
  const failedUrls: string[] = [];

  // First, try Exa for all URLs
  try {
    const result = await exa.getContents(links, {
      text: {
        maxCharacters: 3000,
        includeHtmlTags: false,
      },
      livecrawl: 'preferred',
    });
    console.log(`getContents received ${result.results.length} results from Exa API`);

    // Process Exa results
    for (const r of result.results) {
      if (r.text && r.text.trim()) {
        results.push({
          title: r.title || r.url.split('/').pop() || 'Retrieved Content',
          url: r.url,
          content: r.text,
          publishedDate: r.publishedDate || '',
          favicon: r.favicon || `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=128`,
        });
      } else {
        // Add URLs with no content to failed list for Firecrawl fallback
        failedUrls.push(r.url);
      }
    }

    // Add any URLs that weren't returned by Exa to the failed list
    const exaUrls = result.results.map((r) => r.url);
    const missingUrls = links.filter((url) => !exaUrls.includes(url));
    failedUrls.push(...missingUrls);
  } catch (error) {
    console.error('Exa API error:', error);
    console.log('Adding all URLs to Firecrawl fallback list');
    failedUrls.push(...links);
  }

  // Use Firecrawl as fallback for failed URLs
  if (failedUrls.length > 0) {
    console.log(`Using Firecrawl fallback for ${failedUrls.length} URLs:`, failedUrls);

    for (const url of failedUrls) {
      try {
        const scrapeResponse = await firecrawl.scrape(url, {
          formats: ['markdown'],
          proxy: 'auto',
          storeInCache: true,
          parsers: ['pdf'],
        });

        if (scrapeResponse.markdown) {
          console.log(`Firecrawl successfully scraped ${url}`);

          results.push({
            title: scrapeResponse.metadata?.title || url.split('/').pop() || 'Retrieved Content',
            url: url,
            content: scrapeResponse.markdown.slice(0, 3000), // Match maxCharacters from Exa
            publishedDate: (scrapeResponse.metadata?.publishedDate as string) || '',
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
          });
        } else {
          console.error(`Firecrawl failed for ${url}:`, scrapeResponse);
        }
      } catch (firecrawlError) {
        console.error(`Firecrawl error for ${url}:`, firecrawlError);
      }
    }
  }

  console.log(
    `getContents returning ${results.length} total results (${results.length - failedUrls.length + results.filter((r) => failedUrls.includes(r.url)).length} from Exa, ${results.filter((r) => failedUrls.includes(r.url)).length} from Firecrawl)`,
  );
  return results;
};

async function extremeSearch(
  prompt: string,
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined,
): Promise<Research> {
  const allSources: SearchResult[] = [];

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Planning research' },
      },
    });
  }

  // plan out the research
  const { object: result } = await generateObject({
    model: ritivel.languageModel('ritivel-default'),
    schema: z.object({
      plan: z
        .array(
          z.object({
            title: z.string().min(10).max(70).describe('A title for the research topic'),
            todos: z.array(z.string()).min(3).max(5).describe('A list of what to research for the given title'),
          }),
        )
        .min(1)
        .max(5),
    }),
    prompt: `Develop a high-stakes regulatory research plan for life-science compliance teams investigating: ${prompt}.

Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}

Planning directives:
- Focus strictly on regulatory guidance, approvals, vigilance, labelling, renewals, or market entry rules for medicinal products, biologics, medical devices, or diagnostics.
- Ensure each plan item captures or seeks the three critical details: product category, regulatory topic, and country/authority. Flag gaps explicitly so we can ask the user or target follow-up searches.
- Limit the plan to 15 total actions (≤5 sections, each with 3–5 todos).
- Identify which actions require X (Twitter) monitoring or code-driven analysis (e.g., tabulating timelines) when applicable.
- Do not include narrative summaries—only actionable research todos.`,
  });

  console.log(result.plan);

  const plan = result.plan;

  // calculate the total number of todos
  const totalTodos = plan.reduce((acc, curr) => acc + curr.todos.length, 0);
  console.log(`Total todos: ${totalTodos}`);

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research plan ready, starting up research agent' },
        plan,
      },
    });
  }

  let toolResults: any[] = [];

  // Create the autonomous research agent with tools
  const { text } = await generateText({
    model: ritivel.languageModel('ritivel-default'),
    stopWhen: stepCountIs(totalTodos),
    system: `
You are an autonomous regulatory intelligence analyst serving life-sciences compliance teams. Investigate the research plan thoroughly using the available tools.

Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

### Primary mandate
- Stay strictly within medicinal products, biologics, medical devices, diagnostics, and other life-science products.
- Prioritise factual regulatory requirements; never speculate, offer opinions, or extrapolate beyond retrieved evidence.
- Every action must reinforce or uncover the three critical details: (1) product category, (2) regulatory topic, (3) country/competent authority. When a detail is missing, focus searches or follow-up actions on closing that gap.
- Respect the ${totalTodos} step budget (with up to 2 retries for errors). Treat each step as high-value.

### Searching discipline
- Search before analysing. Run one query at a time, review results, then iterate.
- Craft 3–5 targeted searches per research topic varying angle (baseline requirements, recent updates ${new Date().getFullYear()}, procedural guidance, enforcement actions).
- Always embed temporal context ("${new Date().getFullYear()}", "latest", explicit year spans).
- Tailor queries to the markets supported by the platform; specify product type and authority where possible.
- Use include_domains when a competent authority site is known.
- Seek corroboration from multiple reputable regulatory sources; log inconsistencies for follow-up.

### X (Twitter) usage
- Monitor X only for time-sensitive regulatory announcements, agency alerts, or stakeholder communications.
- Keep queries precise, free of hashtags, and bounded by date ranges.

### Code execution (rare)
- Run code only to organise retrieved regulatory data (e.g., timeline tables) or to perform simple calculations (e.g., deadline intervals).
- All scripts must end with print() and visualisations must call plt.show().

### Workflow expectations
1. Confirm which required details are missing and aim early searches at filling them.
2. Start broad, then drill down to procedural specifics, recent updates, and local obligations.
3. Capture direct excerpts with citations; do not paraphrase beyond the source meaning.
4. If searches fail, record the gap and suggest next steps (e.g., request user clarification).
5. Stop once the plan is complete or the step budget is exhausted.
`,
    prompt,
    temperature: 0,
    providerOptions: {
      xai: {
        parallel_tool_calls: 'false',
      },
    },
    tools: {
      codeRunner: {
        description: 'Run Python code in a sandbox',
        inputSchema: z.object({
          title: z.string().describe('The title of what you are running the code for'),
          code: z.string().describe('The Python code to run with proper syntax and imports'),
        }),
        execute: async ({ title, code }) => {
          console.log('Running code:', code);
          // check if the code has any imports other than the pythonLibsAvailable
          // and then install the missing libraries
          const imports = code.match(/import\s+([\w\s,]+)/);
          const importLibs = imports ? imports[1].split(',').map((lib: string) => lib.trim()) : [];
          const missingLibs = importLibs.filter((lib: string) => !pythonLibsAvailable.includes(lib));

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId: `code-${Date.now()}`,
                title: title,
                code: code,
                status: 'running',
              },
            });
          }
          const response = await runCode(code, missingLibs);

          // Extract chart data if present, and if so then map and remove the png with chart.png
          const charts =
            response.artifacts?.charts?.map((chart) => {
              if (chart.png) {
                const { png, ...chartWithoutPng } = chart;
                return chartWithoutPng;
              }
              return chart;
            }) || [];

          console.log('Charts:', response.artifacts?.charts);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId: `code-${Date.now()}`,
                title: title,
                code: code,
                status: 'completed',
                result: response.result,
                charts: charts,
              },
            });
          }

          return {
            result: response.result,
            charts: charts,
          };
        },
      },
      webSearch: {
        description: 'Search the web for information on a topic',
        inputSchema: z.object({
          query: z.string().describe('The search query to achieve the todo').max(150),
          category: z.nativeEnum(SearchCategory).optional().describe('The category of the search if relevant'),
          includeDomains: z.array(z.string()).optional().describe('The domains to include in the search for results'),
        }),
        execute: async ({ query, category, includeDomains }, { toolCallId }) => {
          console.log('Web search query:', query);
          console.log('Category:', category);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'query',
                queryId: toolCallId,
                query: query,
                status: 'started',
              },
            });
          }
          // Query annotation already sent above
          let results = await searchWeb(query, category, includeDomains);
          console.log(`Found ${results.length} results for query "${query}"`);

          // Add these sources to our total collection
          allSources.push(...results);

          if (dataStream) {
            results.forEach(async (source) => {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'source',
                  queryId: toolCallId,
                  source: {
                    title: source.title,
                    url: source.url,
                    favicon: source.favicon,
                  },
                },
              });
            });
          }
          // Get full content for the top results
          if (results.length > 0) {
            try {
              if (dataStream) {
                dataStream.write({
                  type: 'data-extreme_search',
                  data: {
                    kind: 'query',
                    queryId: toolCallId,
                    query: query,
                    status: 'reading_content',
                  },
                });
              }

              // Get the URLs from the results
              const urls = results.map((r) => r.url);

              // Get the full content using getContents
              const contentsResults = await getContents(urls);

              // Only update results if we actually got content results
              if (contentsResults && contentsResults.length > 0) {
                // For each content result, add a content annotation
                if (dataStream) {
                  contentsResults.forEach((content) => {
                    dataStream.write({
                      type: 'data-extreme_search',
                      data: {
                        kind: 'content',
                        queryId: toolCallId,
                        content: {
                          title: content.title || '',
                          url: content.url,
                          text: (content.content || '').slice(0, 500) + '...', // Truncate for annotation
                          favicon: content.favicon || '',
                        },
                      },
                    });
                  });
                }
                // Update results with full content, but keep original results as fallback
                results = contentsResults.map((content) => {
                  const originalResult = results.find((r) => r.url === content.url);
                  return {
                    title: content.title || originalResult?.title || '',
                    url: content.url,
                    content: content.content || originalResult?.content || '',
                    publishedDate: content.publishedDate || originalResult?.publishedDate || '',
                    favicon: content.favicon || originalResult?.favicon || '',
                  };
                }) as SearchResult[];
              } else {
                console.log('getContents returned no results, using original search results');
              }
            } catch (error) {
              console.error('Error fetching content:', error);
              console.log('Using original search results due to error');
            }
          }

          // Mark query as completed
          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'query',
                queryId: toolCallId,
                query: query,
                status: 'completed',
              },
            });
          }

          return results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            publishedDate: r.publishedDate,
          }));
        },
      },
      xSearch: {
        description: 'Search X (formerly Twitter) posts for recent information and discussions',
        inputSchema: z.object({
          query: z.string().describe('The search query for X posts').max(150),
          startDate: z
            .string()
            .describe('The start date of the search in the format YYYY-MM-DD (default to 7 days ago if not specified)')
            .optional(),
          endDate: z
            .string()
            .describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)')
            .optional(),
          xHandles: z
            .array(z.string())
            .optional()
            .describe(
              'Optional list of X handles/usernames to search from (without @ symbol). Only include if user explicitly mentions specific handles',
            ),
          maxResults: z.number().optional().describe('Maximum number of search results to return (default 15)'),
        }),
        execute: async ({ query, startDate, endDate, xHandles, maxResults = 15 }, { toolCallId }) => {
          console.log('X search query:', query);
          console.log('X search parameters:', { startDate, endDate, xHandles, maxResults });

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'x_search',
                xSearchId: toolCallId,
                query: query,
                startDate: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: endDate || new Date().toISOString().split('T')[0],
                handles: xHandles || [],
                status: 'started',
              },
            });
          }

          try {
            // Set default dates if not provided
            const searchStartDate =
              startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const searchEndDate = endDate || new Date().toISOString().split('T')[0];

            const { text, sources } = await generateText({
              model: xai('grok-4-fast-non-reasoning'),
              system: `You gather recent regulatory intelligence from X (Twitter). Focus on competent authorities, official stakeholders, and recognised experts. Return only factual posts relevant to life-science regulations, include inline references [Source No.], and note when few or no credible posts are found. Avoid speculation or commentary.`,
              messages: [{ role: 'user', content: query }],
              maxOutputTokens: 10,
              providerOptions: {
                xai: {
                  searchParameters: {
                    mode: 'on',
                    fromDate: searchStartDate,
                    toDate: searchEndDate,
                    maxSearchResults: maxResults < 15 ? 15 : maxResults,
                    returnCitations: true,
                    sources: [xHandles && xHandles.length > 0 ? { type: 'x', xHandles: xHandles } : { type: 'x' }],
                  },
                } satisfies XaiProviderOptions,
              },
            });

            const citations = sources || [];
            const allSources = [];

            if (citations.length > 0) {
              const tweetFetchPromises = citations
                .filter((link) => link.sourceType === 'url')
                .map(async (link) => {
                  try {
                    const tweetUrl = link.sourceType === 'url' ? link.url : '';
                    const tweetId = tweetUrl.match(/\/status\/(\d+)/)?.[1] || '';

                    const tweetData = await getTweet(tweetId);
                    if (!tweetData) return null;

                    const text = tweetData.text;
                    if (!text) return null;

                    // Generate a better title with user handle and text preview
                    const userHandle = tweetData.user?.screen_name || tweetData.user?.name || 'unknown';
                    const textPreview = text.slice(0, 20) + (text.length > 20 ? '...' : '');
                    const generatedTitle = `Post from @${userHandle}: ${textPreview}`;

                    return {
                      text: text,
                      link: tweetUrl,
                      title: generatedTitle,
                    };
                  } catch (error) {
                    console.error(`Error fetching tweet data for ${link.sourceType === 'url' ? link.url : ''}:`, error);
                    return null;
                  }
                });

              const tweetResults = await Promise.all(tweetFetchPromises);
              allSources.push(...tweetResults.filter((result) => result !== null));
            }

            const result = {
              content: text,
              citations: citations,
              sources: allSources.filter((source): source is { text: string; link: string; title: string } => source !== null),
              dateRange: `${searchStartDate} to ${searchEndDate}`,
              handles: xHandles || [],
            };

            if (dataStream) {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'x_search',
                  xSearchId: toolCallId,
                  query: query,
                  startDate: searchStartDate,
                  endDate: searchEndDate,
                  handles: xHandles || [],
                  status: 'completed',
                  result: result,
                },
              });
            }

            return result;
          } catch (error) {
            console.error('X search error:', error);

            if (dataStream) {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'x_search',
                  xSearchId: toolCallId,
                  query: query,
                  startDate: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: endDate || new Date().toISOString().split('T')[0],
                  handles: xHandles || [],
                  status: 'error',
                },
              });
            }

            throw error;
          }
        },
      },
    },
    onStepFinish: (step) => {
      console.log('Step finished:', step.finishReason);
      console.log('Step:', step);
      if (step.toolResults) {
        console.log('Tool results:', step.toolResults);
        toolResults.push(...step.toolResults);
      }
    },
  });

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research completed' },
      },
    });
  }

  const chartResults = toolResults.filter(
    (result) =>
      result.toolName === 'codeRunner' &&
      typeof result.result === 'object' &&
      result.result !== null &&
      'charts' in result.result,
  );

  console.log('Chart results:', chartResults);

  const charts = chartResults.flatMap((result) => (result.result as any).charts || []);

  console.log('Tool results:', toolResults);
  console.log('Charts:', charts);
  console.log('Source 2:', allSources[2]);

  return {
    text,
    toolResults,
    sources: Array.from(
      new Map(allSources.map((s) => [s.url, { ...s, content: s.content.slice(0, 3000) + '...' }])).values(),
    ),
    charts,
  };
}

export function extremeSearchTool(dataStream: UIMessageStreamWriter<ChatMessage> | undefined) {
  return tool({
    description: 'Use this tool to conduct an extreme search on a given topic.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "This should take the user's exact prompt. Extract from the context but do not infer or change in any way.",
        ),
    }),
    execute: async ({ prompt }) => {
      console.log({ prompt });

      const research = await extremeSearch(prompt, dataStream);

      return {
        research: {
          text: research.text,
          toolResults: research.toolResults,
          sources: research.sources,
          charts: research.charts,
        },
      };
    },
  });
}
