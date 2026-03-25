'use client'

import * as m from 'motion/react-client'
import { staggerContainer, staggerItem } from '@/lib/animation'
import { templates, type TeacherTemplateData } from '@/lib/templates'
import { SwipeFileCard } from '@/components/dashboard/SwipeFileCard'

interface SwipeFileSectionProps {
  teacherData: TeacherTemplateData
}

export function SwipeFileSection({ teacherData }: SwipeFileSectionProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-1">
        Announcement Templates
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pre-written copy — click to copy, then paste into your email or social media.
      </p>

      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {templates.map((template) => (
          <m.div key={template.id} variants={staggerItem}>
            <SwipeFileCard
              title={template.title}
              description={template.description}
              content={template.render(teacherData)}
            />
          </m.div>
        ))}
      </m.div>
    </section>
  )
}
