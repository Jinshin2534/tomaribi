import { describe, it, expect } from 'vitest';
import { CAMPSITES, SCENERIES } from './data/campsites.js';
import { filterSites, disqualify } from './filter.js';
import { rankSites, scoreSite } from './score.js';
import { reasonsFor } from './reasons.js';

/** 現実に選ばれうる条件の直積。ここを増やしたらデータか重みを直すまで先へ進まない。 */
function allCriteria() {
  const out = [];
  for (const hasCar of [true, false]) {
    for (const fire of ['none', 'stand', 'ground']) {
      for (const party of ['solo', 'couple', 'family', 'group']) {
        for (const month of [1, 5, 8, 11]) {
          for (const scenery of [null, ...SCENERIES]) {
            out.push({ hasCar, fire, party, month, scenery, headcount: party === 'solo' ? 1 : 4 });
          }
        }
      }
    }
  }
  return out;
}

/** 上のものに、ペット・予算・手ぶらを重ねた厳しい条件。 */
function harshCriteria() {
  const out = [];
  for (const base of allCriteria()) {
    out.push({ ...base, pet: true });
    out.push({ ...base, budget: 1500 });
    out.push({ ...base, budget: 800 });
    out.push({ ...base, budget: 5000 });
    out.push({ ...base, tebura: true });
    out.push({ ...base, departHour: 16 });
  }
  return out;
}

const ALL = allCriteria();
const HARSH = harshCriteria();

describe('総当たり — ハード制約', () => {
  it('どの条件でも、失格した場所が結果に一度も混ざらない', () => {
    for (const c of [...ALL, ...HARSH]) {
      for (const s of filterSites(CAMPSITES, c)) {
        expect(disqualify(s, c), `${s.name} / ${JSON.stringify(c)}`).toEqual([]);
      }
    }
  });

  it('休止中の場所は、どの条件でも一度も返らない', () => {
    for (const c of [...ALL, ...HARSH]) {
      for (const s of filterSites(CAMPSITES, c)) {
        expect(s.closed, `${s.name} / ${JSON.stringify(c)}`).toBeNull();
      }
    }
  });

  it('車なし条件では、公共交通の無い場所が一度も返らない', () => {
    for (const c of [...ALL, ...HARSH].filter((x) => x.hasCar === false)) {
      for (const s of filterSites(CAMPSITES, c)) {
        expect(s.transit, s.name).not.toBeNull();
      }
    }
  });

  it('落ちうる側：候補がゼロになる条件が全体の2割を超えない', () => {
    const empty = [...ALL, ...HARSH].filter((c) => filterSites(CAMPSITES, c).length === 0);
    const ratio = empty.length / (ALL.length + HARSH.length);
    expect(ratio, `空になる条件が ${empty.length} 件`).toBeLessThan(0.2);
  });
});

describe('総当たり — 死にデータ', () => {
  const topsBy = (n) => {
    const seen = new Set();
    for (const c of [...ALL, ...HARSH]) {
      for (const r of rankSites(filterSites(CAMPSITES, c), c).slice(0, n)) seen.add(r.site.id);
    }
    return seen;
  };

  it('全てのキャンプ場が、ある条件では候補として残る（誰にも届かない場所が無い）', () => {
    const ever = new Set();
    for (const c of [...ALL, ...HARSH]) for (const s of filterSites(CAMPSITES, c)) ever.add(s.id);
    const unreachable = CAMPSITES.filter((s) => !s.closed && !ever.has(s.id)).map((s) => s.name);
    expect(unreachable, `どの条件でも失格になる: ${unreachable.join(', ')}`).toEqual([]);
  });

  it('全てのキャンプ場が、ある条件では一覧の上位8件に現れる（画面に出ないデータが無い）', () => {
    const shown = topsBy(8);
    const dead = CAMPSITES.filter((s) => !s.closed && !shown.has(s.id)).map((s) => s.name);
    expect(dead, `一度も一覧の上位に出ない: ${dead.join(', ')}`).toEqual([]);
  });

  // 上位3位を取れない場所は存在しうるが、それが許されるのは
  // 「同じエリアに、あらゆる条件で自分以上の場所が実在する」＝真に支配されている場合だけ。
  // それ以外の理由で上位に出ないなら、スコアの軸を取りこぼしている。
  it('上位3位に入れない場所は、いずれも同エリアの別の場所に完全に負けている', () => {
    const top3 = topsBy(3);
    const alive = CAMPSITES.filter((s) => !s.closed);
    const never = alive.filter((s) => !top3.has(s.id));

    for (const s of never) {
      const rivals = alive.filter((r) => r.id !== s.id && r.area === s.area);
      const dominator = rivals.find((r) =>
        ALL.every((c) => {
          const passes = disqualify(s, c).length === 0;
          if (!passes) return true; // その条件では自分が出ないので比べる必要がない
          if (disqualify(r, c).length > 0) return false; // 相手が出られないなら支配していない
          return scoreSite(r, c).total >= scoreSite(s, c).total;
        }),
      );
      expect(dominator, `${s.name} は上位に出ないのに、完全に上回る場所が同エリアに無い`).toBeTruthy();
    }
  });

  it('上位3位に一度も入らない場所は、休止中を除く全体の2割を超えない', () => {
    const top3 = topsBy(3);
    const alive = CAMPSITES.filter((s) => !s.closed);
    const never = alive.filter((s) => !top3.has(s.id)).map((s) => s.name);
    expect(never.length / alive.length, `上位3位に一度も入らない: ${never.join(', ')}`).toBeLessThan(0.2);
  });

  it('1位を取れる場所が、休止中を除く全体の半分以上ある', () => {
    const winners = topsBy(1);
    const alive = CAMPSITES.filter((s) => !s.closed);
    expect(winners.size / alive.length).toBeGreaterThan(0.5);
  });

  it('休止中の場所は一度も上位に現れない', () => {
    const top8 = topsBy(8);
    for (const s of CAMPSITES.filter((x) => x.closed)) {
      expect(top8.has(s.id), s.name).toBe(false);
    }
  });
});

describe('総当たり — 並べる意味', () => {
  it('上位3件が全部同点になる条件が無い', () => {
    for (const c of [...ALL, ...HARSH]) {
      const top = rankSites(filterSites(CAMPSITES, c), c).slice(0, 3);
      if (top.length < 3) continue;
      const totals = new Set(top.map((r) => r.total.toFixed(6)));
      expect(totals.size, JSON.stringify(c)).toBeGreaterThan(1);
    }
  });

  it('候補が3件以上あるとき、1位と最下位のスコア差が 0.15 以上ある', () => {
    for (const c of ALL) {
      const ranked = rankSites(filterSites(CAMPSITES, c), c);
      if (ranked.length < 3) continue;
      const gap = ranked[0].total - ranked[ranked.length - 1].total;
      expect(gap, JSON.stringify(c)).toBeGreaterThan(0.15);
    }
  });

  it('どの条件でも、1位に理由が1つ以上付く', () => {
    for (const c of [...ALL, ...HARSH]) {
      const ranked = rankSites(filterSites(CAMPSITES, c), c);
      if (ranked.length === 0) continue;
      const { plus, minus } = reasonsFor(ranked[0].contributions, c);
      expect(plus.length + minus.length, `${ranked[0].site.name} / ${JSON.stringify(c)}`).toBeGreaterThan(0);
    }
  });
});

describe('総当たり — 摂動耐性', () => {
  // 上位が総入れ替えになってよいのは、候補集合そのものが入れ替わったときだけ
  // （11月→12月は多くのキャンプ場が閉まるので、顔ぶれが変わるのが正しい）。
  it('条件を1軸ずらしても、候補集合が変わらない限り上位3件は総入れ替えにならない', () => {
    const pool = (c) => new Set(filterSites(CAMPSITES, c).map((s) => s.id));
    const ids = (c) => rankSites(filterSites(CAMPSITES, c), c).slice(0, 3).map((r) => r.site.id);
    let checked = 0;
    for (const c of ALL) {
      for (const nudged of [
        { ...c, month: (c.month % 12) + 1 },
        { ...c, party: c.party === 'solo' ? 'couple' : 'solo' },
      ]) {
        const a = ids(c);
        const b = ids(nudged);
        if (a.length < 3 || b.length < 3) continue;

        const pa = pool(c);
        const pb = pool(nudged);
        const kept = [...pa].filter((x) => pb.has(x)).length;
        const churn = 1 - kept / Math.max(pa.size, pb.size);
        if (churn > 0.3) continue; // 候補集合が3割以上入れ替わった＝別の条件

        checked++;
        const overlap = a.filter((x) => b.includes(x)).length;
        expect(overlap, `${JSON.stringify(c)} → ${JSON.stringify(nudged)}`).toBeGreaterThan(0);
      }
    }
    expect(checked, '摂動を1件も検証していない').toBeGreaterThan(50);
  });

  it('車の有無を変えると、上位の顔ぶれは実際に変わる（条件が効いている）', () => {
    const ids = (c) => rankSites(filterSites(CAMPSITES, c), c).slice(0, 3).map((r) => r.site.id).join(',');
    let changed = 0;
    const cases = ALL.filter((c) => c.hasCar === true);
    for (const c of cases) {
      if (ids(c) !== ids({ ...c, hasCar: false })) changed++;
    }
    // 氷川のように「車でも電車でも一番」という場所は実在するので、全条件では変わらない。
    expect(changed / cases.length, '車の有無で順位が変わらない').toBeGreaterThan(0.4);
  });
});
