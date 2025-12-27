import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-2 border-black bg-white h-10 w-full min-w-0 rounded-none px-3 py-1 text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-none outline-none font-mono focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:ring-0 focus:border-blue-600 focus:bg-blue-50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
