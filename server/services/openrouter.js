import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    this.model = "google/gemini-2.0-flash-lite-001";

    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is required");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "RFP Analysis Server",
      },
      timeout: 120000, // 2 minutes timeout for large documents
    });
  }

  async invokeLLM({ prompt, documents = [], responseJsonSchema = null, addContextFromInternet = false }) {
    try {
      let messages;

      // Check if we have documents to process
      if (documents && documents.length > 0) {
        console.log(`📎 Adding ${documents.length} document(s) to AI request`);

        // For documents, use the vision-capable format
        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  prompt +
                  `\n\nI have provided ${documents.length} document(s) for analysis. Please analyze the content and respond based on the documents provided.`,
              },
            ],
          },
        ];

        // Add each document
        documents.forEach((doc, index) => {
          console.log(`📄 Processing document ${index + 1}: ${doc.filename} (${doc.mimeType})`);
          
          if (doc.type === 'text') {
            // For text-extracted documents (like PDFs), add the text content directly
            console.log(`✅ Adding text content from: ${doc.filename} (${doc.content.length} characters)`);
            messages[0].content[0].text += `\n\n--- Document Content: ${doc.filename} ---\n${doc.content}\n--- End of Document ---\n`;
          } else if (doc.mimeType.startsWith("image/")) {
            // For images, use vision API
            console.log(`✅ Adding image to vision API: ${doc.filename}`);
            messages[0].content.push({
              type: "image_url",
              image_url: {
                url: `data:${doc.mimeType};base64,${doc.content}`,
                detail: "high",
              },
            });
          } else {
            console.log(`⚠️ Document type not supported: ${doc.mimeType}`);
            messages[0].content[0].text += `\n\nDocument: ${doc.filename} (${doc.mimeType}) - Document type not supported for analysis.`;
          }
        });
      } else {
        // Simple text-only request
        messages = [
          {
            role: "user",
            content: prompt,
          },
        ];
      }

      const requestData = {
        model: this.model,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9,
        stream: false,
      };

      console.log(`🤖 Sending request to OpenRouter with model: ${this.model}`);
      console.log(`📝 Message structure:`, JSON.stringify(messages, null, 2).substring(0, 500) + '...');

      // Add JSON schema if provided
      if (responseJsonSchema) {
        requestData.response_format = {
          type: "json_object",
        };

        // Add schema instruction to prompt
        const schemaInstruction = `\n\nPlease respond with a valid JSON object matching this schema: ${JSON.stringify(responseJsonSchema)}`;
        if (typeof messages[0].content === "string") {
          messages[0].content += schemaInstruction;
        } else if (Array.isArray(messages[0].content)) {
          messages[0].content[0].text += schemaInstruction;
        }
      }

      console.log("🤖 Sending request to OpenRouter...");
      const response = await this.client.post("/chat/completions", requestData);

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;

        // If JSON schema was requested, try to parse the response
        if (responseJsonSchema) {
          try {
            return JSON.parse(content);
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            // Return the raw content if JSON parsing fails
            return content;
          }
        }

        return content;
      } else {
        throw new Error("No response from OpenRouter API");
      }
    } catch (error) {
      console.error("OpenRouter API Error:", error.response?.data || error.message);

      if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.response?.status === 401) {
        throw new Error("Invalid API key. Please check your OpenRouter configuration.");
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout. The document might be too large or complex.");
      } else {
        throw new Error(`AI processing failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  }

  async analyzeDocument(documents, questions) {
    // For now, let's use a text-only approach since vision might not be available
    const prompt = `As an expert RFP analyzer for ESDS, analyze the provided document and answer the following questions.

Questions to Answer:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Instructions:
- Provide accurate answers based on the document content
- If information is not found, respond with "Not specified in RFP"
- Include page numbers or section references when possible
- Be concise but comprehensive
- Return a JSON object where each question is a key and the answer is the value

Please analyze the document and provide answers in the requested JSON format.`;

    const schema = {
      type: "object",
      properties: questions.reduce((acc, question) => {
        acc[question] = { type: "string" };
        return acc;
      }, {}),
      additionalProperties: false,
    };

    // Try with documents first, if that fails, fall back to text-only
    try {
      return await this.invokeLLM({
        prompt,
        documents,
        responseJsonSchema: schema,
      });
    } catch (error) {
      console.warn("Vision-based analysis failed, trying text-only approach:", error.message);

      // Fallback to text-only analysis
      const textOnlyPrompt = `${prompt}

Note: Document analysis is being performed without direct document access. Please provide general RFP analysis guidance based on common RFP patterns and the questions asked.`;

      return await this.invokeLLM({
        prompt: textOnlyPrompt,
        responseJsonSchema: schema,
      });
    }
  }

  async chatWithDocument(message, documents = [], conversationHistory = []) {
    console.log(`🤖 ChatWithDocument called with ${documents.length} documents`);
    
    if (documents.length > 0) {
      console.log(`📄 Documents received:`, documents.map(d => ({ filename: d.filename, mimeType: d.mimeType, sizeMB: d.sizeMB })));
    }

    let prompt = `You are a professional AI assistant for ESDS's Presales Division, expert at analyzing RFP documents.

Instructions:
1. Analyze documents to answer user questions
2. Cite sources when possible (e.g., "Source: Page 15, Section 3.2.1")
3. If information isn't found, state: "This information is not specified in the uploaded document(s)."
4. Stay professional and focused on RFP analysis
5. Provide actionable insights when possible

`;

    if (documents && documents.length > 0) {
      prompt += `I have provided ${documents.length} document(s) for analysis. `;
    }

    if (conversationHistory.length > 0) {
      prompt += `Previous Conversation:
${conversationHistory.map((msg) => `${msg.sender}: ${msg.message}`).join("\n")}

`;
    }

    prompt += `User Question: ${message}

Please provide your response:`;

    // Try with documents first, if that fails, fall back to text-only
    try {
      console.log(`🚀 Attempting document-based chat...`);
      const result = await this.invokeLLM({
        prompt,
        documents,
      });
      console.log(`✅ Document-based chat successful`);
      return result;
    } catch (error) {
      console.warn("❌ Document-based chat failed, trying text-only approach:", error.message);

      // Fallback to text-only chat
      const textOnlyPrompt = `${prompt}

Note: I'm currently unable to directly access the uploaded documents, but I can provide general RFP analysis guidance based on your question.`;

      console.log(`🔄 Falling back to text-only chat`);
      return await this.invokeLLM({
        prompt: textOnlyPrompt,
      });
    }
  }
}

export default new OpenRouterService();
