// xl:bom
// xl:note mid-line BOM between tokens：U+FEFF 在任意位置都是 trivia（用户裁定②），不得污染相邻 token
// xl:expect Let,Function
const a = 1;﻿const b = 2;
function﻿f() {}
const e = [1,﻿2];
const﻿x = 1;
class﻿C {}
