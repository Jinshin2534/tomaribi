// スコアの寄与を、そのまま人間の言葉にする。
// 順位を説明できない提案は信用されないので、加点だけでなく減点も必ず見せる。

export const PLUS_THRESHOLD = 0.62;
export const MINUS_THRESHOLD = 0.32;
const MAX_PLUS = 3;
const MAX_MINUS = 2;

export const TEMPLATES = {
  access: {
    plus: (c) => (c.hasCar === false ? '電車とバスで無理なく着ける' : '都心から近く、移動が短い'),
    minus: (c) => (c.hasCar === false ? '公共交通だと遠く、着く時刻が際どい' : '車でもそれなりに時間がかかる'),
  },
  fire: {
    plus: () => '焚き火の条件がいい（薪の現地調達や直火）',
    minus: () => '焚き火まわりの自由度は低い',
  },
  facility: {
    plus: () => 'トイレ・シャワー・レンタルなどが揃っている',
    minus: () => '設備は最小限で、持ち込み前提',
  },
  quiet: {
    plus: () => '静かに過ごしやすい立地',
    minus: () => '人が多く、賑やかになりやすい',
  },
  price: {
    plus: () => '料金が手頃',
    minus: () => '料金は高めの部類',
  },
  season: {
    plus: () => 'この時期の気候と相性がいい',
    minus: () => 'この時期は暑さ寒さがこたえる標高',
  },
};

/**
 * 寄与の配列から加点・減点の文を組み立てる。
 * 素点で「良い／悪い」を判定し、重み込みの points で並べる
 * （＝いま重視している軸ほど先に説明される）。
 */
export function reasonsFor(contributions, criteria) {
  const c = criteria ?? {};
  const byPoints = (a, b) => b.points - a.points || a.axis.localeCompare(b.axis);

  const plus = contributions
    .filter((co) => co.raw >= PLUS_THRESHOLD)
    .sort(byPoints)
    .slice(0, MAX_PLUS)
    .map((co) => TEMPLATES[co.axis].plus(c));

  const minus = contributions
    .filter((co) => co.raw <= MINUS_THRESHOLD)
    .sort((a, b) => b.weight - a.weight || a.axis.localeCompare(b.axis))
    .slice(0, MAX_MINUS)
    .map((co) => TEMPLATES[co.axis].minus(c));

  return { plus, minus };
}
