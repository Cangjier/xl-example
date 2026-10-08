// xl:title 类里计算键方法的名字
// xl:round 732
// xl:judge stdout
// xl:why **第 755 轮收掉了**（指令已撤、用例留着当守卫）：类成员那条路现在
// xl:why 与对象字面量那条**同一个形状**——静态键当场给名字（`memberDisplay`）、
// xl:why 动态键由运行期补写（`EmitComputedFunctionName`）。
// xl:why 根子那一段留着做历史：对象字面量那条路第 620 / 732 两轮把两半都接上了，
// xl:why 而类成员走的是另一条（`LowerClass` 那一族），同一个形状只接了一条。
// xl:end
class C { ["m"]() { return 1; } static ["s"]() { return 2; } ["n" + 1]() { return 3; } }
console.log(C.prototype.m.name, C["s"].name, C.prototype.n1.name);
