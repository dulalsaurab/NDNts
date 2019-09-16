import { Decoder } from "../src";
import "../src/expect";

test("simple", () => {
  const decoder = new Decoder(Buffer.from([
    0x01, 0x00,
    0xFD, 0x04, 0x09, 0x02, 0xB0, 0xB1,
    0xFE, 0x00, 0x02, 0x04, 0x09, 0x03, 0xC0, 0x01, 0xC2,
  ]));

  {
    let { type, length, value, tlv, size } = decoder.read();
    expect(type).toBe(0x01);
    expect(length).toBe(0);
    expect(value).toEqualUint8Array([]);
    expect(tlv).toEqualUint8Array([0x01, 0x00]);
    expect(size).toBe(2);
  }

  {
    let { type, value } = decoder.read();
    expect(type).toBe(0x0409);
    expect(value).toEqualUint8Array([0xB0, 0xB1]);
  }

  {
    let { type, vd } = decoder.read();
    expect(type).toBe(0x00020409);
    let { type: type1, value } = vd.read();
    expect(type1).toBe(0xC0);
    expect(value).toEqualUint8Array([0xC2]);
    expect(vd.eof).toBeTruthy();
  }

  expect(decoder.eof).toBeTruthy();
});

test("from", () => {
  const decoder = new Decoder(new Uint8Array());
  expect(Decoder.isInput(decoder)).toBeTruthy();
  expect(Decoder.from(decoder)).toBe(decoder);

  const wire = new Uint8Array();
  expect(Decoder.isInput(wire)).toBeTruthy();
  expect(Decoder.from(wire)).toBeInstanceOf(Decoder);

  expect(Decoder.isInput({})).toBeFalsy();
  expect(() => { Decoder.from({} as any); }).toThrow();
});

test("error on incomplete VAR-NUMBER", () => {
  let decoder = new Decoder(new Uint8Array([]));
  expect(() => { decoder.read() }).toThrow();

  decoder = new Decoder(new Uint8Array([0xFD, 0x01]));
  expect(() => { decoder.read() }).toThrow();

  decoder = new Decoder(new Uint8Array([0xFE, 0x00, 0x01, 0x02]));
  expect(() => { decoder.read() }).toThrow();
});

test("error on VAR-NUMBER-9", () => {
  const decoder = new Decoder(new Uint8Array([
    0x01, 0xFF, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0xA0
  ]));
  expect(() => { decoder.read() }).toThrow();
});

test("error on incomplete TLV-VALUE", () => {
  const decoder = new Decoder(new Uint8Array([
    0x01, 0x05, 0xA0, 0xA1, 0xA2
  ]));
  expect(() => { decoder.read() }).toThrow();
});