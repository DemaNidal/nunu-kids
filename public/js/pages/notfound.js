// صفحة 404: رسالة لطيفة + بحث + اقتراحات، عشان الزبونة ما تطلع من الموقع
import { $ } from '../utils.js';
import { cart } from '../store/cart.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { productGrid } from '../ui/components.js';

mountLayout();

$('#lostGrid').innerHTML = productGrid(recommend({ cart: cart.lines, limit: 4 }));
