export class LimitedReadableStream extends TransformStream<Uint8Array> {
  constructor(byteLength: number) {
    let n = 0;
    super({
      transform(chunk, controller) {
        const chunkLimited = chunk.subarray(0, byteLength - n);
        controller.enqueue(chunkLimited);
        n += chunkLimited.byteLength;
        if (n >= byteLength) {
          controller.terminate();
        }
      },
    });
  }
}
