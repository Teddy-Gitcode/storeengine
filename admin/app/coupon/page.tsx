import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { updatePromotion, deletePromotion, getPromotions, getStoreSettings } from '@/lib/admin-api';
import { Tag, Zap, Ban, Users2, Plus } from 'lucide-react';
import PromoRows from './PromoRows';

export const dynamic = 'force-dynamic';

async function setStatusAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') || 'draft');
  await updatePromotion(id, { status });
  revalidatePath('/coupon');
  revalidatePath('/marketing-tools');
}

async function deletePromotionAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await deletePromotion(id);
  revalidatePath('/coupon');
  revalidatePath('/marketing-tools');
}

export default async function DiscountsPage() {
  const [page, settings] = await Promise.all([
    getPromotions(),
    getStoreSettings().catch(() => null),
  ]);
  const promos = page.results;
  const active = promos.filter((promo) => promo.status === 'active').length;
  const ended = promos.filter((promo) => promo.status === 'ended').length;
  const totalUses = promos.reduce((sum, promo) => sum + promo.usage_count, 0);

  const STAT_CARDS = [
    { label: 'Total Coupons', value: promos.length, bg: 'bg-accent-1', icon: Tag },
    { label: 'Active Coupons', value: active, bg: 'bg-accent-2', icon: Zap },
    { label: 'Ended Coupons', value: ended, bg: 'bg-accent-3', icon: Ban },
    { label: 'Total Uses', value: totalUses, bg: 'bg-accent-4', icon: Users2 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-surface rounded-2xl w-full p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h3 className="text-xl font-bold font-public-sans text-light-primary-text leading-7">Discounts</h3>
          <Link
            href="/coupon/add"
            className="rounded-full inline-flex items-center gap-1.5 justify-center cursor-pointer font-bold font-public-sans transition-colors focus:outline-none bg-primary text-white hover:bg-primary-dark px-6 py-1 h-9 text-sm leading-6"
          >
            <Plus size={14} />
            Create Coupon
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STAT_CARDS.map(({ label, value, bg, icon: Icon }) => (
            <div key={label} className={`rounded-2xl p-5 flex items-center gap-4 ${bg}`}>
              <div className="size-14 rounded-full flex items-center justify-center shrink-0 bg-surface text-primary">
                <Icon size={24} />
              </div>
              <div>
                <h4 className="text-light-primary-text text-sm font-semibold font-public-sans mb-1">{label}</h4>
                <div className="text-2xl font-bold font-dm-sans text-light-primary-text">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PromoRows
        promos={promos}
        setStatusAction={setStatusAction}
        deleteAction={deletePromotionAction}
        currencyCode={settings?.currency_code || 'USD'}
        locale={settings?.locale || 'en-US'}
      />
    </div>
  );
}
