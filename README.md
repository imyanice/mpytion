# aes 128 cfb8 mode decryption / encryption

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
