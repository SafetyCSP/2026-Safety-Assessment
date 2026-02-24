/**
 * Generates a thumbnail image (base64 JPEG) from the first page of a PDF.
 * Uses pdfjs-dist to render the first page onto an off-screen canvas.
 */
export async function generatePdfThumbnail(pdfDataUrl: string): Promise<string> {
    // Dynamically import pdfjs-dist (client-side only)
    const pdfjsLib = await import('pdfjs-dist');

    // Set the worker source to the bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    // Convert data URL to ArrayBuffer for pdfjs
    const base64 = pdfDataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Scale to a reasonable thumbnail size (max 400px wide)
    const viewport = page.getViewport({ scale: 1 });
    const maxWidth = 400;
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    // Render the page
    await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: scaledViewport,
    }).promise;

    // Convert canvas to JPEG base64
    const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // Clean up
    pdf.destroy();

    return thumbnailBase64;
}
