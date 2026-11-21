import { ScrollView, Text } from 'react-native';

import { Card, styles as ui } from '../components/ui';
import { privacyPolicy } from '../content/privacyPolicy';

/** The policy is bundled with the app so it remains accessible offline. */
export default function PrivacyScreen() {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={ui.cardTitle}>{privacyPolicy.appName}</Text>
      <Text style={ui.muted}>Effective {privacyPolicy.effectiveDate}</Text>
      <Text style={ui.body}>{privacyPolicy.introduction}</Text>
      {privacyPolicy.sections.map((section) => (
        <Card key={section.heading}>
          <Text style={ui.cardTitle} accessibilityRole="header">{section.heading}</Text>
          <Text style={ui.body} selectable>{section.text}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
