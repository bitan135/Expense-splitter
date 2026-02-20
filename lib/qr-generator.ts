/**
 * QR Code Generator — thin wrapper around the `qrcode` package
 * Returns a data URL (base64 PNG) for use in <img> tags
 */
import QRCode from "qrcode"

export async function generateQrDataUrl(text: string, size: number = 256): Promise<string> {
    return QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        color: {
            dark: "#000000",
            light: "#ffffff",
        },
        errorCorrectionLevel: "M",
    })
}
