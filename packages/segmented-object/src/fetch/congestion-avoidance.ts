import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";

interface Events {
  cwndupdate: number;
}

type Emitter = StrictEventEmitter<EventEmitter, Events>;

const CWND = Symbol("CongestionAvoidance.CWND");

/** Congestion avoidance algorithm. */
export abstract class CongestionAvoidance extends (EventEmitter as new() => Emitter) {
  private [CWND]: number;

  constructor(initialCwnd: number) {
    super();
    this[CWND] = initialCwnd;
  }

  public get cwnd() { return this[CWND]; }

  protected updateCwnd(v: number) {
    this[CWND] = v;
    this.emit("cwndupdate", v);
  }

  public abstract increase(now: number, rtt: number): void;
  public abstract decrease(now: number): void;
}
