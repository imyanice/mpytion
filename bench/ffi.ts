import * as ffi from 'bun:ffi'


const openssl = ffi.dlopen('./libopenssl_bindings.dylib', {
	get_cipher_handle: { args: [], returns: ffi.FFIType.ptr },
	test_cipher: { args: [ffi.FFIType.ptr, ffi.FFIType.ptr, ffi.FFIType.uint32_t] },
	destroy_cipher: { args: [ffi.FFIType.ptr] },
})
async function run(data: Buffer) {
	const handle = openssl.symbols.get_cipher_handle()
	const start = performance.now()
	openssl.symbols.test_cipher(handle, data, data.length)
	const dt = performance.now() - start
	openssl.symbols.destroy_cipher(handle)
	return dt
}

const he_sees = Buffer.from(await Bun.file('./the-all-seeing.jpg').bytes())

const N = 1

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
