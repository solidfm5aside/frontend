import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type SelectControlSize = 'compact' | 'default' | 'large';
type SelectFontWeight = 'normal' | 'medium' | 'bold' | 'black';
type SelectOptionSurface = 'black' | 'neutral' | 'solid';
type SelectSurface = 'black' | 'glass' | 'muted' | 'neutral' | 'solid';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  controlSize?: SelectControlSize;
  fontWeight?: SelectFontWeight;
  optionSurface?: SelectOptionSurface;
  surface?: SelectSurface;
}

const SIZE_CLASSES: Record<SelectControlSize, string> = {
  compact: 'min-h-11 rounded-xl px-3 py-2.5 pr-10 text-base [@media(pointer:fine)]:text-sm',
  default: 'min-h-12 rounded-2xl px-4 py-3 pr-11 text-base [@media(pointer:fine)]:text-sm',
  large: 'min-h-14 rounded-2xl px-5 py-4 pr-12 text-base [@media(pointer:fine)]:text-sm',
};

const ARROW_CLASSES: Record<SelectControlSize, string> = {
  compact: 'right-3 h-3.5 w-3.5',
  default: 'right-4 h-4 w-4',
  large: 'right-5 h-4 w-4',
};

const SURFACE_CLASSES: Record<SelectSurface, string> = {
  black: 'bg-black enabled:hover:bg-neutral-950',
  glass: 'border-white/5 bg-white/5 enabled:hover:bg-white/[0.08]',
  muted: 'bg-black/40 enabled:hover:bg-black/60',
  neutral: 'bg-neutral-950 enabled:hover:bg-neutral-900',
  solid: 'bg-[#07131a] enabled:hover:bg-[#0a1820]',
};

const FONT_WEIGHT_CLASSES: Record<SelectFontWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
  black: 'font-black',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    children,
    className,
    containerClassName,
    controlSize = 'default',
    disabled,
    fontWeight = 'bold',
    optionSurface,
    surface = 'solid',
    ...props
  },
  ref,
) {
  const resolvedOptionSurface = optionSurface ?? (
    surface === 'black' ? 'black' : surface === 'glass' || surface === 'neutral' ? 'neutral' : 'solid'
  );

  return (
    <div className={clsx('group relative min-w-0', containerClassName)}>
      <select
        {...props}
        ref={ref}
        data-option-surface={resolvedOptionSurface}
        data-surface={surface}
        disabled={disabled}
        className={twMerge(clsx(
          'app-select w-full cursor-pointer appearance-none truncate border border-white/10 text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] outline-none transition-[border-color,background-color,box-shadow] duration-200 [color-scheme:dark]',
          'enabled:hover:border-white/20 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 focus-visible:outline-none',
          'aria-[invalid=true]:border-red-500/60 aria-[invalid=true]:ring-red-500/10',
          'disabled:cursor-not-allowed disabled:border-white/5 disabled:text-neutral-500 disabled:opacity-60',
          SIZE_CLASSES[controlSize],
          FONT_WEIGHT_CLASSES[fontWeight],
          SURFACE_CLASSES[surface],
          className,
        ))}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-neutral-500 transition-colors duration-200 group-hover:text-neutral-300 group-focus-within:text-blue-400 group-has-[select:disabled]:text-neutral-600 group-has-[select:disabled]:opacity-40',
          disabled && 'opacity-40',
          ARROW_CLASSES[controlSize],
        )}
      />
    </div>
  );
});
