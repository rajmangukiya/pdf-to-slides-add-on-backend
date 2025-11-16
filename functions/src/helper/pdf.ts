import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";
import { ExtractImagesFromPdfResult, ExtractImagesFromPdfResult_Image, ExtractTextPageWiseResult, SlidesDataOnlyText, SlideWithImages } from "../types";

const loadPdf = async (pdfBuffer: Buffer) => {
    try {
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        return pdf;
    } catch (error: any) {
        console.error(error);
        throw new Error("Error loading PDF: " + error.message);

    }
}

export const extractImagesFromPdf = async (pdfBuffer: Buffer): Promise<ExtractImagesFromPdfResult[]> => {
    try {
        const pdf = await loadPdf(pdfBuffer);

        let pageImagesMap = new Map<number, ExtractImagesFromPdfResult_Image[]>();

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const ops = await page.getOperatorList();
            // const objs = page.commonObjs;
            // const xobjs = page.objs;

            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i];
                const args = ops.argsArray[i];

                // Image types
                if (
                    fn === pdfjsLib.OPS.paintImageXObject ||
                    fn === pdfjsLib.OPS.paintXObject
                ) {
                    const objName = args[0];

                    const img = await page.objs.get(objName); // raw pixel data
                    if (!img || !img.data) continue;

                    const canvas = createCanvas(img.width, img.height);
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
    } catch (error: any) {
        console.error(error);
        throw new Error("Error extracting images from PDF: " + error.message);
    }
}

export async function extractTextPageWise(pdfBuffer: Buffer): Promise<ExtractTextPageWiseResult[]> {
    const pdf = await loadPdf(pdfBuffer);

    let pages: { page: number; text: string }[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Extract text content for this page ONLY
        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ")
            .trim();

        pages.push({
            page: pageNum,
            text: pageText
        });
    }

    return pages;
}

export async function extractTextWithoutImages(pdfBuffer: Buffer): Promise<string> {
    try {
        const pdf = await loadPdf(pdfBuffer);

        let allText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Get text (this contains NO images)
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ")
                .trim();

            allText += `\n\n${pageText}`;
        }

        return allText.trim();
    } catch (error: any) {
        console.error(error);
        throw new Error("Error extracting text from PDF: " + error.message);
    }
}

export const mergeTextAndImages = (pdfTextContent: SlidesDataOnlyText, images: ExtractImagesFromPdfResult[]): SlideWithImages[] => {
    return pdfTextContent.slides.map((textItem, index) => {
      const imageItem = images.find((imageItem) => imageItem.page === textItem.page);
      return {
        page: index + 1,
        title: textItem.title,
        bullets: textItem.bullets,
        images: imageItem?.images || [],
      };
    }).filter((item) => item.images.length > 0);
  }