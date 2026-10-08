// xl:title 降级层：方法里的 `await` + 逻辑
// xl:round 739
// xl:judge stdout
// xl:end
class A {
  async m(): Promise<any> { return await Promise.resolve(0) || "d"; }
}
new A().m().then((v) => console.log(v));
