/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format currency in Indian style (e.g., ₹1,00,000.00)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate GST and subtotal for a series of products
 */
export function calculateGST(
  rate: number,
  quantity: number,
  gstPercent: number,
  discountPercent: number = 0
) {
  const baseAmount = rate * quantity;
  const discountAmount = baseAmount * (discountPercent / 100);
  const taxableAmount = baseAmount - discountAmount;
  const gstAmount = taxableAmount * (gstPercent / 100);
  const totalAmount = taxableAmount + gstAmount;

  return {
    baseAmount,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount
  };
}

/**
 * Format dates beautifully
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Generate a pre-filled WhatsApp share url
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  // Support both direct wa.me link with or without phone
  if (cleanPhone) {
    return `https://wa.me/91${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
