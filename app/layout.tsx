import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Banner Generator",
  description: "Form-based LinkedIn banner generator with deterministic safe zones.",
  icons: {
    icon: "/app-logo.svg",
    shortcut: "/app-logo.svg",
    apple: "/app-logo.svg"
  }
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
