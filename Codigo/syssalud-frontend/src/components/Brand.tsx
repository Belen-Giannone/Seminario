export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-600 text-lg font-semibold text-white dark:bg-teal-500">
        S
      </span>
      <div className="leading-tight">
        <p className="font-mono text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          SysSalud
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
