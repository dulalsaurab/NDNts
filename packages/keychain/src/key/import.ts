import { Name } from "@ndn/name";
import { DERElement } from "asn1-ts";

import { EcPrivateKey, EcPublicKey } from "./ec";
import { StoredKey } from "./internal";
import { PublicKey } from "./public-key";
import { RsaPrivateKey, RsaPublicKey } from "./rsa";

export async function loadFromStored(name: Name, stored: StoredKey) {
  switch (stored.type) {
    case "EC":
      return EcPrivateKey.loadFromStored(name, stored);
    case "RSA":
      return RsaPrivateKey.loadFromStored(name, stored);
  }
  throw new Error(`unknown stored type ${stored.type}`);
}

export async function importSpki(name: Name, spki: Uint8Array): Promise<PublicKey> {
  const der = new DERElement();
  der.fromBytes(spki);
  const {
    sequence: [
      { sequence: [{ objectIdentifier: { dotDelimitedNotation: algoOid } }] },
    ],
  } = der;

  switch (algoOid) {
    case "1.2.840.10045.2.1":
      return EcPublicKey.importSpki(name, spki, der);
    case "1.2.840.113549.1.1.1":
      return RsaPublicKey.importSpki(name, spki);
  }
  /* istanbul ignore next */
  throw new Error(`unknown algorithm ${algoOid}`);
}
