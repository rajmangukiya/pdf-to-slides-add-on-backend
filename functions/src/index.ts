import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { callGemini, generatePrompt } from './helper';
import { extractImagesFromPdf, extractTextPageWise, mergeTextAndImages } from './helper/pdf';

// const pdfParse = require('pdf-parse');

setGlobalOptions({
    timeoutSeconds: 3000,
    memory: '1GiB',
    region: 'us-central1'
});

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const convertPdfToSlides = onRequest(
    {
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

            const pdfBase64 = request.body.data || request.body;

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

            const images = await extractImagesFromPdf(pdfBuffer);
            const pdfTextContent = await extractTextPageWise(pdfBuffer);

            // AI processing
            const prompt = generatePrompt(pdfTextContent);

            // Call Gemini API
            const slidesDataText = await callGemini(prompt, apiKey);

            const slidesData = mergeTextAndImages(slidesDataText, images);

            response.status(200).json({
                success: true,
                data: slidesData,
                metadata: {
                    model: "gemini-2.5-flash",
                    pagesProcessed: pdfTextContent.length,
                    slidesGenerated: slidesData.length,
                },
            });

            // response.status(200).json({
            //     success: true,
            //     data: pdfWithoutImages,
            //     images: images,
            //     metadata: {
            //         model: "gemini-2.5-flash",
            //         pagesProcessed: 10,
            //         slidesGenerated: 10,
            //     },
            // });
        } catch (error: any) {
            console.error(error);
            response.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

export const healthCheck = onRequest(async (request, response) => {
    response.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'pdf-to-slides-converter',
        version: '2.0',
        ai: 'gemini-pro'
    });
});