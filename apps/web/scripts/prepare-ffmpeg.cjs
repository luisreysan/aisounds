const fs = require('node:fs')
const path = require('node:path')

const ffmpegPath = require('ffmpeg-static')

if (!ffmpegPath || typeof ffmpegPath !== 'string') {
  throw new Error('ffmpeg-static did not return a valid binary path')
}

const appRoot = path.resolve(__dirname, '..')
const outputDir = path.join(appRoot, '.ffmpeg')
const outputFile = path.join(outputDir, path.basename(ffmpegPath))

fs.mkdirSync(outputDir, { recursive: true })
fs.copyFileSync(ffmpegPath, outputFile)

try {
  fs.chmodSync(outputFile, 0o755)
} catch {
  // chmod can fail on Windows; the copied file is still usable there.
}

console.log(`[prepare-ffmpeg] copied binary to ${outputFile}`)
