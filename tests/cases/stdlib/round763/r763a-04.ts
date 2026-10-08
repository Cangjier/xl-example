// xl:title 格式串那一格：**第一个实参才是格式串**，说明符不够时原样留着
// xl:round 763
// xl:judge stdout
// xl:note 第 763 轮顺手钉住的一条（原来只是把它当守卫收进矩阵）：
// xl:note `console.log("%s-%d", 7)` 在 Node 里给 `7-%d`——**第二个说明符没有实参可消耗、
// xl:note 于是原样留着**（而 `%s` 照常换掉那个 `7`）。
// xl:note **第 764 轮把这一条的口径量正了**：格式串**只有落在第一个实参上**才生效
// xl:note （`console.log("a", "%s", "x")` 印的是 `a %s x`），这一条钉的是前半句；
// xl:note 后半句在 `stdlib/round764/r764b-02`。**两条合起来才是 Node 那一层的形状**——
// xl:note 第 763 轮这一条自己的 `xl:title` 原来写成「%s 后面还有说明符」，那是**读错了自己**。
// xl:end
console.log("%s-%d", 7);
console.log("%s %s", "a");
console.log("%d%s", 1);
console.log("%s-%d", "a", "b");
console.log("%s-%s-%s", "a", "b");
console.log("%s-%d", 1, 2);
