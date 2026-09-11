import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const buttonVariants = cva('inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:pointer-events-none disabled:opacity-50 shadow-sm', { variants: { variant: { default: 'bg-[#b8eee0] text-[#0b272a] hover:bg-[#d4fff2]', outline: 'border border-white/20 bg-white/5 text-white hover:bg-white/10', ghost: 'text-white/65 hover:text-white hover:bg-white/5' }, size: { default: 'h-12 px-6', icon: 'h-10 w-10', sm: 'h-9 px-3' } }, defaultVariants: { variant: 'default', size: 'default' } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : 'button'; return <Comp className={twMerge(clsx(buttonVariants({ variant, size, className })))} ref={ref} {...props} />; });
Button.displayName = 'Button';
