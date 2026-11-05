import { contact } from '../data/portfolio'

const env = import.meta.env
const emailJs = {
  service_id: env.VITE_EMAILJS_SERVICE_ID,
  template_id: env.VITE_EMAILJS_TEMPLATE_ID,
  user_id: env.VITE_EMAILJS_PUBLIC_KEY,
}
export const hasEmailJs = Object.values(emailJs).every(Boolean)

// Sends through EmailJS when configured, otherwise hands off to the visitor's mail app.
export async function sendMessage({ name, email, message }) {
  if (!hasEmailJs) {
    const subject = encodeURIComponent(`Portfolio message from ${name}`)
    const body = encodeURIComponent(`${message}\n\n${name} (${email})`)
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`
    return 'mailto'
  }
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...emailJs, template_params: { from_name: name, reply_to: email, message } }),
  })
  if (!res.ok) throw new Error(await res.text())
  return 'sent'
}
