# Features to Rebuild



## Known Bugs

### iPad Magic Keyboard Viewport Jumping
**Status:** Under investigation (v1.8.3)

**Symptom:** When typing with an external Magic Keyboard attached to iPad, the screen/content jumps down and stays in the wrong position.

**What we know:**
- Only occurs with external keyboard (Magic Keyboard), not on-screen keyboard
- Happens while typing, not just on focus
- Content jumps down (viewport shifts up) and stays there
- Does NOT occur on iPhone or iPad without external keyboard

**Fixes attempted:**
1. ✅ Updated viewport meta tag: `interactive-widget=resizes-content`, `viewport-fit=cover`
2. ✅ Added CSS fixes: `100dvh`, `-webkit-fill-available` height
3. ✅ Added JS fix: `visualViewport` resize listener to restore scroll position (v1.8.3)

**Files involved:**
- `index.html` - viewport meta tag
- `src/index.css` - height/viewport CSS
- `src/main.tsx` - JS viewport resize handler

---
