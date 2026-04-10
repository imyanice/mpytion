import { getCipher, getDecipher } from '../impl'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
/*
 * Quick sanity check:
 * - blinded should have for first 4 bytes: 99BE6A87
 *                           last  4 bytes: 729E5D39
 * - he can see should be like the all seeing.
 * - see assets for complete data.
 */

const [key, iv] = [
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
]

// const cipher = getCipher(key, iv)
const decipher = getDecipher(key, iv)
// await pipeline(
// 	createReadStream('/Users/yanjobs/coding/lilith/openssl-bindings/assets/the-all-seeing.jpg'),
// 	cipher,
// 	createWriteStream('/Users/yanjobs/coding/lilith/openssl-bindings/trash/blinded.jpg'),
// )

await pipeline(
	createReadStream('/Users/yanjobs/coding/lilith/openssl-bindings/assets/blinded.jpg'),
	decipher,
	createWriteStream('/Users/yanjobs/coding/lilith/openssl-bindings/trash/he-can-see.jpg'),
)

process.on('beforeExit', () => {
	Bun.gc(true)
})
