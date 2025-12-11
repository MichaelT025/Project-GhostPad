# Required Icons for GhostPad

Upload SVG icons to this directory. All icon files should be named exactly as shown below.

## Icon Requirements
- **Format**: SVG only
- **Naming**: Lowercase, no spaces, use hyphens for multi-word names
- **Size**: Recommend 24x24 viewBox for consistency
- **Color**: Use `currentColor` for stroke/fill to inherit from CSS

---

## Required Icons List

### Navigation Icons (Title Bar)
- `settings.svg` - Settings gear icon (top left button)
- `close.svg` - Close/X icon (top right button)

### Action Icons (Input Area)
- `camera.svg` - Screenshot/capture icon (input area)
- `send.svg` - Send message icon (send button)
- `remove.svg` - Remove/delete icon (screenshot chip remove button)

### Utility Icons (Messages & Code)
- `copy.svg` - Copy icon (code blocks and message copy)
- `check.svg` - Checkmark icon (copy success feedback)

### Provider Icons (Status Pill)
- `gemini.svg` - Google Gemini logo/icon
- `openai.svg` - OpenAI logo/icon
- `anthropic.svg` - Anthropic logo/icon

### Status Icons (Errors & Notifications)
- `error.svg` - Error/warning icon
- `info.svg` - Information icon
- `success.svg` - Success icon
- `warning.svg` - Warning icon

### UI Navigation Icons
- `chevron-up.svg` - Upward chevron/arrow
- `chevron-down.svg` - Downward chevron/arrow
- `chevron-left.svg` - Left chevron/arrow
- `chevron-right.svg` - Right chevron/arrow

### Optional Icons (Future Use)
- `loading.svg` - Loading spinner/animation
- `refresh.svg` - Refresh/reload icon
- `download.svg` - Download icon
- `upload.svg` - Upload icon

---

## How to Add Icons

1. Place SVG files in this directory: `src/renderer/assets/icons/custom-icons/`
2. Name files exactly as shown above (e.g., `settings.svg`, `camera.svg`)
3. Icons will be automatically loaded when the app starts
4. Restart the app after adding new icons

## Icon Template

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Your icon paths here -->
</svg>
```

## Missing Icons

If an icon is missing, a placeholder will be shown with the icon name.
Check the console for warnings about missing icons.
