import Image from 'next/image'
import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — OurFamCalendar' }

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-gray-500">Last updated: May 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">1. Who we are</h2>
          <p>
            OurFamCalendar is a private, invitation-only family event calendar. Access is restricted
            to members who have received a family invite code. This site is not open to the public.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">2. Information we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Name and email address</strong> — required to create an account.</li>
            <li><strong>Phone number</strong> — optional; collected only if you choose to receive SMS notifications.</li>
            <li><strong>Event and RSVP data</strong> — events you create and RSVPs you submit.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">3. How we use your information</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To operate the family calendar and show you events you have access to.</li>
            <li>To send you email notifications about new events and reminders, if you have opted in.</li>
            <li>To send you SMS text message notifications about new events and reminders, if you have provided your phone number and opted in.</li>
          </ul>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">4. SMS messaging</h2>
          <p>
            By providing your phone number and enabling SMS notifications in your profile settings,
            you consent to receive text messages from OurFamCalendar about family events and reminders.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Message frequency:</strong> Varies based on how many events are created. Typically a few messages per month.</li>
            <li><strong>Message &amp; data rates may apply</strong> depending on your carrier plan.</li>
            <li>
              <strong>To opt out:</strong> Reply <strong>STOP </strong> to any message, or uncheck
              &ldquo;Text message&rdquo; in your profile settings.
            </li>
            <li><strong>For help:</strong> Reply HELP to any message or email us at {contactEmail}.</li>
          </ul>
          <p>SMS is powered by Twilio. Your phone number is not shared with any other parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">5. Data storage and security</h2>
          <p>
            Your data is stored in Supabase, a cloud database provider with encryption at rest and in
            transit. Only authenticated family members can view shared event and RSVP data. Your
            profile information (email, phone) is visible only to you and site administrators.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">6. Data retention</h2>
          <p>
            Your account and associated data are retained for as long as you have an active account.
            You may request deletion of your account and data by contacting us at {contactEmail}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">7. Contact</h2>
          <p>
            Questions about this policy? Email us at{' '}
            <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">
              {contactEmail}
            </a>
            .
          </p>
        </section>
      </main>
    </>
  )
}
