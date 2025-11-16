"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTextAndImages = exports.extractImagesFromPdf = void 0;
exports.extractTextPageWise = extractTextPageWise;
exports.extractTextWithoutImages = extractTextWithoutImages;
const pdfjsLib = __importStar(require("pdfjs-dist/legacy/build/pdf.js"));
const canvas_1 = require("canvas");
const loadPdf = async (pdfBuffer) => {
    try {
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        return pdf;
    }
    catch (error) {
        console.error(error);
        throw new Error("Error loading PDF: " + error.message);
    }
};
const extractImagesFromPdf = async (pdfBuffer) => {
    try {
        const pdf = await loadPdf(pdfBuffer);
        let pageImagesMap = new Map();
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const ops = await page.getOperatorList();
            // const objs = page.commonObjs;
            // const xobjs = page.objs;
            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i];
                const args = ops.argsArray[i];
                // Image types
                if (fn === pdfjsLib.OPS.paintImageXObject ||
                    fn === pdfjsLib.OPS.paintXObject) {
                    const objName = args[0];
                    const img = await page.objs.get(objName); // raw pixel data
                    if (!img || !img.data)
                        continue;
                    const canvas = (0, canvas_1.createCanvas)(img.width, img.height);
                    const ctx = canvas.getContext("2d");
                    const imageData = ctx.createImageData(img.width, img.height);
                    imageData.data.set(img.data);
                    ctx.putImageData(imageData, 0, 0);
                    const base64 = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
                    pageImagesMap.set(pageNum, [...pageImagesMap.get(pageNum) || [], {
                            base64,
                            width: img.width,
                            height: img.height
                        }]);
                }
            }
        }
        return Array.from(pageImagesMap.entries()).map(([page, images]) => ({
            page,
            images: images
        }));
    }
    catch (error) {
        console.error(error);
        throw new Error("Error extracting images from PDF: " + error.message);
    }
};
exports.extractImagesFromPdf = extractImagesFromPdf;
async function extractTextPageWise(pdfBuffer) {
    const pdf = await loadPdf(pdfBuffer);
    let pages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        // Extract text content for this page ONLY
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => item.str)
            .join(" ")
            .trim();
        pages.push({
            page: pageNum,
            text: pageText
        });
    }
    return pages;
}
async function extractTextWithoutImages(pdfBuffer) {
    try {
        const pdf = await loadPdf(pdfBuffer);
        let allText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            // Get text (this contains NO images)
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => item.str)
                .join(" ")
                .trim();
            allText += `\n\n${pageText}`;
        }
        return allText.trim();
    }
    catch (error) {
        console.error(error);
        throw new Error("Error extracting text from PDF: " + error.message);
    }
}
const mergeTextAndImages = (pdfTextContent, images) => {
    return pdfTextContent.slides.map((textItem, index) => {
        const imageItem = images.find((imageItem) => imageItem.page === textItem.page);
        return {
            page: index + 1,
            title: textItem.title,
            bullets: textItem.bullets,
            images: (imageItem === null || imageItem === void 0 ? void 0 : imageItem.images) || [],
        };
    }).filter((item) => item.images.length > 0);
};
exports.mergeTextAndImages = mergeTextAndImages;
//# sourceMappingURL=pdf.js.map