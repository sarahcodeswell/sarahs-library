# Smart Action Bar - Options A & E (with Profile)

## Option A: Minimal Pills with Icons

### Desktop View
```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  [📚 Reading Queue (3)]  [📖 Collection (45)]  [💝 Recommendations (12)] │
│  [➕ Add Books]          [👤 Profile]                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (Stacked)
```
┌────────────────────────────┐
│  [📚 Reading Queue (3)]    │
│  [📖 Collection (45)]      │
│  [💝 Recommendations (12)] │
│  [➕ Add Books]            │
│  [👤 Profile]              │
└────────────────────────────┘
```

### Visual Specifications
- **Pill Shape**: Rounded-full (fully rounded ends)
- **Background**: #F8F6EE (light sage)
- **Border**: 1px solid #D4DAD0
- **Padding**: px-4 py-2 (16px horizontal, 8px vertical)
- **Font Size**: text-sm (14px)
- **Font Weight**: font-medium (500)
- **Text Color**: #4A5940 (dark green)
- **Icon Size**: 16px (w-4 h-4)
- **Gap Between Pills**: 12px (gap-3)

### Hover State
- **Background**: #E8EBE4 (darker sage)
- **Border**: #5F7252 (brand green)
- **Transition**: all 200ms

### Layout
- **Desktop**: Two rows, pills flow left to right
- **Mobile**: Single column, stacked vertically
- **Alignment**: Center on page
- **Spacing**: mb-6 (24px margin bottom)

### Code Structure
```jsx
<div className="flex flex-wrap items-center justify-center gap-3 mb-6">
  {/* Reading Queue */}
  {queueCount > 0 && (
    <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] hover:border-[#5F7252] rounded-full text-sm font-medium text-[#4A5940] transition-all">
      <BookMarked className="w-4 h-4" />
      <span>Reading Queue</span>
      <span className="ml-1 px-2 py-0.5 bg-[#5F7252] text-white rounded-full text-xs font-semibold">
        {queueCount}
      </span>
    </button>
  )}
  
  {/* Collection */}
  {collectionCount > 0 && (
    <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] hover:border-[#5F7252] rounded-full text-sm font-medium text-[#4A5940] transition-all">
      <Library className="w-4 h-4" />
      <span>Collection</span>
      <span className="ml-1 px-2 py-0.5 bg-[#5F7252] text-white rounded-full text-xs font-semibold">
        {collectionCount}
      </span>
    </button>
  )}
  
  {/* Recommendations */}
  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] hover:border-[#5F7252] rounded-full text-sm font-medium text-[#4A5940] transition-all">
    <Heart className="w-4 h-4" />
    <span>Recommendations</span>
    {recommendationCount > 0 && (
      <span className="ml-1 px-2 py-0.5 bg-[#5F7252] text-white rounded-full text-xs font-semibold">
        {recommendationCount}
      </span>
    )}
  </button>
  
  {/* Add Books */}
  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] hover:border-[#5F7252] rounded-full text-sm font-medium text-[#4A5940] transition-all">
    <Plus className="w-4 h-4" />
    <span>Add Books</span>
  </button>
  
  {/* Profile */}
  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F6EE] hover:bg-[#E8EBE4] border border-[#D4DAD0] hover:border-[#5F7252] rounded-full text-sm font-medium text-[#4A5940] transition-all">
    <User className="w-4 h-4" />
    <span>Profile</span>
  </button>
</div>
```

### Pros
- Clean, modern pill design
- Flexible wrapping for different screen sizes
- Clear labels with icons
- Counts integrated into pills
- Easy to scan

### Cons
- Takes more vertical space (2 rows)
- Longer text labels take more horizontal space

---

## Option E: Inline Text Links (Minimal)

### Desktop View
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                   │
│  Reading Queue (3) · Collection (45) · Recommendations (12) · Add Books · Profile │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile View (Wrapped)
```
┌────────────────────────────────┐
│  Reading Queue (3) ·           │
│  Collection (45) ·             │
│  Recommendations (12) ·        │
│  Add Books · Profile           │
└────────────────────────────────┘
```

### Visual Specifications
- **Font Size**: text-sm (14px)
- **Font Weight**: font-medium (500)
- **Text Color**: #5F7252 (brand green)
- **Separator**: · (middle dot) in #D4DAD0
- **Spacing**: gap-2 between items (8px)
- **Counts**: In parentheses, same color as text

### Hover State
- **Text Color**: #4A5940 (darker green)
- **Text Decoration**: underline
- **Underline Offset**: 4px
- **Underline Thickness**: 2px
- **Transition**: all 200ms

### Layout
- **Desktop**: Single line, items separated by dots
- **Mobile**: Wraps naturally with flex-wrap
- **Alignment**: Center on page
- **Spacing**: mb-6 (24px margin bottom)

### Code Structure
```jsx
<div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-6">
  {/* Reading Queue */}
  {queueCount > 0 && (
    <>
      <button 
        onClick={() => navigateTo('reading-queue')}
        className="font-medium text-[#5F7252] hover:text-[#4A5940] hover:underline underline-offset-4 decoration-2 transition-all"
      >
        Reading Queue ({queueCount})
      </button>
      <span className="text-[#D4DAD0]">·</span>
    </>
  )}
  
  {/* Collection */}
  {collectionCount > 0 && (
    <>
      <button 
        onClick={() => navigateTo('collection')}
        className="font-medium text-[#5F7252] hover:text-[#4A5940] hover:underline underline-offset-4 decoration-2 transition-all"
      >
        Collection ({collectionCount})
      </button>
      <span className="text-[#D4DAD0]">·</span>
    </>
  )}
  
  {/* Recommendations */}
  <button 
    onClick={() => navigateTo('recommendations')}
    className="font-medium text-[#5F7252] hover:text-[#4A5940] hover:underline underline-offset-4 decoration-2 transition-all"
  >
    Recommendations {recommendationCount > 0 && `(${recommendationCount})`}
  </button>
  <span className="text-[#D4DAD0]">·</span>
  
  {/* Add Books */}
  <button 
    onClick={() => navigateTo('my-books')}
    className="font-medium text-[#5F7252] hover:text-[#4A5940] hover:underline underline-offset-4 decoration-2 transition-all"
  >
    Add Books
  </button>
  <span className="text-[#D4DAD0]">·</span>
  
  {/* Profile */}
  <button 
    onClick={() => navigateTo('profile')}
    className="font-medium text-[#5F7252] hover:text-[#4A5940] hover:underline underline-offset-4 decoration-2 transition-all"
  >
    Profile
  </button>
</div>
```

### Pros
- **Ultra-minimal**: Takes least vertical space (single line)
- **Elegant**: Clean typography-focused design
- **Space-efficient**: No backgrounds or borders
- **Sophisticated**: Feels more editorial/literary
- **Fast to scan**: Simple text is easy to read

### Cons
- Less visual hierarchy (no icons)
- Counts might be less prominent
- Harder to tap on mobile (smaller targets)

---

## Comparison

| Feature | Option A (Pills) | Option E (Text Links) |
|---------|------------------|----------------------|
| **Vertical Space** | ~80px (2 rows) | ~24px (1 line) |
| **Visual Weight** | Medium | Light |
| **Tap Target Size** | Large (good for mobile) | Small (harder on mobile) |
| **Scannability** | Icons help | Text-only |
| **Elegance** | Modern, clean | Sophisticated, minimal |
| **Counts Visibility** | High (badges) | Medium (parentheses) |
| **Desktop Layout** | 2 rows | 1 line |
| **Mobile Layout** | Stacked column | Wrapped lines |

---

## Recommendation

**For Homepage**: **Option E (Inline Text Links)**
- Most elegant and space-efficient
- Fits the literary/editorial aesthetic
- Single line keeps focus on content below
- Works well with "smart action bar" concept

**For Sidebar Menu**: **Keep current style**
- Icons + text work better in vertical menu
- More space available in sidebar
- Touch targets need to be larger

---

## Navigation Labels (Both Options)

### Sidebar Menu
```
MY BOOKS
├─ In Queue (3)
└─ In Collection (45)
```

### Page Titles
- Reading Queue page: "Reading Queue"
- Collection page: "My Collection"
- Recommendations page: "My Recommendations"
- Profile page: "Profile"

### Smart Action Bar (Homepage only)
- Reading Queue (3)
- Collection (45)
- Recommendations (12)
- Add Books
- Profile
