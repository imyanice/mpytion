import { Transform, TransformCallback } from 'node:stream'
import { Context, decrypt, destroy_ctx, encrypt, get_ctx, get_deallocator } from './native'
import { Pointer, toBuffer } from 'bun:ffi'

const toBufferDealloc: (
	ptr: Pointer,
	byteOffset: number,
	length: number,
	deallocator: Pointer,
) => Buffer = toBuffer

class Cipher extends Transform {
	public ctx: Context
	private deallocator: Pointer
	constructor(key: Uint8Array, initialVector: Uint8Array) {
		super()
		const ctx = get_ctx(key, initialVector)
		if (!ctx) throw new Error('error while getting encryption ctx!')
		const dealloc = get_deallocator()
		if (!dealloc) throw new Error('error while getting deallocator!')
		this.ctx = ctx
		this.deallocator = dealloc
	}

	public processBuffer(chunk: Buffer) {
		const buffer_pointer = encrypt(chunk, chunk.length, this.ctx)
		if (!buffer_pointer) return
		return toBufferDealloc(buffer_pointer, 0, chunk.length, this.deallocator)
	}

	public _transform(chunk: Buffer, _: BufferEncoding, callback: TransformCallback) {
		try {
			callback(null, this.processBuffer(chunk))
		} catch (e) {
			callback(e as Error)
		}
	}
}
class Decipher extends Transform {
	public ctx: Context
	private deallocator: Pointer
	constructor(key: Uint8Array, initialVector: Uint8Array) {
		super()
		const ctx = get_ctx(key, initialVector)
		const dealloc = get_deallocator()

		if (!ctx) throw new Error('error while getting decryption ctx!')
		if (!dealloc) throw new Error('error while getting deallocator!')

		this.ctx = ctx
		this.deallocator = dealloc
	}
	public processBuffer(chunk: Buffer) {
		const buffer_pointer = decrypt(chunk, chunk.length, this.ctx)
		if (!buffer_pointer) return
		return toBufferDealloc(buffer_pointer, 0, chunk.length, this.deallocator)
	}
	public _transform(chunk: Buffer, _: BufferEncoding, callback: TransformCallback) {
		try {
			callback(null, this.processBuffer(chunk))
		} catch (e) {
			callback(e as Error)
		}
	}
}
const ctx_freeer = new FinalizationRegistry((ptr: Pointer) => {
	destroy_ctx(ptr)
})

export function getCipher(key: Uint8Array, initialVector: Uint8Array) {
	const cipher = new Cipher(key, initialVector)
	ctx_freeer.register(cipher, cipher.ctx)
	return cipher
}
export function getDecipher(key: Uint8Array, initialVector: Uint8Array) {
	const cipher = new Decipher(key, initialVector)
	ctx_freeer.register(cipher, cipher.ctx)
	return cipher
}
