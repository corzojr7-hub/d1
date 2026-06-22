"use client";

import { useEffect, useId, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  name?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

export default function AppSelect({
  label,
  options,
  value,
  defaultValue,
  name,
  disabled,
  onChange,
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
    <div ref={rootRef} className="relative block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {name ? <input type="hidden" name={name} value={selectedOption.value} /> : null}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${generatedId}-listbox`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:bg-white disabled:cursor-wait disabled:opacity-70"
      >
        <span className="truncate">{selectedOption.label}</span>
        <span
          className={`ml-3 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={`${generatedId}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-red-50 font-bold text-[#c41525]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <span className="ml-3 text-xs font-black uppercase tracking-[0.14em]">Activo</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
