import type { Metadata } from 'next'
import { NavBar } from '@/components/landing/NavBar'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { ProblemSolutionSection } from '@/components/landing/ProblemSolutionSection'
import { TeacherMockSection } from '@/components/landing/TeacherMockSection'
import { CTASection } from '@/components/landing/CTASection'
import { AnimatedSection } from '@/components/landing/AnimatedSection'

export const metadata: Metadata = {
  title: 'Tutelo — Professional Tutoring Pages for Teachers',
  description:
    'Create a shareable tutoring page in minutes. Manage bookings, share your link, and grow your practice — free for teachers.',
  openGraph: {
    title: 'Tutelo — Professional Tutoring Pages for Teachers',
    description:
      'Create a shareable tutoring page in minutes. Manage bookings, share your link, and grow your practice — free for teachers.',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Tutelo' }],
  },
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <AnimatedSection delay={0}>
        <HeroSection />
      </AnimatedSection>
      <AnimatedSection>
        <HowItWorksSection />
      </AnimatedSection>
      <AnimatedSection>
        <TeacherMockSection />
      </AnimatedSection>
      <AnimatedSection>
        <ProblemSolutionSection />
      </AnimatedSection>
      <AnimatedSection>
        <CTASection />
      </AnimatedSection>
    </div>
  )
}
