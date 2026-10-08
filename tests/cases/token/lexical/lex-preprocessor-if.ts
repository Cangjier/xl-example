// xl:note hash at column zero (rejected by TypeScript; this parser treats it specially)
// xl:ts-invalid
// xl:expect Statement,Let
#if FOO
const a = 1;
#endif
