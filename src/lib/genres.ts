/**
 * The look of each shelf. Every subject is its own cloth binding, foil colour
 * and pattern, so a shelf reads at a glance like a real bookshop section.
 */
import {
  Briefcase,
  Code2,
  Cog,
  Compass,
  FlaskConical,
  GraduationCap,
  Landmark,
  Languages,
  Palette,
  PenLine,
  Sigma,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Subject } from './xchange'

export type Pattern = 'linen' | 'stripes' | 'dots' | 'grid' | 'herringbone' | 'plain'

export interface Genre {
  cloth: string
  /** Darker shade for the spine and edges. */
  spine: string
  /** Foil used for the title and rules. */
  foil: string
  pattern: Pattern
  icon: LucideIcon
  /** A short line for the brass shelf plaque. */
  tagline: string
}

export const GENRES: Record<Subject, Genre> = {
  Writing: { cloth: '#2f5d46', spine: '#1f3f2f', foil: '#e6c674', pattern: 'linen', icon: PenLine, tagline: 'Essays, stories, voice' },
  Finance: { cloth: '#7a2430', spine: '#561820', foil: '#e9cf8a', pattern: 'stripes', icon: Landmark, tagline: 'Models, markets, money' },
  Engineering: { cloth: '#23405f', spine: '#172b41', foil: '#d9dde3', pattern: 'grid', icon: Cog, tagline: 'Design, systems, specs' },
  Math: { cloth: '#3b3a7a', spine: '#282757', foil: '#f0d98c', pattern: 'dots', icon: Sigma, tagline: 'Proofs, problems, patterns' },
  Science: { cloth: '#1f6b6b', spine: '#144a4a', foil: '#f3e3b0', pattern: 'linen', icon: FlaskConical, tagline: 'Labs, methods, data' },
  Coding: { cloth: '#2b2f36', spine: '#1a1d22', foil: '#9fd8b5', pattern: 'grid', icon: Code2, tagline: 'Review, debug, ship' },
  Business: { cloth: '#7a4a22', spine: '#573316', foil: '#f1d9a6', pattern: 'herringbone', icon: Briefcase, tagline: 'Strategy, pitches, plans' },
  'Study skills': { cloth: '#c08e2c', spine: '#8f6719', foil: '#2a2118', pattern: 'dots', icon: GraduationCap, tagline: 'Notes, recall, exams' },
  Careers: { cloth: '#6a2c5a', spine: '#4a1e3f', foil: '#f0cfa0', pattern: 'stripes', icon: Compass, tagline: 'Resumes, letters, interviews' },
  Languages: { cloth: '#b5532f', spine: '#843a1f', foil: '#fbe7c3', pattern: 'herringbone', icon: Languages, tagline: 'Grammar, practice, tone' },
  Creative: { cloth: '#b0436b', spine: '#82304e', foil: '#fde2c0', pattern: 'dots', icon: Palette, tagline: 'Art, music, ideas' },
  Other: { cloth: '#556070', spine: '#3b4350', foil: '#ead9b0', pattern: 'plain', icon: Sparkles, tagline: 'Everything else' },
}

export function genreOf(subject: string): Genre {
  return GENRES[subject as Subject] ?? GENRES.Other
}

/** Subtle cloth texture laid over the base colour. */
export function patternCss(p: Pattern): string {
  switch (p) {
    case 'linen':
      return 'repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)'
    case 'stripes':
      return 'repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 2px, transparent 2px 14px)'
    case 'dots':
      return 'radial-gradient(rgba(255,255,255,.09) 1px, transparent 1.4px) 0 0 / 9px 9px'
    case 'grid':
      return 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0 / 12px 12px'
    case 'herringbone':
      return 'repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0 3px, transparent 3px 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,.035) 0 3px, transparent 3px 8px)'
    default:
      return 'none'
  }
}
