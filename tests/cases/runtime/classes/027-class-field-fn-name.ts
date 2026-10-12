// xl:title 类字段里的箭头从字段名取名
// xl:round 330
// xl:judge stdout
// xl:end

class K {
  f = () => 1;
  #n = () => 2;
  nName(): string {
    return this.#n.name;
  }
}
const k = new K();
console.log(k.f.name, k.nName());
