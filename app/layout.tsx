import "./globals.css";

export const metadata = {
  title: "Cerebras Chat",
  description: "A modern chat interface powered by Cerebras models",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
