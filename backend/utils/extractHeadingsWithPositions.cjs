// Extract headings and their positions from DOCX
// Returns: [{ text: heading, wordIndex: position }]

const mammoth = require('mammoth');
const fs = require('fs');

async function extractHeadingsWithPositions(filePath) {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    const headings = [];
    let wordCount = 0;
    // Split HTML into blocks to estimate word positions
    const blocks = html.split(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi);
    for (let i = 0; (match = headingRegex.exec(html)) !== null; i++) {
        // Count words before this heading
        if (blocks[i]) {
            wordCount += blocks[i].replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
        }
        headings.push({
            text: match[2].replace(/<[^>]+>/g, '').trim(),
            wordIndex: wordCount
        });
    }
    return headings;
}

module.exports = { extractHeadingsWithPositions };
