import Image from 'next/image'
import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions — OurFamCalendar' }

export default function TermsPage() {
  const contactEmail = 'no-reply@ourfamcalendar.com'

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/login" className="flex items-center">
            <Image src="/navbarlogo.png" alt="OurFamCalendar" height={193} width={1033} className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 text-sm text-gray-700 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terms &amp; Conditions</h1>
          <p className="mt-2 text-gray-500">Last updated: May 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">1. Service</h2>
          <p>
            OurFamCalendar is a private, invitation-only family calendar. By creating an account,
            you agree to use the service only for its intended purpose: coordinating events among
            invited family members.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">2. Eligibility</h2>
          <p>
            Access requires a valid family invite code. You must be at least 13 years old to create
            an account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">3. SMS notifications</h2>
          <p>
            By opting in to SMS notifications, you consent to receive text messages about family
            events. Message and data rates may apply. Reply <strong>STOP</strong> to opt out at any
            time. Reply <strong>HELP</strong> for assistance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">4. Acceptable use</h2>
          <p>
            You agree not to post content that is harmful, offensive, or unrelated to family events.
            We reserve the right to remove content or accounts that violate this policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">5. Disclaimer</h2>
          <p>
            This service is provided as-is for personal family use. We make no guarantees of uptime
            or data retention, though we do our best to keep it reliable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">6. Contact</h2>
          <p>
            Questions?{' '}
            <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">
              {contactEmail}
            </a>
          </p>
        </section>
      </main>
    </>
  )
}
