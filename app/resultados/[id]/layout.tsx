export default function PageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='flex items-start justify-center w-screen min-h-screen'>
      {children}
    </div>
  );
}
