import OpenAI from 'openai';
import type { LLMResponse } from './types.js';

/**
 * Processes editorial content using LLM to extract optimal strategy and complexity
 */
export class LLMProcessor {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Processes problem description and editorial to extract description summary,
   * optimal strategy, and complexity in a single LLM call
   */
  async processProblem(
    problemTitle: string,
    descriptionContent: string,
    editorialContent?: string
  ): Promise<LLMResponse> {
    const hasEditorial = editorialContent && editorialContent.trim().length > 0;
    
    const prompt = `For the problem "${problemTitle}", provide the following:

1. A 2-3 sentence summary of the problem description (what it asks and key constraints)
2. An example input/output pair
3. ${hasEditorial ? 'The ideal approach for use in an interview / tech screen in one sentence, based on the editorial' : 'The ideal approach for use in an interview / tech screen in one sentence, based on your analysis of the problem'}
4. A TypeScript code snippet demonstrating the optimal approach
5. Time and space complexity in Big-O notation${hasEditorial ? ', based on the editorial' : ', based on your analysis'}

Note that the most optimal solution is not always the right one to use in an interview, as it may be too complex.
For instance, if a problem is designed to be solved using a heap, the optimal strategy should be to use a heap even if there's technically a more optimal solution.

Do not include any hints about time/space complexity in your problem description, only in the dedicated timeComplexity and spaceComplexity fields.

Problem description:
${descriptionContent}

${hasEditorial ? `Editorial content:\n${editorialContent}` : ''}

Respond in JSON format with the following structure:
{
  "description": "2-3 sentence summary of the problem (without example)",
  "example": {
    "input": "example input (e.g., \"nums = [1,2,3], target = 5\")",
    "output": "example output (e.g., \"[0, 2]\")"
  },
  "strategy": "one sentence optimal approach${hasEditorial ? ' based on the editorial' : ' for interview use'}",
  "codeSnippet": "TypeScript code example",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)"
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in algorithms and data structures with TypeScript expertise. When an editorial is provided, extract optimal strategies and complexity from it. When no editorial is available, analyze the problem yourself and provide an interview-optimal solution. Always provide code snippets in TypeScript.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const parsed = JSON.parse(content) as LLMResponse;
      
      // Validate response structure
      if (!parsed.description || !parsed.example || !parsed.example.input || !parsed.example.output || !parsed.strategy || !parsed.codeSnippet || !parsed.timeComplexity || !parsed.spaceComplexity) {
        throw new Error('Invalid LLM response structure');
      }

      return parsed;
    } catch (error) {
      console.error(`Error processing LLM request for ${problemTitle}:`, error);
      throw error;
    }
  }

  /**
   * Strips HTML tags from editorial content
   */
  stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
