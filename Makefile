lib:
	clang -O3 -march=native -dynamiclib -o dist/libaes128_cfb8.dylib src/aes128_cfb8.c -lm -fno-omit-frame-pointer 2>&1
test_transform: lib
	cd tests && TARGET=macos ARCH=aarch64 bun ./test.transform.ts
test_raw: lib
	cd tests && TARGET=macos ARCH=aarch64  bun ./test.raw.ts
bun_bench: lib
	bun bench/bench.ts
node_bench:
	bun build bench/node-transform.ts --outdir dist/node-bench --target=node --format=cjs
	node --expose-gc ./dist/node-bench/node-transform.js
.SILENT:
bench: node_bench bun_bench

build_bench: lib
	bun build bench/bench.ts --outfile=dist/bench_bun_arm64 --compile --define 'process.env.TARGET="macos"' --define 'process.env.ARCH="aarch64"'
