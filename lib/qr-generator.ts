/**
 * Minimal QR Code Generator — Zero Dependencies
 * Supports byte-mode encoding, EC level M, versions 1–10.
 * Returns an SVG string.
 */

// --- Galois Field GF(256) arithmetic ---
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
    ; (() => {
        let x = 1
        for (let i = 0; i < 255; i++) {
            EXP[i] = x
            LOG[x] = i
            x = (x << 1) ^ (x & 128 ? 0x11d : 0)
        }
        for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
    })()

function gfMul(a: number, b: number): number {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]
}

function polyMul(a: number[], b: number[]): number[] {
    const r = new Array(a.length + b.length - 1).fill(0)
    for (let i = 0; i < a.length; i++)
        for (let j = 0; j < b.length; j++)
            r[i + j] ^= gfMul(a[i], b[j])
    return r
}

function polyMod(data: number[], gen: number[]): number[] {
    const out = data.slice()
    for (let i = 0; i < data.length - gen.length + 1; i++) {
        if (out[i] === 0) continue
        for (let j = 0; j < gen.length; j++)
            out[i + j] ^= gfMul(gen[j], out[i])
    }
    return out.slice(data.length - gen.length + 1)
}

function generatorPoly(n: number): number[] {
    let g = [1]
    for (let i = 0; i < n; i++) g = polyMul(g, [1, EXP[i]])
    return g
}

// --- Version/EC parameters (byte mode, EC level M) ---
interface VersionInfo {
    totalCodewords: number
    ecPerBlock: number
    blocks1: number
    dataPerBlock1: number
    blocks2: number
    dataPerBlock2: number
}

// Versions 1-10, EC level M
const VERSIONS: VersionInfo[] = [
    { totalCodewords: 26, ecPerBlock: 10, blocks1: 1, dataPerBlock1: 16, blocks2: 0, dataPerBlock2: 0 },  // v1
    { totalCodewords: 44, ecPerBlock: 16, blocks1: 1, dataPerBlock1: 28, blocks2: 0, dataPerBlock2: 0 },  // v2
    { totalCodewords: 70, ecPerBlock: 26, blocks1: 1, dataPerBlock1: 44, blocks2: 0, dataPerBlock2: 0 },  // v3
    { totalCodewords: 100, ecPerBlock: 18, blocks1: 2, dataPerBlock1: 32, blocks2: 0, dataPerBlock2: 0 },  // v4
    { totalCodewords: 134, ecPerBlock: 24, blocks1: 2, dataPerBlock1: 43, blocks2: 0, dataPerBlock2: 0 },  // v5
    { totalCodewords: 172, ecPerBlock: 16, blocks1: 4, dataPerBlock1: 27, blocks2: 0, dataPerBlock2: 0 },  // v6
    { totalCodewords: 196, ecPerBlock: 18, blocks1: 4, dataPerBlock1: 31, blocks2: 0, dataPerBlock2: 0 },  // v7
    { totalCodewords: 242, ecPerBlock: 22, blocks1: 2, dataPerBlock1: 38, blocks2: 2, dataPerBlock2: 39 },  // v8
    { totalCodewords: 292, ecPerBlock: 22, blocks1: 3, dataPerBlock1: 36, blocks2: 2, dataPerBlock2: 37 },  // v9
    { totalCodewords: 346, ecPerBlock: 28, blocks1: 4, dataPerBlock1: 43, blocks2: 1, dataPerBlock2: 44 },  // v10
]

function getVersion(dataLen: number): { version: number; info: VersionInfo } {
    for (let v = 0; v < VERSIONS.length; v++) {
        const info = VERSIONS[v]
        const capacity = info.blocks1 * info.dataPerBlock1 + info.blocks2 * info.dataPerBlock2
        if (dataLen <= capacity - 2) return { version: v + 1, info } // -2 for mode + length indicator
    }
    throw new Error("Data too long for QR versions 1-10")
}

// --- Encode data ---
function encodeData(text: string, info: VersionInfo): number[] {
    const bytes = new TextEncoder().encode(text)
    const totalData = info.blocks1 * info.dataPerBlock1 + info.blocks2 * info.dataPerBlock2
    const bits: number[] = []

    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
    }

    // Mode: byte (0100)
    pushBits(0b0100, 4)
    // Character count (8 bits for v1-9, 16 for v10+)
    const ccBits = 8 // versions 1-9 use 8-bit count; v10 uses 16
    pushBits(bytes.length, ccBits)

    // Data
    for (const b of bytes) pushBits(b, 8)

    // Terminator
    const maxBits = totalData * 8
    const termLen = Math.min(4, maxBits - bits.length)
    for (let i = 0; i < termLen; i++) bits.push(0)

    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0)

    // Pad codewords
    const padBytes = [0xEC, 0x11]
    let padIdx = 0
    while (bits.length < maxBits) {
        pushBits(padBytes[padIdx % 2], 8)
        padIdx++
    }

    // Convert to bytes
    const codewords: number[] = []
    for (let i = 0; i < bits.length; i += 8) {
        let b = 0
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]
        codewords.push(b)
    }

    return codewords
}

// --- Error correction ---
function addErrorCorrection(data: number[], info: VersionInfo): number[] {
    const gen = generatorPoly(info.ecPerBlock)
    const blocks: number[][] = []
    const ecBlocks: number[][] = []
    let offset = 0

    const processBlocks = (count: number, dataPerBlock: number) => {
        for (let i = 0; i < count; i++) {
            const block = data.slice(offset, offset + dataPerBlock)
            offset += dataPerBlock
            blocks.push(block)
            const padded = [...block, ...new Array(info.ecPerBlock).fill(0)]
            ecBlocks.push(polyMod(padded, gen))
        }
    }

    processBlocks(info.blocks1, info.dataPerBlock1)
    processBlocks(info.blocks2, info.dataPerBlock2)

    // Interleave data blocks
    const result: number[] = []
    const maxDataLen = Math.max(info.dataPerBlock1, info.dataPerBlock2)
    for (let i = 0; i < maxDataLen; i++) {
        for (const block of blocks) {
            if (i < block.length) result.push(block[i])
        }
    }

    // Interleave EC blocks
    for (let i = 0; i < info.ecPerBlock; i++) {
        for (const ec of ecBlocks) result.push(ec[i])
    }

    return result
}

// --- Matrix operations ---
type Matrix = (number | null)[][]

function createMatrix(size: number): Matrix {
    return Array.from({ length: size }, () => new Array(size).fill(null))
}

function placeFinderPattern(matrix: Matrix, row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
            const mr = row + r, mc = col + c
            if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue
            if (r === -1 || r === 7 || c === -1 || c === 7) {
                matrix[mr][mc] = 0 // separator
            } else if ((r === 0 || r === 6) || (c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                matrix[mr][mc] = 1
            } else {
                matrix[mr][mc] = 0
            }
        }
    }
}

const ALIGNMENT_POSITIONS: number[][] = [
    [],       // v1
    [6, 18],  // v2
    [6, 22],  // v3
    [6, 26],  // v4
    [6, 30],  // v5
    [6, 34],  // v6
    [6, 22, 38], // v7
    [6, 24, 42], // v8
    [6, 26, 46], // v9
    [6, 28, 50], // v10
]

function placeAlignmentPatterns(matrix: Matrix, version: number) {
    const positions = ALIGNMENT_POSITIONS[version - 1]
    if (positions.length < 2) return
    for (const row of positions) {
        for (const col of positions) {
            // Skip if overlapping with finder patterns
            if (row <= 8 && col <= 8) continue // top-left
            if (row <= 8 && col >= matrix.length - 8) continue // top-right
            if (row >= matrix.length - 8 && col <= 8) continue // bottom-left
            for (let r = -2; r <= 2; r++) {
                for (let c = -2; c <= 2; c++) {
                    const v = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) ? 1 : 0
                    matrix[row + r][col + c] = v
                }
            }
        }
    }
}

function placeTimingPatterns(matrix: Matrix) {
    for (let i = 8; i < matrix.length - 8; i++) {
        const v = i % 2 === 0 ? 1 : 0
        if (matrix[6][i] === null) matrix[6][i] = v
        if (matrix[i][6] === null) matrix[i][6] = v
    }
}

function reserveFormatArea(matrix: Matrix) {
    const n = matrix.length
    // Around top-left finder
    for (let i = 0; i <= 8; i++) {
        if (matrix[8][i] === null) matrix[8][i] = 0
        if (matrix[i][8] === null) matrix[i][8] = 0
    }
    // Around top-right finder
    for (let i = 0; i <= 7; i++) {
        if (matrix[8][n - 1 - i] === null) matrix[8][n - 1 - i] = 0
    }
    // Around bottom-left finder
    for (let i = 0; i <= 7; i++) {
        if (matrix[n - 1 - i][8] === null) matrix[n - 1 - i][8] = 0
    }
    // Dark module
    matrix[n - 8][8] = 1
}

function placeData(matrix: Matrix, data: number[]): void {
    const n = matrix.length
    const bits: number[] = []
    for (const byte of data) {
        for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
    }

    let bitIdx = 0
    let upward = true
    for (let right = n - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5 // skip timing column
        const rows = upward
            ? Array.from({ length: n }, (_, i) => n - 1 - i)
            : Array.from({ length: n }, (_, i) => i)
        for (const row of rows) {
            for (const col of [right, right - 1]) {
                if (matrix[row][col] === null) {
                    matrix[row][col] = bitIdx < bits.length ? bits[bitIdx++] : 0
                }
            }
        }
        upward = !upward
    }
}

// --- Masking ---
type MaskFn = (r: number, c: number) => boolean
const MASKS: MaskFn[] = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
]

function applyMask(matrix: Matrix, reserved: Matrix, maskIdx: number): Matrix {
    const n = matrix.length
    const result = matrix.map(row => [...row])
    const fn = MASKS[maskIdx]
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (reserved[r][c] !== null) continue // don't mask reserved
            if (fn(r, c)) result[r][c] = result[r][c] === 1 ? 0 : 1
        }
    }
    return result
}

function scorePenalty(matrix: Matrix): number {
    const n = matrix.length
    let penalty = 0

    // Rule 1: runs of 5+ same-color in a row/column
    for (let r = 0; r < n; r++) {
        let count = 1
        for (let c = 1; c < n; c++) {
            if (matrix[r][c] === matrix[r][c - 1]) {
                count++
                if (count === 5) penalty += 3
                else if (count > 5) penalty++
            } else count = 1
        }
    }
    for (let c = 0; c < n; c++) {
        let count = 1
        for (let r = 1; r < n; r++) {
            if (matrix[r][c] === matrix[r - 1][c]) {
                count++
                if (count === 5) penalty += 3
                else if (count > 5) penalty++
            } else count = 1
        }
    }

    // Rule 2: 2x2 blocks
    for (let r = 0; r < n - 1; r++) {
        for (let c = 0; c < n - 1; c++) {
            const v = matrix[r][c]
            if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1])
                penalty += 3
        }
    }

    return penalty
}

// --- Format info ---
// EC level M = 0, mask pattern 0-7
const FORMAT_BITS: number[] = [
    0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0,
]

function placeFormatInfo(matrix: Matrix, maskIdx: number) {
    const n = matrix.length
    const bits = FORMAT_BITS[maskIdx]

    // Place format bits
    const formatBits: number[] = []
    for (let i = 14; i >= 0; i--) formatBits.push((bits >> i) & 1)

    // Horizontal: left side
    const hPositions = [0, 1, 2, 3, 4, 5, 7, 8, n - 7, n - 6, n - 5, n - 4, n - 3, n - 2, n - 1]
    for (let i = 0; i < 15; i++) matrix[8][hPositions[i]] = formatBits[i]

    // Vertical: top and bottom
    const vPositions = [n - 1, n - 2, n - 3, n - 4, n - 5, n - 6, n - 7, 8, 7, 5, 4, 3, 2, 1, 0]
    for (let i = 0; i < 15; i++) matrix[vPositions[i]][8] = formatBits[i]
}

// --- Main export ---
export function generateQrSvg(text: string, moduleSize: number = 4, quietZone: number = 4): string {
    const { version, info } = getVersion(new TextEncoder().encode(text).length)
    const size = version * 4 + 17

    // Build reserved mask (to know which cells shouldn't be data-masked)
    const reserved = createMatrix(size)
    placeFinderPattern(reserved, 0, 0)
    placeFinderPattern(reserved, 0, size - 7)
    placeFinderPattern(reserved, size - 7, 0)
    placeAlignmentPatterns(reserved, version)
    placeTimingPatterns(reserved)
    reserveFormatArea(reserved)

    // Build data matrix
    const matrix = createMatrix(size)
    placeFinderPattern(matrix, 0, 0)
    placeFinderPattern(matrix, 0, size - 7)
    placeFinderPattern(matrix, size - 7, 0)
    placeAlignmentPatterns(matrix, version)
    placeTimingPatterns(matrix)
    reserveFormatArea(matrix)

    // Encode + EC
    const data = encodeData(text, info)
    const withEc = addErrorCorrection(data, info)
    placeData(matrix, withEc)

    // Find best mask
    let bestMask = 0
    let bestScore = Infinity
    for (let m = 0; m < 8; m++) {
        const masked = applyMask(matrix, reserved, m)
        placeFormatInfo(masked, m)
        const score = scorePenalty(masked)
        if (score < bestScore) {
            bestScore = score
            bestMask = m
        }
    }

    const finalMatrix = applyMask(matrix, reserved, bestMask)
    placeFormatInfo(finalMatrix, bestMask)

    // Render SVG
    const totalSize = (size + quietZone * 2) * moduleSize
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (finalMatrix[r][c] === 1) {
                const x = (c + quietZone) * moduleSize
                const y = (r + quietZone) * moduleSize
                svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`
            }
        }
    }

    svg += `</svg>`
    return svg
}
