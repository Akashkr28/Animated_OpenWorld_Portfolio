// Content blocks shared by the island panels and the classic page.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { certifications, contact, credits, education, profile, skills } from '../../data/portfolio'
import { hasEmailJs, sendMessage } from '../../lib/contact'

export function Bio() {
  return <div className="space-y-3 leading-relaxed text-cream/90">{profile.bio.map((p) => <p key={p}>{p}</p>)}</div>
}

export function Education() {
  return (
    <ul className="space-y-2">
      {[...education, ...certifications].map((e) => (
        <li key={e.degree} className="rounded-2xl bg-cream/8 px-4 py-3">
          <p className="font-semibold">{e.degree}</p>
          <p className="text-sm text-cream/75">{e.school} · {e.when}</p>
        </li>
      ))}
    </ul>
  )
}

export function Skills() {
  let n = 0
  return (
    <div className="space-y-4">
      {skills.map(({ group, items }) => (
        <div key={group}>
          <h4 className="mb-2 text-sm font-semibold text-apricot">{group}</h4>
          <ul className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <motion.li
                key={skill}
                className="rounded-full border border-cream/15 bg-cream/8 px-3 py-1 text-sm"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(n++ * 0.02, 0.6), type: 'spring', stiffness: 380, damping: 22 }}
              >
                {skill}
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const linkClass = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors'

export function ResumeButton({ label = 'Download resume', className = `${linkClass} bg-coral text-night hover:bg-apricot` }) {
  return (
    <a href={contact.resume} download className={className}>
      {label} <span aria-hidden="true">↓</span>
    </a>
  )
}

export function Credits() {
  return <p className="mt-6 text-xs text-cream/60">{credits}</p>
}

export function ProjectCard({ project }) {
  return (
    <>
      <img
        src={project.image}
        alt={project.imageAlt}
        loading="lazy"
        width="640"
        height="360"
        className="aspect-video w-full rounded-2xl object-cover"
      />
      <p className="mt-4 leading-relaxed text-cream/90">{project.description}</p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tech stack">
        {project.tech.map((t) => <li key={t} className="rounded-full bg-cream/10 px-3 py-1 text-xs font-semibold">{t}</li>)}
      </ul>
      {(project.github || project.demo) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noreferrer" className={`${linkClass} bg-coral text-night hover:bg-apricot`}>
              Live demo <span aria-hidden="true">↗</span>
            </a>
          )}
          {project.github && (
            <a href={project.github} target="_blank" rel="noreferrer" className={`${linkClass} bg-cream/12 hover:bg-cream/20`}>
              GitHub <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
    </>
  )
}

export function ContactLinks() {
  const rows = [
    ['Email', contact.email, `mailto:${contact.email}`],
    ['LinkedIn', 'akash-kumar-singh', contact.linkedin],
    ['GitHub', 'Akashkr28', contact.github],
  ]
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {rows.map(([label, text, href]) => (
        <li key={label}>
          <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="block h-full rounded-2xl bg-cream/8 px-4 py-3 hover:bg-cream/15">
            <span className="block text-xs font-semibold text-apricot">{label}</span>
            <span className="block text-sm break-all">{text}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

const field = 'w-full rounded-xl border border-cream/20 bg-night/50 px-3 py-2 placeholder:text-cream/45 focus:border-apricot focus:outline-none'

export function ContactForm() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (data.website) return // honeypot filled in, so it's a bot
    setStatus('sending')
    setError('')
    try {
      const result = await sendMessage(data)
      setStatus(result)
      if (result === 'sent') form.reset()
    } catch (err) {
      console.error(err)
      setStatus('idle')
      setError(`That didn't send. Please email ${contact.email} directly.`)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Name
          <input name="name" required autoComplete="name" className={`${field} mt-1 font-normal`} />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input name="email" type="email" required autoComplete="email" className={`${field} mt-1 font-normal`} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Message
        <textarea name="message" required rows={4} className={`${field} mt-1 resize-y font-normal`} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === 'sending'} className={`${linkClass} bg-coral text-night hover:bg-apricot disabled:opacity-60`}>
          {status === 'sending' ? 'Sending…' : hasEmailJs ? 'Send message' : 'Send via your mail app'}
        </button>
        <p role="status" className="text-sm text-cream/85">
          {status === 'sent' && 'Message sent. Thank you!'}
          {status === 'mailto' && 'Your mail app should have opened with this message.'}
          {error}
        </p>
      </div>
    </form>
  )
}
