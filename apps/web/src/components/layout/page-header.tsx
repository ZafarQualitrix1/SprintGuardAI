interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// Consistent header for every dashboard/*page.tsx -- title + optional description + right-aligned
// actions slot (e.g. "Upload Sprint", "Generate Tests").
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
