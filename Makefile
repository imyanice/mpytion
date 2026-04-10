lib:
	clang -O3 -march=native -dynamiclib -o dist/libaes128_cfb8.dylib src/aes128_cfb8.c -lm -fno-omit-frame-pointer 2>&1
test_transform: lib
	cd tests && bun ./test.transform.ts
test_raw: lib
	cd tests && bun ./test.raw.ts
