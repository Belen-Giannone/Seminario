import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/** Estilo común de inputs, selects y textareas. */
export function claseCampo(error?: string): string {
  return `w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-theme placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 ${
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
      : 'border-slate-300 dark:border-slate-700'
  }`;
}

function Etiqueta({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

function MensajeError({ error }: { error?: string }) {
  return error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null;
}

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, className, ...rest }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etiqueta htmlFor={id}>{label}</Etiqueta>
      <input id={id} className={`${claseCampo(error)} ${className ?? ''}`} {...rest} />
      <MensajeError error={error} />
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextAreaField({ label, error, id, className, ...rest }: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etiqueta htmlFor={id}>{label}</Etiqueta>
      <textarea id={id} className={`${claseCampo(error)} ${className ?? ''}`} {...rest} />
      <MensajeError error={error} />
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SelectField({ label, id, className, children, ...rest }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Etiqueta htmlFor={id}>{label}</Etiqueta>
      <select id={id} className={`${claseCampo()} ${className ?? ''}`} {...rest}>
        {children}
      </select>
    </div>
  );
}
