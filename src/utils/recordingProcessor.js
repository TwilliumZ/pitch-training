// @ts-nocheck -- AudioWorkletGlobalScope runs outside the DOM/main thread.
class RecordingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      for (const sample of channel) {
        this.buffer[this.offset++] = sample;
        if (this.offset === this.buffer.length) {
          this.port.postMessage(this.buffer, [this.buffer.buffer]);
          this.buffer = new Float32Array(2048);
          this.offset = 0;
        }
      }
    }
    // 出力は無音のまま。マイクをスピーカーへ返さない。
    return true;
  }
}
registerProcessor('recording-processor', RecordingProcessor);
