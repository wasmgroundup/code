import {
  code,
  codesec,
  func,
  funcidx,
  funcsec,
  functype,
  instr,
  locals,
  makeTestFn,
  module,
  name,
  section,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter05.js';

const test = makeTestFn(import.meta.url);

const SECTION_ID_CUSTOM = 0;

function custom(name, bytes) {
  return [name, bytes];
}

function customsec(custom) {
  return section(SECTION_ID_CUSTOM, custom);
}

function namesec(namedata) {
  return customsec(custom(name('name'), namedata));
}

// n:name
function namedata(modulenamesubsec, funcnamesubsec, localnamesubsec) {
  return [modulenamesubsec, funcnamesubsec, localnamesubsec];
}

const CUSTOM_NAME_SUB_SEC_MODULE = 0;
function modulenamesubsec(n) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_MODULE, name(n));
}

const CUSTOM_NAME_SUB_SEC_FUNC = 1;
function funcnamesubsec(namemap) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_FUNC, namemap);
}

// N:byte
function namesubsection(N, B) {
  const flatB = B.flat(Infinity);
  const size = u32(flatB.length);
  return [N, size, flatB];
}

function namemap(nameassocs) {
  return vec(nameassocs);
}

function nameassoc(idx, n) {
  return [idx, name(n)];
}

const CUSTOM_NAME_SUB_SEC_LOCAL = 2;
function localnamesubsec(indirectnamemap) {
  return namesubsection(CUSTOM_NAME_SUB_SEC_LOCAL, indirectnamemap);
}

function indirectnamemap(indirectnameassocs) {
  return vec(indirectnameassocs);
}

function indirectnameassoc(idx, namemap) {
  return [idx, namemap];
}

export * from './chapter11.js';
export {
  SECTION_ID_CUSTOM,
  custom,
  customsec,
  namesec,
  namedata,
  CUSTOM_NAME_SUB_SEC_MODULE,
  modulenamesubsec,
  CUSTOM_NAME_SUB_SEC_FUNC,
  funcnamesubsec,
  namesubsection,
  namemap,
  nameassoc,
  CUSTOM_NAME_SUB_SEC_LOCAL,
  localnamesubsec,
  indirectnamemap,
  indirectnameassoc,
};
