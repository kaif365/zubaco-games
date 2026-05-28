import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname)
const IGNORE_FOLDERS = ["node_modules", "dist", "build", ".next", ".git"]
const VALID_EXTENSIONS = [".js", ".ts", ".tsx"]
console.log("ROOT_DIR ::", ROOT_DIR)
const THRESHOLDS = {
  hexEscapeRatio: 0.02,
  unicodeEscapeRatio: 0.01,
  avgIdentifierLength: 25,
  entropyThreshold: 4.8,
  maxLineLength: 500,
  maxTernaryCount: 30,
  minSuspiciousIds: 5,
  minLongIds: 3,
  minDecoderPatternMatches: 2,
}

const DECODER_PATTERNS = [
  { re: /\(function\s*\([a-z],\s*[a-z]\)/, name: "(function(h,l)) wrapper" },
  { re: /String\.fromCharCode\s*\(/, name: "String.fromCharCode" },
  { re: /\beval\s*\(/, name: "eval()" },
  { re: /\bFunction\s*\(\s*["'`]return/, name: "Function('return ...')" },
  { re: /\btoa\s*\(|\batob\s*\(/, name: "btoa/atob" },
  { re: /\bcharCodeAt\s*\(.*\bfromCharCode\s*\(/s, name: "charCodeAt+fromCharCode combo" },
  { re: /global\s*\[\s*_\$_/, name: "global[_$_...] pattern" },
  { re: /\bsplit\s*\(\s*["'`][^"'`]{0,3}["'`]\s*\)\s*\.join/, name: "split/join chaining" },
]

// ─── HEURISTIC HELPERS ────────────────────────────────────────────────────────

function shannonEntropy(str) {
  const freq = {}
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1
  const len = str.length
  return -Object.values(freq).reduce((sum, count) => {
    const p = count / len
    return sum + p * Math.log2(p)
  }, 0)
}

function checkEscapeSequences(code, len) {
  const findings = []
  const hexEscapes = (code.match(/\\x[0-9a-fA-F]{2}/g) || []).length
  if (hexEscapes / len > THRESHOLDS.hexEscapeRatio) {
    findings.push(
      `High hex escape density (${hexEscapes} occurrences, ratio: ${(hexEscapes / len).toFixed(4)})`,
    )
  }
  const unicodeEscapes = (code.match(/\\u[0-9a-fA-F]{4}/g) || []).length
  if (unicodeEscapes / len > THRESHOLDS.unicodeEscapeRatio) {
    findings.push(`High unicode escape density (${unicodeEscapes} occurrences)`)
  }
  return findings
}

function checkStringLiterals(code) {
  const findings = []
  const base64Matches = code.match(/["'`][A-Za-z0-9+/]{40,}={0,2}["'`]/g) || []
  if (base64Matches.length > 0) {
    findings.push(`${base64Matches.length} base64-like string literal(s) detected`)
  }
  if (/var\s+_0x[0-9a-f]+\s*=\s*\[/.test(code)) {
    findings.push("Array-based string obfuscation (_0x... variable) detected")
  }
  return findings
}

function checkIdentifiers(code) {
  const findings = []
  const identifiers = code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []
  const suspiciousIds = identifiers.filter(
    (id) => /^_\$_[a-f0-9]+$/i.test(id) || /^[a-zA-Z]{1,2}[0-9]{2,}$/.test(id),
  )
  if (suspiciousIds.length > THRESHOLDS.minSuspiciousIds) {
    const examples = [...new Set(suspiciousIds)].slice(0, 3).join(", ")
    findings.push(
      `${suspiciousIds.length} mangled/suspicious identifier(s) found (e.g. ${examples})`,
    )
  }
  const longIds = identifiers.filter((id) => id.length > THRESHOLDS.avgIdentifierLength)
  if (longIds.length > THRESHOLDS.minLongIds) {
    findings.push(`${longIds.length} unusually long identifier(s) found`)
  }
  return findings
}

function checkEntropyInSamples(samples) {
  for (const sample of samples) {
    if (sample.length < 80) continue
    const entropy = shannonEntropy(sample)
    if (entropy > THRESHOLDS.entropyThreshold) {
      return `High entropy detected (${entropy.toFixed(2)} bits) — possible encrypted/packed payload`
    }
  }
  return null
}

function checkLinesAndEntropy(code) {
  const findings = []
  const lines = code.split("\n")
  const longLines = lines.filter((l) => l.length > THRESHOLDS.maxLineLength)
  if (longLines.length > 0) {
    findings.push(
      `${longLines.length} very long line(s) (>${THRESHOLDS.maxLineLength} chars) — possible minification or packing`,
    )
  }
  const samplesToCheck = lines.length === 1 ? [code] : longLines
  const entropyFinding = checkEntropyInSamples(samplesToCheck)
  if (entropyFinding) findings.push(entropyFinding)
  return findings
}

function checkDecoderPatterns(code) {
  const findings = []
  const matched = DECODER_PATTERNS.filter(({ re }) => re.test(code))
  if (matched.length >= THRESHOLDS.minDecoderPatternMatches) {
    findings.push(
      `${matched.length} decoder pattern(s) matched: ${matched.map((p) => p.name).join(", ")}`,
    )
  }
  const ternaryCount = (code.match(/\?[^:]+:/g) || []).length
  if (ternaryCount > THRESHOLDS.maxTernaryCount) {
    findings.push(
      `Excessive ternary expressions (${ternaryCount}) — possible control-flow obfuscation`,
    )
  }
  return findings
}

// ─── MAIN DETECTOR ────────────────────────────────────────────────────────────

function detectObfuscation(code) {
  if (code.length === 0) return []
  return [
    ...checkEscapeSequences(code, code.length),
    ...checkStringLiterals(code),
    ...checkIdentifiers(code),
    ...checkLinesAndEntropy(code),
    ...checkDecoderPatterns(code),
  ]
}

// ─── FILE WALKER ──────────────────────────────────────────────────────────────

function shouldIgnore(filePath) {
  return IGNORE_FOLDERS.some(
    (folder) =>
      filePath.includes(`${path.sep}${folder}${path.sep}`) ||
      filePath.endsWith(`${path.sep}${folder}`),
  )
}

function scanFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf8")
    const findings = detectObfuscation(code, filePath)
    if (findings.length > 0) {
      console.log("\n⚠️  Suspicious File:", filePath)
      findings.forEach((f) => console.log("   •", f))
    }
  } catch (err) {
    console.error("\n📂 Error reading file:", filePath, "-", err.message)
  }
}

function processEntry(fullPath) {
  if (shouldIgnore(fullPath)) return
  const stat = fs.statSync(fullPath)
  if (stat.isDirectory()) {
    walk(fullPath)
  } else if (VALID_EXTENSIONS.includes(path.extname(fullPath))) {
    scanFile(fullPath)
  }
}

function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return
  }
  for (const file of entries) {
    processEntry(path.join(dir, file))
  }
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

console.log("🔍 Scanning project for obfuscated code...\n")
walk(ROOT_DIR)
console.log("\n✅ Scan complete.")
