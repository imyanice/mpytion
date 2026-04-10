lib:
	clang -O3 -march=native -dynamiclib -o dist/libaes128_cfb8.dylib src/aes128_cfb8.c -lm -fno-omit-frame-pointer 2>&1
test_transform: lib
	cd tests && bun ./test.transform.ts
test_raw: lib
	cd tests && bun ./test.raw.ts
bun_bench: lib
	bun bench/bench.ts
node_bench:
	bun build bench/node-transform.ts --outdir dist/node-bench --target=node --format=cjs
	node --expose-gc ./dist/node-bench/node-transform.js
.SILENT:
bench: node_bench bun_bench
