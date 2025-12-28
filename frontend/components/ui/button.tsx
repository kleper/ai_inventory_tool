import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-black uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-0 focus-visible:shadow-brutal border-[2px] border-white shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-black hover:bg-primary/90 border-white", // Yellow Button, White Border
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 border-white",
        outline:
          "bg-black text-white border-white hover:bg-white hover:text-black",
        secondary:
          "bg-secondary text-white hover:bg-secondary/80 border-white",
        ghost:
          "border-transparent shadow-none hover:bg-white hover:text-black hover:shadow-brutal hover:border-white",
        link: "text-primary underline-offset-4 hover:underline shadow-none border-0 p-0 h-auto",
      },
      size: {
        default: "h-14 px-8 py-4", // Larger touch targets
        sm: "h-10 rounded-none px-4",
        lg: "h-16 rounded-none px-10 text-lg",
        icon: "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
