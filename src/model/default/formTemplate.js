module.exports = [
  {
    formName: "Start of Care",
    assessmentForm: [
      {
        question_code: "A1110.A",
        question: "What is your preferred language?",
        question_type: "TEXT_INPUT",
        options: ["0. English", "1. Spanish", "9. Unable to determine"],
        section: "Administrative",
      },
      {
        question_code: "A1110.B",
        question:
          "Do you need or want an interpreter to communicate with a doctor or health care staff?",
        options: ["0. No", "1. Yes", "9. Unable to determine"],
        question_type: "TEXT_INPUT",
        section: "Administrative",
      },
      {
        question_code: "B0200",
        question:
          "Do you have difficulty hearing in a normal conversation, when socializing, or watching TV?",
        options: [
          "0. Adequate - no difficulty in normal conversation, social interaction, listening to TV",
          "1. Minimal difficulty - difficulty in some environments (e.g., when person speaks softly, or setting is noisy)",
          "2. Moderate difficulty - speaker has to increase volume and speak distinctly",
          "3. Highly impaired - absence of useful hearing",
        ],
        question_type: "TEXT_INPUT",
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "B1000",
        question:
          "Can you see fine details, like regular print in newspapers or books?",
        options: [
          "0. Adequate - sees fine detail, such as regular print in newspapers/books",
          "1. Impaired - sees large print, but not regular print in newspapers/books",
          "2. Moderately impaired - limited vision; not able to see newspaper headlines but can identify objects",
          "3. Highly impaired - object identification in question, but eyes appear to follow objects",
          "4. Severely impaired - no vision or sees only light, colors or shapes; eyes do not appear to follow objects",
        ],
        question_type: "TEXT_INPUT",
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "B1300",
        question:
          "How often do you need to have someone help you when you read instructions, pamphlets, or other written material from your doctor or pharmacy?",
        options: [
          "0. Never",
          "1. Rarely",
          "2. Sometimes",
          "3. Often",
          "4. Always",
          "7. Patient declines to respond",
          "8. Patient unable to respond",
        ],
        question_type: "TEXT_INPUT",
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "C0300.A",
        question:
          "Please tell me what year it is right now. - Able to report correct year",
        options: [
          "0. Missed by > 5 years or no answer",
          "1. Missed by 2-5 years",
          "2. Missed by 1 year",
          "3. Correct",
        ],
        section: "Cognitive Patterns",
      },
      {
        question_code: "C0300.B",
        question:
          "What month are we in right now? - Able to report correct month",
        options: [
          "0. Missed by more than 1 month or no answer",
          "1. Missed by 6 days to 1 month",
          "2. Accurate within 5 days",
        ],
        question_type: "TEXT_INPUT",
        section: "Cognitive Patterns",
      },
      {
        question_code: "C0300.C",
        question: "What day of the week is it? - Able to report correct day",
        options: ["0. Incorrect or no answer", "1. Correct"],
        question_type: "TEXT_INPUT",
        section: "Cognitive Patterns",
      },
      {
        question_code: "M1740",
        question:
          "Have you experienced any difficulties with cognitive, behavioral, or psychiatric symptoms?",
        options: [
          "1. Memory deficit: failure to recognize familiar persons/places, inability to recall events of past 24 hours, significant memory loss so that supervision is required",
          "2. Impaired decision-making: failure to perform usual ADLs or IADLs, inability to appropriately stop activities, jeopardizes safety through actions",
          "3. Verbal disruption: yelling, threatening, excessive profanity, sexual references, etc.",
          "4. Physical aggression: aggressive or combative to self and others (e.g., hits self, throws objects, punches, dangerous maneuvers with wheelchair or other objects)",
          "5. Disruptive, infantile, or socially inappropriate behavior (excludes verbal actions)",
          "6. Delusional, hallucinatory, or paranoid behavior",
          "7. None of the above behaviors demonstrated",
        ],
        question_type: "CHECK_LIST",
        section: "Behavior",
      },
      {
        question_code: "M1800",
        question:
          "Can you tell me about any help you need with grooming, such as brushing your teeth, combing your hair, or shaving?",
        options: [
          "0. Able to groom self unaided, with or without the use of assistive devices or adapted methods.",
          "1. Grooming utensils must be placed within reach before able to complete grooming activities.",
          "2. Someone must assist the patient to groom self.",
          "3. Patient depends entirely upon someone else for grooming needs.",
        ],
        question_type: "TEXT_INPUT",
        section: "Functional Status",
      },
      {
        question_code: "M1860",
        question:
          "How would you describe your ability to walk or get around, on an even or uneven surface? Do you use a wheelchair?",
        options: [
          "0. Able to independently walk on even and uneven surfaces and negotiate stairs with or without railings (specifically: needs no human assistance or assistive device).",
          "1. With the use of a one-handed device (e.g., cane, single crutch, hemi-walker), able to independently walk on even and uneven surfaces and negotiate stairs with or without railings.",
          "2. Requires use of a two-handed device (e.g., walker or crutches) to walk alone on a level surface and/or requires human supervision or assistance to negotiate stairs or steps or uneven surfaces.",
          "3. Able to walk only with the supervision or assistance of another person at all times.",
          "4. Chairfast, unable to ambulate but is able to wheel self independently.",
          "5. Chairfast, unable to ambulate and is unable to wheel self.",
          "6. Bedfast, unable to ambulate or be up in a chair.",
        ],
        question_type: "TEXT_INPUT",
        section: "Functional Status",
      },
      {
        question_code: "M1610",
        question:
          "Have you been experiencing any issues with urinary leakage or incontinence? Do you currently use a urinary catheter?",
        options: [
          "0. No incontinence or catheter (includes anuria or ostomy for urinary drainage)",
          "1. Patient is incontinent",
          "2. Patient requires a urinary catheter (specifically: external, indwelling, intermittent, or suprapubic)",
        ],
        question_type: "TEXT_INPUT",
        section: "Bladder and Bowel",
      },
      {
        question_code: "M1028",
        question:
          "Do you have any other active health conditions that we should be aware of?",
        options: [
          "1. Peripheral Vascular Disease (PVD) or Peripheral Arterial Disease (PAD)",
          "2. Diabetes Mellitus (DM)",
          "3. None of the above",
        ],
        question_type: "TEXT_INPUT",
        section: "Medications",
      },
    ],
  },
  {
    formName: "ROC",
    assessmentForm: [
      {
        question_code: "M1800",
        question:
          "Can you tell me about any help you need with grooming, such as brushing your teeth, combing your hair, or shaving?",
        options: [
          "0. Able to groom self unaided, with or without the use of assistive devices or adapted methods.",
          "1. Grooming utensils must be placed within reach before able to complete grooming activities.",
          "2. Someone must assist the patient to groom self.",
          "3. Patient depends entirely upon someone else for grooming needs.",
        ],
        question_type: "TEXT_INPUT",
        section: "Functional Status",
      },
    ],
  },
  {
    formName: "Fall Risk",
    assessmentForm: [
      {
        question_code: "M1800",
        question:
          "Can you tell me about any help you need with grooming, such as brushing your teeth, combing your hair, or shaving?",
        options: [
          "0. Able to groom self unaided, with or without the use of assistive devices or adapted methods.",
          "1. Grooming utensils must be placed within reach before able to complete grooming activities.",
          "2. Someone must assist the patient to groom self.",
          "3. Patient depends entirely upon someone else for grooming needs.",
        ],
        question_type: "TEXT_INPUT",
        section: "Functional Status",
      },
    ],
  },
  {
    formName: "Wound Care",
    assessmentForm: [
      {
        question_code: "M1800",
        question:
          "Can you tell me about any help you need with grooming, such as brushing your teeth, combing your hair, or shaving?",
        options: [
          "0. Able to groom self unaided, with or without the use of assistive devices or adapted methods.",
          "1. Grooming utensils must be placed within reach before able to complete grooming activities.",
          "2. Someone must assist the patient to groom self.",
          "3. Patient depends entirely upon someone else for grooming needs.",
        ],
        question_type: "TEXT_INPUT",
        section: "Functional Status",
      },
    ],
  },
];
