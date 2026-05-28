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
      scoreFailed: 'स्कोर लोड करने में विफल',
      contentFailed: 'सामग्री उपलब्ध नहीं',
      contentNotFound: 'इस स्टेज के लिए निर्देश सामग्री अभी कॉन्फ़िगर नहीं है।',
    },
    meta: {
      title: 'ब्लॉक फिल',
      label: 'प्रीमियम पज़ल गेम',
    },
    game: {
      demo: 'डेमो',
      done: 'हो गया',
      demoCleared: 'डेमो पूरा हुआ',
      level: 'लेवल',
      round: 'राउंड',
      demoMessages: {
        title: 'कैसे खेलें',
        primaryInstruction: 'सभी मिलते-जुलते बिंदुओं को जोड़ें।',
        secondaryInstruction: 'राउंड खत्म करने के लिए बोर्ड का 100% भरें।',
        tip: 'सुझाव: रास्तों को पार करने से बचें और खाली सेल भरते जाएँ।',
      },
      demoToActualTransition: {
        title: 'स्कोर वाले राउंड शुरू हो रहे हैं',
        body: 'आपका सत्र टाइमर यहाँ से गिनना शुरू करेगा — इस राउंड को पूरा करने पर आपके स्कोर में जोड़ा जाएगा।',
      },
      roundAdvance: {
        loader: 'अगला राउंड लोड हो रहा है…',
      },
      finalRound: {
        loader: 'स्कोर की गणना हो रही है…',
      },
      pauseDialog: {
        tag: 'रुका हुआ',
        title: 'एक पल रुकें',
        description: 'अपना वर्तमान रास्ता जारी रखें, बोर्ड फिर से शुरू करें, या लेवल चयन पर वापस जाएँ।',
        resume: 'जारी रखें',
        restart: 'लेवल फिर शुरू करें',
        exit: 'लेवल्स पर वापस जाएँ',
      },
      winDialog: {
        tag: 'बोर्ड साफ हो गया',
        score: 'स्कोर',
        time: 'समय',
        target: 'लक्ष्य',
        scoreNote:
          'स्कोर की गणना `timeLimit - timeTaken` के रूप में की जाती है, शून्य की फ्लोर के साथ ताकि भविष्य के बैकएंड लीडरबोर्ड नियम निर्धारित रहें।',
        replay: 'फिर खेलें',
        nextLevel: 'अगला लेवल',
        finishPack: 'पैक समाप्त करें',
        levelSelect: 'लेवल चुनें',
      },
    },
    tilt: {
      title: 'झुकाव पकड़ा गया!',
      message: 'खेलते रहने के लिए पोर्ट्रेट मोड पर स्विच करें',
    },
    offline: {
      connectionLost: 'कनेक्शन खो गया',
      youAreOffline: 'आप ऑफ़लाइन हैं',
      message: 'जारी रखने के लिए इंटरनेट आवश्यक है। कृपया अपना नेटवर्क जाँचें और पुनः प्रयास करें।',
      retry: 'पुनः प्रयास करें',
    },
    instructions: {
      labels: {
        playNow: 'अभी खेलें',
        learnHowToPlay: 'खेलना कैसे सीखें?',
        starting: 'शुरू हो रहा है...',
      },
      stages: {
        '1': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'ब्लॉक फिल',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'मिलते-जुलते रंगीन बिंदुओं को एक निरंतर पथ से जोड़ें और ग्रिड के हर सेल को भरें। समय समाप्त होने से पहले जितने हो सकें उतने पज़ल पूरे करें।',
              items: [
                {
                  id: 'connect',
                  title: 'जोड़ें',
                  description: 'एक ही रंग के दो बिंदुओं के बीच रास्ता बनाएँ।',
                  variant: 'step',
                },
                {
                  id: 'fill',
                  title: 'भरें',
                  description: 'पज़ल हल करने के लिए ग्रिड का हर सेल ढका होना चाहिए।',
                  variant: 'step',
                },
                {
                  id: 'no-cross',
                  title: 'क्रॉसिंग नहीं',
                  description: 'रास्ते एक-दूसरे को काट या ओवरलैप नहीं कर सकते।',
                  variant: 'step',
                },
                {
                  id: 'advance',
                  title: 'आगे बढ़ें',
                  description: 'अगले पज़ल पर जाने के लिए पज़ल हल करें।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे निकाले जाते हैं।',
              items: [
                {
                  id: 'puzzle-complete',
                  title: 'पज़ल पूरा',
                  description: 'पज़ल हल करने पर ग्रिड आकार और गति के आधार पर अंक मिलते हैं।',
                  variant: 'step',
                },
                {
                  id: 'full-fill',
                  title: 'पूर्ण भराव बोनस',
                  description: 'कोई खाली सेल छोड़े बिना सभी सेल भरने पर बोनस मिलता है।',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'समय सीमा',
                  description: 'टाइमर समाप्त होने से पहले जितने हो सकें पज़ल हल करें।',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'अंतिम स्कोर',
                  description: 'अंतिम स्कोर सभी पूर्ण पज़ल का कुल है।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'एंटी-चीट नियम',
              description: 'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्य स्वचालित अयोग्यता का कारण बनेंगे:',
              items: [
                {
                  id: 'switch',
                  title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र छोटा करना',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'संदिग्ध इंटरैक्शन पैटर्न (बहुत तेज़ या स्वचालित)',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'tools',
                  title: 'बाहरी उपकरणों या सहायता का उपयोग',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'accounts',
                  title: 'अलग-अलग खातों से कई प्रयास',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '2': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'ब्लॉक फिल',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'मिलते-जुलते रंगीन बिंदुओं को एक निरंतर पथ से जोड़ें और ग्रिड के हर सेल को भरें। समय समाप्त होने से पहले जितने हो सकें उतने पज़ल पूरे करें।',
              items: [
                { id: 'connect', title: 'जोड़ें', description: 'एक ही रंग के दो बिंदुओं के बीच रास्ता बनाएँ।', variant: 'step' },
                { id: 'fill', title: 'भरें', description: 'पज़ल हल करने के लिए ग्रिड का हर सेल ढका होना चाहिए।', variant: 'step' },
                { id: 'no-cross', title: 'क्रॉसिंग नहीं', description: 'रास्ते एक-दूसरे को काट या ओवरलैप नहीं कर सकते।', variant: 'step' },
                { id: 'advance', title: 'आगे बढ़ें', description: 'अगले पज़ल पर जाने के लिए पज़ल हल करें।', variant: 'step' },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे निकाले जाते हैं।',
              items: [
                { id: 'puzzle-complete', title: 'पज़ल पूरा', description: 'पज़ल हल करने पर ग्रिड आकार और गति के आधार पर अंक मिलते हैं।', variant: 'step' },
                { id: 'full-fill', title: 'पूर्ण भराव बोनस', description: 'कोई खाली सेल छोड़े बिना सभी सेल भरने पर बोनस मिलता है।', variant: 'step' },
                { id: 'time-limit', title: 'समय सीमा', description: 'टाइमर समाप्त होने से पहले जितने हो सकें पज़ल हल करें।', variant: 'step' },
                { id: 'final-score', title: 'अंतिम स्कोर', description: 'अंतिम स्कोर सभी पूर्ण पज़ल का कुल है।', variant: 'step' },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'एंटी-चीट नियम',
              description: 'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्य स्वचालित अयोग्यता का कारण बनेंगे:',
              items: [
                { id: 'switch', title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र छोटा करना', description: '', variant: 'rule' },
                { id: 'patterns', title: 'संदिग्ध इंटरैक्शन पैटर्न (बहुत तेज़ या स्वचालित)', description: '', variant: 'rule' },
                { id: 'tools', title: 'बाहरी उपकरणों या सहायता का उपयोग', description: '', variant: 'rule' },
                { id: 'accounts', title: 'अलग-अलग खातों से कई प्रयास', description: '', variant: 'rule' },
              ],
            },
          ],
        },
        '3': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'ब्लॉक फिल',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'मिलते-जुलते रंगीन बिंदुओं को एक निरंतर पथ से जोड़ें और ग्रिड के हर सेल को भरें। समय समाप्त होने से पहले जितने हो सकें उतने पज़ल पूरे करें।',
              items: [
                { id: 'connect', title: 'जोड़ें', description: 'एक ही रंग के दो बिंदुओं के बीच रास्ता बनाएँ।', variant: 'step' },
                { id: 'fill', title: 'भरें', description: 'पज़ल हल करने के लिए ग्रिड का हर सेल ढका होना चाहिए।', variant: 'step' },
                { id: 'no-cross', title: 'क्रॉसिंग नहीं', description: 'रास्ते एक-दूसरे को काट या ओवरलैप नहीं कर सकते।', variant: 'step' },
                { id: 'advance', title: 'आगे बढ़ें', description: 'अगले पज़ल पर जाने के लिए पज़ल हल करें।', variant: 'step' },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे निकाले जाते हैं।',
              items: [
                { id: 'puzzle-complete', title: 'पज़ल पूरा', description: 'पज़ल हल करने पर ग्रिड आकार और गति के आधार पर अंक मिलते हैं।', variant: 'step' },
                { id: 'full-fill', title: 'पूर्ण भराव बोनस', description: 'कोई खाली सेल छोड़े बिना सभी सेल भरने पर बोनस मिलता है।', variant: 'step' },
                { id: 'time-limit', title: 'समय सीमा', description: 'टाइमर समाप्त होने से पहले जितने हो सकें पज़ल हल करें।', variant: 'step' },
                { id: 'final-score', title: 'अंतिम स्कोर', description: 'अंतिम स्कोर सभी पूर्ण पज़ल का कुल है।', variant: 'step' },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'एंटी-चीट नियम',
              description: 'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्य स्वचालित अयोग्यता का कारण बनेंगे:',
              items: [
                { id: 'switch', title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र छोटा करना', description: '', variant: 'rule' },
                { id: 'patterns', title: 'संदिग्ध इंटरैक्शन पैटर्न (बहुत तेज़ या स्वचालित)', description: '', variant: 'rule' },
                { id: 'tools', title: 'बाहरी उपकरणों या सहायता का उपयोग', description: '', variant: 'rule' },
                { id: 'accounts', title: 'अलग-अलग खातों से कई प्रयास', description: '', variant: 'rule' },
              ],
            },
          ],
        },
        '4': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'ब्लॉक फिल',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'मिलते-जुलते रंगीन बिंदुओं को एक निरंतर पथ से जोड़ें और ग्रिड के हर सेल को भरें। समय समाप्त होने से पहले जितने हो सकें उतने पज़ल पूरे करें।',
              items: [
                { id: 'connect', title: 'जोड़ें', description: 'एक ही रंग के दो बिंदुओं के बीच रास्ता बनाएँ।', variant: 'step' },
                { id: 'fill', title: 'भरें', description: 'पज़ल हल करने के लिए ग्रिड का हर सेल ढका होना चाहिए।', variant: 'step' },
                { id: 'no-cross', title: 'क्रॉसिंग नहीं', description: 'रास्ते एक-दूसरे को काट या ओवरलैप नहीं कर सकते।', variant: 'step' },
                { id: 'advance', title: 'आगे बढ़ें', description: 'अगले पज़ल पर जाने के लिए पज़ल हल करें।', variant: 'step' },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे निकाले जाते हैं।',
              items: [
                { id: 'puzzle-complete', title: 'पज़ल पूरा', description: 'पज़ल हल करने पर ग्रिड आकार और गति के आधार पर अंक मिलते हैं।', variant: 'step' },
                { id: 'full-fill', title: 'पूर्ण भराव बोनस', description: 'कोई खाली सेल छोड़े बिना सभी सेल भरने पर बोनस मिलता है।', variant: 'step' },
                { id: 'time-limit', title: 'समय सीमा', description: 'टाइमर समाप्त होने से पहले जितने हो सकें पज़ल हल करें।', variant: 'step' },
                { id: 'final-score', title: 'अंतिम स्कोर', description: 'अंतिम स्कोर सभी पूर्ण पज़ल का कुल है।', variant: 'step' },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'एंटी-चीट नियम',
              description: 'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्य स्वचालित अयोग्यता का कारण बनेंगे:',
              items: [
                { id: 'switch', title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र छोटा करना', description: '', variant: 'rule' },
                { id: 'patterns', title: 'संदिग्ध इंटरैक्शन पैटर्न (बहुत तेज़ या स्वचालित)', description: '', variant: 'rule' },
                { id: 'tools', title: 'बाहरी उपकरणों या सहायता का उपयोग', description: '', variant: 'rule' },
                { id: 'accounts', title: 'अलग-अलग खातों से कई प्रयास', description: '', variant: 'rule' },
              ],
            },
          ],
        },
      },
    },
    results: {
      success: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'पज़ल मास्टर!',
        headingLeading: 'शाबाश! आपने',
        headingHighlight: ' फ्लो पज़ल',
        headingTrailing: ' हल कर लिया!',
        subheading: 'शानदार पाथफाइंडिंग — आगे के खेलों में भी इसी तरह आगे बढ़ें।',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'पज़ल पूरे किए',
        ctaLabel: 'जारी रखें',
      },
      failure: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'अच्छी कोशिश!',
        headingLeading: 'चिंता न करें,',
        headingHighlight: ' अगले खेल में',
        headingTrailing: ' फिर कोशिश करें!',
        subheading: 'अपना फ्लो अभ्यास करते रहें — अगली बार जरूर सफल होंगे!',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'पज़ल पूरे किए',
        ctaLabel: 'जारी रखें',
      },
    },
  },
} as const;
