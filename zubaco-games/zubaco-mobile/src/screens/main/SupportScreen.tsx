import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

// TODO: Replace with API call or remote config
const FAQ_ITEMS: FaqItem[] = [
  { id: '1', question: 'How do I join a tournament?', answer: 'Go to the Tournament tab and tap on any upcoming tournament. Pay the entry fee to reserve your spot.' },
  { id: '2', question: 'How do withdrawals work?', answer: 'Complete KYC verification first. Then go to Wallet → Withdraw. Minimum withdrawal is ₹50. Funds are credited within 24 hours.' },
  { id: '3', question: 'What is bonus cash?', answer: 'Bonus cash is earned from referrals and promotions. It can be used to join tournaments but cannot be withdrawn directly.' },
  { id: '4', question: 'How is scoring calculated?', answer: 'Each game has its own scoring system based on speed, accuracy, and completion. Check game rules before playing.' },
  { id: '5', question: 'How do I report a bug?', answer: 'Tap "Contact Us" below to send us an email with details of the issue. Include screenshots if possible.' },
];

export const SupportScreen: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleContactUs = () => {
    Linking.openURL('mailto:support@zubaco.com?subject=Support%20Request');
  };

  const handleTerms = () => {
    // TODO: Replace with actual URLs
    Linking.openURL('https://zubaco.com/terms');
  };

  const handlePrivacy = () => {
    // TODO: Replace with actual URLs
    Linking.openURL('https://zubaco.com/privacy');
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Help & Support</Text>

      {/* FAQ Section */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      <View style={styles.faqContainer}>
        {FAQ_ITEMS.map((item) => (
          <View key={item.id}>
            <TouchableOpacity
              style={styles.faqRow}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqChevron}>
                {expandedId === item.id ? '−' : '+'}
              </Text>
            </TouchableOpacity>
            {expandedId === item.id && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Contact */}
      <TouchableOpacity style={styles.contactButton} onPress={handleContactUs} activeOpacity={0.7}>
        <Text style={styles.contactButtonText}>Contact Us</Text>
      </TouchableOpacity>

      {/* Links */}
      <View style={styles.links}>
        <TouchableOpacity onPress={handleTerms}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>•</Text>
        <TouchableOpacity onPress={handlePrivacy}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  faqContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 28,
  },
  faqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  faqQuestion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  faqChevron: {
    color: '#6C3CE1',
    fontSize: 20,
    fontWeight: '700',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#141425',
  },
  faqAnswerText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: '#6C3CE1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    color: '#6C3CE1',
    fontSize: 14,
  },
  linkDot: {
    color: '#6B7280',
    fontSize: 14,
  },
});
