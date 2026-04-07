
test: src/aes128_cfb8.c src/main.c
	clang src/aes128_cfb8.c src/main.c -o dist/aes128_cfb8 -lm -march=native -fsanitize=address -g
