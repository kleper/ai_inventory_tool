import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium uppercase tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 border border-black hover:bg-neutral-100",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-neutral-800 hover:text-white border-black",
        destructive:
          "bg-white text-destructive border-destructive hover:bg-destructive hover:text-white",
        outline:
          "bg-white text-black border-black hover:bg-black hover:text-white", // Inverted hover for wireframe feel
        secondary:
          "bg-neutral-100 text-black hover:bg-neutral-200 border-transparent",
        ghost:
          "border-transparent hover:bg-neutral-100 hover:text-black",
        link: "text-black underline-offset-4 hover:underline border-0 p-0 h-auto",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded-none px-3 text-xs",
        lg: "h-12 rounded-none px-8 text-base",
        icon: "size-10",
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
