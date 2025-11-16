"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.convertPdfToSlides = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const helper_1 = require("./helper");
const pdfParse = require('pdf-parse');
(0, v2_1.setGlobalOptions)({
    timeoutSeconds: 3000,
    memory: '1GiB',
    region: 'us-central1'
});
const geminiApiKey = (0, params_1.defineSecret)('GEMINI_API_KEY');
exports.convertPdfToSlides = (0, https_1.onRequest)({
    secrets: [geminiApiKey],
    cpu: 1,
    timeoutSeconds: 300,
    memory: "1GiB",
    minInstances: 0,
    maxInstances: 10,
}, async (request, response) => {
    // CORS handling
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Credentials", "true");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") {
        // CORS preflight MUST end here
        response.status(204).send("");
        return;
    }
    try {
        const pdfBase64 = request.body.data;
        if (!pdfBase64) {
            response.status(400).json({
                success: false,
                error: "PDF file is required: body.data is null",
            });
            return;
        }
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            response.status(500).json({
                success: false,
                error: "Missing Gemini API key",
            });
            return;
        }
        // Extract PDF text
        const pdfBuffer = Buffer.from(pdfBase64, "base64");
        const pdfData = await pdfParse(pdfBuffer);
        const pdfText = pdfData.text;
        if (!pdfText || pdfText.trim().length < 50) {
            response.status(500).json({
                success: false,
                error: "Could not extract enough text from PDF: Found less than 50 characters",
            });
            return;
        }
        // AI processing
        const prompt = (0, helper_1.generatePrompt)(pdfText);
        // Call Gemini API
        const slidesData = await (0, helper_1.callGemini)(prompt, apiKey);
        response.status(200).json({
            success: true,
            data: slidesData,
            metadata: {
                model: "gemini-2.5-flash",
                pagesProcessed: pdfData.numpages,
                slidesGenerated: slidesData.slides.length,
            },
        });
    }
    catch (error) {
        response.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.healthCheck = (0, https_1.onRequest)(async (request, response) => {
    response.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'pdf-to-slides-converter',
        version: '2.0',
        ai: 'gemini-pro'
    });
});
//# sourceMappingURL=index.js.map