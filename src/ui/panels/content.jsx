// Content blocks shared by the island panels and the classic page.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { certifications, contact, credits, education, profile, skills } from '../../data/portfolio'
import { hasEmailJs, sendMessage } from '../../lib/contact'
import { Arrow, Download, Github, Linkedin, Mail } from '../icons'

export function Bio() {
  return <div className="space-y-3 leading-relaxed text-cream/90">{profile.bio.map((p) => <p key={p}>{p}</p>)}</div>
}

export function Education() {
  return (
    <ul className="space-y-2">
      {[...education, ...certifications].map((e) => (
        <li key={e.degree} className="flex gap-3 rounded-2xl bg-cream/6 px-4 py-3 ring-1 ring-cream/10">
          <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rotate-45 bg-apricot shadow-[0_0_8px_rgb(255_194_122/0.8)]" />
          <span>
            <span className="block font-semibold">{e.degree}</span>
            <span className="block text-sm text-cream/70">{e.school} · {e.when}</span>
          </span>
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
          <h4 className="hud-label mb-2 !text-apricot">{group}</h4>
          <ul className="flex flex-wrap gap-2">
            {items.map((skill) => (
              <motion.li
                key={skill}
                className="chip !text-sm !font-semibold"
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

export function ResumeButton({ label = <><Download className="size-4" /> Download resume</>, className = 'btn-primary', ...rest }) {
  return <a href={contact.resume} download className={className} {...rest}>{label}</a>
}

export function Credits() {
  return <p className="mt-6 text-xs text-cream/60">{credits}</p>
}

export function ProjectCard({ project }) {
  return (
    <>
      <figure className="relative overflow-hidden rounded-2xl ring-1 ring-cream/15 shadow-[0_20px_40px_-18px_rgb(6_5_22/0.9)]">
        <img src={project.image} alt={project.imageAlt} loading="lazy" width="640" height="360" className="aspect-video w-full object-cover" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent" />
        {project.demo && (
          <span className="chip absolute top-3 left-3 gap-1.5 !bg-night/70 backdrop-blur">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lagoon shadow-[0_0_8px_rgb(47_183_168)]" /> Live
          </span>
        )}
      </figure>
      <p className="mt-5 leading-relaxed text-cream/90">{project.description}</p>
      <p className="hud-label mt-5 mb-2">Built with</p>
      <ul className="flex flex-wrap gap-2" aria-label="Tech stack">
        {project.tech.map((t) => <li key={t} className="chip">{t}</li>)}
      </ul>
      {(project.github || project.demo) && (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noreferrer" className="btn-primary">
              Live demo <Arrow className="size-4" />
            </a>
          )}
          {project.github && (
            <a href={project.github} target="_blank" rel="noreferrer" className="btn-ghost">
              <Github className="size-4" /> GitHub
            </a>
          )}
        </div>
      )}
    </>
  )
}

export function ContactLinks() {
  const rows = [
    ['Email', contact.email, `mailto:${contact.email}`, Mail],
    ['LinkedIn', 'akash-kumar-singh', contact.linkedin, Linkedin],
    ['GitHub', 'Akashkr28', contact.github, Github],
  ]
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {rows.map(([label, text, href, Glyph]) => (
        <li key={label}>
          <a
            href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
            className="group flex h-full items-start gap-3 rounded-2xl bg-cream/6 px-4 py-3 ring-1 ring-cream/10 transition hover:-translate-y-0.5 hover:bg-cream/10 hover:ring-apricot/50"
          >
            <Glyph className="mt-0.5 size-5 shrink-0 text-apricot" />
            <span className="min-w-0">
              <span className="hud-label block">{label}</span>
              <span className="block text-sm break-all">{text}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

const field = 'w-full rounded-xl bg-night/60 px-3.5 py-2.5 ring-1 ring-cream/15 transition placeholder:text-cream/45 focus:ring-2 focus:ring-apricot focus:outline-none'

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
        <label className="hud-label block">
          Name
          <input name="name" required autoComplete="name" className={`${field} mt-1.5 text-base font-normal tracking-normal text-cream normal-case sm:text-sm`} />
        </label>
        <label className="hud-label block">
          Email
          <input name="email" type="email" required autoComplete="email" className={`${field} mt-1.5 text-base font-normal tracking-normal text-cream normal-case sm:text-sm`} />
        </label>
      </div>
      <label className="hud-label block">
        Message
        <textarea name="message" required rows={4} className={`${field} mt-1.5 resize-y text-base font-normal tracking-normal text-cream normal-case sm:text-sm`} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === 'sending'} className="btn-primary">
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
