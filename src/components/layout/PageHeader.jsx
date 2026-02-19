export default function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        {title && (
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content flex items-center gap-3">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mt-2 text-base-content opacity-70 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
