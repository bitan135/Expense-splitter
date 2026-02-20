"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "expense-splitter-upi-config"

interface UpiConfig {
    upiId: string
    name: string
}

const defaultConfig: UpiConfig = { upiId: "", name: "" }

function loadConfig(): UpiConfig {
    if (typeof window === "undefined") return defaultConfig
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            if (parsed && typeof parsed.upiId === "string" && typeof parsed.name === "string") {
                return parsed
            }
        }
    } catch {
        // Corrupt data — ignore
    }
    return defaultConfig
}

function saveConfig(config: UpiConfig) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
        // Storage full — ignore silently
    }
}

export function isValidUpiId(id: string): boolean {
    return id.trim().length > 0 && id.includes("@")
}

export function useUpiConfig() {
    const [config, setConfig] = useState<UpiConfig>(defaultConfig)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        setConfig(loadConfig())
        setLoaded(true)
    }, [])

    const setUpiId = useCallback((upiId: string) => {
        setConfig(prev => {
            const next = { ...prev, upiId }
            saveConfig(next)
            return next
        })
    }, [])

    const setName = useCallback((name: string) => {
        setConfig(prev => {
            const next = { ...prev, name }
            saveConfig(next)
            return next
        })
    }, [])

    const isConfigured = config.upiId.trim().length > 0 && config.name.trim().length > 0
    const isValid = isConfigured && isValidUpiId(config.upiId)

    return {
        upiId: config.upiId,
        name: config.name,
        setUpiId,
        setName,
        isConfigured,
        isValid,
        loaded,
    }
}

export function buildUpiUrl(upiId: string, name: string, amount: number, note: string = "Expense Settlement"): string {
    const params = new URLSearchParams({
        pa: upiId.trim(),
        pn: name.trim(),
        am: amount.toFixed(2),
        cu: "INR",
        tn: note,
    })
    return `upi://pay?${params.toString()}`
}
