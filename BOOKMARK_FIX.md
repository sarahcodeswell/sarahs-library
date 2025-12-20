# UX Fix Plan

## Issues to Fix:
1. Buy button is smaller than Reviews/Save/Share (has flex-1 in a relative div)
2. Save icon broken (📌 emoji not rendering properly)
3. Replace emoji indicators (📚 library, ∞ discover) with clickable bookmark icon for save

## Solution:
1. Remove emoji indicators next to title
2. Add Bookmark icon button next to expand/collapse button
3. Change button grid from 2x2/4 columns to 3 columns (Buy, Reviews, Share)
4. Remove Save button from action buttons row
5. Make all action buttons consistent width (remove flex-1)

## Implementation:
- Move save functionality to bookmark icon in header
- Bookmark fills when saved
- 3 equal-width buttons: Buy, Reviews, Share
