import { AnimatePresence } from 'framer-motion'
import Panel from '../Panel'
import GuestbookPage from './GuestbookPage'
import WorldMap from './WorldMap'
import { Bio, ContactForm, ContactLinks, Education, ProjectCard, ResumeButton, Skills } from './content'
import { profile, projects } from '../../data/portfolio'
import { timeGreeting } from '../../lib/greeting'
import { useGameStore } from '../../store/useGameStore'

const heading = 'mb-2 mt-6 font-display text-lg font-bold'

function Body({ panel, onClose }) {
  if (panel.type === 'map') {
    return (
      <Panel eyebrow="Choose a place to travel to" title="World map" onClose={onClose}>
        <WorldMap />
      </Panel>
    )
  }
  if (panel.type === 'about') {
    return (
      <Panel eyebrow={`${timeGreeting().title} I'm a ${profile.title.toLowerCase()}`} title={profile.name} onClose={onClose}>
        <Bio />
        <div className="mt-4"><ResumeButton /></div>
        <h3 className={heading}>Education and certification</h3>
        <Education />
        <h3 className={heading}>Skills</h3>
        <Skills />
      </Panel>
    )
  }
  if (panel.type === 'skills') {
    return (
      <Panel eyebrow="From the bookshelf" title="Skills" onClose={onClose}>
        <Skills />
      </Panel>
    )
  }
  if (panel.type === 'education') {
    return (
      <Panel eyebrow="On the wall" title="Education and certification" onClose={onClose}>
        <Education />
      </Panel>
    )
  }
  if (panel.type === 'guestbook') {
    return (
      <Panel eyebrow="Everyone who has washed ashore" title="Island guestbook" onClose={onClose}>
        <GuestbookPage />
      </Panel>
    )
  }
  if (panel.type === 'project') {
    const project = projects.find((p) => p.id === panel.id)
    return (
      <Panel eyebrow={project.summary} title={project.title} onClose={onClose}>
        <ProjectCard project={project} />
      </Panel>
    )
  }
  return (
    <Panel eyebrow="Say hello" title="Get in touch" onClose={onClose}>
      <ContactLinks />
      <div className="mt-3"><ResumeButton /></div>
      <h3 className={heading}>Send a message</h3>
      <ContactForm />
    </Panel>
  )
}

export default function PanelHost() {
  const panel = useGameStore((s) => s.panel)
  const closePanel = useGameStore((s) => s.closePanel)
  return (
    <AnimatePresence>
      {panel && <Body key={panel.type + (panel.id ?? '')} panel={panel} onClose={closePanel} />}
    </AnimatePresence>
  )
}
