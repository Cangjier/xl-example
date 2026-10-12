// xl:title 类里的 getter / setter / static getter
// xl:judge stdout
// xl:end

class Temp {
  private c = 0;
  get celsius(): number { return this.c; }
  set celsius(v: number) { this.c = v; }
  get fahrenheit(): number { return this.c * 9 / 5 + 32; }
}
const t = new Temp();
t.celsius = 100;
console.log(t.celsius, t.fahrenheit);
