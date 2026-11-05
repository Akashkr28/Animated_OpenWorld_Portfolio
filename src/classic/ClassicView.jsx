import { motion } from 'framer-motion'
import { Bio, ContactForm, ContactLinks, Education, ProjectCard, ResumeButton, Skills } from '../ui/panels/content'
import { milestones, profile, projects } from '../data/portfolio'
import { timeGreeting } from '../lib/greeting'
import { useGameStore } from '../store/useGameStore'

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <h2 id={`${id}-title`} className="mb-6 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      {children}
    </section>
  )
}

const NAV = [['about', 'About'], ['projects', 'Projects'], ['journey', 'Journey'], ['contact', 'Contact']]

export default function ClassicView() {
  const canRun3D = useGameStore((s) => s.canRun3D)
  const autoClassic = useGameStore((s) => s.autoClassic)
  const setMode = useGameStore((s) => s.setMode)

  return (
    <div className="min-h-full bg-gradient-to-b from-dusk via-night to-night">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <nav aria-label="Sections" className="flex gap-4 text-sm font-semibold">
          {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="hover:text-apricot">{label}</a>)}
        </nav>
        {canRun3D && (
          <button
            type="button"
            onClick={() => { useGameStore.setState({ autoClassic: false }); setMode('game') }}
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-night hover:bg-apricot"
          >
            Explore the 3D island
          </button>
        )}
      </header>

      <main>
        {autoClassic && (
          <p className="mx-auto mt-4 max-w-4xl px-5 text-sm text-cream/75">
            This device may struggle with the 3D island, so you're seeing the classic page. It has all the same content.
          </p>
        )}
        <motion.div
          className="mx-auto max-w-4xl px-5 pt-16 pb-6 sm:pt-24"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        >
          <p className="font-semibold text-apricot">{timeGreeting().title} I'm a {profile.title.toLowerCase()}</p>
          <h1 className="mt-1 font-display text-5xl leading-none font-extrabold sm:text-7xl">{profile.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-cream/85">{profile.tagline}</p>
          <div className="mt-5"><ResumeButton /></div>
        </motion.div>

        <Section id="about" title="About">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <Bio />
              <h3 className="mt-6 mb-2 font-display text-xl font-bold">Education and certification</h3>
              <Education />
            </div>
            <div>
              <h3 className="mb-3 font-display text-xl font-bold">Skills</h3>
              <Skills />
            </div>
          </div>
        </Section>

        <Section id="projects" title="Projects">
          <div className="grid gap-5 md:grid-cols-2">
            {projects.map((p) => (
              <article key={p.id} className="rounded-3xl border border-cream/12 bg-cream/5 p-5">
                <h3 className="font-display text-xl font-bold">{p.title}</h3>
                <p className="mb-3 text-sm font-semibold text-apricot">{p.summary}</p>
                <ProjectCard project={p} />
              </article>
            ))}
          </div>
        </Section>

        <Section id="journey" title="Journey">
          <ol className="space-y-5 border-l-2 border-coral/60 pl-6">
            {milestones.map((m) => (
              <li key={m.title} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full bg-coral" />
                <p className="text-sm font-semibold text-apricot">{m.when}</p>
                <h3 className="font-display text-xl font-bold">{m.title}</h3>
                <p className="text-cream/85">{m.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="contact" title="Contact">
          <ContactLinks />
          <div className="mt-3"><ResumeButton /></div>
          <div className="mt-6"><ContactForm /></div>
        </Section>
      </main>
    </div>
  )
}
