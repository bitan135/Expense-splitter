"use client"

interface HeaderProps {
    title: string
    rightAction?: React.ReactNode
    children?: React.ReactNode
}

export function Header({ title, rightAction, children }: HeaderProps) {
    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-4">
                <h1 className="text-lg font-bold truncate">{title}</h1>
                {rightAction && <div>{rightAction}</div>}
            </div>
            {children}
        </header>
    )
}
