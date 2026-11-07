import type { ChangeEvent } from 'react';

type Props = Readonly<{
  id: string;
  label: string;
  value?: string;
  defaultValue?: string;
  name?: string;
  onChange?: (digits: string) => void;
  required?: boolean;
  error?: string;
}>;

function nacional(value: string | undefined) {
  if (!value) return '';
  const stored = /^\+505(\d{8})$/.exec(value.trim());
  return stored?.[1] ?? (/^\d{0,8}$/.test(value) ? value : '');
}

export function NicaraguanPhoneField({ id, label, value, defaultValue, name, onChange, required, error }: Props) {
  const controlled = value !== undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 8);
    if (controlled) onChange?.(digits);
    else event.currentTarget.value = digits;
  };
  return <label className="nic-phone-field" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}
    <span className="nic-phone-field__control"><span aria-hidden="true">+505</span><input id={id} name={name} type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{8}" maxLength={8} required={required} value={controlled ? nacional(value) : undefined} defaultValue={controlled ? undefined : nacional(defaultValue)} onChange={handleChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} placeholder="88880000" /></span>
    {error && <small id={`${id}-error`} role="alert">{error}</small>}
  </label>;
}
