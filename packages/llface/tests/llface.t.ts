import { Interest, Data } from "@ndn/l3pkt";
import { PassThrough } from "readable-stream";
import { ObjectReadableMock, ObjectWritableMock } from "stream-mock";

import { LLFace, DatagramTransport } from "../src";
import duplexify = require("duplexify");

test("simple", done => {
  expect.hasAssertions();

  const connAB = new PassThrough({ objectMode: true });
  const connBA = new PassThrough({ objectMode: true });
  const faceA = new LLFace(new DatagramTransport(duplexify.obj(connAB, connBA)));
  const faceB = new LLFace(new DatagramTransport(duplexify.obj(connBA, connAB)));

  process.nextTick(() => {
    faceA.sendInterest(new Interest("/A"));
  });

  faceB.recvInterest.add((interest) => {
    expect(interest.name.toString()).toBe("/A");

    const data = new Data("/A", new Uint8Array([0xC0, 0xC1]));
    faceB.sendData(data);
  });

  faceA.recvData.add((data) => {
    expect(data.name.toString()).toBe("/A");
    expect(data.content).toHaveLength(2);
    process.nextTick(() => {
      expect(faceA.close());
    });
  });

  faceA.rxError.add(async (error) => {
    expect(error.message).toEqual(expect.stringContaining("closed"));
    expect(connAB.writableFinished).toBeFalsy();
    expect(connBA.writableFinished).toBeFalsy();
    await expect(faceA.close()).resolves.toBeUndefined();
    done();
  });
});

test("error on unknown TLV-TYPE", done => {
  expect.hasAssertions();

  const rxRemote = new ObjectReadableMock([
    Buffer.from([0xF0, 0x00]),
  ]);
  const face = new LLFace(new DatagramTransport(duplexify.obj(new ObjectWritableMock(), rxRemote)));

  face.rxError.add(async () => {
    await expect(face.close()).resolves.toBeUndefined();
    done();
  });
});
