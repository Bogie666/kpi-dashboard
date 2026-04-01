/**
 * Claude AI Service for Customer Review Insights
 * Uses Anthropic's Claude API for natural language analysis
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODELS = [
  process.env.ANTHROPIC_MODEL,
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001'
].filter(Boolean);

class ClaudeService {
  constructor() {
    this.apiKey = ANTHROPIC_API_KEY;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async generateCompletion(prompt, options = {}) {
    if (!this.isConfigured()) {
      console.error('Claude API key not configured. ANTHROPIC_API_KEY:', this.apiKey ? 'exists' : 'missing');
      return {
        success: false,
        error: 'Claude API key not configured'
      };
    }

    console.log('API Key configured:', this.apiKey ? 'Yes' : 'No');

    const {
      systemPrompt = 'You are a helpful AI assistant.',
      maxTokens = 2000,
      temperature = 0.7
    } = options;

    try {
      let lastError = 'Unknown Claude API error';

      for (const model of DEFAULT_CLAUDE_MODELS) {
        console.log('Calling Claude API with model:', model);

        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });

        console.log('Claude API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Failed to parse error response' } }));
          const apiError = errorData.error?.message || errorData.message || `API request failed: ${response.status} ${response.statusText}`;
          lastError = apiError;

          console.error('Claude API error:', {
            model,
            status: response.status,
            statusText: response.statusText,
            errorData
          });

          const modelNotAvailable =
            response.status === 400 &&
            /model|not found|unsupported|invalid/i.test(apiError);

          if (modelNotAvailable) {
            console.warn(`Model unavailable: ${model}. Trying next fallback model...`);
            continue;
          }

          return {
            success: false,
            error: apiError
          };
        }

        const data = await response.json();

        // Extract text content from Claude's response
        const content = data.content?.[0]?.text || '';

        return {
          success: true,
          content
        };
      }

      return {
        success: false,
        error: `All configured Claude models failed. Last error: ${lastError}`
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeReviews(reviews, options = {}) {
    const {
      timeframe = 'last 3 months',
      location = 'all locations'
    } = options;

    // Separate reviews by rating
    const positiveReviews = reviews.filter(r => r.rating >= 4);
    const negativeReviews = reviews.filter(r => r.rating <= 3);

    // Prepare review text samples
    const positiveText = positiveReviews
      .slice(0, 30) // Limit to avoid token limits
      .map(r => r.text)
      .filter(Boolean)
      .join('\n---\n');

    const negativeText = negativeReviews
      .slice(0, 20)
      .map(r => r.text)
      .filter(Boolean)
      .join('\n---\n');

    const prompt = `Analyze these customer reviews for an HVAC, plumbing, and electrical service company.

POSITIVE REVIEWS (${positiveReviews.length} total, showing sample):
${positiveText || 'No positive reviews available'}

NEGATIVE/NEUTRAL REVIEWS (${negativeReviews.length} total, showing sample):
${negativeText || 'No negative reviews available'}

Analyze these reviews and provide insights in the following JSON format (return ONLY valid JSON, no markdown):

{
  "commonPraise": ["specific praise 1", "specific praise 2", "specific praise 3", "specific praise 4", "specific praise 5"],
  "commonComplaints": ["specific issue 1", "specific issue 2", "specific issue 3"],
  "keyThemes": [
    {
      "theme": "Theme Name",
      "sentiment": "positive" or "negative" or "neutral",
      "frequency": <number of mentions>,
      "examples": ["short example quote from review"]
    }
  ],
  "technicianMentions": [
    {
      "name": "Technician Name",
      "mentions": <number of times mentioned>,
      "sentiment": "positive" or "negative" or "mixed",
      "samplePraise": "brief quote about this technician"
    }
  ],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3", "actionable recommendation 4", "actionable recommendation 5"],
  "sentimentScore": <number between 0-100 representing overall customer satisfaction>
}

Requirements:
- Extract 5-7 specific things customers praised
- Extract 3-5 specific issues mentioned
- Identify 4-6 key themes with real quotes
- Extract ALL technician/employee names mentioned by customers, with count of mentions and overall sentiment
- Provide 5-7 actionable business recommendations
- Calculate an overall sentiment score (0-100)
- Be specific, reference actual review content
- Return ONLY the JSON object, no other text`;

    const systemPrompt = `You are an expert business analyst specializing in customer feedback analysis for service companies.
You extract specific, actionable insights from customer reviews.
You always respond with valid JSON format only, no markdown formatting or extra text.`;

    const result = await this.generateCompletion(prompt, {
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.3 // Lower for more consistent, analytical output
    });

    if (!result.success) {
      return result;
    }

    try {
      // Strip markdown code fences if present (anywhere in response)
      let jsonText = result.content.trim();
      const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (fenceMatch) {
        jsonText = fenceMatch[1].trim();
      }

      // If still not valid JSON, try to find a JSON object in the response
      if (!jsonText.startsWith('{')) {
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }
      }

      const insights = JSON.parse(jsonText);
      return {
        success: true,
        insights
      };
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', error.message);
      console.error('Raw response (first 500 chars):', result.content?.substring(0, 500));
      return {
        success: false,
        error: `Failed to parse AI response: ${error.message}`,
        rawResponse: result.content
      };
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
