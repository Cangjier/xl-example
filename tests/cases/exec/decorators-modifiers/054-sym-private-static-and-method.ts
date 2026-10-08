// xl:title 私有静态成员与私有方法
// xl:round 678
// xl:judge stdout
// xl:end

class C {
  static #count = 0;
  #secret = "s";
  static bump(): number {
    C.#count += 1;
    return C.#count;
  }
  #reveal(): string {
    return this.#secret;
  }
  show(): string {
    return this.#reveal();
  }
}
console.log(C.bump(), C.bump());
console.log(new C().show());
