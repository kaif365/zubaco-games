import { Controller, Get } from '@nestjs/common';

/**
 * Serve legal documents (Terms of Service, Privacy Policy, Responsible Gaming).
 * These are served as JSON with metadata; the actual rendered content
 * is displayed via WebView in the mobile app.
 */
@Controller('legal')
export class LegalController {
  @Get('terms')
  getTermsOfService() {
    return {
      title: 'Terms of Service',
      version: '1.2',
      effective_date: '2026-01-01',
      last_updated: '2026-01-01',
      sections: [
        {
          heading: '1. Eligibility',
          content:
            'You must be at least 18 years of age to create an account and use paid features. ' +
            'Users from states where real-money gaming is prohibited by law are restricted from participating in paid contests. ' +
            'By using Zubaco, you represent that you meet these eligibility requirements.',
        },
        {
          heading: '2. Account & Identity',
          content:
            'You agree to provide accurate information during registration. ' +
            'KYC verification (PAN, Aadhaar) is required for withdrawals exceeding ₹10,000. ' +
            'One account per person; duplicate accounts will be terminated.',
        },
        {
          heading: '3. Game of Skill',
          content:
            'Zubaco is a platform for games of skill as defined under the Public Gambling Act, 1867. ' +
            'Games offered require cognitive skills including memory, pattern recognition, speed, and logical reasoning. ' +
            'Outcomes are determined predominantly by the skill of participants.',
        },
        {
          heading: '4. Deposits & Withdrawals',
          content:
            'Deposits are processed through Razorpay. ' +
            'Withdrawals are subject to: KYC verification, 48-hour cooling period after bank detail changes, ' +
            'daily limits (3 transactions, ₹50,000 per day), and TDS deduction at 30% on net winnings as per Section 194BA.',
        },
        {
          heading: '5. GST',
          content:
            'Entry fees include 28% GST on the full face value as per GST Council ruling (October 2023). ' +
            'GST is collected and remitted by Zubaco.',
        },
        {
          heading: '6. Fair Play & Anti-Cheat',
          content:
            'The platform employs server-side seed-based randomization and anti-cheat systems. ' +
            'Any attempt to manipulate scores, exploit bugs, or use automation tools will result in account suspension and forfeiture of winnings.',
        },
        {
          heading: '7. Responsible Gaming',
          content:
            'Set daily deposit limits. Self-exclude via account settings if needed. ' +
            'If you feel gaming is affecting your finances or well-being, please contact support or helpline 1800-599-0019.',
        },
        {
          heading: '8. Account Termination',
          content:
            'You may delete your account at any time via the app. ' +
            'Pending withdrawals will be processed. Data is retained for 180 days as per regulatory requirements, then permanently deleted.',
        },
        {
          heading: '9. Dispute Resolution',
          content:
            'Disputes shall be resolved through arbitration under the Arbitration and Conciliation Act, 1996. ' +
            'Jurisdiction: Courts of Bangalore, Karnataka.',
        },
        {
          heading: '10. Limitation of Liability',
          content:
            'Zubaco shall not be liable for losses arising from technical failures, force majeure, ' +
            'or circumstances beyond reasonable control. Maximum liability is limited to the amount deposited by the user in the preceding 3 months.',
        },
      ],
    };
  }

  @Get('privacy')
  getPrivacyPolicy() {
    return {
      title: 'Privacy Policy',
      version: '1.1',
      effective_date: '2026-01-01',
      last_updated: '2026-01-01',
      sections: [
        {
          heading: '1. Information We Collect',
          content:
            'Personal: Name, phone, email, date of birth, state. ' +
            'Identity: PAN card, Aadhaar (for KYC). ' +
            'Financial: Bank details, UPI ID, transaction history. ' +
            'Device: Device ID, platform, app version. ' +
            'Gameplay: Scores, session data, game progress.',
        },
        {
          heading: '2. How We Use Your Information',
          content:
            'Account management and authentication. KYC verification. ' +
            'Processing deposits and withdrawals. Tax (TDS) computation and reporting. ' +
            'Anti-cheat and fraud detection. Improving game experience and personalization.',
        },
        {
          heading: '3. Data Sharing',
          content:
            'Payment processors (Razorpay) for transactions. ' +
            'Government authorities for TDS reporting (IT Department). ' +
            'Cloud service providers (AWS) for hosting. ' +
            'We do NOT sell personal data to third parties.',
        },
        {
          heading: '4. Data Security',
          content:
            'Data encrypted at rest (AES-256) and in transit (TLS 1.3). ' +
            'Access controls and audit logs. Regular security assessments. ' +
            'PCI-DSS compliant payment processing via Razorpay.',
        },
        {
          heading: '5. Data Retention',
          content:
            'Active accounts: data retained as long as account is active. ' +
            'Deleted accounts: personal data purged after 180 days. ' +
            'Financial records: retained for 8 years (Income Tax Act requirement). ' +
            'Game sessions: retained for 1 year for audit/dispute resolution.',
        },
        {
          heading: '6. Your Rights',
          content:
            'Access: Request a copy of your data. ' +
            'Correction: Update inaccurate information. ' +
            'Deletion: Delete account and personal data (subject to retention requirements). ' +
            'Portability: Export your data in machine-readable format.',
        },
        {
          heading: '7. Cookies & Analytics',
          content:
            'We use device identifiers for session management and analytics. ' +
            'No third-party advertising cookies. Analytics used solely for improving game experience.',
        },
        {
          heading: '8. Contact',
          content:
            'Data Protection Officer: dpo@zubaco.com. ' +
            'Grievance Officer: grievance@zubaco.com. ' +
            'Address: [Registered office address], Bangalore, Karnataka, India.',
        },
      ],
    };
  }

  @Get('responsible-gaming')
  getResponsibleGamingPolicy() {
    return {
      title: 'Responsible Gaming Policy',
      version: '1.0',
      sections: [
        {
          heading: 'Our Commitment',
          content:
            'Zubaco is committed to promoting responsible gaming. While our games are games of skill, ' +
            'we recognize that some users may develop unhealthy gaming habits.',
        },
        {
          heading: 'Tools Available',
          items: [
            'Daily deposit limits (configurable in settings)',
            'Session time reminders (after 60 minutes)',
            'Self-exclusion (7 days, 30 days, or permanent)',
            'Transaction history and spending reports',
            'Cool-off period before re-entry after losses',
          ],
        },
        {
          heading: 'Warning Signs',
          items: [
            'Playing to recover losses',
            'Spending more than you can afford',
            'Neglecting responsibilities to play',
            'Borrowing money to play',
            'Feeling anxious or irritable when not playing',
          ],
        },
        {
          heading: 'Help & Support',
          content:
            'National Helpline: 1800-599-0019 (toll-free). ' +
            'Email: support@zubaco.com. ' +
            'In-app: Settings > Help > Responsible Gaming.',
        },
      ],
    };
  }
}
