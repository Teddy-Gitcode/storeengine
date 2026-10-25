"""Second seeding pass: the admin sections the first pass left empty."""
import random
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.catalog.models import Brand, Category, Product
from apps.content.models import CategoryGroup, LegalPage, PromoPopup
from apps.core.models import TaxRate
from apps.inventory.models import InventoryMovement, StockItem, StockOrderRequest, Supplier, Warehouse
from apps.orders.models import OrderItem
from apps.promotions.models import Deal

random.seed(7)
now = timezone.now()

main = Warehouse.objects.create(name="Nairobi Central", code="NBO-1", address="Mombasa Road, Industrial Area",
                                city="Nairobi", country="KE", is_default=True, is_active=True)
Warehouse.objects.create(name="Kisumu Depot", code="KSM-1", address="Obote Road", city="Kisumu", country="KE",
                         is_active=True)
StockItem.objects.update(warehouse=main)

sup = [
    Supplier.objects.create(name="Savannah Electronics Ltd", contact_name="Joseph Mwangi",
                            email="orders@savannah-electronics.example.com", phone="+254 711 000 101",
                            address="Luthuli Avenue, Nairobi", lead_time_days=5, is_active=True),
    Supplier.objects.create(name="Rift Valley Textiles", contact_name="Esther Chepkoech",
                            email="sales@rv-textiles.example.com", phone="+254 722 000 202",
                            address="Eldoret", lead_time_days=10, is_active=True),
    Supplier.objects.create(name="Coastline Home & Living", contact_name="Ali Said",
                            email="hello@coastline-home.example.com", phone="+254 733 000 303",
                            address="Nyali, Mombasa", lead_time_days=14, is_active=True),
]

TaxRate.objects.create(name="VAT", location="Kenya", rate_type="vat", rate_percent=Decimal("16"), is_active=True,
                       notes="Standard rate, KRA.")
TaxRate.objects.create(name="Excise duty (phones)", location="Kenya", rate_type="custom",
                       rate_percent=Decimal("10"), is_active=False)

for name, slug in [("Voltix", "voltix"), ("Nyumba Living", "nyumba-living"), ("Kitenge & Co", "kitenge-co")]:
    Brand.objects.get_or_create(slug=slug, defaults={"name": name, "is_active": True,
                                                    "description": f"{name}: house brand in the demo catalogue."})
brands = {b.slug: b for b in Brand.objects.all()}
for p in Product.objects.select_related("category"):
    slug = {"electronics": "voltix", "home-living": "nyumba-living", "apparel": "kitenge-co"}.get(p.category.slug)
    if slug and not p.brand_id and random.random() < 0.6:
        p.brand = brands[slug]
        p.save(update_fields=["brand"])

electronics = list(Product.objects.filter(category__slug="electronics", status="active"))
apparel = list(Product.objects.filter(category__slug="apparel", status="active"))
flash = Deal.objects.create(title="Weekend tech flash sale", kind="flash", deal_type="promo",
                            discount_percent=Decimal("15"), status="active", headline="Up to 15% off tech",
                            subheadline="Laptops, monitors and audio, this weekend only", badge_label="FLASH",
                            cta_label="Shop the sale", cta_href="/flash-deals", gradient_from="#1e3a8a",
                            gradient_to="#0f172a", text_color="#ffffff", accent_color="#f59e0b",
                            starts_at=now - timedelta(days=1), ends_at=now + timedelta(days=60))
flash.products.set(random.sample(electronics, 8))
featured = Deal.objects.create(title="Denim week", kind="featured", deal_type="promo",
                               discount_percent=Decimal("10"), status="active", headline="10% off all denim",
                               subheadline="Skinny, flare and straight cuts", badge_label="FEATURED",
                               cta_label="Shop denim", cta_href="/offers", gradient_from="#b91c1c",
                               gradient_to="#7f1d1d", text_color="#ffffff", accent_color="#fde68a",
                               starts_at=now - timedelta(days=2), ends_at=now + timedelta(days=60))
featured.products.set([p for p in apparel if "Jeans" in p.name][:8])

PromoPopup.objects.create(title="Demo welcome", kind="banner", headline="This is a StoreEngine demo",
                          body="Browse, add to cart and check out. Nothing is charged or shipped.",
                          cta_label="Start shopping", link_url="/shop", status="published",
                          frequency="once_per_session", sort_order=0)

cats = {c.slug: c for c in Category.objects.all()}
g1 = CategoryGroup.objects.create(title="Work from home", subtitle="Screens, keyboards and a good sofa",
                                  overlay_color="#0f172a", text_color="#ffffff", status="published", sort_order=0)
g1.categories.set([cats["electronics"], cats["home-living"]])
g2 = CategoryGroup.objects.create(title="Wardrobe refresh", subtitle="Denim, tees and everyday shoes",
                                  overlay_color="#7f1d1d", text_color="#ffffff", status="published", sort_order=1)
g2.categories.set([cats[s] for s in ("apparel", "footwear", "accessories") if s in cats])

PRIVACY = """This is a demo of StoreEngine, a white-label commerce platform.

What this demo collects

Nothing. There is no server behind it: the products, orders and customers you see are bundled sample data, and the customers are fictional. Anything you type, such as a cart, an address or a sign-in, stays in your own browser and is gone when you clear it.

Payments

No payment is ever taken. Checkout ends on a demo screen.

Contact

Questions about StoreEngine go to the developer through teddynova.com."""

TERMS = """These terms cover the StoreEngine demo.

It's a demonstration

The store, its products and its prices are samples. Orders placed here are not real, are never charged and are never shipped.

No warranty

The demo is provided as is, to show how the platform works. Changes you make in the admin aren't saved.

The real platform

StoreEngine runs real stores with M-Pesa, Paystack, PayPal and cash on delivery. To talk about running one, get in touch through teddynova.com."""

LegalPage.objects.create(page_type="privacy", title="Privacy Policy", body=PRIVACY, language="en", status="published")
LegalPage.objects.create(page_type="terms", title="Terms & Conditions", body=TERMS, language="en", status="published")

for item in OrderItem.objects.select_related("order").filter(product_id__isnull=False).order_by("-order__placed_at")[:60]:
    mv = InventoryMovement.objects.create(product_id=item.product_id, reason="sale", quantity_delta=-item.quantity,
                                          reference=item.order.number)
    InventoryMovement.objects.filter(pk=mv.pk).update(created_at=item.order.placed_at)
for st in StockItem.objects.filter(quantity_on_hand__lte=4).select_related("product")[:4]:
    mv = InventoryMovement.objects.create(product=st.product, reason="adjustment", quantity_delta=-1,
                                          note="Damaged in storage")
low = list(StockItem.objects.filter(quantity_on_hand__lte=4).select_related("product"))
for st, status in zip(low[:3], ["requested", "approved", "received"]):
    StockOrderRequest.objects.create(product=st.product, supplier=random.choice(sup), warehouse=main,
                                     quantity=20, order_type="restock", priority="high", status=status,
                                     stock_level_at_request=st.quantity_on_hand, note="Low stock")
print("extras seeded")
