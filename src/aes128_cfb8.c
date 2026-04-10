#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include "aes128_cfb8.h"

#if defined(AES_ARM64)
  #include <arm_neon.h>
#elif defined(AES_X86)
  #include <wmmintrin.h>
  #include <smmintrin.h>
#endif
#define DEBUG 1
// pre-computed t-table
static const uint8_t rcon[11] = {
  0x00, 0x01, 0x02, 0x04, 0x08, 0x10,
  0x20, 0x40, 0x80, 0x1b, 0x36
};

static const uint8_t sbox[256] = {
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
};

static void aes128_key_expand(const uint8_t key[16], uint32_t rk[44]) {
  int i = 0;
  uint32_t t;

  load_key:
    if (i >= 4) goto expand;
    rk[i] =
      ((uint32_t)key[4*i] << 24)  | ((uint32_t)key[4*i+1] << 16) |
      ((uint32_t)key[4*i+2] << 8) |  (uint32_t)key[4*i+3];
    i++;
    goto load_key;

  expand:
    if (i >= 44) goto done;
    t = rk[i - 1];
    if ((i & 3) != 0) goto no_sub;

    t =
    ((uint32_t)sbox[(t >> 16) & 0xff] << 24) |
    ((uint32_t)sbox[(t >>  8) & 0xff] << 16) |
    ((uint32_t)sbox[ t        & 0xff] <<  8) |
    (uint32_t)sbox[(t >> 24)  & 0xff];
    t ^= (uint32_t)rcon[i / 4] << 24;

  no_sub:
    rk[i] = rk[i - 4] ^ t;
    i++;
    goto expand;

  done: return;
}

#ifdef AES_SOFT

static uint32_t Te0[256], Te1[256], Te2[256], Te3[256];
static uint32_t Te4[256];

static inline uint8_t xtime(uint8_t x) {
  return (uint8_t)((x << 1) ^ ((x >> 7) * 0x1b));
}

static void init_tables(void) {
  for (int i = 0; i < 256; i++) {
    uint8_t s = sbox[i];
    uint8_t s2 = xtime(s);
    uint8_t s3 = s2 ^ s;
    Te0[i] =
      ((uint32_t)s2 << 24) | ((uint32_t)s << 16) |
      ((uint32_t)s << 8)   |  (uint32_t)s3;
    Te1[i] =
    ((uint32_t)s3 << 24) | ((uint32_t)s2 << 16) |
    ((uint32_t)s << 8)   |  (uint32_t)s;
    Te2[i] =
      ((uint32_t)s << 24)  | ((uint32_t)s3 << 16) |
      ((uint32_t)s2 << 8)  |  (uint32_t)s;
    Te3[i] =
      ((uint32_t)s << 24)  | ((uint32_t)s << 16) |
      ((uint32_t)s3 << 8)  |  (uint32_t)s2;
    Te4[i] =
      ((uint32_t)s << 24) | ((uint32_t)s << 16) |
      ((uint32_t)s << 8)  |  (uint32_t)s;
  }
}

static inline uint8_t aes128_encrypt_first_byte(uint64_t hi, uint64_t lo, const uint32_t rk[44]) {
  uint32_t s0, s1, s2, s3, t0, t1, t2, t3;

  s0 = (uint32_t)(hi >> 32);
  s1 = (uint32_t)hi;
  s2 = (uint32_t)(lo >> 32);
  s3 = (uint32_t)lo;

  s0 ^= rk[0]; s1 ^= rk[1]; s2 ^= rk[2]; s3 ^= rk[3];

  #define AES_ROUND(r) do {                                                                   \
    const uint32_t *k = rk + (r) * 4;                                                         \
    t0 = Te0[(s0>>24)&0xff] ^ Te1[(s1>>16)&0xff] ^ Te2[(s2>>8)&0xff] ^ Te3[s3&0xff] ^ k[0];   \
    t1 = Te0[(s1>>24)&0xff] ^ Te1[(s2>>16)&0xff] ^ Te2[(s3>>8)&0xff] ^ Te3[s0&0xff] ^ k[1];   \
    t2 = Te0[(s2>>24)&0xff] ^ Te1[(s3>>16)&0xff] ^ Te2[(s0>>8)&0xff] ^ Te3[s1&0xff] ^ k[2];   \
    t3 = Te0[(s3>>24)&0xff] ^ Te1[(s0>>16)&0xff] ^ Te2[(s1>>8)&0xff] ^ Te3[s2&0xff] ^ k[3];   \
    s0 = t0; s1 = t1; s2 = t2; s3 = t3;                                                       \
  } while(0)

  AES_ROUND(1); AES_ROUND(2); AES_ROUND(3);
  AES_ROUND(4); AES_ROUND(5); AES_ROUND(6);
  AES_ROUND(7); AES_ROUND(8); AES_ROUND(9);

  #undef AES_ROUND

  return sbox[(s0 >> 24) & 0xff] ^ (uint8_t)(rk[40] >> 24);
}

static void aes128_cfb8_encrypt(
  const uint8_t *in, uint8_t *out,
  size_t len, const uint32_t rk[44], uint8_t iv[16]
) {
  uint64_t hi, lo;
  memcpy(&hi, iv, 8);
  memcpy(&lo, iv + 8, 8);
  #if __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
    hi = __builtin_bswap64(hi);
    lo = __builtin_bswap64(lo);
  #endif

  for (size_t i = 0; i < len; i++) {
    uint8_t eb = aes128_encrypt_first_byte(hi, lo, rk);
    uint8_t cb = in[i] ^ eb;
    out[i] = cb;
    hi = (hi << 8) | (lo >> 56);
    lo = (lo << 8) | cb;
  }
}

#endif

#ifdef AES_ARM64

__attribute((target("aes")))
static void aes128_cfb8_decrypt(
  const uint8_t* in, uint8_t * out,
  size_t len, const uint8_t rk_bytes[176], uint8_t iv[16]
) {
  uint8x16_t k0  = vld1q_u8(rk_bytes +   0);
  uint8x16_t k1  = vld1q_u8(rk_bytes +  16);
  uint8x16_t k2  = vld1q_u8(rk_bytes +  32);
  uint8x16_t k3  = vld1q_u8(rk_bytes +  48);
  uint8x16_t k4  = vld1q_u8(rk_bytes +  64);
  uint8x16_t k5  = vld1q_u8(rk_bytes +  80);
  uint8x16_t k6  = vld1q_u8(rk_bytes +  96);
  uint8x16_t k7  = vld1q_u8(rk_bytes + 112);
  uint8x16_t k8  = vld1q_u8(rk_bytes + 128);
  uint8x16_t k9  = vld1q_u8(rk_bytes + 144);
  uint8x16_t k10 = vld1q_u8(rk_bytes + 160);

  for (size_t i = 0; i < len; i++) {
    uint8x16_t state = vld1q_u8(iv);

    state = vaesmcq_u8(vaeseq_u8(state, k0));
    state = vaesmcq_u8(vaeseq_u8(state, k1));
    state = vaesmcq_u8(vaeseq_u8(state, k2));
    state = vaesmcq_u8(vaeseq_u8(state, k3));
    state = vaesmcq_u8(vaeseq_u8(state, k4));
    state = vaesmcq_u8(vaeseq_u8(state, k5));
    state = vaesmcq_u8(vaeseq_u8(state, k6));
    state = vaesmcq_u8(vaeseq_u8(state, k7));
    state = vaesmcq_u8(vaeseq_u8(state, k8));
    state = veorq_u8(vaeseq_u8(state, k9), k10);

    uint8_t enc_byte = vgetq_lane_u8(state, 0);
    uint8_t cb = in[i] ^ enc_byte;

    out[i] = cb;
    memmove(iv, iv + 1, 15);
    iv[15] = in[i];
  }
}

__attribute__((target("aes")))
static void aes128_cfb8_encrypt(
  const uint8_t *in, uint8_t *out,
  size_t len, const uint8_t rk_bytes[176], uint8_t iv[16]
) {
  uint8x16_t k0  = vld1q_u8(rk_bytes +   0);
  uint8x16_t k1  = vld1q_u8(rk_bytes +  16);
  uint8x16_t k2  = vld1q_u8(rk_bytes +  32);
  uint8x16_t k3  = vld1q_u8(rk_bytes +  48);
  uint8x16_t k4  = vld1q_u8(rk_bytes +  64);
  uint8x16_t k5  = vld1q_u8(rk_bytes +  80);
  uint8x16_t k6  = vld1q_u8(rk_bytes +  96);
  uint8x16_t k7  = vld1q_u8(rk_bytes + 112);
  uint8x16_t k8  = vld1q_u8(rk_bytes + 128);
  uint8x16_t k9  = vld1q_u8(rk_bytes + 144);
  uint8x16_t k10 = vld1q_u8(rk_bytes + 160);


  for (size_t i = 0; i < len; i++) {
    uint8x16_t state = vld1q_u8(iv);

    state = vaesmcq_u8(vaeseq_u8(state, k0));
    state = vaesmcq_u8(vaeseq_u8(state, k1));
    state = vaesmcq_u8(vaeseq_u8(state, k2));
    state = vaesmcq_u8(vaeseq_u8(state, k3));
    state = vaesmcq_u8(vaeseq_u8(state, k4));
    state = vaesmcq_u8(vaeseq_u8(state, k5));
    state = vaesmcq_u8(vaeseq_u8(state, k6));
    state = vaesmcq_u8(vaeseq_u8(state, k7));
    state = vaesmcq_u8(vaeseq_u8(state, k8));
    state = veorq_u8(vaeseq_u8(state, k9), k10);

    uint8_t enc_byte = vgetq_lane_u8(state, 0);
    uint8_t cb = in[i] ^ enc_byte;

    out[i] = cb;
    memmove(iv, iv + 1, 15);
    iv[15] = cb;
  }
}

#endif

#ifdef AES_X86

static void aes128_key_expand_ni(const uint8_t key[16], __m128i rk[11]) {
  rk[0] = _mm_loadu_si128((const __m128i *)key);

  #define EXPAND_ROUND(i, rcon_val) do {                               \
    __m128i t = rk[(i)-1];                                             \
    __m128i gen = _mm_aeskeygenassist_si128(t, (rcon_val));            \
    gen = _mm_shuffle_epi32(gen, 0xff);                                \
    t = _mm_xor_si128(t, _mm_slli_si128(t, 4));                        \
    t = _mm_xor_si128(t, _mm_slli_si128(t, 4));                        \
    t = _mm_xor_si128(t, _mm_slli_si128(t, 4));                        \
    rk[(i)] = _mm_xor_si128(t, gen);                                   \
  } while(0)

  EXPAND_ROUND( 1, 0x01); EXPAND_ROUND( 2, 0x02);
  EXPAND_ROUND( 3, 0x04); EXPAND_ROUND( 4, 0x08);
  EXPAND_ROUND( 5, 0x10); EXPAND_ROUND( 6, 0x20);
  EXPAND_ROUND( 7, 0x40); EXPAND_ROUND( 8, 0x80);
  EXPAND_ROUND( 9, 0x1b); EXPAND_ROUND(10, 0x36);

  #undef EXPAND_ROUND
}

static void aes128_cfb8_encrypt(
  const uint8_t *in, uint8_t *out,
  size_t len, const __m128i rk[11], uint8_t iv[16]
) {


  for (size_t i = 0; i < len; i++) {
    __m128i state = _mm_loadu_si128((const __m128i *)iv);

    state = _mm_aesenc_si128(_mm_xor_si128(state, rk[0]), rk[1]);
    state = _mm_aesenc_si128(state, rk[2]);
    state = _mm_aesenc_si128(state, rk[3]);
    state = _mm_aesenc_si128(state, rk[4]);
    state = _mm_aesenc_si128(state, rk[5]);
    state = _mm_aesenc_si128(state, rk[6]);
    state = _mm_aesenc_si128(state, rk[7]);
    state = _mm_aesenc_si128(state, rk[8]);
    state = _mm_aesenc_si128(state, rk[9]);
    state = _mm_aesenclast_si128(state, rk[10]);

    uint8_t enc_byte = (uint8_t)_mm_extract_epi8(state, 0);
    uint8_t cb = in[i] ^ enc_byte;

    out[i] = cb;
    memmove(iv, iv + 1, 15);
    iv[15] = cb;
  }
}

#endif

// bench code
static double now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000.0 + ts.tv_nsec / 1e6;
}

static int cmp_double(const void *a, const void *b) {
  double da = *(const double *)a, db = *(const double *)b;
  return (da > db) - (da < db);
}

struct ctx * get_ctx(uint8_t * key, uint8_t * iv) {
  struct ctx * ctx  = malloc(sizeof(struct ctx));
  if (!ctx) perror("malloc");

  memcpy(ctx->iv, iv, 16);
  memcpy(ctx->key, key, 16);

  uint32_t rk32[44] = {0};
  aes128_key_expand(ctx->key, rk32);
  #ifdef AES_ARM64
    // 8 * 176 b
    for (int i = 0; i < 44; i+=4) {
        uint32x4_t vec32 = vld1q_u32(rk32 + i);
        uint8x16_t vec8 = vreinterpretq_u8_u32(vec32);
        vec8 = vrev32q_u8(vec8);
        vst1q_u8((*ctx).rk + i*4, vec8);
    }

  #elif defined(AES_X86)
    // 11 * 128
    uint8_t key_bytes[16];
    for (int i = 0; i < 4; i++) {
      key_bytes[i*4+0] = (uint8_t)(rk32[i] >> 24);
      key_bytes[i*4+1] = (uint8_t)(rk32[i] >> 16);
      key_bytes[i*4+2] = (uint8_t)(rk32[i] >> 8);
      key_bytes[i*4+3] = (uint8_t)(rk32[i]);
    }
    aes128_key_expand_ni(key_bytes, ctx->rk);
  #endif
  return ctx;
}

void destroy_ctx(struct ctx * ctx) {
    #ifdef DEBUG
        puts("context destroyed");
    #endif
    free(ctx);
}

/* void (*JSTypedArrayBytesDeallocator)(void *bytes, void *deallocatorContext); */
void destroy_data(void * data, void * ctx) {
    #ifdef DEBUG
        puts("data freed");
    #endif
    (void)ctx;
    free(data);
}
JSTypedArrayBytesDeallocator get_deallocator () {
    return destroy_data;
}

uint8_t * encrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx) {
    #ifdef DEBUG
        printf("encrypting %u bytes\n", length);
    #endif
  #ifdef AES_SOFT
    init_tables();
  #endif

  uint8_t *scratch = malloc(length);
  if (!scratch) { perror("malloc"); return NULL; }

  aes128_cfb8_encrypt(data, scratch, length, ctx->rk, ctx->iv);

  return scratch;
}
uint8_t * decrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx) {
    #ifdef DEBUG
        printf("decrypting %u bytes\n", length);
    #endif
  #ifdef AES_SOFT
    init_tables();
  #endif

  uint8_t *scratch = malloc(length);
  if (!scratch) { perror("malloc"); return NULL; }

  aes128_cfb8_decrypt(data, scratch, length, ctx->rk, ctx->iv);

  return scratch;
}
