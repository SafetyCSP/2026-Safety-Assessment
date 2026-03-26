import type { Metadata } from "next";
import "./globals.css";
import { AssessmentProvider } from "@/context/AssessmentContext";

export const metadata: Metadata = {
  title: "AI Site Safety Assessment",
  description: "Regulatory compliance and safety assessment tool for AI sites.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AssessmentProvider>
          {children}
        </AssessmentProvider>
      </body>
    </html>
  );
}