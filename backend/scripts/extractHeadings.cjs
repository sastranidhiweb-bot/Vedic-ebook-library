// Script to extract all headings from Word documents in uploads/books
// Uses 'mammoth' npm package to parse Word files
// Usage: node extractHeadings.cjs

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const booksDir = path.join(__dirname, '../uploads/books');

function isDocx(file) {
    return file.endsWith('.docx');
}

async function extractHeadingsFromDocx(filePath) {
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        const html = result.value;
        const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
        let match;
        const headings = [];
        while ((match = headingRegex.exec(html)) !== null) {
            headings.push(match[1]);
        }
        return headings;
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

async function main() {
    const files = fs.readdirSync(booksDir).filter(isDocx);
    for (const file of files) {
        const filePath = path.join(booksDir, file);
        const headings = await extractHeadingsFromDocx(filePath);
        console.log(`\nHeadings in ${file}:`);
        if (headings.length === 0) {
            console.log('  No headings found.');
        } else {
            headings.forEach((heading, idx) => {
                console.log(`  ${idx + 1}. ${heading}`);
            });
        }
    }
}

main();
