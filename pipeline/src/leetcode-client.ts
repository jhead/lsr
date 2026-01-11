import type { LeetCodeGraphQLResponse, LeetCodeProblemListResponse } from './types.js';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

interface GraphQLQuery {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

/**
 * Fetches problem data from LeetCode GraphQL API
 */
export class LeetCodeClient {
  private readonly graphqlUrl: string;
  private readonly sessionToken?: string;
  private readonly csrfToken?: string;

  constructor(
    graphqlUrl: string = LEETCODE_GRAPHQL_URL,
    sessionToken?: string,
    csrfToken?: string
  ) {
    this.graphqlUrl = graphqlUrl;
    this.sessionToken = sessionToken || process.env.LEETCODE_SESSION;
    this.csrfToken = csrfToken || process.env.LEETCODE_CSRF_TOKEN;
  }

  /**
   * Fetches problem details including editorial solution
   */
  async fetchProblem(slug: string): Promise<LeetCodeGraphQLResponse> {
    const query: GraphQLQuery = {
      query: `
        query questionContent($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            titleSlug
            difficulty
            content
            topicTags {
              name
            }
            solution {
              content
            }
          }
        }
      `,
      variables: {
        titleSlug: slug,
      },
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication headers if available
      if (this.csrfToken) {
        headers['x-csrftoken'] = this.csrfToken;
      }
      if (this.sessionToken) {
        headers['Cookie'] = `LEETCODE_SESSION=${this.sessionToken}${this.csrfToken ? `; csrftoken=${this.csrfToken}` : ''}`;
      }

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as LeetCodeGraphQLResponse | { errors: unknown };
      
      if ('errors' in data && data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data as LeetCodeGraphQLResponse;
    } catch (error) {
      console.error(`Error fetching problem ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Fetches a list of problem slugs from LeetCode
   * @param limit Maximum number of problems to fetch per request (default: 50)
   * @param skip Number of problems to skip (for pagination, default: 0)
   * @param categorySlug Category slug (e.g., "", "algorithms", etc., default: "")
   * @param orderBy Sort order in filters (e.g., "FREQUENCY_DESCENDING", default: undefined)
   */
  async fetchProblemList(
    limit: number = 50,
    skip: number = 0,
    categorySlug: string = '',
    orderBy?: string
  ): Promise<LeetCodeProblemListResponse> {
    const filters: Record<string, unknown> = {};
    if (orderBy) {
      filters.orderBy = orderBy;
    }
    
    const query: GraphQLQuery = {
      query: `
        query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
          problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
          ) {
            total: totalNum
            questions: data {
              titleSlug
              difficulty
            }
          }
        }
      `,
      variables: {
        categorySlug,
        limit,
        skip,
        filters,
      },
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication headers if available
      if (this.csrfToken) {
        headers['x-csrftoken'] = this.csrfToken;
      }
      if (this.sessionToken) {
        headers['Cookie'] = `LEETCODE_SESSION=${this.sessionToken}${this.csrfToken ? `; csrftoken=${this.csrfToken}` : ''}`;
      }

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as LeetCodeProblemListResponse | { errors: unknown };
      
      if ('errors' in data && data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data as LeetCodeProblemListResponse;
    } catch (error) {
      console.error(`Error fetching problem list:`, error);
      throw error;
    }
  }

  /**
   * Fetches top N most frequent problem slugs using V2 API (requires authentication)
   * @param limit Number of problems to fetch (default: 150)
   * @param categorySlug Category slug (e.g., "", "all-code-essentials", etc., default: "")
   */
  async fetchTopFrequentProblemSlugs(
    limit: number = 150,
    categorySlug: string = 'all-code-essentials'
  ): Promise<string[]> {
    console.log(`[INFO] Fetching top ${limit} most frequent problem slugs...`);
    
    if (!this.sessionToken || !this.csrfToken) {
      throw new Error(
        'Authentication required for frequency sorting. Please set LEETCODE_SESSION and LEETCODE_CSRF_TOKEN environment variables.'
      );
    }

    const query: GraphQLQuery = {
      query: `
        query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $searchKeyword: String, $skip: Int, $sortBy: QuestionSortByInput, $categorySlug: String) {
          problemsetQuestionListV2(
            filters: $filters
            limit: $limit
            searchKeyword: $searchKeyword
            skip: $skip
            sortBy: $sortBy
            categorySlug: $categorySlug
          ) {
            questions {
              titleSlug
            }
            totalLength
          }
        }
      `,
      variables: {
        skip: 0,
        limit,
        categorySlug,
        filters: {
          filterCombineType: 'ALL',
          statusFilter: { questionStatuses: [], operator: 'IS' },
          difficultyFilter: { difficulties: [], operator: 'IS' },
          languageFilter: { languageSlugs: [], operator: 'IS' },
          topicFilter: { topicSlugs: [], operator: 'IS' },
        },
        searchKeyword: '',
        sortBy: {
          sortField: 'FREQUENCY',
          sortOrder: 'DESCENDING',
        },
      },
      operationName: 'problemsetQuestionListV2',
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrftoken': this.csrfToken!,
        'Cookie': `LEETCODE_SESSION=${this.sessionToken}; csrftoken=${this.csrfToken}`,
      };

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as LeetCodeProblemListResponse | { errors: unknown };
      
      if ('errors' in data && data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const responseData = data as LeetCodeProblemListResponse;
      const questions = responseData.data.problemsetQuestionListV2?.questions || [];
      const slugs = questions.map((q) => q.titleSlug);
      
      console.log(`[INFO] Fetched ${slugs.length} most frequent problem slugs`);
      return slugs;
    } catch (error) {
      console.error(`Error fetching top frequent problem slugs:`, error);
      throw error;
    }
  }

  /**
   * Fetches all problem slugs by paginating through the API
   * @param categorySlug Category slug (e.g., "", "algorithms", etc., default: "")
   * @param pageSize Number of problems per request (default: 50)
   */
  async fetchAllProblemSlugs(
    categorySlug: string = '',
    pageSize: number = 50
  ): Promise<string[]> {
    const allSlugs: string[] = [];
    let skip = 0;
    let total = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[INFO] Fetching problem slugs (skip: ${skip}, pageSize: ${pageSize})`);
      const response = await this.fetchProblemList(pageSize, skip, categorySlug);
      
      const problemsetList = response.data.problemsetQuestionList;
      if (!problemsetList) {
        throw new Error('Invalid response: problemsetQuestionList is missing');
      }
      const questions = problemsetList.questions;
      total = problemsetList.total;
      
      const slugs = questions.map((q) => q.titleSlug);
      allSlugs.push(...slugs);
      
      skip += pageSize;
      hasMore = skip < total;
      
      // Small delay to avoid rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[INFO] Fetched ${allSlugs.length} problem slugs`);
    return allSlugs;
  }

  /**
   * Fetches problem by ID (converts to slug format)
   * Note: This is a simplified approach. In production, you might need
   * a mapping of problem IDs to slugs or use a different query.
   */
  async fetchProblemById(id: number): Promise<LeetCodeGraphQLResponse> {
    // For MVP, we'll need to use a slug. This is a placeholder.
    // In practice, you'd need either:
    // 1. A list of problem slugs
    // 2. A different GraphQL query that accepts problem ID
    // 3. A mapping file
    
    throw new Error(
      'fetchProblemById not implemented. Use fetchProblem with slug instead, or provide a slug mapping.'
    );
  }
}
