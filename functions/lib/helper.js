"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGemini = exports.generatePrompt = void 0;
const axios_1 = __importDefault(require("axios"));
const generatePrompt = (pdfText) => {
    return (`
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
  ${pdfText.substring(0, 30000)}`);
};
exports.generatePrompt = generatePrompt;
const callGemini = async (prompt, apiKey) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const model = "gemini-2.5-flash";
        const geminiResponse = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }],
                },
            ],
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        const responseText = (_f = (_e = (_d = (_c = (_b = (_a = geminiResponse.data) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
        if (!responseText) {
            throw new Error("Empty response from Gemini");
        }
        // Clean JSON
        let cleanJson = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch)
            cleanJson = jsonMatch[0];
        // Data formatting
        let slidesData;
        try {
            slidesData = JSON.parse(cleanJson);
        }
        catch (error) {
            throw new Error("Failed to parse AI JSON: " + error.message);
        }
        if (!slidesData.slides || !Array.isArray(slidesData.slides)) {
            throw new Error("Invalid JSON: slides is not an array");
        }
        return slidesData;
    }
    catch (error) {
        throw new Error("Error calling Gemini: " + error.message);
    }
};
exports.callGemini = callGemini;
//# sourceMappingURL=helper.js.map