# ColorBlind Generator

**ColorBlind Generator** takes any black-and-white image and produces six colorblind-friendly variants of it — each packed with thousands of tiny anti-aliased circles using a randomized circle-packing algorithm.

The color pairs used for each variant are chosen to represent common types of color vision deficiency, so the original shape remains readable to people with those conditions while appearing as a natural circular dot pattern to others.

---

## Features

- 🎨 Six color-pair variants per image
- ⚙️ Circle-packing algorithm with gradient and light shift effects
- 📐 Output sizes from 16 × 16 up to 8192 × 8192 px
- 💾 Save directly to a local folder (Chrome/Edge) or download individually
- 🌐 Runs entirely in the browser — no server, no install, no data leaves your machine

## Usage

1. Open `generator.html` in Chrome or Edge
2. Drop in a black-and-white image (or click to browse)
3. Select an output folder and choose a size
4. Click **Generate** and wait for the images to render

## File Structure

```
generator.html   # Main page
style.css        # Styles
generator.js     # Circle-packing algorithm and UI logic
```

## License

Copyright © 2026 Can D. Sandikci — see [LICENSE](LICENSE) for full terms.

Free to use, modify, and redistribute for **non-commercial purposes**. Generated output images are yours to use without restriction.
