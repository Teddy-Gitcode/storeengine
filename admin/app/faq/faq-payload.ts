export function faqPayload(formData: FormData): Record<string, unknown> | null {
  const question = String(formData.get('question') || '').trim();
  if (!question) return null;
  return {
    question,
    answer: String(formData.get('answer') || '').trim(),
    status: String(formData.get('status')) === 'draft' ? 'draft' : 'published',
    sort_order: Number(formData.get('sort_order') || 0),
  };
}
