export * from "./public-key";
export * from "./private-key";

export type RsaModulusLength = 1024 | 2048 | 4096;
export const RSA_MODULUS_LENGTHS: readonly RsaModulusLength[] = [1024, 2048, 4096];
