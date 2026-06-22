"use client";

import { useEffect, useId, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
  containerClassName?: string;
  labelClassName?: string;
  buttonClassName?: string;
  panelClassName?: string;
  optionClassName?: string;
  hideLabel?: boolean;
};

export default function AppSelect({
  label,
  options,
  value,
  defaultValue,
  name,
  disabled,
  required,
  onChange,
  containerClassName = "",
  labelClassName = "",
  buttonClassName = "",
  panelClassName = "",
  optionClassName = "",
  hideLabel = false,
}: Props) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "");
  const [open, setOpen] = useState(false);
  const selectedValue = isControlled ? value : internalValue;
  const selectedOption =
    options.find((option) => option.value === selectedValue) || options[0] || { value: "", label: "" };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative block ${containerClassName}`}>
      {label && !hideLabel ? (
        <span className={`mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 ${labelClassName}`}>
          {label}
        </span>
      ) : null}

      {name ? <input type="hidden" name={name} value={selectedOption.value} /> : null}
      {required ? (
        <input
          tabIndex={-1}
          value={selectedOption.value}
          onChange={() => undefined}
          required
          aria-hidden="true"
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      ) : null}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${generatedId}-listbox`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:bg-white disabled:cursor-wait disabled:opacity-70 ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption.label}</span>
        <span className={`ml-3 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          id={`${generatedId}-listbox`}
          role="listbox"
          className={`absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)] ${panelClassName}`}
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === selectedOption.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-red-50 font-bold text-[#c41525]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  } ${optionClassName}`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {active ? <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em]">Activo</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
