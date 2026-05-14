# वेदिक ग्रंथालय - Vedic Library 📚

[![Next.js](https://img.shields.io/badge/Next.js-16.0-blue.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38B2AC.svg)](https://tailwindcss.com/)

A beautiful, responsive web application for reading Vedic scriptures and spiritual texts online. Upload Word documents and enjoy a distraction-free reading experience with Sanskrit and Devanagari support.

## ✨  Features

- **📖 Word Document Reader**: Upload .docx files and read them online
- **🎨 Vedic-Themed Design**: Beautiful saffron, gold, and deep blue color scheme
- **🔍 Text Search**: Search within uploaded documents
- **📱 Responsive Design**: Works perfectly on all devices
- **🎯 Reading Controls**: Adjustable font size, line height, and settings
- **📑 Table of Contents**: Auto-generated from document headings
- **🌙 Sanskrit Support**: Optimized for Devanagari and Sanskrit texts
- **🎪 Distraction-Free**: Clean reading interface without clutter

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20.9.0 (Current version requirement)
- npm or yarn package manager

### Installation

1. **Clone or download the project**:
   ```bash
   git clone <repository-url>
   cd EBooksApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
npm run build
npm run start
```

## 🎯 Usage Guide

### Uploading Books

1. Click on the **"Upload Book"** section or drag and drop a Word document
2. Select a `.docx` file containing your Vedic text or spiritual literature
3. Wait for the document to be processed and converted
4. Start reading in the beautiful interface!

### Reading Features

- **Search**: Use the search bar in the sidebar to find specific terms
- **Font Controls**: Adjust text size using + and - buttons
- **Settings**: Access line height and other reading preferences
- **Navigation**: Use the table of contents for easy chapter navigation
- **Sanskrit Display**: Optimized fonts for Devanagari script

## 🛠️ Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React framework for production | 16.0.2 |
| **TypeScript** | Type-safe JavaScript | 5.0+ |
| **Tailwind CSS** | Utility-first CSS framework | 4.1+ |
| **Mammoth.js** | Word document to HTML conversion | Latest |
| **Lucide React** | Beautiful icon library | Latest |
| **Noto Fonts** | Sanskrit/Devanagari font support | Google Fonts |

## 📁 Project Structure

```
EBooksApp/
├── .github/
│   └── copilot-instructions.md    # Project guidelines
├── public/                        # Static assets
├── src/
│   ├── app/
│   │   ├── globals.css           # Global styles and Vedic theme
│   │   ├── layout.tsx            # Root layout with fonts
│   │   └── page.tsx              # Main application component
│   └── components/
│       ├── FileUpload.tsx        # Document upload component
│       └── EBookReader.tsx       # Reading interface component
├── package.json                   # Dependencies and scripts
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🎨 Design Philosophy

The application follows traditional Vedic and spiritual aesthetics:

- **Colors**: Saffron (#ff9933), Gold (#ffd700), Deep Blue (#003366)
- **Typography**: Serif fonts optimized for Sanskrit and spiritual texts
- **Layout**: Clean, distraction-free reading experience
- **Cultural Elements**: Sanskrit terminology and spiritual symbolism

## 🔧 Configuration

### Custom Styling

Edit `src/app/globals.css` to modify the Vedic theme colors:

```css
:root {
  --saffron: #ff9933;        /* Traditional saffron */
  --gold: #ffd700;           /* Sacred gold */
  --deep-blue: #003366;      /* Sacred blue */
  --background: #fef7e0;     /* Soft cream background */
}
```

### Font Configuration

Fonts are configured in `src/app/layout.tsx`:
- Noto Serif Devanagari for Sanskrit text
- Lora for English content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is dedicated to preserving and sharing Vedic wisdom in the service of Srila Prabhupad Founder Acarya of ISKCON and Sri Srimad Goura Govinda Swami Maharaj. Use it freely for educational and spiritual purposes.

## 🙏 Acknowledgments

- Inspired by traditional Vedic literature preservation
- Built with respect for Sanskrit and spiritual texts
- Designed for students and practitioners of Vedic knowledge

---

**ॐ शान्ति शान्ति शान्तिः**

*Om Shanti Shanti Shantih*
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
