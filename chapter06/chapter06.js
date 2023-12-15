import {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcsec,
  functype,
  i32,
  instr,
  localidx,
  locals,
  module,
  typeidx,
  typesec,
  u32,
  valtype,
} from './chapter05.js';

// a == 0
instr.i32.eqz = 0x45;
// a == b
instr.i32.eq = 0x46;
// a !== b
instr.i32.ne = 0x47;
// a < b
instr.i32.lt_s = 0x48;
// a < b
instr.i32.lt_u = 0x49;
// a > b
instr.i32.gt_s = 0x4a;
// a > b
instr.i32.gt_u = 0x4b;
// a <= b
instr.i32.le_s = 0x4c;
// a <= b
instr.i32.le_u = 0x4d;
// a >= b
instr.i32.ge_s = 0x4e;
// a >= b
instr.i32.ge_u = 0x4f;

instr.i32.and = 0x71;
instr.i32.or = 0x72;

const blocktype = { empty: 0x40, ...valtype };

function compileCompAndBoolOps() {
  function binOp(instruction) {
    return code(
      func(
        [],
        [
          [instr.local.get, localidx(0)],
          [instr.local.get, localidx(1)],
          instruction,
          instr.end,
        ]
      )
    );
  }

  const mod = module([
    typesec([
      functype([valtype.i32, valtype.i32], [valtype.i32]),
      functype([valtype.i32], [valtype.i32]),
    ]),
    funcsec([
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(1),
    ]),
    exportsec([
      export_('eq', exportdesc.func(0)),
      export_('ne', exportdesc.func(1)),
      export_('lt', exportdesc.func(2)),
      export_('gt', exportdesc.func(3)),
      export_('le', exportdesc.func(4)),
      export_('ge', exportdesc.func(5)),
      export_('and', exportdesc.func(6)),
      export_('or', exportdesc.func(7)),
      export_('eqz', exportdesc.func(8)),
    ]),
    codesec([
      binOp(instr.i32.eq),
      binOp(instr.i32.ne),
      binOp(instr.i32.lt_s),
      binOp(instr.i32.gt_s),
      binOp(instr.i32.le_s),
      binOp(instr.i32.ge_s),
      binOp(instr.i32.and),
      binOp(instr.i32.or),
      code(
        func([], [[instr.local.get, localidx(0)], instr.i32.eqz, instr.end])
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

const labelidx = u32;

valtype.void = 0x40;
instr.if = 0x04;
instr.else = 0x05;

function compileIfVoid() {
  const mod = module([
    typesec([functype([valtype.i32], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [locals(1, valtype.i32)],
          [
            [instr.local.get, localidx(0)],
            instr.i32.eqz,
            [instr.if, valtype.void],
            [
              [instr.i32.const, i32(11)],
              [instr.local.set, localidx(1)],
            ],
            instr.else,
            [
              [instr.i32.const, i32(22)],
              [instr.local.set, localidx(1)],
            ],
            instr.end,
            [instr.local.get, localidx(1)],
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

function compileIfReturn() {
  const mod = module([
    typesec([functype([valtype.i32], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [locals(1, valtype.i32)],
          [
            [instr.local.get, localidx(0)],
            instr.i32.eqz,
            [instr.if, valtype.i32],
            [instr.i32.const, i32(11)],
            instr.else,
            [instr.i32.const, i32(22)],
            instr.end,
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

instr.block = 0x02;
instr.loop = 0x03;
instr.br = 0x0c;
instr.br_if = 0x0d;

function compileWhile() {
  const mod = module([
    typesec([functype([valtype.i32], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [locals(2, valtype.i32)],
          [
            // v1 = arg
            [instr.local.get, localidx(0)],
            [instr.local.set, localidx(1)],

            [
              instr.block,
              valtype.void,
              // 1:
              [
                instr.loop,
                valtype.void,

                // condition
                [instr.local.get, localidx(1)],

                instr.i32.eqz,
                [instr.br_if, labelidx(1)],

                // body
                [
                  // v1 = v1 - 1
                  [instr.local.get, localidx(1)],
                  [instr.i32.const, i32(1)],
                  instr.i32.sub,
                  [instr.local.set, localidx(1)],

                  // v2 = v2 + 1
                  [instr.local.get, localidx(2)],
                  [instr.i32.const, i32(1)],
                  [instr.i32.add],
                  [instr.local.set, localidx(2)],
                ],

                [instr.br, labelidx(0)],

                instr.end,
              ], // loop
              instr.end,
            ], // block
            // 0:

            // return v2
            [instr.local.get, localidx(2)],
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

export * from './chapter05.js';
export { blocktype };
