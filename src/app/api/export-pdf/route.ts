import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import standardsData from '@/data/standards.json';
import { Category } from '@/types/standards';

export const runtime = 'nodejs';

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + ' ' + word, fontSize);
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
}

function splitReferenceLines(value: string): string[] {
    if (!value) return [];
    return value.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

export async function GET() {
    try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const form = pdfDoc.getForm();

        let page = pdfDoc.addPage();
        let { width, height } = page.getSize();
        let y = height - 50;
        const margin = 50;
        const contentWidth = width - margin * 2;

        const checkNewPage = (requiredSpace: number) => {
            if (y - requiredSpace < 50) {
                page = pdfDoc.addPage();
                y = height - 50;
            }
        };

        // --- TITLE PAGE ---
        page.drawText('Site Safety Assessment', { x: margin, y, size: 24, font: boldFont });
        y -= 40;

        const titleFields = [
            { label: 'Report Title:', name: 'reportTitle', type: 'text' },
            { label: 'Assessment ID:', name: 'assessmentId', type: 'text' },
            { label: 'Date:', name: 'date', type: 'text' },
            { label: 'Location:', name: 'location', type: 'text' },
            { label: 'Assessor Name:', name: 'assessorName', type: 'text' },
            { label: 'Point of Contact:', name: 'pointOfContact', type: 'text' },
            { label: 'Operational Scope:', name: 'operationalScope', type: 'text' }
        ];

        for (const field of titleFields) {
            page.drawText(field.label, { x: margin, y, size: 12, font: boldFont });
            const textField = form.createTextField(field.name);
            textField.addToPage(page, {
                x: margin + 140,
                y: y - 5,
                width: contentWidth - 140,
                height: 20,
            });
            y -= 35;
        }

        page.drawText('Review Status:', { x: margin, y, size: 12, font: boldFont });
        const statusDropdown = form.createDropdown('reviewStatus');
        statusDropdown.setOptions(['Draft', 'Final', 'Approved']);
        statusDropdown.addToPage(page, {
            x: margin + 140,
            y: y - 5,
            width: contentWidth - 140,
            height: 20,
        });
        y -= 40;

        // --- ASSESSMENT PAGES ---
        const categories = standardsData as Category[];

        for (const category of categories) {
            checkNewPage(40);
            y -= 10;
            page.drawText(`Category: ${category.id} - ${category.title}`, { x: margin, y, size: 16, font: boldFont, color: rgb(0, 0.2, 0.6) });
            y -= 30;

            for (const question of category.questions) {
                // Wrap question text
                const qText = `${question.id}: ${question.text}`;
                const lines = wrapText(qText, contentWidth, font, 11);
                
                checkNewPage(lines.length * 15 + 150); // space for text + dropdowns + textareas
                
                for (const line of lines) {
                    page.drawText(line, { x: margin, y, size: 11, font });
                    y -= 15;
                }
                y -= 5;

                // Answer Dropdown
                page.drawText('Answer:', { x: margin, y, size: 10, font: boldFont });
                const answerDropdown = form.createDropdown(`ans_${question.id}`);
                answerDropdown.setOptions(['Yes', 'No', 'Unsure', 'N/A']);
                answerDropdown.addToPage(page, { x: margin + 50, y: y - 5, width: 80, height: 18 });
                
                // Risk Dropdown
                page.drawText('Risk:', { x: margin + 150, y, size: 10, font: boldFont });
                const riskDropdown = form.createDropdown(`risk_${question.id}`);
                riskDropdown.setOptions(['Good', 'Low', 'Medium', 'High']);
                riskDropdown.addToPage(page, { x: margin + 185, y: y - 5, width: 80, height: 18 });

                y -= 30;

                let oshaRefs: string[] = [];
                if (question.references && question.references.osha) {
                    oshaRefs = splitReferenceLines(question.references.osha);
                }

                if (oshaRefs.length > 0) {
                    page.drawText('Reference Standards:', { x: margin, y, size: 9, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
                    y -= 12;
                    for (const ref of oshaRefs) {
                        const refLines = wrapText(`• ${ref}`, contentWidth, font, 8);
                        checkNewPage(refLines.length * 10 + 100);
                        for (const rLine of refLines) {
                            page.drawText(rLine, { x: margin, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
                            y -= 10;
                        }
                    }
                    y -= 5;
                }
                
                page.drawText('Aligned Standard:', { x: margin, y, size: 10, font: boldFont });
                const stdDropdown = form.createDropdown(`std_${question.id}`);
                const options = ['None', ...oshaRefs];
                const uniqueOptions = Array.from(new Set(options));
                
                stdDropdown.setOptions(uniqueOptions);
                stdDropdown.addToPage(page, { x: margin + 100, y: y - 5, width: contentWidth - 100, height: 18 });

                y -= 30;

                // Findings
                page.drawText('Findings:', { x: margin, y, size: 10, font: boldFont });
                const notesField = form.createTextField(`notes_${question.id}`);
                notesField.enableMultiline();
                notesField.addToPage(page, { x: margin, y: y - 40, width: contentWidth, height: 35 });
                
                y -= 55;

                // Recommendations
                page.drawText('Recommendations:', { x: margin, y, size: 10, font: boldFont });
                const recField = form.createTextField(`rec_${question.id}`);
                recField.enableMultiline();
                recField.addToPage(page, { x: margin, y: y - 40, width: contentWidth, height: 35 });

                y -= 60; // Extra spacing before next question
            }
        }

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="blank_assessment_template.pdf"',
            },
        });
    } catch (error) {
        console.error('PDF Generation error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
