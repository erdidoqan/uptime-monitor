import { Metadata } from "next";
import { PageHeader, ProseContainer } from "@/components/static";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how UptimeTR collects, uses, and protects your data.",
  alternates: {
    canonical: "https://www.uptimetr.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy - UptimeTR",
    description: "Learn how UptimeTR collects, uses, and protects your data.",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        description="Your privacy is important to us. This policy explains how we handle your data."
        lastUpdated="December 15, 2024"
      />
      <ProseContainer>
        <h2>1. Information We Collect</h2>
        
        <h3>1.1 Account Information</h3>
        <p>
          When you sign up using Google OAuth, we collect:
        </p>
        <ul>
          <li>Your name and email address</li>
          <li>Profile picture (if available)</li>
          <li>Google account ID for authentication</li>
        </ul>

        <h3>1.2 Usage Data</h3>
        <p>
          We automatically collect information about how you use our Service:
        </p>
        <ul>
          <li>Cron job configurations (URLs, schedules, methods)</li>
          <li>Execution logs and response data</li>
          <li>IP addresses for rate limiting and security</li>
          <li>Browser type and device information</li>
        </ul>

        <h3>1.3 Guest Users</h3>
        <p>
          For guest users who create cron jobs without registration, we collect:
        </p>
        <ul>
          <li>IP address (to limit one cron job per guest)</li>
          <li>Cron job configuration data</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the collected information to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Execute your cron jobs as scheduled</li>
          <li>Monitor and improve service performance</li>
          <li>Prevent abuse and ensure security</li>
          <li>Send important service notifications</li>
          <li>Respond to support requests</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>
          Your data is stored on secure servers provided by Cloudflare. We implement 
          industry-standard security measures including:
        </p>
        <ul>
          <li>Encryption in transit (HTTPS/TLS)</li>
          <li>Encrypted database storage</li>
          <li>Regular security audits</li>
          <li>Access controls and authentication</li>
        </ul>

        <h2>4. Data Retention</h2>
        <ul>
          <li><strong>Guest cron jobs:</strong> Automatically deleted after 7 days</li>
          <li><strong>Execution logs:</strong> Retained for 30 days</li>
          <li><strong>Account data:</strong> Retained until account deletion</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Google OAuth:</strong> For authentication</li>
          <li><strong>Cloudflare:</strong> For hosting, CDN, and database services</li>
        </ul>
        <p>
          These services have their own privacy policies governing their use of your data.
        </p>

        <h2>6. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. 
          We do not use tracking or advertising cookies.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent for data processing</li>
        </ul>

        <h2>8. GDPR Compliance</h2>
        <p>
          For users in the European Economic Area (EEA), we comply with the General 
          Data Protection Regulation (GDPR). Our lawful bases for processing include:
        </p>
        <ul>
          <li>Contract performance (providing the Service)</li>
          <li>Legitimate interests (security, service improvement)</li>
          <li>Consent (where applicable)</li>
        </ul>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          Our Service is not intended for users under 13 years of age. We do not 
          knowingly collect data from children.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you 
          of significant changes via email or in-app notification.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For privacy-related inquiries, please contact us at{" "}
          <a href="/contact">our contact page</a>.
        </p>

        <hr />
        <p className="text-sm">
          This privacy policy is effective as of December 15, 2024.
        </p>
      </ProseContainer>
    </>
  );
}

