import { formatCOP } from "./format";

/** Abre WhatsApp con un mensaje de cobro ya escrito. Asume Colombia si el número tiene 10 dígitos. */
export function whatsappUrl(phone: string, name: string, balance: number) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? `57${digits}` : digits;
  const text = `Hola ${name}, te escribimos de la tienda para recordarte que tienes un saldo pendiente de ${formatCOP(balance)}. ¡Gracias!`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}