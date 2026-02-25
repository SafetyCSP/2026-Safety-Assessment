/**
 * Parses simple markdown-like formatting and returns HTML.
 * Supports: **bold**, *italic*, __underline__, and lines starting with "• " or "- " as bullet points.
 */
export function formatTextToHtml(text: string): string {
    if (!text) return '';

    // Split into lines for bullet point detection
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');

        if (isBullet) {
            if (!inList) {
                html += '<ul style="margin:4px 0;padding-left:20px;">';
                inList = true;
            }
            const content = trimmed.replace(/^[•\-]\s+/, '');
            html += `<li>${applyInlineFormatting(content)}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            if (trimmed === '') {
                html += '<br/>';
            } else {
                html += `<p style="margin:2px 0;">${applyInlineFormatting(trimmed)}</p>`;
            }
        }
    }

    if (inList) {
        html += '</ul>';
    }

    return html;
}

function applyInlineFormatting(text: string): string {
    // Bold: **text**
    let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Underline: __text__
    result = result.replace(/__(.+?)__/g, '<u>$1</u>');
    // Italic: *text*
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return result;
}
