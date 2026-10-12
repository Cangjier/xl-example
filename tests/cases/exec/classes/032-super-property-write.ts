// xl:title super 上的写：落在当前实例上，起点是父原型
// xl:round 323
// xl:judge stdout
// xl:end

class Base { value = 1; }
class Sub extends Base {
  set value(v: number) { super.value = v * 2; }
  get value() { return super.value + 1; }
}
const s = new Sub();
s.value = 5;
console.log(s.value);
