import { dlopen, FFIType } from 'bun:ffi'
import { randomBytes } from 'crypto'
/*

struct get_encrypt_ctx * get_ctx(uint8_t*iv, uint8_t*key);
int encrypt_ffi(uint8_t * data, uint32_t length, struct encrypt_ctx * ctx);
void destroy_ctx(struct encrypt_ctx * ctx);
*/
const {
	symbols: { encrypt_ffi, get_encrypt_ctx, destroy_ctx },
} = dlopen('libaes128_cfb8.dylib', {
	encrypt_ffi: {
		args: [FFIType.ptr, FFIType.uint32_t, FFIType.ptr],
		returns: FFIType.ptr,
	},
	get_encrypt_ctx: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
	destroy_ctx: { args: [FFIType.ptr] },
})
const iv = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const key = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

async function run(data: Buffer) {
	const handle = get_encrypt_ctx(iv, key)
	const start = performance.now()
	encrypt_ffi(data, data.length, handle)
	const dt = performance.now() - start
	destroy_ctx(handle)
	return dt
}

const he_sees = Buffer.from(await Bun.file('./the-all-seeing.jpg').bytes())

const N = 100

for (let i = 0; i < 5; i++) run(he_sees)
const results = []
Bun.gc(true)
for (let i = 0; i < N; i++) {
	Bun.gc(true)
	results.push(await run(he_sees))
}

const mean = results.reduce((a, b) => a + b) / N
const stddev = Math.sqrt(results.map((a) => (a - mean) * (a - mean)).reduce((a, b) => a + b) / N)
results.sort()
const p50 = results[Math.floor(N / 2)]
const p99 = results[Math.floor(N * 0.99)]
const b_per_ms = he_sees.length / mean

console.log(`N:    ${N}`)
console.log(`µ:    ${mean.toFixed(2)}`)
console.log(`σ:    ${stddev.toFixed(2)}`)
console.log(`p50:  ${p50.toFixed(2)}`)
console.log(`p99:  ${p99.toFixed(2)}`)
console.log(`B/ms: ${b_per_ms.toFixed(2)}`)
