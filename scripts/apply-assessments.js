// Apply reviewed sarah_assessment values back to books.json
// Run: node scripts/apply-assessments.js

import fs from 'fs';
import path from 'path';

const booksPath = path.join(process.cwd(), 'src', 'books.json');
const assessmentsPath = path.join(process.cwd(), 'scripts', 'sarah-assessments.json');

// Load files
const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const assessments = JSON.parse(fs.readFileSync(assessmentsPath, 'utf8'));

console.log(`\n📚 Applying ${assessments.length} assessments to books.json...\n`);

let updated = 0;
let skipped = 0;

// Create a map of assessments by title for quick lookup
const assessmentMap = new Map();
assessments.forEach(a => assessmentMap.set(a.title.toLowerCase(), a.sarah_assessment));

// Update books with assessments
books.forEach(book => {
  const assessment = assessmentMap.get(book.title.toLowerCase());
  
  if (assessment && assessment !== "[NEEDS MANUAL ENTRY]") {
    book.sarah_assessment = assessment;
    updated++;
    console.log(`✅ ${book.title}`);
  } else {
    skipped++;
    console.log(`⏭️  ${book.title} (no assessment)`);
  }
});

// Backup original
const backupPath = path.join(process.cwd(), 'src', 'books.backup.json');
fs.writeFileSync(backupPath, fs.readFileSync(booksPath));
console.log(`\n💾 Backup saved to: ${backupPath}`);

// Save updated books.json
fs.writeFileSync(booksPath, JSON.stringify(books, null, 4));

console.log(`\n✅ Done!`);
console.log(`   Updated: ${updated} books`);
console.log(`   Skipped: ${skipped} books`);
console.log(`\n📝 Next step: Run node scripts/generate-embeddings.js to update vector DB`);
