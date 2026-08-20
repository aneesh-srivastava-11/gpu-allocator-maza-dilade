import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "GPU Allocator Portal — Department GPU Access & Governance",
  description: "Department GPU access allocation, queueing, and live usage governance system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-orange-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
