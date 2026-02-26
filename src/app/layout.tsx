import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import GoogleTranslate from "@/components/GoogleTranslate";

export const metadata: Metadata = {
  title: "AskMyNotes — AI Study Copilot",
  description:
    "Upload your notes, ask questions, and get cited answers. Your AI-powered subject-scoped study companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <GoogleTranslate />
      </body>
    </html>
  );
}
