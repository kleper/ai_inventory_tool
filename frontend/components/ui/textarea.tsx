import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "flex min-h-[80px] w-full rounded-none border-2 border-black bg-white px-3 py-2 text-sm text-black ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all",
                className
            )}
            {...props}
        />
    )
}

export { Textarea }
