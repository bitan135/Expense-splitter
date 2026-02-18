import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

// --- Button ---
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
    isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
        const variants = {
            default: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90",
            destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
            outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        }
        const sizes = {
            default: "h-12 px-6 py-3 text-base rounded-2xl",
            sm: "h-9 rounded-xl px-4 text-sm",
            lg: "h-14 rounded-2xl px-8 text-lg",
            icon: "h-12 w-12 rounded-2xl",
        }
        return (
            <button
                ref={ref}
                disabled={isLoading || props.disabled}
                className={cn(
                    "active-press inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

// --- Card ---
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("premium-card text-card-foreground overflow-hidden", className)}
            {...props}
        />
    )
)
Card.displayName = "Card"

// --- Input (Native Mobile Feel) ---
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-14 w-full rounded-2xl bg-secondary px-5 py-3 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"
