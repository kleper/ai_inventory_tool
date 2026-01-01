import * as React from "react"
import { ChevronDown } from "lucide-react"

interface BrutalistSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    options: { label: string; value: string }[]
    className?: string
}

export const BrutalistSelect = React.forwardRef<HTMLSelectElement, BrutalistSelectProps>(
    ({ label, options, className = "", ...props }, ref) => {
        return (
            <div className="space-y-2">
                {label && (
                    <label className="uppercase font-mono text-xs text-black block">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`appearance-none w-full bg-white border border-black rounded-none p-3 pr-10 font-mono text-sm uppercase focus:outline-none focus:ring-0 focus:border-black transition-colors hover:bg-neutral-50 ${className}`}
                        {...props}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value} className="font-sans">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-black">
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
            </div>
        )
    }
)
BrutalistSelect.displayName = "BrutalistSelect"
