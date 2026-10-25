"""Third pass: payment methods, and the demo shopper who signs in on the storefront."""
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.customers.models import Address, CustomerProfile
from apps.orders.models import Order
from apps.payments.models import PaymentMethodConfig

PaymentMethodConfig.objects.all().delete()
call_command("seed_payment_methods")

U = get_user_model()
u = U.objects.create_user("demo@storeengine.demo", "demo@storeengine.demo", "demo-shopper-password",
                          first_name="Demo", last_name="Shopper")
p = CustomerProfile.objects.create(user=u, phone="+254700123456", email_verified=True)
a = Address.objects.create(customer=p, type="shipping", full_name="Demo Shopper", phone="+254700123456",
                           line1="12 Kenyatta Avenue", city="Nairobi", country_code="KE", is_default=True)
for o in Order.objects.filter(currency="KES", fulfillment_status__in=["shipped", "delivered"]).order_by("-placed_at")[:3]:
    o.customer, o.email, o.shipping_address = p, u.email, a
    o.save()
print("shopper orders:", list(Order.objects.filter(customer=p).values_list("number", flat=True)))
