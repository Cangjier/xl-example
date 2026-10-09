// xl:title 复合赋值、逻辑赋值与自增自减
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe693b-e23 · e24 · e25 · e26 · e27 · e34 · e35 · e36 · e37
// 判据只有一条：赋值那一族——逻辑赋值（`??=` / `||=` / `&&=`）只在**该赋值时**才写，
// 复合赋值读一次写一次，`++` / `--` 的前后缀在**读到的旧值**与写回的新值上各表达一次
// （成员与下标位置同样如此）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 逻辑赋值
probe(() => { let a = null; a ??= 1; return a; });
probe(() => { let a = 0; a ||= 5; return a; });
probe(() => { let a = 1; a &&= 5; return a; });

// 复合赋值：读一次、写一次
probe(() => { let a = 1; a += 2; a *= 3; a -= 1; return a; });
probe(() => { let a = 7; a %= 4; return a; });
probe(() => { let n = 1; n <<= 2; return n; });

// 自增自减：旧值与新值各表达一次
probe(() => { let n = 1; return n++ + ++n + n; });
probe(() => { let a = [1]; return a[0]++ + a[0]; });
probe(() => { const o = { n: 1 }; return o.n++ + o.n; });
