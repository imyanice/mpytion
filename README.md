# aes 128 cfb8 mode decryption / encryption

why?

> bun doesnt provide native aes 128 cfb8 decryption/encryption because it doesnt expose boringssl's methods.
> see [oven-sh/bun/issues/28521](https://github.com/oven-sh/bun/issues/28521)

why cfb8?

> minecraft uses aes 128 cfb8 as the encryption method for its packets.

## benches

> ~ 0.20ms faster on average

benched on mac m1

```
buffered file in memory:
2000 runs w/ 3237.07 ms total
t: (µ ± σ) = 1.62ms ± 0.02ms
p50 = 1.61ms | p99 = 1.69ms
     1.58ms...1.83ms
```

<details>

<summary>Intel i5 iMac - 2019</summary>

```
buffered file in memory:
2000 runs w/ 3872.63 ms total
t: (µ ± σ) = 1.94ms ± 0.03ms
p50 = 1.93ms | p99 = 2.02ms
      1.93ms...3.12ms
```

</details>

<details>

<summary>AMD Ryzen 7 7800x3d - Windows</summary>

```
buffered file in memory:
2000 runs w/ 3273.25 ms total
t: (µ ± σ) = 1.64ms ± 0.13ms
p50 = 1.57ms | p99 = 1.97ms
      1.51ms...2.10ms
```

</details>

<details>
<summary>MacBook Neo - A18 Pro</summary>

```
buffered file in memory:
2000 runs w/ 1931.58 ms total
t: (µ ± σ) = 0.97 ± 0.01ms
p50 = 0.96ms | p99 = 1.01ms
      0.95ms...1.15ms
```

</details>

v.s.

```
node buffered file in memory:
2000 runs w/ 3645.07 ms total
t: (µ ± σ) = 1.82ms ± 0.03ms
p50 = 1.81ms | p99 = 1.93ms
     1.77ms...2.15ms
```

> [!WARNING]
> disclaimer: these values are to be taken with a grain of salt (accounts for `createReadStream` too)!

```
transform stream:
2000 runs w/ 7914.54 ms total
t: (µ ± σ) = 3.96ms ± 3.75ms
p50 = 1.76ms | p99 = 13.57ms
      1.71ms...13.87ms
```

v.s.

```
node transform stream:
2000 runs w/ 10332.76 ms total
t: (µ ± σ) = 5.17ms ± 1.97ms
p50 = 5.13ms | p99 = 9.24ms
      2.05ms...13.76ms
```

## credits

[@theMackabu](https://github.com/theMackabu) for writing the initial [implementation](bench/aes128_cfb8-bench.c).
