export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" translate="no">
      <body>{children}</body>
    </html>
  );
}