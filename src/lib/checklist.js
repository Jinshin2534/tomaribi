// 装備チェックリスト。その場所とその夜に合わせて増減させる。
// 「レンタルできるものは持っていかなくていい」を出せるかが、汎用リストとの差。

const item = (id, category, text, note = null) => ({ id, category, text, note });

export function buildChecklist(site, { month, minTemp } = {}) {
  const items = [];
  const rental = site.facilities.rental;
  const rentalNote = rental ? 'レンタルあり' : null;
  const cold = typeof minTemp === 'number' && minTemp < 0;
  const chilly = typeof minTemp === 'number' && minTemp < 8;
  const summer = month >= 6 && month <= 9;
  const winter = month === 12 || month <= 2;

  items.push(item('tent', '寝る', 'テント（ペグとハンマーも）', rentalNote));
  items.push(item('sleeping-bag', '寝る', '寝袋', rentalNote));
  items.push(item('mat', '寝る', 'マット（地面の冷たさは寝袋では防げない）', rentalNote));
  items.push(item('light', '灯り', 'ランタンとヘッドライト（予備電池も）', rentalNote));
  items.push(item('cook', '食べる', '調理器具・食器・ゴミ袋', site.facilities.shop ? '売店あり' : null));
  items.push(item('water', '食べる', '飲み水（炊事場の水が飲用とは限らない）'));

  if (site.fire.stand || site.fire.ground) {
    items.push(item('fire-stand', '焚き火', site.fire.ground ? '焚き火台（直火もできるが、河原の石は熱で割れる）' : '焚き火台と焚き火シート', rentalNote));
    items.push(item('glove', '焚き火', '革手袋と火ばさみ'));
    if (!site.fire.wood_sold) items.push(item('firewood', '焚き火', '薪を持参（現地販売なし）'));
  }

  if (!site.facilities.power) items.push(item('power-bank', '灯り', 'モバイルバッテリー（電源なし）'));
  if (site.facilities.shower) items.push(item('towel', '身の回り', 'タオルと着替え', 'シャワーあり'));

  if (summer) {
    items.push(item('insect', '身の回り', '虫よけと痒み止め'));
    items.push(item('shade', '身の回り', '日よけと帽子'));
  }
  if (winter || chilly) items.push(item('layer', '寒さ', '着るものを1枚多く（夜は予報より冷える）'));
  if (cold) {
    items.push(item('hot-water-bottle', '寒さ', '湯たんぽ（またはお湯を入れるボトル）'));
    items.push(item('winter-mat', '寒さ', '銀マットを重ねて地面からの冷えを断つ'));
  }

  items.push(item('trash', '帰る', 'ゴミの持ち帰り袋'));

  return items;
}
