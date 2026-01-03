import { Buffer } from "buffer";

if (typeof Buffer !== "undefined" && !globalThis.Buffer) {
  (globalThis as any).Buffer = Buffer;
}
