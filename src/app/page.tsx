import type { Metadata } from 'next'
import { NavBar } from '@/components/landing/NavBar'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { ProblemSolutionSection } from '@/components/landing/ProblemSolutionSection'
import { TeacherMockSection } from '@/components/landing/TeacherMockSection'
import { CTASection } from '@/components/landing/CTASection'

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
      <HeroSection />
      <HowItWorksSection />
      <TeacherMockSection />
      <ProblemSolutionSection />
      <CTASection />
    </div>
  )
}
