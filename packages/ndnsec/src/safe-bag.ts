import { Certificate, EcPrivateKey, EcPublicKey, KeyChain, RsaPrivateKey, RsaPublicKey, saveKey } from "@ndn/keychain";
import { Data, SigType, TT as l3TT } from "@ndn/packet";
import { Decoder, EvDecoder } from "@ndn/tlv";
import { createPrivateKey } from "crypto";

import { TT } from "./an";

interface SafeBagFields {
  certificate?: Certificate;
  encryptedKey?: Uint8Array;
}

const EVD = new EvDecoder<SafeBagFields>("SafeBag", TT.SafeBag)
  .add(l3TT.Data, (t, { decoder }) => t.certificate = new Certificate(decoder.decode(Data)))
  .add(TT.EncryptedKeyBag, (t, { value }) => t.encryptedKey = value);

/** ndn-cxx private key export. */
export class SafeBag {
  public static decodeFrom(decoder: Decoder): SafeBag {
    const { certificate, encryptedKey } = EVD.decode({} as SafeBagFields, decoder);
    if (!certificate || !encryptedKey) {
      throw new Error("invalid SafeBag");
    }
    return new SafeBag(certificate, encryptedKey);
  }

  constructor(public readonly certificate: Certificate, public readonly encryptedKey: Uint8Array) {
  }

  /** Decrypt private key and return unencrypted PKCS8 format. */
  public decryptKey(passphrase: string): Uint8Array {
    const key = createPrivateKey({
      key: Buffer.from(this.encryptedKey),
      format: "der",
      type: "pkcs8",
      passphrase,
    });
    return key.export({ type: "pkcs8", format: "der" });
  }

  /**
   * Save private key and public key to KeyChain.
   * @param passphrase SafeBag passphrase.
   * @param keyChain destination KeyChain.
   */
  public async saveKeyPair(passphrase: string, keyChain: KeyChain): Promise<void> {
    const pub = await Certificate.loadPublicKey(this.certificate);
    switch (pub.sigType) {
      case SigType.Sha256WithEcdsa: {
        const curve = (pub as EcPublicKey).curve;
        return this.saveImpl(passphrase, keyChain, pub as EcPublicKey,
          EcPrivateKey.makeStoredKeyBase(curve), EcPrivateKey.makeWebCryptoImportParams(curve));
      }
      case SigType.Sha256WithRsa:
        return this.saveImpl(passphrase, keyChain, pub as RsaPublicKey,
          RsaPrivateKey.makeStoredKeyBase(), RsaPrivateKey.makeWebCryptoImportParams());
      default:
        /* istanbul ignore next */
        throw new Error(`unknown SigType ${pub.sigType}`);
    }
  }

  private async saveImpl<
    Public extends EcPublicKey|RsaPublicKey,
    StoredBase extends { type: string },
    Param extends EcKeyImportParams|RsaHashedImportParams,
  >(
      passphrase: string, keyChain: KeyChain, { name, key: publicKey }: Public,
      base: StoredBase, params: Param,
  ): Promise<void> {
    await saveKey(name, base, params, keyChain,
      async (extractable, crypto): Promise<CryptoKeyPair> => {
        const pkcs8 = this.decryptKey(passphrase);
        return {
          privateKey: await crypto.subtle.importKey("pkcs8", pkcs8, params, extractable, ["sign"]),
          publicKey,
        };
      });
  }
}
