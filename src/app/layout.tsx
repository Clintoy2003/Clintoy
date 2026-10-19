import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Clintoy — a simpler AI assistant",
    template: "%s · Clintoy",
  },
  description:
    "Clintoy is an AI assistant for writing, planning, explaining, building and generating images. Free forever with a free account, private by default, designed to be usable by everyone.",
  keywords: ["AI assistant", "AI chat", "Clintoy", "writing assistant", "accessible AI"],
  applicationName: "Clintoy",
  authors: [{ name: "Clintoy" }],
  openGraph: {
    title: "Clintoy — a simpler AI assistant",
    description:
      "Writing, planning, explanations and code in one clean assistant. Private by default, accessible by design, free to start.",
    url: siteUrl,
    siteName: "Clintoy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clintoy — a simpler AI assistant",
    description: "An AI assistant for writing, planning, explaining and building.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
  width: "device-width",
  initialScale: 1,
};

const bootScript = `(function(){try{var s=localStorage.getItem("clintoy-a11y");var d=s?JSON.parse(s):null;var r=document.documentElement;if(d){r.dataset.theme=d.theme||"light";r.dataset.text=d.text||"base";r.dataset.contrast=d.contrast||"normal";r.dataset.motion=d.motion||"full";}else{r.dataset.theme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.dataset.text="base";r.dataset.contrast="normal";r.dataset.motion="full";}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
