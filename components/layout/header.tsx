"use client"

interface HeaderProps {
    title: string
    rightAction?: React.ReactNode
    children?: React.ReactNode
}

export function Header({ title, rightAction, children }: HeaderProps) {
    return (
        <header className="sticky top-0 z-40 w-full glass-header pt-safe transition-all duration-200">
            <div className="flex h-14 items-center justify-between px-4 max-w-md mx-auto">
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                    {title}
                </h1>
                {rightAction && <div>{rightAction}</div>}
            </div>
            {children}
        </header>
    )
}
