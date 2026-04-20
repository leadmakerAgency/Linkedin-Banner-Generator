import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadMaker LinkedIn Banner Generator",
  description: "Form-based LinkedIn banner generator with deterministic safe zones.",
  icons: {
    icon: "/leadmaker-logo.png",
    shortcut: "/leadmaker-logo.png",
    apple: "/leadmaker-logo.png"
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
