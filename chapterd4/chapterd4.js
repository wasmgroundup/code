class ModuleInstance {
  constructor() {
    this.pc = 0;
    this.opC = 0;

    this.stack = [];

    this.c = null;
    this.c1 = null;
    this.c2 = null;
  }

  step(code) {
    if (this.pc >= code.length) {
      return;
    }

    const instr = code[this.pc];

    if (this.opC < instr.ops.length) {
      const op = instr.ops[this.opC];
      op.run(this);
    }

    this.opC += 1;
    if (this.opC >= instr.ops.length) {
      this.pc += 1;
      this.opC = 0;
    }
  }

  pushValue(v) {
    this.stack.push(v);
  }

  popValue() {
    return this.stack.pop();
  }

  peekValue() {
    return this.stack.at(-1);
  }

  assertTopValueOfType(Class) {
    return this.peekValue() instanceof Class;
  }

  popValueIntoC1() {
    this.c1 = this.popValue();
  }

  popValueIntoC2() {
    this.c2 = this.popValue();
  }

  applyUnOp(fn) {
    this.c = this.c1.applyUnOp(fn);
  }

  pushC() {
    this.pushValue(this.c);
  }

  applyBinOp(fn) {
    this.c = this.c1.applyBinOp(fn, this.c2);
  }

  clearC() {
    this.c = null;
  }

  clearC1() {
    this.c1 = null;
  }

  clearC2() {
    this.c2 = null;
  }

  clearCs() {
    this.clearC();
    this.clearC1();
    this.clearC2();
  }

  reset() {
    this.pc = 0;
    this.opC = 0;
    this.clearCs();
    this.stack = [];
  }
}

class Instruction {
  constructor(name, ops) {
    this.name = name;
    this.ops = ops;
  }
}

const nop = new Instruction('nop', []);

class Module {
  constructor(code) {
    this.code = code;
  }
}

class Value {
  constructor(value) {
    this.value = value;
  }

  getTypeName() {
    throw new Error('not implemented');
  }

  applyUnOp(fn) {
    return new this.constructor(fn(this.value));
  }

  applyBinOp(fn, other) {
    return new this.constructor(fn(this.value, other.value));
  }
}

class I32 extends Value {
  getTypeName() {
    return 'i32';
  }
}

function i32(v) {
  return new I32(v);
}

class Op {
  constructor(name, fn) {
    this.name = name;
    this.fn = fn;
  }

  run(vm) {
    this.fn(vm);
  }
}

class ConstOp extends Op {
  constructor(name, value) {
    super(name, (vm) => vm.pushValue(value));
  }
}

i32.const = (v) =>
  new Instruction(`i32.const`, [new ConstOp(`Push value ${v}`, i32(v))]);

const ASSERT_TOP_I32 = new Op('Assert Value Type i32', (vm) =>
  vm.assertTopValueOfType(I32),
);

const POP_TO_C1 = new Op('Pop to c1', (vm) => vm.popValueIntoC1());

const APPLY_UN_OP = (opName, fn) =>
  new Op('Apply UnOp: ' + opName, (vm) => vm.applyUnOp(fn));

const PUSH_C = new Op('Push C', (vm) => vm.pushC());

i32.eqz = new Instruction('i32.eqz', [
  ASSERT_TOP_I32,
  POP_TO_C1,
  APPLY_UN_OP('eqz', (c1) => (c1 === 0 ? 1 : 0)),
  PUSH_C,
]);

const POP_TO_C2 = new Op('Pop to c2', (vm) => vm.popValueIntoC2());

const APPLY_BIN_OP = (opName, fn) =>
  new Op('Apply BinOp: ' + opName, (vm) => vm.applyBinOp(fn));

i32.add = new Instruction('i32.add', [
  ASSERT_TOP_I32,
  POP_TO_C2,
  ASSERT_TOP_I32,
  POP_TO_C1,
  APPLY_BIN_OP('+', (c1, c2) => c1 + c2),
  PUSH_C,
]);

i32.sub = new Instruction('i32.sub ', [
  ASSERT_TOP_I32,
  POP_TO_C2,
  ASSERT_TOP_I32,
  POP_TO_C1,
  APPLY_BIN_OP('-', (c1, c2) => c1 - c2),
  PUSH_C,
]);

function makeI32BinOp(name, symbol, fn) {
  return new Instruction(name, [
    ASSERT_TOP_I32,
    POP_TO_C2,
    ASSERT_TOP_I32,
    POP_TO_C1,
    APPLY_BIN_OP(symbol, fn),
    PUSH_C,
  ]);
}

i32.mul = makeI32BinOp('i32.mul', '*', (c1, c2) => c1 * c2);

i32.div = makeI32BinOp('i32.div', '/', (c1, c2) => Math.trunc(c1 / c2));
