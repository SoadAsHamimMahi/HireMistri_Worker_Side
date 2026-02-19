export default function PageContainer({ children, className = '', maxWidth = '7xl' }) {
  const maxWidthClass = {
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }[maxWidth] || 'max-w-7xl';
  return (
    <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 ${className}`.trim()}>
      {children}
    </div>
  );
}
