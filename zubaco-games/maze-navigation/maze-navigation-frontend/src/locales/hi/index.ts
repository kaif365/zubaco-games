import { instructionStageContent } from './instruction-stages';

const stage = instructionStageContent;

export const hi = {
  translation: {
    meta: {
      title: 'मेज़ नेविगेशन',
      description: 'लौ के साथ मेज़ नेविगेशन गेम।',
    },
    auth: {
      failed: 'सत्र शुरू नहीं हो सका',
    },
    instructions: {
      primaryCtaLabel: 'अभी खेलें',
      secondaryCtaLabel: 'कैसे खेलें?',
      stages: {
        '1': stage,
        '2': stage,
        '3': stage,
        '4': stage,
      },
    },
    results: {
      success: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'बहुत बढ़िया!',
        headingLeading: 'शाबाश! आपने पूरा किया',
        headingHighlight: ' स्टेज',
        headingTrailing: '',
        subheading: 'आगे के गेम के लिए तैयार रहें।',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'पूरे गेम',
        ctaLabel: 'जारी रखें',
      },
      failure: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'कोशिश अच्छी थी!',
        headingLeading: 'चिंता न करें, अगले',
        headingHighlight: ' गेम में फिर कोशिश करें',
        headingTrailing: '',
        subheading: 'अभ्यास जारी रखें!',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'पूरे गेम',
        ctaLabel: 'जारी रखें',
      },
    },
    hud: {
      done: 'हो गया',
      settings: 'सेटिंग्स',
      closeSettings: 'सेटिंग्स बंद करें',
      openSettings: 'सेटिंग्स खोलें',
      soundEffects: 'ध्वनि प्रभाव',
      soundOn: 'चालू',
      soundOff: 'बंद',
      startFresh: 'नया शुरू',
      testing: 'टेस्ट',
      returnHome: 'होम पर वापस',
      level: 'लेवल',
      mode: 'मोड',
      demo: 'डेमो',
      time: 'समय',
    },
    controls: {
      hint: 'तीर, WASD या स्वाइप',
    },
    tutorial: {
      tapToContinue: 'जारी रखने के लिए टैप करें',
    },
    common: {
      loading: 'लोड हो रहा है...',
    },
    loading: {
      game: 'गेम लोड हो रहा है',
    },
    demo: {
      noLevelsAdded: 'कोई DEMO स्तर नहीं जोड़े गए',
    },
  },
};
