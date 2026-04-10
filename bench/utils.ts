function format_ns(n: number, NS_TO_MS = 1_000_000, separator = '') {
	/*if (n < 10_000) {
		return `${n}${separator}ns`
		} else {*/
	return `${(n / NS_TO_MS).toFixed(2)}${separator}ms`
	// }
}
function display_results(results: number[], NS_TO_MS?: number) {
	if (results.length === 0) return
	const n_iter = results.length
	const total_time = results.reduce((a, b) => a + b)
	const mean = total_time / n_iter
	const stddev = Math.sqrt(
		results.map((a) => (a - mean) * (a - mean)).reduce((a, b) => a + b) / n_iter,
	)
	results.sort((a, b) => a - b)
	const p50 = results[Math.floor(n_iter / 2)]
	const p99 = results[Math.floor(n_iter * 0.99)]
	const [low, high] = [results[0], results[results.length - 1]]
	// const b_per_ms = (await stat(filePath)).size / mean

	console.log(
		`${n_iter} run${n_iter > 1 ? 's' : ''} w/ ${format_ns(total_time, NS_TO_MS, ' ')} total`,
	)
	console.log(`t: (µ ± σ) = ${format_ns(mean, NS_TO_MS)} ± ${format_ns(stddev, NS_TO_MS)}`)
	console.log(`p50 = ${format_ns(p50, NS_TO_MS)} | p99 = ${format_ns(p99, NS_TO_MS)}`)
	console.log(`      ${format_ns(low, NS_TO_MS)}...${format_ns(high, NS_TO_MS)}`)
}
// console.log(`B/ms: ${b_per_ms.toFixed(2)}`)
export async function bench(
	fn: () => Promise<number>,
	name: string,
	n_iters: number,
	warm: number,
	options?: { NS_TO_MS?: number },
) {
	for (let i = 0; i < warm; i++) await fn()
	const bench_data = []
	if (process.versions.bun) Bun.gc(true)
	else if (gc) gc()
	for (let i = 0; i < n_iters; i++) {
		if (process.versions.bun) Bun.gc(true)
		else if (gc) gc()
		bench_data.push(await fn())
	}
	console.log(name)
	display_results(bench_data, options?.NS_TO_MS)
	console.log('')
}
