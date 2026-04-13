import { dlopen, FFIType, Pointer } from 'bun:ffi'

import libaes128_cfb8 from '../dist/libaes128_cfb8.dylib' with { type: 'file' }
export const openssl = dlopen(libaes128_cfb8, {
	get_ctx: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
	destroy_ctx: { args: [FFIType.ptr] },
	destroy_data: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.void },
	get_deallocator: { returns: FFIType.function },
	init: {},
	encrypt_ffi: {
		args: [FFIType.ptr, FFIType.uint32_t, FFIType.ptr],
		returns: FFIType.ptr,
	},
	decrypt_ffi: {
		args: [FFIType.ptr, FFIType.uint32_t, FFIType.ptr],
		returns: FFIType.ptr,
	},
})
openssl.symbols.init()

type Context = Pointer
type JSBuffer = NodeJS.TypedArray<ArrayBufferLike> /*| DataView<ArrayBufferLike>*/
type uint32_t = number

/**
 * `struct ctx * get_ctx(uint8_t * key, uint8_t * iv);`
 */
const get_ctx: (key: JSBuffer, iv: JSBuffer) => Context | null = openssl.symbols.get_ctx
/**
 * `void destroy_ctx(struct ctx * ctx);`
 */
const destroy_ctx: (ctx: Context) => void = openssl.symbols.destroy_ctx
/**
 * `void destroy_data(struct ctx * ctx);`
 */
const destroy_data: (data: Pointer) => void = openssl.symbols.destroy_data
/**
 * `uint8_t * encrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx)`
 */
const encrypt: (data: JSBuffer, length: uint32_t, ctx: Context) => Pointer | null =
	openssl.symbols.encrypt_ffi
/**
 * `void decrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx);`
 */
const decrypt: (data: JSBuffer, length: uint32_t, ctx: Context) => Pointer | null =
	openssl.symbols.decrypt_ffi

const get_deallocator: () => Pointer | null = openssl.symbols.get_deallocator

export { get_ctx, get_deallocator, destroy_ctx, encrypt, decrypt, type Context }
