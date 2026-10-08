// xl:note 形参表与 `=>` 之间夹着注释：`=>` 由 token 出的 `ArrowAt` 定位
// xl:expect Lamda,LamdaBody,LamdaParameters,BinaryOperator
const f = (a: number) /* c */ => a + 1
const g = (b: number): number /* r */ => { return b * 2 }
const h = (c: number) /* c1 */ /* c2 */ => c
