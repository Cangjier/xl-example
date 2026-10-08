// xl:title 二进制编码：位打包、位读取、校验和
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class BitWriter {
  private bytes: number[] = [];
  private current = 0;
  private used = 0;
  write(value: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i--) {
      this.current = (this.current << 1) | ((value >> i) & 1);
      this.used += 1;
      if (this.used === 8) { this.bytes.push(this.current); this.current = 0; this.used = 0; }
    }
  }
  finish(): number[] {
    if (this.used > 0) this.bytes.push(this.current << (8 - this.used));
    return this.bytes.slice();
  }
}
class BitReader {
  private at = 0;
  constructor(private bytes: number[]) {}
  read(bits: number): number {
    let value = 0;
    for (let i = 0; i < bits; i++) {
      const byte = this.bytes[this.at >> 3] ?? 0;
      const bit = (byte >> (7 - (this.at & 7))) & 1;
      value = (value << 1) | bit;
      this.at += 1;
    }
    return value;
  }
  get consumed(): number { return this.at; }
}
const w = new BitWriter();
const records: [number, number][] = [[3, 3], [17, 5], [1, 1], [255, 8], [0, 4]];
for (const [v, bits] of records) w.write(v, bits);
const bytes = w.finish();
console.log(bytes.length, bytes.map((b) => b.toString(16).padStart(2, "0")).join(" "));
const r = new BitReader(bytes);
console.log(records.map(([, bits]) => r.read(bits)).join(","));
console.log(r.consumed);
function checksum(data: number[]): number {
  let sum = 0;
  for (const b of data) sum = (sum + b) & 0xff;
  return sum;
}
console.log(checksum(bytes), checksum([]), checksum([255, 255]));
