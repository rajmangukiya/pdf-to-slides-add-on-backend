import axios from "axios";

export const generatePrompt = (pdfText: string) => {
  return (
    `
  You are a presentation expert. Convert this document into a structured JSON presentation.
  
  Rules:
  - 5-10 slides
  - Each slide has a title + 2-5 bullets
  - JSON only, no markdown
  - Format:
  
  {
    "slides": [
      { "title": "Title", "bullets": ["a", "b", "c"] }
    ]
  }
  
  Document:
  ${pdfText.substring(0, 30000)}`
  )
}

export const callGemini = async (prompt: string, apiKey: string) => {
  try {
    const model = "gemini-2.5-flash";
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    // Clean JSON
    let cleanJson = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanJson = jsonMatch[0];

    // Data formatting
    let slidesData;
    try {
      slidesData = JSON.parse(cleanJson);
    } catch (error: any) {
      throw new Error("Failed to parse AI JSON: " + error.message);
    }

    if (!slidesData.slides || !Array.isArray(slidesData.slides)) {
      throw new Error("Invalid JSON: slides is not an array");
    }

    return slidesData;
  } catch (error: any) {
    throw new Error("Error calling Gemini: " + error.message);
  }
}