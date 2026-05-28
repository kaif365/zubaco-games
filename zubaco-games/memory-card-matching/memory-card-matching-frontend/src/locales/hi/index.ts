import type { StageInstructionContent } from '@micro-screens/src';

const memoryMatchInstructions: StageInstructionContent & {
  playNowButton: string;
  learnHowToPlay: string;
} = {
  gameLabel: 'गेम {stage}',
  statusLabel: 'सक्रिय',
  gameTitle: 'मेमोरी मैच',
  playNowButton: 'अभी खेलें',
  learnHowToPlay: 'कैसे खेलें?',
  slides: [
    {
      id: 'description',
      title: 'गेम विवरण',
      description:
        'मेमोरी मैच एक कार्ड-फ्लिपिंग गेम है जो आपकी एकाग्रता और याददाश्त को तेज करता है। नीचे रखे कार्ड थोड़ी देर के लिए दिखाए जाते हैं — जोड़ों को याद करें, फिर कार्ड पलटकर समय खत्म होने से पहले सभी जोड़े मिलाएँ।',
      items: [
        {
          id: 'observe',
          title: 'देखें',
          description: 'जब कार्ड खुले हों, सभी कार्ड ध्यान से देखें।',
          variant: 'step',
        },
        {
          id: 'memorize',
          title: 'याद रखें',
          description: 'हर जोड़े की जगह अपने मन में पक्की करें।',
          variant: 'step',
        },
        {
          id: 'match',
          title: 'मिलाएँ',
          description: 'जोड़ा खोजने के लिए एक बार में दो कार्ड पलटें।',
          variant: 'step',
        },
        {
          id: 'score',
          title: 'स्कोर',
          description: 'समय खत्म होने से पहले सभी जोड़े साफ करें।',
          variant: 'step',
        },
      ],
    },
    {
      id: 'scoring',
      title: 'स्कोरिंग नियम',
      description: 'जानें कि आपका प्रदर्शन कैसे आँका जाता है।',
      items: [
        {
          id: 'match',
          title: 'सही जोड़ा',
          description: 'हर सही जोड़े पर अंक मिलते हैं।',
          variant: 'step',
        },
        {
          id: 'speed',
          title: 'स्पीड बोनस',
          description: 'जल्दी खत्म करने पर समय-आधारित बोनस अंक मिलते हैं।',
          variant: 'step',
        },
        {
          id: 'mismatch',
          title: 'गलत जोड़ा',
          description: 'कार्ड वापस पलट जाते हैं — अंक नहीं कटते, खेलते रहें।',
          variant: 'step',
        },
        {
          id: 'levels',
          title: 'कई स्तर',
          description: 'हर साफ किया गया स्तर आपके कुल स्कोर में जुड़ता है।',
          variant: 'step',
        },
        {
          id: 'harder',
          title: 'बड़े ग्रिड',
          description: 'बड़े बोर्ड पर ज्यादा अंक मिलते हैं।',
          variant: 'step',
        },
      ],
    },
    {
      id: 'anti-cheat',
      title: 'एंटी-चीट नियम',
      description:
        'हम निष्पक्षता को गंभीरता से लेते हैं। ये काम अपने-आप अयोग्यता का कारण बनेंगे:',
      items: [
        {
          id: 'switch',
          title: 'गेम के दौरान ऐप बदलना या ब्राउज़र छोटा करना',
          description: '',
          variant: 'rule',
        },
        {
          id: 'patterns',
          title: 'संदिग्ध क्लिक पैटर्न (बहुत तेज या ऑटोमेटेड)',
          description: '',
          variant: 'rule',
        },
        {
          id: 'tools',
          title: 'बाहरी टूल या सहायता का उपयोग',
          description: '',
          variant: 'rule',
        },
        {
          id: 'accounts',
          title: 'अलग-अलग खातों से कई प्रयास',
          description: '',
          variant: 'rule',
        },
        {
          id: 'early',
          title: 'प्रीव्यू खत्म होने से पहले कार्ड न पलटें।',
          description: '',
          variant: 'rule',
        },
      ],
    },
  ],
};

export const hi = {
  translation: {
    auth: {
      fetchingDevUserTitle: 'साइन इन हो रहा है',
      fetchingDevUserCopy: 'आपका सत्र तैयार किया जा रहा है…',
      fetchingConfigTitle: 'गेम सेटिंग्स लोड हो रही हैं',
      fetchingConfigCopy: 'इस स्टेज के लिए कॉन्फ़िगरेशन लाया जा रहा है…',
      failedTitle: 'गेम शुरू नहीं हो सका',
    },
    errors: {
      connectionFailed: 'कनेक्शन विफल',
      startFailed: 'गेम शुरू करने में विफल',
      requestFailed: 'अनुरोध विफल',
      offline: 'आप ऑफ़लाइन हैं',
      contentFailed: 'सामग्री उपलब्ध नहीं',
      contentNotFound: 'इस स्टेज के लिए निर्देश सामग्री अभी कॉन्फ़िगर नहीं है।',
    },
    app: {
      authLoading: 'डमी उपयोगकर्ता टोकन लाया जा रहा है...',
      authFailed: 'प्रमाणीकरण विफल: {error}',
      configLoading: 'गेम कॉन्फिगरेशन लोड हो रहा है...',
      configError: 'गेम कॉन्फिगरेशन लोड नहीं हो सका। कृपया फिर कोशिश करें।',
      retry: 'फिर कोशिश करें',
      tiltTitle: 'झुकाव मिला!',
      tiltDescription: 'खेलते रहने के लिए पोर्ट्रेट मोड में आएँ',
      startTitle: 'मेमोरी मैच',
      startTagline: 'सभी मिलते जोड़े खोजें',
      startDescription: 'जीतने के लिए टाइमर खत्म होने से पहले सभी स्तर साफ करें।',
      startPlay: 'खेलें',
    },
    offline: {
      connectionLost: 'कनेक्शन खो गया',
      youAreOffline: 'आप ऑफ़लाइन हैं',
      message: 'जारी रखने के लिए इंटरनेट आवश्यक है। कृपया अपना नेटवर्क जाँचें और पुनः प्रयास करें।',
      retry: 'पुनः प्रयास करें',
    },
    demo: {
      badge: 'डेमो',
      skip: 'डेमो छोड़ें',
      memorize: 'याद रखें',
      complete: 'डेमो पूरा',
      progress: 'डेमो {level} / {total} · {matched} / {pairs}',
      demoCleared: 'डेमो पूरा हुआ',
    },
    game: {
      memorize: 'याद रखें',
      levelComplete: 'स्तर पूरा',
      levelProgress: 'स्तर {level} / {total} · {matched} / {pairs}',
      preparing: 'आपका गेम तैयार हो रहा है…',
      loadError: 'गेम डेटा लोड नहीं हो सका। कृपया फिर कोशिश करें।',
      missingLevelData: 'गेम सत्र पेलोड में स्तर डेटा नहीं है।',
      initFailed: 'गेम शुरू नहीं हो सका।',
      nextLevel: 'अगला स्तर',
      roundTransition: {
        nextRound: 'अगला राउंड',
      },
    },
    instructions: {
      stages: {
        1: memoryMatchInstructions,
        2: memoryMatchInstructions,
        3: memoryMatchInstructions,
        4: memoryMatchInstructions,
      },
    },
    results: {
      success: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'आप शानदार कर रहे हैं',
        headingLeading: 'बहुत बढ़िया! आपने',
        headingHighlight: ' मेमोरी मैच पूरा किया!',
        headingTrailing: '',
        subheading: 'याददाश्त अच्छी रही — आगे के गेम्स में भी ऐसे ही खेलें।',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'गेम पूरे',
        ctaLabel: 'जारी रखें',
      },
      failure: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'आपने अच्छी कोशिश की!',
        headingLeading: 'चिंता न करें,',
        headingHighlight: ' अगले गेम में फिर कोशिश करें!',
        headingTrailing: '',
        subheading: 'अपनी मेमोरी का अभ्यास करते रहें — आप जरूर बेहतर होंगे!',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'गेम पूरे',
        ctaLabel: 'जारी रखें',
      },
    },
  },
} as const;
