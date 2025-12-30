import { Metadata } from "next";
import { PageHeader, ProseContainer } from "@/components/static";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using CronUptime services.",
  alternates: {
    canonical: "https://www.cronuptime.com/terms",
  },
  openGraph: {
    title: "Terms of Service - CronUptime",
    description: "Terms and conditions for using CronUptime services.",
  },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms of Service"
        description="Please read these terms carefully before using our service."
        lastUpdated="December 15, 2024"
      />
      <ProseContainer>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using CronUptime (&quot;the Service&quot;), you agree to be bound by these 
          Terms of Service. If you do not agree to these terms, please do not use our Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          CronUptime provides cron job scheduling and uptime monitoring services. We offer 
          both free and paid tiers with varying features and limitations.
        </p>

        <h3>2.1 Free Tier</h3>
        <p>
          Guest users may create one cron job without registration. This cron job will 
          automatically expire after 7 days. Registered free users have access to limited 
          features as described on our pricing page.
        </p>

        <h3>2.2 Paid Tiers</h3>
        <p>
          Paid subscriptions provide additional features and higher limits. Specific terms 
          for paid services are provided at the time of purchase.
        </p>

        <h2>3. User Responsibilities</h2>
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate information when creating an account</li>
          <li>Maintain the security of your account credentials</li>
          <li>Use the Service only for lawful purposes</li>
          <li>Not attempt to disrupt or overload our systems</li>
          <li>Not use the Service to send spam or malicious requests</li>
        </ul>

        <h2>4. Prohibited Uses</h2>
        <p>You may not use the Service to:</p>
        <ul>
          <li>Conduct DDoS attacks or any form of cyber attack</li>
          <li>Send unsolicited requests to third-party services</li>
          <li>Scrape or harvest data without authorization</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on intellectual property rights</li>
        </ul>

        <h2>5. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted service. 
          Scheduled maintenance and unforeseen outages may occur. We will make reasonable 
          efforts to notify users of planned downtime.
        </p>

        <h2>6. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our{" "}
          <a href="/privacy">Privacy Policy</a>. By using the Service, you consent to 
          our data practices as described in that policy.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          CronUptime is provided &quot;as is&quot; without warranties of any kind. We are not liable 
          for any damages arising from your use of the Service, including but not limited to:
        </p>
        <ul>
          <li>Loss of data or profits</li>
          <li>Service interruptions</li>
          <li>Errors in cron job execution</li>
          <li>Third-party service failures</li>
        </ul>

        <h2>8. Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms. 
          You may also delete your account at any time through your account settings.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the Service after 
          changes constitutes acceptance of the new terms. We will notify users of significant 
          changes via email or in-app notification.
        </p>

        <h2>10. Contact</h2>
        <p>
          If you have questions about these terms, please contact us at{" "}
          <a href="/contact">our contact page</a>.
        </p>

        <hr />
        <p className="text-sm">
          These terms are effective as of December 15, 2024.
        </p>
      </ProseContainer>
    </>
  );
}

