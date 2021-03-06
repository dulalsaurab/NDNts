import { Data, Interest, LLSign, Nack, TT as l3TT } from "@ndn/packet";
import { Decoder, Encoder, printTT, toHex } from "@ndn/tlv";

import { LpPacket, TT } from "./mod";
import { PitToken } from "./pit-token";

export class LpService {
  public rx = (iterable: AsyncIterable<Decoder.Tlv>) => {
    return this.rx_(iterable);
  };

  private async *rx_(iterable: AsyncIterable<Decoder.Tlv>): AsyncIterable<LpService.L3Pkt|LpService.RxError> {
    for await (const tlv of iterable) {
      yield* this.decode(tlv);
    }
  }

  private *decode(tlv: Decoder.Tlv) {
    try {
      const { type, decoder } = tlv;
      if (type !== TT.LpPacket) {
        return yield this.decodeL3(tlv);
      }

      const lpp = decoder.decode(LpPacket);
      if (!lpp.fragment) {
        return;
      }

      let l3pkt = this.decodeL3(new Decoder(lpp.fragment).read());
      if (lpp.nack) {
        if (l3pkt instanceof Interest) {
          l3pkt = new Nack(l3pkt, lpp.nack);
        } else {
          throw new Error("Nack can only appear on Interest");
        }
      }
      PitToken.set(l3pkt, lpp.pitToken);
      yield l3pkt;
    } catch (err) {
      yield new LpService.RxError(err, tlv.tlv);
    }
  }

  private decodeL3({ type, decoder }: Decoder.Tlv): LpService.L3Pkt {
    switch (type) {
      case l3TT.Interest:
        return decoder.decode(Interest);
      case l3TT.Data:
        return decoder.decode(Data);
      default:
        throw new Error(`unrecognized TLV-TYPE ${printTT(type)} as L3Pkt`);
    }
  }

  public tx = (iterable: AsyncIterable<LpService.L3Pkt>) => {
    return this.tx_(iterable);
  };

  private async *tx_(iterable: AsyncIterable<LpService.L3Pkt>): AsyncIterable<Uint8Array|LpService.TxError> {
    for await (const pkt of iterable) {
      yield* this.encode(pkt);
    }
  }

  private async *encode(pkt: LpService.L3Pkt) {
    try {
      switch (true) {
        case pkt instanceof Interest:
        case pkt instanceof Data: {
          const l3pkt = pkt as Interest|Data;
          await l3pkt[LLSign.PROCESS]();
          const pitToken = PitToken.get(l3pkt);
          if (!pitToken) {
            return yield Encoder.encode(l3pkt);
          }
          const lpp = new LpPacket();
          lpp.pitToken = pitToken;
          lpp.fragment = Encoder.encode(l3pkt);
          return yield Encoder.encode(lpp);
        }
        case pkt instanceof Nack: {
          const nack = pkt as Nack;
          const lpp = new LpPacket();
          lpp.pitToken = PitToken.get(nack);
          lpp.nack = nack.header;
          lpp.fragment = Encoder.encode(nack.interest);
          return yield Encoder.encode(lpp);
        }
      }
    } catch (err) {
      return yield new LpService.TxError(err, pkt);
    }
  }
}

export namespace LpService {
  export type L3Pkt = Interest|Data|Nack;

  export class RxError extends Error {
    constructor(inner: Error, public readonly packet: Uint8Array) {
      super(`${inner.message} ${toHex(packet)}`);
    }
  }

  export class TxError extends Error {
    constructor(inner: Error, public readonly packet: L3Pkt) {
      super(`${inner.message} ${packet instanceof Nack ? packet.interest.name : packet.name}`);
    }
  }
}
