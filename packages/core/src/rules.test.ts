import { describe, expect, it } from 'vitest'

import { FILE_RULES, isAcceptedExtension, isAcceptedMimeType } from './rules.js'

describe('FILE_RULES accepted mime types', () => {
  it('accepts common mp3 mime aliases', () => {
    expect(isAcceptedMimeType('audio/mpeg')).toBe(true)
    expect(isAcceptedMimeType('audio/mp3')).toBe(true)
    expect(isAcceptedMimeType('audio/x-mp3')).toBe(true)
  })

  it('normalizes mime type parameters', () => {
    expect(isAcceptedMimeType('audio/mpeg; charset=binary')).toBe(true)
    expect(isAcceptedMimeType('audio/wav; codecs=1')).toBe(true)
  })

  it('rejects unsupported mime values', () => {
    expect(isAcceptedMimeType('application/octet-stream')).toBe(false)
    expect(isAcceptedMimeType('video/mp4')).toBe(false)
  })
})

describe('FILE_RULES accepted extensions', () => {
  it('accepts all declared extensions in the rule set', () => {
    for (const ext of FILE_RULES.accepted_extensions) {
      expect(isAcceptedExtension(ext)).toBe(true)
    }
  })

  it('accepts extensions with dot and mixed case', () => {
    expect(isAcceptedExtension('.Mp3')).toBe(true)
    expect(isAcceptedExtension('.WAV')).toBe(true)
  })
})
