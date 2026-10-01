import type { ReactNode } from "react";

type FieldGroupProps = {
  legend: string;
  hint?: string;
  error?: string;
  errorId: string;
  children: ReactNode;
};

/** A labelled group of related inputs with an optional hint and error message. */
export function FieldGroup({ legend, hint, error, errorId, children }: FieldGroupProps) {
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1 font-semibold">{legend}</legend>
      {hint && <p className="-mt-2 text-sm text-muted">{hint}</p>}
      {children}
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {message}
    </p>
  );
}
