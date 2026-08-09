# 🚀 Code Capture AI Pro

> **Visual Code Reconstruction Engine for Chrome** — Turn video tutorials, documentation PDFs, live streams, and screenshots into clean, syntactically perfect code in your clipboard with a single keyboard shortcut.

Created with ❤️ by **Uday Gautam**  
👉 Follow on Instagram: [**@uday_is_creating**](https://www.instagram.com/uday_is_creating)

---

## ⚡ The Problem It Solves

We’ve all been there: you're watching a coding tutorial on YouTube, Udemy, or Coursera, or reading a PDF guide, and you see a chunk of code on screen that you want to test locally. 

**The painful status quo:**
1. Manually re-typing code line-by-line while pausing and playing the video.
2. Making silly typos like confusing `l` (lowercase L), `1` (one), and `I` (capital i), or `O` and `0`.
3. Using generic OCR tools that completely destroy Python / YAML indentation and turn multi-line code into a broken mess.

**The Solution — Code Capture AI Pro:**  
Simply press **`Alt + V`** on any video page (or **`Alt + C`** to drag-select any region on screen). Vision AI processes the exact frame in real-time, reconstructs the code structure with syntactically valid indentation, and automatically places the clean code right into your clipboard. Zero friction, instant productivity.

---

## ✨ Key Features

- 📸 **Native Video Frame Capture (`Alt + V`)**  
  Directly extracts full-resolution video frames from HTML5 video players (YouTube, Udemy, Coursera, Vimeo, custom video sites) without UI overlays blocking the code.

- ✂️ **Custom Region Selector (`Alt + C`)**  
  Overlay crosshair that lets you drag and highlight any snippet from documentation pages, blogs, PDFs, or live streams.

- 🤖 **Vision AI Powered (Google Gemini 2.5 Flash & Pro)**  
  Leverages multimodal Vision AI to understand programming syntax, block structures, and indentation hierarchies rather than naive character recognition.

- 🔒 **3 Specialized Recovery Modes**
  - **Strict Preservation**: 1:1 exact visual match. Preserves line breaks, spacing, and formatting.
  - **Visual Recovery**: Resolves visually ambiguous characters (`l` ↔ `1` ↔ `I`, `O` ↔ `0`, `{` ↔ `(`) based on surrounding syntax context.
  - **Advanced Recovery**: Repairs minor syntax artifacts (e.g. truncated closing brackets at screen edges) without ever altering business logic.

- 📋 **Zero-Click Automatic Clipboard Sync**  
  As soon as AI processes the image, the reconstructed code is instantly copied to your system clipboard. Just hit `Ctrl + V` (`Cmd + V` on Mac) in VS Code to paste!

- 📝 **CodeMirror 6 Editor & Syntax Highlighting**  
  Embedded side panel features a full-featured code editor with syntax highlighting for Python, JavaScript, TypeScript, C++, Java, Rust, Go, PHP, SQL, HTML, CSS, Markdown, and more.

- 🛡️ **Offline OCR Fallback**  
  Includes a local Tesseract.js fallback engine when API connectivity is unavailable.

- 📜 **Local Searchable History**  
  Stores up to 50 recent captures locally with search/filter features, quick copy, and export functions.

- 🎨 **Modern Dark & Light UI**  
  Designed with clean GitHub-inspired styling, responsive layouts, custom fonts, and smooth animations.

---

## ⌨️ Shortcuts Reference

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Alt + V`** | Video Frame Capture | Captures active video frame, reconstructs code, copies to clipboard |
| **`Alt + C`** | Region Select | Opens visual selection overlay to crop any code on screen |

*(Shortcuts can be customized in `chrome://extensions/shortcuts`)*

---

## 🛠️ Installation & Setup

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/ayush76-65/Code-Capture-AI-Pro.git
   cd Code-Capture-AI-Pro
   ```

2. **Install dependencies & build**
   ```bash
   npm install
   npm run build
   ```

3. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked** and select the `dist/` folder inside the project directory.

4. **Configure Gemini API Key**
   - Click the extension icon in Chrome or open the Side Panel.
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).
   - Enter your key in Settings and hit **Test Connection**.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Extension Architecture**: Chrome Extension Manifest V3 (Service Worker + Offscreen API + Content Script + SidePanel)
- **Styling**: Tailwind CSS
- **Code Editor**: CodeMirror 6
- **Vision AI**: Google Generative AI (`@google/generative-ai`)
- **OCR Engine**: Tesseract.js

---

## 👨‍💻 Creator & Community

Built with passion by **Uday Gautam**.

- 📸 Instagram: [**@uday_is_creating**](https://www.instagram.com/uday_is_creating)
- 🌐 Website / Portfolio: Feel free to reach out via Instagram for feature requests or feedback!

If you find this tool helpful, don't forget to star ⭐ the repository and share it with fellow developers!
