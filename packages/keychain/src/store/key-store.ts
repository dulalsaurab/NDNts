import { Name } from "@ndn/packet";

import { loadFromStored } from "../key/load";
import { StoredKey } from "../key/save";
import { PrivateKey, PublicKey } from "../mod";
import { StoreBase } from "./store-base";

export class KeyStore extends StoreBase<StoredKey> {
  public async get(name: Name): Promise<[PrivateKey, PublicKey]> {
    const stored = await this.getImpl(name);
    return loadFromStored(name, stored);
  }

  public async insert(name: Name, stored: StoredKey): Promise<void> {
    await this.insertImpl(name, stored);
  }
}
