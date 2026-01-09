/**
 * Claude AI Service for Customer Review Insights
 * Uses Anthropic's Claude API for natural language analysis
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Use Claude 3.7 Sonnet
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

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

    console.log('API Key configured:', this.apiKey ? `Yes (${this.apiKey.substring(0, 10)}...)` : 'No');

    const {
      systemPrompt = 'You are a helpful AI assistant.',
      maxTokens = 2000,
      temperature = 0.7
    } = options;

    try {
      console.log('Calling Claude API with model:', CLAUDE_MODEL);

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
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
        console.error('Claude API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        return {
          success: false,
          error: errorData.error?.message || errorData.message || `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      // Extract text content from Claude's response
      const content = data.content?.[0]?.text || '';

      return {
        success: true,
        content
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
      maxTokens: 2000,
      temperature: 0.3 // Lower for more consistent, analytical output
    });

    if (!result.success) {
      return result;
    }

    try {
      // Parse the JSON response
      const insights = JSON.parse(result.content);
      return {
        success: true,
        insights
      };
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', error);
      console.log('Raw response:', result.content);
      return {
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: result.content
      };
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
