import { pipeline } from 'node:stream/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { bench } from './utils'
import { createCipheriv } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { N_ITER, WARM } from './constants'

const [key, iv] = [
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
]
const filePath = '/Users/yanjobs/coding/lilith/openssl-bindings/assets/the-all-seeing.jpg'
async function runTransform() {
	const cipher = createCipheriv('aes-128-cfb8', key, iv)
	const t0 = performance.now()
	await pipeline(createReadStream(filePath), cipher, createWriteStream('/dev/null'))
	const dt = performance.now() - t0
	return dt
}
async function runBuffered() {
	const cipher = createCipheriv('aes-128-cfb8', key, iv)
	const buf = await readFile(filePath)
	const t0 = performance.now()
	cipher.update(buf)
	const dt = performance.now() - t0
	return dt
}
bench(runTransform, 'node transform stream:', N_ITER, WARM, { NS_TO_MS: 1 })
bench(runBuffered, 'node buffered file in memory:', N_ITER, WARM, { NS_TO_MS: 1 })
