export default function PageContainer({ children, className = '', maxWidth = '7xl' }) {
  return (
    <div className={`w-full max-w-[83.333%] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 ${className}`.trim()}>
      {children}
    </div>
  );
}
