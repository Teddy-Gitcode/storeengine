"""Seed a throwaway DB for the StoreEngine demo.

Catalogue, settings and slides come from the live store's public API snapshot.
Customers, orders and everything else are generated: no real shopper data.
Run with: manage.py shell < seed_demo.py
"""
import json
import random
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.contrib.auth import get_user_model
from django.db import models as djm
from django.utils import timezone

from apps.catalog.models import Category, Product, ProductImage, ProductVideo, Review, Tag, Brand
from apps.content.models import StorefrontSlide, Faq
from apps.core.models import StoreSettings
from apps.customers.models import Address, CustomerProfile
from apps.inventory.models import InventoryMovement, StockItem
from apps.orders.models import Order, OrderItem, OrderStatusEvent, Refund, AbandonedCart
from apps.payments.models import Payment, PaymentMethodConfig
from apps.promotions.models import Promotion
from apps.shipping.models import Shipment
from apps.support.models import SupportReply, SupportTicket

import os
SNAP = Path(os.environ["DEMO_SNAPSHOT"])  # the live store's public API, saved as JSON
MEDIA = "https://api.teddylan.com/media/"
random.seed(20261025)
now = timezone.now()
User = get_user_model()


def load(name):
    data = json.loads((SNAP / name).read_text())
    return data["results"] if isinstance(data, dict) and "results" in data else data


def media_name(url):
    return url[len(MEDIA):] if url and url.startswith(MEDIA) else ""


def field_names(model):
    return {f.name for f in model._meta.get_fields() if isinstance(f, djm.Field) and not f.is_relation}


def at(days_ago, minutes=0):
    return now - timedelta(days=days_ago, minutes=minutes)


# ── Settings ────────────────────────────────────────────────────────────────
snap = json.loads((SNAP / "settings.json").read_text())
s = StoreSettings.load()
names = field_names(StoreSettings)
for k, v in snap.items():
    if k in names and k not in ("updated_at", "id") and not k.endswith("_url"):
        setattr(s, k, v)
s.business_name = "StoreEngine"
s.tagline = "One codebase, any store"
s.announcement = "Demo store: browse freely, nothing here is charged or shipped"
s.support_email = "hello@storeengine.demo"
s.support_phone = "+254 700 000 000"
s.city = "Nairobi"
s.social_links = {}
s.is_onboarded = True
s.save()

# ── Catalogue ───────────────────────────────────────────────────────────────
for c in load("categories.json"):
    cat = Category(id=c["id"], name=c["name"], slug=c["slug"], description=c["description"],
                   sort_order=c["sort_order"], is_active=True)
    cat.image.name = media_name(c["image_url"])
    cat.save()

products = []
for p in load("products.json"):
    brand = None
    if p.get("brand"):
        brand, _ = Brand.objects.get_or_create(slug=p["brand"]["slug"], defaults={"name": p["brand"]["name"]})
    prod = Product.objects.create(
        id=p["id"], legacy_id=p["legacy_id"] or "", sku=p["sku"], name=p["name"], slug=p["slug"],
        category_id=p["category"]["id"], short_description=p["short_description"],
        description=p["description"], status=p["status"], price=Decimal(p["price"]),
        compare_at_price=Decimal(p["compare_at_price"]) if p["compare_at_price"] else None,
        weight_grams=p["weight_grams"] or 0, hs_code=p["hs_code"] or "",
        is_featured=p["is_featured"], brand=brand, metadata={},
    )
    for t in p["tags"]:
        tag, _ = Tag.objects.get_or_create(slug=t["slug"], defaults={"name": t["name"]})
        prod.tags.add(tag)
    for img in p["images"]:
        pi = ProductImage(product=prod, alt_text=img["alt_text"], sort_order=img["sort_order"],
                          is_primary=img["is_primary"])
        pi.image.name = media_name(img["url"])
        pi.save()
    stock = p.get("stock") or {}
    StockItem.objects.update_or_create(product=prod, defaults={
        "quantity_on_hand": stock.get("quantity_on_hand", 20),
        "allow_backorder": stock.get("allow_backorder", False),
        "reorder_level": 5,
    })
    products.append(prod)

# A few stock levels low/out so the inventory alerts have something to show.
for prod, qty in zip(random.sample(products, 6), [0, 0, 2, 3, 4, 1]):
    StockItem.objects.filter(product=prod).update(quantity_on_hand=qty)

# ── Content ─────────────────────────────────────────────────────────────────
slide_fields = field_names(StorefrontSlide)
for sl in load("slides.json"):
    kw = {k: v for k, v in sl.items() if k in slide_fields and k not in ("created_at", "updated_at")}
    kw["ends_at"] = None
    obj = StorefrontSlide(**kw)
    for f in StorefrontSlide._meta.get_fields():
        if isinstance(f, djm.FileField) and f.name + "_url" in sl:
            getattr(obj, f.name).name = media_name(sl[f.name + "_url"])
    obj.save()

for i, (q, a) in enumerate([
    ("How long does delivery take?", "Orders within Nairobi arrive in 1–2 days; the rest of Kenya in 2–4 days."),
    ("Which payment methods do you accept?", "M-Pesa, card via Paystack, PayPal and cash on delivery."),
    ("Can I return an item?", "Yes, within 14 days of delivery, unused and in its original packaging."),
    ("Is this a real store?", "No, it's a StoreEngine demo. Nothing is charged or shipped."),
]):
    Faq.objects.create(question=q, answer=a, status="published", sort_order=i)

for pm in load("payment-methods.json"):
    cfg = PaymentMethodConfig(name=pm["name"], body_text=pm["body_text"], is_active=True,
                              provider=pm.get("method", ""), sort_order=pm["id"])
    cfg.logo.name = media_name(pm["logo_url"])
    cfg.save()

# ── Customers (fictional) ───────────────────────────────────────────────────
FIRST = ["Wanjiru", "Otieno", "Achieng", "Kamau", "Njeri", "Kiprono", "Akinyi", "Mutua", "Chebet", "Omondi",
         "Wambui", "Kibet", "Nyambura", "Barasa", "Atieno", "Mwangi", "Jepkosgei", "Odhiambo", "Muthoni", "Langat",
         "Amina", "Hassan", "Faith", "Brian", "Grace", "Kevin", "Mercy", "Dennis", "Joy", "Collins"]
LAST = ["Kariuki", "Ochieng", "Wafula", "Njoroge", "Koech", "Onyango", "Mwende", "Rotich", "Kilonzo", "Maina",
        "Cheruiyot", "Owino", "Gitau", "Nyaga", "Kipchumba", "Mohamed", "Wekesa", "Kimani", "Ruto", "Adhiambo"]
CITIES = [("Nairobi", 46), ("Mombasa", 12), ("Kisumu", 10), ("Nakuru", 9), ("Eldoret", 8), ("Kericho", 6),
          ("Thika", 5), ("Nyeri", 4)]
STREETS = ["Ngong Road", "Kenyatta Avenue", "Moi Avenue", "Oginga Odinga St", "Uhuru Highway", "Kimathi St",
           "Waiyaki Way", "Mama Ngina St", "Tom Mboya St", "Langata Road"]


def pick(weighted):
    return random.choices([v for v, _ in weighted], weights=[w for _, w in weighted])[0]


customers = []
used = set()
for i in range(48):
    while True:
        first, last = random.choice(FIRST), random.choice(LAST)
        if (first, last) not in used:
            used.add((first, last))
            break
    joined = at(random.uniform(5, 300))
    user = User.objects.create_user(
        username=f"{first}.{last}".lower(), email=f"{first}.{last}@example.com".lower(),
        password=None, first_name=first, last_name=last,
    )
    User.objects.filter(pk=user.pk).update(date_joined=joined)
    phone = f"+2547{random.randint(10, 99)}{random.randint(100000, 999999)}"
    prof = CustomerProfile.objects.create(user=user, phone=phone, marketing_opt_in=random.random() < 0.6,
                                          email_verified=True)
    CustomerProfile.objects.filter(pk=prof.pk).update(created_at=joined)
    city = pick(CITIES)
    addr = Address.objects.create(customer=prof, type="shipping", full_name=f"{first} {last}", phone=phone,
                                  line1=f"{random.randint(1, 240)} {random.choice(STREETS)}", city=city,
                                  country_code="KE", is_default=True)
    customers.append((prof, addr, joined))

# ── Orders ──────────────────────────────────────────────────────────────────
P, F = Order.PaymentStatus, Order.FulfillmentStatus
# (payment, fulfillment, method, cancelled, weight)
SHAPES = [
    (P.PAID, F.DELIVERED, "prepaid", False, 44),
    (P.PAID, F.SHIPPED, "prepaid", False, 9),
    (P.PAID, F.PACKED, "prepaid", False, 6),
    (P.PAID, F.PROCESSING, "prepaid", False, 7),
    (P.PAID, F.UNFULFILLED, "prepaid", False, 8),
    (P.DUE_ON_DELIVERY, F.SHIPPED, "cod", False, 5),
    (P.DUE_ON_DELIVERY, F.PROCESSING, "cod", False, 4),
    (P.PENDING, F.UNFULFILLED, "prepaid", False, 6),
    (P.FAILED, F.UNFULFILLED, "prepaid", False, 3),
    (P.PENDING, F.UNFULFILLED, "prepaid", True, 4),
    (P.REFUNDED, F.RETURNED, "prepaid", False, 2),
    (P.PARTIALLY_REFUNDED, F.DELIVERED, "prepaid", False, 2),
]
PROVIDERS = [("mobile_money", 60), ("paystack", 28), ("paypal", 12)]
RIDERS = [("Peter Kamau", "KMFG 214A"), ("Samuel Otieno", "KMDX 902L"), ("Daniel Kiptoo", "KMEB 388C")]
active = [p for p in products if p.status == "active"]
orders = []
for i in range(160):
    days_ago = min(random.betavariate(1.2, 2.0) * 180, 179.5)
    placed = at(days_ago, random.randint(0, 1380))
    pay, ful, method, cancelled, _ = random.choices(SHAPES, weights=[x[-1] for x in SHAPES])[0]
    if days_ago < 2 and ful == F.DELIVERED:
        pay, ful = P.PAID, random.choice([F.PROCESSING, F.UNFULFILLED])
    if days_ago > 20 and ful in (F.UNFULFILLED, F.PROCESSING, F.PACKED, F.SHIPPED) and not cancelled and pay != P.FAILED:
        ful = F.DELIVERED
        pay = P.PAID
    prof, addr, joined = random.choice(customers)
    order = Order.objects.create(
        number=f"SO-{placed:%y%m}{10000 + i}", customer=prof, email=prof.user.email, phone=prof.phone,
        payment_status=pay, fulfillment_status=ful, payment_method=method, currency="KES",
        placed_at=placed, shipping_address=addr, billing_address=addr,
        cancelled_at=placed + timedelta(hours=random.randint(1, 30)) if cancelled else None,
        metadata={"channel": random.choice(["web", "web", "web", "mobile", "mobile"])},
    )
    subtotal = Decimal("0")
    for prod in random.sample(active, k=random.choices([1, 2, 3, 4], weights=[48, 32, 14, 6])[0]):
        qty = 1 if prod.price > 20000 else random.choices([1, 2, 3], weights=[70, 22, 8])[0]
        line = prod.price * qty
        subtotal += line
        OrderItem.objects.create(order=order, product_id=prod.id, sku=prod.sku, name=prod.name,
                                 quantity=qty, unit_price=prod.price, line_total=line)
    shipping = Decimal("300.00")
    discount = (subtotal * Decimal("0.10")).quantize(Decimal("1")) if random.random() < 0.15 else Decimal("0")
    order.subtotal, order.shipping_total, order.discount_total = subtotal, shipping, discount
    order.grand_total = subtotal + shipping - discount
    if ful in (F.PACKED, F.SHIPPED, F.DELIVERED, F.RETURNED):
        order.packed_at = placed + timedelta(hours=random.randint(3, 20))
        order.package_weight_grams = random.randint(400, 9000)
        order.package_length_cm, order.package_width_cm, order.package_height_cm = 40, 30, random.randint(8, 30)
    if ful in (F.SHIPPED, F.DELIVERED, F.RETURNED):
        order.dispatched_at = order.packed_at + timedelta(hours=random.randint(2, 18))
    order.status = order.compute_display_status()
    order.save()
    Order.objects.filter(pk=order.pk).update(created_at=placed)

    # Status trail
    trail = ["pending_payment"]
    if pay in (P.PAID, P.DUE_ON_DELIVERY, P.REFUNDED, P.PARTIALLY_REFUNDED):
        trail.append("paid" if method == "prepaid" else "processing")
    for stage in ("processing", "packed", "shipped", "delivered"):
        if stage in trail:
            continue
        order_rank = ["unfulfilled", "processing", "packed", "shipped", "delivered"]
        if ful in order_rank and order_rank.index(ful) >= order_rank.index(stage):
            trail.append(stage)
    if cancelled:
        trail.append("cancelled")
    if pay == P.REFUNDED:
        trail.append("refunded")
    t = placed
    prev = ""
    for st in trail:
        ev = OrderStatusEvent.objects.create(order=order, from_status=prev, to_status=st,
                                             actor="system" if st in ("pending_payment", "paid") else "staff")
        OrderStatusEvent.objects.filter(pk=ev.pk).update(created_at=t)
        prev = st
        t = t + timedelta(hours=random.randint(1, 26))

    if pay in (P.PAID, P.REFUNDED, P.PARTIALLY_REFUNDED, P.FAILED) or (pay == P.PENDING and not cancelled):
        provider = pick(PROVIDERS)
        status = {P.PAID: "confirmed", P.REFUNDED: "refunded", P.PARTIALLY_REFUNDED: "confirmed",
                  P.FAILED: "failed", P.PENDING: "pending"}[pay]
        pm = Payment.objects.create(
            order=order, provider=provider, status=status, amount=order.grand_total, currency="KES",
            provider_reference=f"{'QK' if provider == 'mobile_money' else 'T'}{random.randint(10**8, 10**9 - 1)}",
            idempotency_key=f"demo-{order.number}",
            failure_reason="The customer cancelled the M-Pesa prompt." if status == "failed" else "",
            confirmed_at=placed + timedelta(minutes=random.randint(1, 20)) if status in ("confirmed", "refunded") else None,
        )
        Payment.objects.filter(pk=pm.pk).update(created_at=placed)

    if order.dispatched_at:
        rider, plate = random.choice(RIDERS)
        nairobi = addr.city == "Nairobi"
        sh = Shipment.objects.create(
            order=order, provider="courier" if nairobi else "dhl",
            status={F.SHIPPED: "in_transit", F.DELIVERED: "delivered", F.RETURNED: "returned"}[ful],
            tracking_number=f"SE{random.randint(10**7, 10**8 - 1)}" if not nairobi else "",
            service_name="Same-day rider" if nairobi else "DHL Express Domestic",
            cost=Decimal("300.00"), currency="KES",
            estimated_delivery_at=order.dispatched_at + timedelta(days=1 if nairobi else 3),
            rider_name=rider if nairobi else "", vehicle="Motorbike" if nairobi else "",
            vehicle_plate=plate if nairobi else "",
        )
        Shipment.objects.filter(pk=sh.pk).update(created_at=order.dispatched_at)
    orders.append(order)

# Refund requests: some pending review, some resolved.
delivered = [o for o in orders if o.fulfillment_status == F.DELIVERED]
REASONS = ["Arrived with a cracked screen.", "Wrong size, would like to return it.",
           "Item doesn't match the photos.", "Ordered twice by mistake.", "Stopped working after two days."]
for o, st in zip(random.sample(delivered, 7), ["requested"] * 3 + ["approved"] * 3 + ["rejected"]):
    r = Refund.objects.create(
        order=o, kind=random.choice(["refund", "return"]), status=st,
        amount=o.items.first().line_total, partial=o.items.count() > 1, reason=random.choice(REASONS),
        method="M-Pesa reversal", requested_by=o.email,
        resolved_by="demo.admin" if st != "requested" else "",
        resolution_note={"approved": "Refunded to M-Pesa.", "rejected": "Outside the 14-day window."}.get(st, ""),
        resolved_at=now - timedelta(days=random.randint(1, 10)) if st != "requested" else None,
    )

# Reviews on delivered items.
REVIEW_TEXT = [
    (5, "Exactly as described", "Delivered the next day and works perfectly."),
    (5, "Great value", "Better quality than I expected for the price."),
    (4, "Good, minor issue", "Happy overall, the packaging was a bit damaged."),
    (4, "Solid", "Does the job. Would buy again."),
    (3, "It's okay", "Fine, but the colour is slightly different from the photo."),
    (5, "Love it", "My second order from this store, never disappointed."),
]
for o in random.sample(delivered, 40):
    item = o.items.first()
    rating, title, body = random.choice(REVIEW_TEXT)
    prof = o.customer
    rv = Review.objects.create(product_id=item.product_id, customer=prof,
                               display_name=f"{prof.user.first_name} {prof.user.last_name[0]}.",
                               rating=rating, title=title, body=body, is_verified_purchase=True,
                               is_approved=random.random() < 0.85)
    Review.objects.filter(pk=rv.pk).update(created_at=o.placed_at + timedelta(days=random.randint(3, 9)))

# Support inbox.
TICKETS = [
    ("Where is my order?", "delivery", "high", "open", "Hi, my order hasn't arrived yet and it's been three days."),
    ("Change delivery address", "order", "medium", "in_progress", "Can I have it delivered to my office instead?"),
    ("M-Pesa charged twice", "payment", "urgent", "open", "I was charged twice for the same order, please help."),
    ("Do you have this in blue?", "product", "low", "resolved", "Is the weekender bag available in navy?"),
    ("Invoice for my company", "order", "low", "closed", "Please send an invoice with our KRA PIN."),
    ("Return request", "returns", "medium", "open", "The jeans are too small, how do I return them?"),
]
for i, (subj, cat, prio, st, msg) in enumerate(TICKETS):
    o = random.choice(orders)
    prof = o.customer
    tk = SupportTicket.objects.create(
        reference=f"SUP-{4200 + i}", name=f"{prof.user.first_name} {prof.user.last_name}", email=prof.user.email,
        subject=subj, message=msg, category=cat, order_number=o.number, status=st, priority=prio,
        customer=prof, needs_human=st == "open",
    )
    SupportReply.objects.create(ticket=tk, author=tk.name, author_kind="customer", is_staff=False, body=msg)
    if st != "open":
        SupportReply.objects.create(ticket=tk, author="Demo Admin", author_kind="staff", is_staff=True,
                                    body="Thanks for reaching out, we're on it and will update you shortly.")

# Promotions.
for name, code, ptype, value, st in [
    ("Welcome 10% off", "WELCOME10", "percentage", "10", "active"),
    ("Free delivery weekend", "FREESHIP", "free_shipping", "0", "active"),
    ("KSh 1,000 off electronics", "TECH1000", "fixed", "1000", "scheduled"),
    ("Back to school", "SCHOOL15", "percentage", "15", "ended"),
]:
    Promotion.objects.create(name=name, code=code, promotion_type=ptype, value=Decimal(value), status=st,
                             usage_count=random.randint(0, 80), revenue=Decimal(random.randint(20000, 400000)),
                             is_sitewide=ptype != "fixed", starts_at=at(30), ends_at=at(-30) if st != "ended" else at(2))

# Abandoned carts.
for i in range(9):
    prof, _, _ = random.choice(customers)
    picked = random.sample(active, k=random.randint(1, 3))
    AbandonedCart.objects.create(
        reference=f"CART-{7300 + i}", customer=prof, email=prof.user.email, phone=prof.phone,
        status=random.choice(["abandoned", "abandoned", "recovered"]), currency="KES",
        subtotal=sum((p.price for p in picked), Decimal("0")), item_count=len(picked),
        last_activity_at=at(random.uniform(0.2, 12)),
        metadata={"items": [{"product_id": p.id, "name": p.name, "quantity": 1, "price": str(p.price)} for p in picked]},
    )

# The staff account the demo signs in as.
admin = User.objects.create_superuser("demo.admin", "admin@storeengine.demo", "demo-only-password",
                                      first_name="Demo", last_name="Admin")
print("seeded:", Product.objects.count(), "products,", CustomerProfile.objects.count(), "customers,",
      Order.objects.count(), "orders,", Review.objects.count(), "reviews")
