export type SlideOnlyText = {
    page: number;
    title: string;
    bullets: string[];
}

export type SlidesDataOnlyText = {
    slides: SlideOnlyText[];
}

export type ExtractTextPageWiseResult = {
    page: number;
    text: string;
}

export type ExtractImagesFromPdfResult_Image = {
    base64: string;
    width: number;
    height: number;
}

export type ExtractImagesFromPdfResult = {
    page: number;
    images: ExtractImagesFromPdfResult_Image[];
}

export type SlideWithImages = {
    page: number;
    title: string;
    bullets: string[];
    images: ExtractImagesFromPdfResult_Image[];
}