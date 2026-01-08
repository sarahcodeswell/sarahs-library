# Smart Action Bar - Design Mockup

## Concept
A tight, elegant horizontal action bar on the homepage that provides quick access to the user's key actions. Replaces the current "Your Books" section with a more streamlined approach.

## Design Options

### Option A: Minimal Pills with Icons
```
┌─────────────────────────────────────────────────────────────┐
│  [📚 Reading Queue (3)]  [📖 Collection (45)]               │
│  [💝 Recommendations]    [➕ Add Books]                      │
└─────────────────────────────────────────────────────────────┘
```
- Clean pill buttons with icons
- Counts shown inline
- Two rows for mobile, single row for desktop
- Subtle background color (#F8F6EE)
- Hover state: darker background

### Option B: Icon-First Cards (Recommended)
```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                            │
│  │  📚  │  │  📖  │  │  💝  │  │  ➕  │                            │
│  │  3   │  │  45  │  │  12  │  │      │                            │
│  │Queue │  │Coll. │  │Recs  │  │ Add  │                            │
│  └──────┘  └──────┘  └──────┘  └──────┘                            │
└──────────────────────────────────────────────────────────────────────┘
```
- Compact square cards
- Icon at top, count in middle, label at bottom
- Equal width for visual balance
- Subtle border and shadow
- Hover: lift effect with stronger shadow

### Option C: Horizontal Bar with Dividers
```
┌──────────────────────────────────────────────────────────────────────┐
│  📚 Reading Queue (3)  │  📖 Collection (45)  │  💝 Recs (12)  │  ➕ Add │
└──────────────────────────────────────────────────────────────────────┘
```
- Single horizontal bar
- Vertical dividers between items
- Compact and space-efficient
- Works well on desktop, stacks on mobile
- Clean, professional look

### Option D: Floating Action Bar (Modern)
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  📚 Queue (3)    📖 Collection (45)    💝 Recs (12)    ➕  │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```
- Floating rounded bar with shadow
- Centered on page
- Elegant, modern aesthetic
- Subtle animation on hover
- White background with border

### Option E: Inline Text Links (Minimal)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Reading Queue (3) · Collection (45) · Recommendations (12) · Add Books │
└──────────────────────────────────────────────────────────────────────┘
```
- Ultra-minimal text links
- Separated by dots
- Counts in parentheses
- Underline on hover
- Most space-efficient

## Recommended: Option B (Icon-First Cards)

### Visual Specifications
```
Card Dimensions:
- Width: 80px (mobile), 90px (desktop)
- Height: 90px (mobile), 100px (desktop)
- Border radius: 12px
- Border: 1px solid #E8EBE4
- Background: white
- Shadow: 0 1px 3px rgba(0,0,0,0.1)

Hover State:
- Transform: translateY(-2px)
- Shadow: 0 4px 8px rgba(0,0,0,0.15)
- Border color: #5F7252

Icon:
- Size: 24px (mobile), 28px (desktop)
- Color: #5F7252

Count:
- Font size: 20px (mobile), 24px (desktop)
- Font weight: 700
- Color: #4A5940

Label:
- Font size: 10px (mobile), 11px (desktop)
- Font weight: 500
- Color: #7A8F6C
- Text transform: none
```

### Layout
```jsx
<div className="flex items-center justify-center gap-3 mb-8">
  {/* Reading Queue */}
  <button className="flex flex-col items-center justify-center w-20 sm:w-[90px] h-[90px] sm:h-[100px] bg-white border border-[#E8EBE4] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
    <BookMarked className="w-6 sm:w-7 h-6 sm:h-7 text-[#5F7252] mb-1" />
    <div className="text-xl sm:text-2xl font-bold text-[#4A5940]">3</div>
    <div className="text-[10px] sm:text-[11px] font-medium text-[#7A8F6C]">Queue</div>
  </button>
  
  {/* Collection */}
  <button className="flex flex-col items-center justify-center w-20 sm:w-[90px] h-[90px] sm:h-[100px] bg-white border border-[#E8EBE4] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
    <Library className="w-6 sm:w-7 h-6 sm:h-7 text-[#5F7252] mb-1" />
    <div className="text-xl sm:text-2xl font-bold text-[#4A5940]">45</div>
    <div className="text-[10px] sm:text-[11px] font-medium text-[#7A8F6C]">Collection</div>
  </button>
  
  {/* Recommendations */}
  <button className="flex flex-col items-center justify-center w-20 sm:w-[90px] h-[90px] sm:h-[100px] bg-white border border-[#E8EBE4] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
    <Heart className="w-6 sm:w-7 h-6 sm:h-7 text-[#5F7252] mb-1" />
    <div className="text-xl sm:text-2xl font-bold text-[#4A5940]">12</div>
    <div className="text-[10px] sm:text-[11px] font-medium text-[#7A8F6C]">Recs</div>
  </button>
  
  {/* Add Books */}
  <button className="flex flex-col items-center justify-center w-20 sm:w-[90px] h-[90px] sm:h-[100px] bg-white border border-[#E8EBE4] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
    <Plus className="w-6 sm:w-7 h-6 sm:h-7 text-[#5F7252] mb-1" />
    <div className="text-[10px] sm:text-[11px] font-medium text-[#7A8F6C] mt-auto">Add</div>
  </button>
</div>
```

## Navigation Labels Update

### Sidebar Menu
```
MY BOOKS
├─ In Queue (3)
└─ In Collection (45)
```

### Page Titles
- Reading Queue page: "Reading Queue"
- Collection page: "My Collection"
- My Books upload page: "Add Books"

## Benefits
1. **Elegant & Compact**: Takes minimal vertical space
2. **Visual Hierarchy**: Icons + numbers draw attention
3. **Scannable**: Quick glance shows status
4. **Touch-Friendly**: Large tap targets for mobile
5. **Consistent**: Matches overall design language
6. **Scalable**: Easy to add/remove actions

## Implementation Notes
- Only show when user is logged in
- Only show when there's content (queue > 0 or collection > 0)
- Position after welcome message, before curator themes
- Animate in with subtle fade
- Use existing icon components from lucide-react
