import type { Metadata } from "next";
import "./globals.css";
import { ValidationProvider } from "@/context/ValidationContext";
import { HistoricalProvider } from "@/context/HistoricalContext";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Urmi Group — Procurement Management Platform",
  description:
    "Enterprise procurement management platform featuring CS Validation, Historical Data Analytics, Purchase Analysis, and Fraud Detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <HistoricalProvider>
          <ValidationProvider>
            <Header />
            {children}
          </ValidationProvider>
        </HistoricalProvider>
      </body>
    </html>
  );
}
