// صفحة المفضلة
import { $, piecesLabel } from '../utils.js';
import { favorites } from '../store/favorites.js';
import { cart } from '../store/cart.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { productGrid } from '../ui/components.js';

mountLayout();

function render() {
  const list = favorites.products();
  $('#favSummary').textContent = list.length
    ? `${piecesLabel(list.length)} محفوظة. اضغطي على القلب لتشيليها.`
    : '';
  $('#favGrid').innerHTML = list.length ? productGrid(list) : `
    <div class="empty-state">
      <p>لسا ما حطيتي ولا قطعة بالمفضلة.<br>اضغطي على القلب ♡ على أي قطعة عجبتك عشان ترجعيلها بعدين.</p>
      <a href="index.html#new" class="btn btn--primary">تسوقي الجديد</a>
    </div>`;

  // اقتراحات حسب القطع المحفوظة
  const recs = list.length ? recommend({ exclude: list.map((p) => p.id), similarTo: list[0], cart: cart.lines }) : [];
  $('#favRecs').hidden = !recs.length;
  $('#favRecsGrid').innerHTML = productGrid(recs);
}

render();
favorites.subscribe(render);
