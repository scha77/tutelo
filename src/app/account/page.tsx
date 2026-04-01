import { redirect } from 'next/navigation'

export const metadata = { title: 'My Sessions — Tutelo' }

export default function AccountPage() {
  redirect('/parent/bookings')
}
