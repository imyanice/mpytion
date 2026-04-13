import { Pointer, toArrayBuffer, toBuffer } from 'bun:ffi'
import { decrypt, destroy_ctx, encrypt, get_ctx, openssl } from '../impl/native'
const [key, iv] = [
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	]),
]
console.log('check that 1st and 3rd buffer are equal!')
const toBufferDealloc: (
	ptr: Pointer,
	byteOffset: number,
	length: number,
	deallocator: Pointer,
) => Buffer = toBuffer

const cipher = get_ctx(key, iv)
const decipher = get_ctx(key, iv)
const deallocator = openssl.symbols.get_deallocator()

if (!cipher || !deallocator || !decipher) {
	console.log('could not get cipher/decipher/deallocator')
	process.exit(1)
}

const lines = `Beans, beans, beans
Jessie ate some beans
He was happy, happy, happy
That he ate some beans
Sitting naked, naked, naked
Sitting cross-legged
Naked, naked, naked
And he was happy, happy, happy
That he ate some beans
Wine, wine, wine
Jessie ate some wine
He was happy, happy, happy
That he ate some wine
Beans, beans, beans
Jessie ate some beans
And he drank some wine
And he was happy, happy, happy
That he drank some beans`
	.split('\n')
	.map((s) => Buffer.from(s))
for (const line of lines) {
	const res = encrypt(line, line.length, cipher)
	if (!res) {
		console.log('could not cipher')
		process.exit(1)
	}
	const buffer_res = toBufferDealloc(res, 0, line.length, deallocator)
	const orig = decrypt(buffer_res, line.length, decipher)
	if (!orig) {
		console.log('could not decipher')
		process.exit(1)
	}
	const orig_res = toBufferDealloc(orig, 0, line.length, deallocator)
	if (!orig_res.equals(line)) {
		console.log('original and deciphered did NOT match!')
		process.exit(1)
	}
}
console.log('original and deciphered matched!')

destroy_ctx(cipher)
destroy_ctx(decipher)

Bun.gc(true)

setTimeout(() => {}, 3000)
