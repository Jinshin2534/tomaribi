import { describe, it, expect } from 'vitest';
import { toggle, load, save, KEY } from './favorites.js';

const memStore = (initial) => {
  const m = new Map(initial ? [[KEY, initial]] : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    _raw: () => m.get(KEY),
  };
};

describe('toggle', () => {
  it('無ければ足す', () => {
    expect(toggle([], 'a')).toEqual(['a']);
  });
  it('あれば消す', () => {
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('元の配列を書き換えない', () => {
    const ids = ['a'];
    toggle(ids, 'b');
    expect(ids).toEqual(['a']);
  });
  it('重複を作らない', () => {
    expect(toggle(toggle(['a'], 'a'), 'a')).toEqual(['a']);
  });
});

describe('load / save', () => {
  it('保存したものがそのまま戻る', () => {
    const store = memStore();
    save(store, ['a', 'b']);
    expect(load(store)).toEqual(['a', 'b']);
  });
  it('空の store は空配列', () => {
    expect(load(memStore())).toEqual([]);
  });
  it('壊れた JSON でも例外を投げず空配列', () => {
    expect(load(memStore('{壊れて'))).toEqual([]);
  });
  it('配列でない JSON も空配列に倒す', () => {
    expect(load(memStore('{"a":1}'))).toEqual([]);
    expect(load(memStore('42'))).toEqual([]);
    expect(load(memStore('null'))).toEqual([]);
  });
  it('文字列でない要素は捨てる', () => {
    expect(load(memStore('["a",1,null,"b"]'))).toEqual(['a', 'b']);
  });
  it('store が無くても落ちない', () => {
    expect(load(null)).toEqual([]);
    expect(() => save(null, ['a'])).not.toThrow();
  });
  it('store が例外を投げても落ちない（プライベートモード対策）', () => {
    const angry = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(load(angry)).toEqual([]);
    expect(() => save(angry, ['a'])).not.toThrow();
  });
});
