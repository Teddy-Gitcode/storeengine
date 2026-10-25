import { getCustomers } from '@/lib/admin-api';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const page = await getCustomers({ page_size: 200 });
  return <CustomersClient initialCustomers={page.results} />;
}
