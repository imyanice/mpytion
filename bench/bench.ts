import { pipeline } from 'node:stream/promises'
import { getCipher } from '../impl/index'
import { createReadStream, createWriteStream } from 'node:fs'
import { bench } from './utils'
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
async function run() {
	const cipher = getCipher(key, iv)
	const t0 = Bun.nanoseconds()
	await pipeline(createReadStream(filePath), cipher, createWriteStream('/dev/null'))
	const dt = Bun.nanoseconds() - t0
	return dt
}

async function onBuffer() {
	const he_sees = Buffer.from(
		await Bun.file(
			'/Users/yanjobs/coding/lilith/openssl-bindings/assets/the-all-seeing.jpg',
		).bytes(),
	)
	const cipher = getCipher(key, iv)
	const t0 = Bun.nanoseconds()
	cipher.processBuffer(he_sees)
	const dt = Bun.nanoseconds() - t0
	return dt
}

bench(run, 'transform stream:', N_ITER, WARM)
bench(onBuffer, 'buffered file in memory:', N_ITER, 20)
