// Enrich books.json with ISBNs from Google Books API
import fs from 'fs';
import path from 'path';

const books = JSON.parse(fs.readFileSync('src/books.json', 'utf8'));

async function lookupISBN(title, author) {
  const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
  const data = await response.json();
  
  if (!data.items?.length) return null;
  
  const book = data.items[0].volumeInfo;
  const identifiers = book.industryIdentifiers || [];
  
  return {
    isbn13: identifiers.find(id => id.type === 'ISBN_13')?.identifier || null,
    isbn10: identifiers.find(id => id.type === 'ISBN_10')?.identifier || null,
    coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null
  };
}

async function enrichCatalog() {
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (book.isbn13) continue; // Skip if already has ISBN
    
    console.log(`[${i+1}/${books.length}] ${book.title}`);
    const isbn = await lookupISBN(book.title, book.author);
    
    if (isbn) {
      book.isbn13 = isbn.isbn13;
      book.isbn10 = isbn.isbn10;
      book.coverUrl = isbn.coverUrl;
      console.log(`  ✓ ISBN: ${isbn.isbn13}`);
    } else {
      console.log(`  ✗ Not found`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  fs.writeFileSync('src/books-enriched.json', JSON.stringify(books, null, 2));
  console.log('\nSaved to books-enriched.json');
}

enrichCatalog().catch(console.error);
