import { pipeline } from 'node:stream/promises'
import { getCipher } from '../impl/index'
import { createReadStream, createWriteStream } from 'node:fs'
import { bench } from './utils'
import { N_ITER, WARM } from './constants'

import filePath from '../assets/the-all-seeing.jpg' with { type: 'file' }
console.log(`using file at path: ${filePath}`)
const file = Bun.file(filePath)
const he_sees = Buffer.from(await file.bytes())
const [key, iv] = [
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
]

// async function run() {
// 	const cipher = getCipher(key, iv)
// 	const t0 = Bun.nanoseconds()
// 	await pipeline(createReadStream(filePath), cipher, createWriteStream('/dev/null'))
// 	const dt = Bun.nanoseconds() - t0
// 	return dt
// }

async function onBuffer() {
	const cipher = getCipher(key, iv)
	const t0 = Bun.nanoseconds()
	cipher.processBuffer(he_sees)
	const dt = Bun.nanoseconds() - t0
	return dt
}

// bench(run, 'transform stream:', N_ITER, WARM)
bench(onBuffer, 'buffered file in memory:', N_ITER, WARM)
