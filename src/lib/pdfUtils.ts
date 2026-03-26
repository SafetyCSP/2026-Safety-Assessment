/**
 * Generates a thumbnail image (base64 JPEG) from the first page of a PDF.
 */
export async function generatePdfThumbnail(pdfDataUrl: string): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    const version = pdfjsLib.version;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }

    const base64 = pdfDataUrl.split(',')[1];
    if (!base64) throw new Error('Invalid PDF data URL');

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const maxWidth = 400;
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(scaledViewport.width);
    canvas.height = Math.floor(scaledViewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    const renderTask = page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        canvas,
    });

    await renderTask.promise;

    const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8);
    pdf.destroy();

    return thumbnailBase64;
}

