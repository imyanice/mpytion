#if defined(__aarch64__) && (defined(__ARM_FEATURE_CRYPTO) || defined(__ARM_FEATURE_AES) || defined(__APPLE__))
  #define AES_ARM64 1
  #include <arm_neon.h>
#elif defined(__x86_64__) && defined(__AES__)
  #define AES_X86 1
  #include <wmmintrin.h>
  #include <smmintrin.h>
#else
  #define AES_SOFT 1
#endif

struct ctx {
  #ifdef AES_ARM64
  uint8_t rk[176];
  #elif defined(AES_x86)
  __m128i rk[11];
  #endif

  uint8_t iv[16];
  uint8_t key[16];
};
typedef void (*JSTypedArrayBytesDeallocator)(void *bytes, void *deallocatorContext);
uint8_t * encrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx);
uint8_t * decrypt_ffi(uint8_t * data, uint32_t length, struct ctx * ctx);
void destroy_data(void * data, void * ctx);
void destroy_ctx(struct ctx * ctx);
struct ctx * get_ctx(uint8_t*iv, uint8_t*key);
