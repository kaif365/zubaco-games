export const hi = {
  translation: {
    meta: {
      title: 'अनुक्रम स्मरण',
    },
    game: {
      demo: 'डेमो',
      level: 'स्तर',
      levelComplete: 'स्तर पूरा हुआ',
      done: 'हो गया',
      demoCleared: 'डेमो पूरा हुआ',
      errorTitle: 'अनुक्रम स्मरण',
      errorMessage: 'खेल प्रारंभ नहीं हो सका। कृपया रिफ्रेश करें।',
      errorRefresh: 'रिफ्रेश करें',
      boardInstruction: {
        playback: 'क्रम को ध्यान से देखें।',
        input: 'क्रम दोहराने के लिए टैप करें',
      },
      roundTransition: {
        gameEnd: 'खेल खत्म',
        nextLevel: 'अगला स्तर',
        gameOver: 'खेल खत्म',
      },
      feedback: {
        startWhenReady: 'तैयार होने पर खेल शुरू करें।',
        getReady: 'तैयार हो जाएँ…',
        watchPattern: 'पैटर्न देखें ({length} टैप)।',
        yourTurn: 'आपकी बारी। क्रम दोहराएँ।',
        keepGoing: 'जारी रखें।',
        niceKeepGoing: 'बढ़िया। जारी रखें।',
        correct: 'सही!',
        wrongTryAgain: 'गलत क्रम! फिर कोशिश करें।',
        watchCarefully: 'क्रम को ध्यान से देखें।',
        watchSequence: 'क्रम देखें!',
        sessionResumed: 'सत्र फिर शुरू — क्रम देखें!',
        sessionComplete: 'सत्र पूरा!',
        sessionCompleteLevel: 'सत्र पूरा! आप स्तर {level} तक पहुँचे।',
        timeUp: 'समय समाप्त!',
        gameOver: 'खेल खत्म!',
        maxSequence: 'अधिकतम क्रम पहुँचा। उच्च स्कोर बनाए रखें।',
        timeUpEnded: 'समय समाप्त! सत्र समाप्त।',
        correctNext: 'सही! अगला क्रम लंबा है।',
      },
      roundFeedback: {
        watch: 'देखें',
        turn: 'बारी',
        sequenceFlow: 'क्रम प्रवाह',
        cleared: 'पूरे किए',
      },
      endGameDialog: {
        title: 'वर्तमान खेल समाप्त करें?',
        description:
          'आपका वर्तमान रन समाप्त हो जाएगा और बोर्ड रीसेट हो जाएगा। इसका उपयोग करें यदि आप अभी रोकना और नए सिरे से शुरू करना चाहते हैं।',
        confirm: 'खेल समाप्त करें',
        confirming: 'समाप्त हो रहा है…',
      },
      practiceDialog: {
        title: 'अभ्यास पूरा!',
        description:
          'बढ़िया काम! आपने अभ्यास क्रम पूरा कर लिया। लॉबी पर वापस जाएँ या सीधे असली खेल शुरू करें।',
        cancel: 'लॉबी पर वापस',
        confirm: 'खेल शुरू करें',
        confirming: 'शुरू हो रहा है…',
      },
      toast: {
        offline: 'इंटरनेट कनेक्शन नहीं है। कृपया पुनः कनेक्ट करें और प्रयास करें।',
        somethingWrong: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
      },
    },
    hud: {
      score: 'स्कोर',
      combo: 'कॉम्बो',
      lives: 'जीवन',
    },
    tutorial: {
      howToPlay: 'कैसे खेलें',
      tileDemo: 'टाइल प्रदर्शन',
      instruction: 'निर्देश',
      skip: 'छोड़ें',
      next: 'अगला',
      startGame: 'खेल शुरू करें',
      steps: {
        welcome: {
          title: 'अनुक्रम स्मरण में आपका स्वागत है',
          description: 'प्रत्येक चमकती टाइल देखें, फिर उसी क्रम को दोहराएँ।',
        },
        hud: {
          title: 'HUD का उपयोग करें',
          description: 'स्कोर, जीवन और स्ट्रीक ट्रैक करें। गलतियाँ एक जीवन कम करती हैं।',
        },
        controls: {
          title: 'माउस या कीबोर्ड का उपयोग करें',
          description: '1-4 कुंजियाँ दबाएँ या टाइल्स क्लिक करें। अपनी स्ट्रीक जीवित रखें।',
        },
      },
    },
    offline: {
      connectionLost: 'कनेक्शन खो गया',
      youAreOffline: 'आप ऑफ़लाइन हैं',
      message: 'जारी रखने के लिए इंटरनेट आवश्यक है। कृपया अपना नेटवर्क जाँचें और पुनः प्रयास करें।',
      retry: 'पुनः प्रयास करें',
    },
    dialog: {
      confirmation: 'पुष्टि',
      cancel: 'रद्द करें',
    },
    errors: {
      connectionFailed: 'कनेक्शन विफल',
      startFailed: 'गेम शुरू करने में विफल',
      requestFailed: 'अनुरोध विफल',
      offline: 'आप ऑफ़लाइन हैं',
      contentFailed: 'सामग्री उपलब्ध नहीं',
      contentNotFound: 'इस स्टेज के लिए निर्देश सामग्री अभी कॉन्फ़िगर नहीं है।',
    },
    auth: {
      failed: 'प्रमाणीकरण विफल',
      failedTitle: 'प्रमाणीकरण विफल',
      devFetching: 'डमी उपयोगकर्ता प्राप्त किया जा रहा है (देव-सत्र)…',
      devNote:
        'यह स्टैंडअलोन बिल्ड में अस्थायी प्रमाणीकरण है। यह स्क्रीन वास्तविक सत्र के साथ मुख्य ऐप से खेल लॉन्च होने पर चली जाती है।',
      fetchingDevUserTitle: 'डमी उपयोगकर्ता लाया जा रहा है (dev-session)...',
      fetchingDevUserCopy:
        'यह स्टैंडअलोन बिल्ड में अस्थायी प्रमाणीकरण है। यह स्क्रीन वास्तविक सत्र के साथ मुख्य ऐप से खेल लॉन्च होने पर चली जाती है।',
      fetchingConfigTitle: 'गेम कॉन्फ़िगरेशन लोड हो रहा है...',
      fetchingConfigCopy: 'सर्वर से स्टेज सेटिंग्स प्राप्त की जा रही हैं।',
      fetchingSoundsTitle: 'गेम ध्वनियाँ लोड हो रही हैं...',
      fetchingSoundsCopy: 'गेमप्ले के लिए ऑडियो तैयार किया जा रहा है।',
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
          gameTitle: 'अनुक्रम स्मरण',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'टाइलों का क्रम ध्यान से देखें, फिर टाइलों को टैप करके उसी क्रम को दोहराएँ। जैसे-जैसे आप आगे बढ़ते हैं, क्रम की लंबाई बढ़ती जाती है।',
              items: [
                {
                  id: 'observe',
                  title: 'देखें',
                  description: 'हाइलाइट की गई टाइलों का सटीक क्रम देखें।',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'याद करें',
                  description: 'केवल टाइलें नहीं, बल्कि स्थिति और क्रम दोनों याद करें।',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'दोहराएँ',
                  description: 'दिखाई गई टाइलों को उसी क्रम में टैप करें।',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'प्रगति',
                  description: 'सही राउंड आपको लंबे क्रम की ओर ले जाते हैं।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे तय होते हैं।',
              items: [
                {
                  id: 'correct-tap',
                  title: 'सही टैप',
                  description: 'प्रत्येक सही टैप स्कोर बढ़ाता है।',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'राउंड पूरा',
                  description: 'पूरा क्रम पूरा करने पर आगे बढ़ें।',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'गलत कदम',
                  description: 'गलत इनपुट स्टेज नियमों का पालन करता है।',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'समय सीमा',
                  description: 'टाइमर समाप्त होने से पहले अधिक से अधिक राउंड पूरे करें।',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'अंतिम स्कोर',
                  description: 'अंतिम स्कोर पूरे राउंड और बोनस नियमों पर आधारित है।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'धोखाधड़ी विरोधी नियम',
              description:
                'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्यों के परिणामस्वरूप स्वत: अयोग्यता होगी:',
              items: [
                {
                  id: 'switch',
                  title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र को छोटा करना',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'संदिग्ध टैपिंग पैटर्न (बहुत तेज़ या स्वचालित)',
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
                  title: 'विभिन्न खातों के साथ कई प्रयास',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'early',
                  title: 'प्लेबैक पूरा होने से पहले टाइलें न टैप करें।',
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
          gameTitle: 'अनुक्रम स्मरण',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'टाइलों का क्रम ध्यान से देखें, फिर टाइलों को टैप करके उसी क्रम को दोहराएँ। जैसे-जैसे आप आगे बढ़ते हैं, क्रम की लंबाई बढ़ती जाती है।',
              items: [
                {
                  id: 'observe',
                  title: 'देखें',
                  description: 'हाइलाइट की गई टाइलों का सटीक क्रम देखें।',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'याद करें',
                  description: 'केवल टाइलें नहीं, बल्कि स्थिति और क्रम दोनों याद करें।',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'दोहराएँ',
                  description: 'दिखाई गई टाइलों को उसी क्रम में टैप करें।',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'प्रगति',
                  description: 'सही राउंड आपको लंबे क्रम की ओर ले जाते हैं।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे तय होते हैं।',
              items: [
                {
                  id: 'correct-tap',
                  title: 'सही टैप',
                  description: 'प्रत्येक सही टैप स्कोर बढ़ाता है।',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'राउंड पूरा',
                  description: 'पूरा क्रम पूरा करने पर आगे बढ़ें।',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'गलत कदम',
                  description: 'गलत इनपुट स्टेज नियमों का पालन करता है।',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'समय सीमा',
                  description: 'टाइमर समाप्त होने से पहले अधिक से अधिक राउंड पूरे करें।',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'अंतिम स्कोर',
                  description: 'अंतिम स्कोर पूरे राउंड और बोनस नियमों पर आधारित है।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'धोखाधड़ी विरोधी नियम',
              description:
                'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्यों के परिणामस्वरूप स्वत: अयोग्यता होगी:',
              items: [
                {
                  id: 'switch',
                  title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र को छोटा करना',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'संदिग्ध टैपिंग पैटर्न (बहुत तेज़ या स्वचालित)',
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
                  title: 'विभिन्न खातों के साथ कई प्रयास',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'early',
                  title: 'प्लेबैक पूरा होने से पहले टाइलें न टैप करें।',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '3': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'अनुक्रम स्मरण',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'टाइलों का क्रम ध्यान से देखें, फिर टाइलों को टैप करके उसी क्रम को दोहराएँ। जैसे-जैसे आप आगे बढ़ते हैं, क्रम की लंबाई बढ़ती जाती है।',
              items: [
                {
                  id: 'observe',
                  title: 'देखें',
                  description: 'हाइलाइट की गई टाइलों का सटीक क्रम देखें।',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'याद करें',
                  description: 'केवल टाइलें नहीं, बल्कि स्थिति और क्रम दोनों याद करें।',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'दोहराएँ',
                  description: 'दिखाई गई टाइलों को उसी क्रम में टैप करें।',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'प्रगति',
                  description: 'सही राउंड आपको लंबे क्रम की ओर ले जाते हैं।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे तय होते हैं।',
              items: [
                {
                  id: 'correct-tap',
                  title: 'सही टैप',
                  description: 'प्रत्येक सही टैप स्कोर बढ़ाता है।',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'राउंड पूरा',
                  description: 'पूरा क्रम पूरा करने पर आगे बढ़ें।',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'गलत कदम',
                  description: 'गलत इनपुट स्टेज नियमों का पालन करता है।',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'समय सीमा',
                  description: 'टाइमर समाप्त होने से पहले अधिक से अधिक राउंड पूरे करें।',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'अंतिम स्कोर',
                  description: 'अंतिम स्कोर पूरे राउंड और बोनस नियमों पर आधारित है।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'धोखाधड़ी विरोधी नियम',
              description:
                'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्यों के परिणामस्वरूप स्वत: अयोग्यता होगी:',
              items: [
                {
                  id: 'switch',
                  title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र को छोटा करना',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'संदिग्ध टैपिंग पैटर्न (बहुत तेज़ या स्वचालित)',
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
                  title: 'विभिन्न खातों के साथ कई प्रयास',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'early',
                  title: 'प्लेबैक पूरा होने से पहले टाइलें न टैप करें।',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
        '4': {
          gameLabel: 'खेल {stage}',
          statusLabel: 'सक्रिय',
          gameTitle: 'अनुक्रम स्मरण',
          slides: [
            {
              id: 'description',
              title: 'खेल कैसे काम करता है',
              description:
                'टाइलों का क्रम ध्यान से देखें, फिर टाइलों को टैप करके उसी क्रम को दोहराएँ। जैसे-जैसे आप आगे बढ़ते हैं, क्रम की लंबाई बढ़ती जाती है।',
              items: [
                {
                  id: 'observe',
                  title: 'देखें',
                  description: 'हाइलाइट की गई टाइलों का सटीक क्रम देखें।',
                  variant: 'step',
                },
                {
                  id: 'memorize',
                  title: 'याद करें',
                  description: 'केवल टाइलें नहीं, बल्कि स्थिति और क्रम दोनों याद करें।',
                  variant: 'step',
                },
                {
                  id: 'repeat',
                  title: 'दोहराएँ',
                  description: 'दिखाई गई टाइलों को उसी क्रम में टैप करें।',
                  variant: 'step',
                },
                {
                  id: 'score',
                  title: 'प्रगति',
                  description: 'सही राउंड आपको लंबे क्रम की ओर ले जाते हैं।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'scoring',
              title: 'स्कोरिंग नियम',
              description: 'जानें कि अंक और परिणाम कैसे तय होते हैं।',
              items: [
                {
                  id: 'correct-tap',
                  title: 'सही टैप',
                  description: 'प्रत्येक सही टैप स्कोर बढ़ाता है।',
                  variant: 'step',
                },
                {
                  id: 'round-complete',
                  title: 'राउंड पूरा',
                  description: 'पूरा क्रम पूरा करने पर आगे बढ़ें।',
                  variant: 'step',
                },
                {
                  id: 'wrong-move',
                  title: 'गलत कदम',
                  description: 'गलत इनपुट स्टेज नियमों का पालन करता है।',
                  variant: 'step',
                },
                {
                  id: 'time-limit',
                  title: 'समय सीमा',
                  description: 'टाइमर समाप्त होने से पहले अधिक से अधिक राउंड पूरे करें।',
                  variant: 'step',
                },
                {
                  id: 'final-score',
                  title: 'अंतिम स्कोर',
                  description: 'अंतिम स्कोर पूरे राउंड और बोनस नियमों पर आधारित है।',
                  variant: 'step',
                },
              ],
            },
            {
              id: 'anti-cheat',
              title: 'धोखाधड़ी विरोधी नियम',
              description:
                'हम निष्पक्षता को गंभीरता से लेते हैं। निम्नलिखित कार्यों के परिणामस्वरूप स्वत: अयोग्यता होगी:',
              items: [
                {
                  id: 'switch',
                  title: 'गेमप्ले के दौरान ऐप्स बदलना या ब्राउज़र को छोटा करना',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'patterns',
                  title: 'संदिग्ध टैपिंग पैटर्न (बहुत तेज़ या स्वचालित)',
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
                  title: 'विभिन्न खातों के साथ कई प्रयास',
                  description: '',
                  variant: 'rule',
                },
                {
                  id: 'early',
                  title: 'प्लेबैक पूरा होने से पहले टाइलें न टैप करें।',
                  description: '',
                  variant: 'rule',
                },
              ],
            },
          ],
        },
      },
    },
    results: {
      success: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'आप बहुत अच्छा कर रहे हैं',
        headingLeading: 'शाबाश! आपने पूरा किया',
        headingHighlight: ' मेमोरी मैच!',
        headingTrailing: '',
        subheading: 'बेहतरीन स्मरण — आगे के खेलों के लिए इसे बनाए रखें।',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'खेल पूरे हुए',
        ctaLabel: 'जारी रखें',
      },
      failure: {
        scoreLabel: 'आपका स्कोर',
        chipLabel: 'आपने कोशिश की!',
        headingLeading: 'चिंता न करें, फिर से कोशिश करें',
        headingHighlight: ' अगले खेल में!',
        headingTrailing: '',
        subheading: 'अपनी याददाश्त का अभ्यास जारी रखें — आप वहाँ पहुँचेंगे!',
        progressLabel: 'प्रगति',
        progressSuffixLabel: 'खेल पूरे हुए',
        ctaLabel: 'जारी रखें',
      },
    },
  },
} as const;
