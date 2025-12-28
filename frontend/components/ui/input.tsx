import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-none border-[3px] border-white bg-black px-4 py-3 text-base ring-offset-black file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-brutal disabled:cursor-not-allowed disabled:opacity-50 text-white shadow-brutal font-mono focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all",
        className
      )}
      {...props}
    />
  )
}

export { Input }
