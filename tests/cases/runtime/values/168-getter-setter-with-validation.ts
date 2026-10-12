// xl:title 访问器里的校验与副作用
// xl:round 331
// xl:judge stdout
// xl:end

class Temperature {
  private celsius = 0;
  private reads = 0;
  get value(): number {
    this.reads = this.reads + 1;
    return this.celsius;
  }
  set value(next: number) {
    if (next < -273.15) throw new RangeError("below absolute zero");
    this.celsius = next;
  }
  get readCount(): number {
    return this.reads;
  }
}
const t = new Temperature();
t.value = 25;
console.log(t.value, t.value, t.readCount);
try {
  t.value = -300;
} catch (e) {
  console.log((e as Error).name, (e as Error).message.slice(0, 5));
}
console.log(t.value);
