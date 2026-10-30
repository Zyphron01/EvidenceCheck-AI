export const verifiedArchiveReport = {
  "id": "rep-9aa0e699-d2c5-46b6-8464-023e148b9c0b",
  "claim": {
    "id": "clm-83d1eff1-588e-43bb-ba94-ea71fa55c637",
    "rawText": "The speed of light in a vacuum is approximately 299,792 kilometers per second.",
    "normalizedText": "the speed of light in a vacuum is approximately 299792 kilometers per second",
    "submittedAt": "2026-10-30T03:35:27.420Z"
  },
  "verdict": {
    "status": "SUPPORTED",
    "confidence": 0.75,
    "confidenceInterpretation": "Heuristic support index based on verified source diversity and citation consistency; not a calibrated statistical probability.",
    "summary": "All substantive evidence passages consistently confirm that the speed of light in vacuum is exactly 299,792,458 metres per second. Converting this exact value to kilometres per second (dividing by 1,000) yields exactly 299,792.458 km/s, which rounds to approximately 299,792 km/s. Therefore, the claim that the speed of light in a vacuum is approximately 299,792 kilometres per second is supported by the provided evidence.",
    "reasoning": "Claim is corroborated by 9 verified passage(s) across 4 independent source(s) with 2 verified citation(s). Every substantive passage in the evidence set reports the same exact value for the speed of light in vacuum: 299,792,458 metres per second. Dividing this exact SI value by 1,000 gives exactly 299,792.458 kilometres per second. Rounding to the nearest whole kilometre per second yields 299,792 km/s, which matches the claim's stated approximation of approximately 299,792 kilometres per second. No passage contradicts the claim or the underlying exact value."
  },
  "sources": [
    {
      "id": "src-1",
      "url": "https://en.wikipedia.org/wiki/Speed_of_light",
      "title": "Speed of light - Wikipedia",
      "domain": "en.wikipedia.org",
      "snippet": "The speed of light is the speed of electromagnetic waves. Light travels at slower speed inside materials like glass or water; its highest speed is in a vacuum. The speed of light in vacuum is a universal physical constant denoted c (in ISO ",
      "retrievedAt": "2026-10-30T03:35:38.386Z"
    },
    {
      "id": "src-2",
      "url": "https://physicsfundamentals.org/blog/speed-of-light",
      "title": "How Fast Is the Speed of Light, and How Was It First Measured?",
      "domain": "physicsfundamentals.org",
      "snippet": "The speed of light in a vacuum is exactly c = 299,792,458 m/s. This is not a measured approximation — since 1983, the General Conference on Weights and Measures fixed c at this exact value and redefined the metre accordingly. One metre is n",
      "retrievedAt": "2026-10-30T03:35:38.386Z"
    },
    {
      "id": "src-3",
      "url": "https://physics.stackexchange.com/questions/280004/how-do-we-know-the-precise-speed-of-light-in-a-vacuum",
      "title": "How do we know the precise speed of light in a vacuum?",
      "domain": "physics.stackexchange.com",
      "snippet": "It follows that the speed of light in vacuum is exactly 299 792 458 metres per second and there is no caveat to this statement.  \n As with the definition of the second quoting the speed of light to that number of significant figures means t",
      "retrievedAt": "2026-10-30T03:35:38.386Z"
    },
    {
      "id": "src-4",
      "url": "https://math.ucr.edu/home/baez/physics/Relativity/SpeedOfLight/speed_of_light.html",
      "title": "Is The Speed of Light Everywhere the Same?",
      "domain": "math.ucr.edu",
      "snippet": "(../../index.html) - (../../Administrivia/copyright.html)\n\nUpdated 2014 by Don Koks.  Original by Steve Carlip (1997) and Philip Gibbs, 1996.\n\n# Is The Speed of Light Everywhere the Same?\n\nThe short answer is that it depends on who is doing",
      "retrievedAt": "2026-10-30T03:35:38.386Z"
    }
  ],
  "passages": [
    {
      "id": "psg-1",
      "sourceId": "src-1",
      "text": "The speed of light is the speed of electromagnetic waves. Light travels at slower speed inside materials like glass or water; its highest speed is in a vacuum. The speed of light in vacuum is a universal physical constant denoted c (in ISO and IEC standards {\\displaystyle c_{0}}), exactly equal to 299792458 m⋅s−1. It is exact because, by international agreement, a metre is defined as the length of the path travelled by light in vacuum during a time interval of 1⁄299792458 second. ] second.",
      "stance": "SUPPORTING",
      "charOffsetStart": 0,
      "charOffsetEnd": 495
    },
    {
      "id": "psg-2",
      "sourceId": "src-1",
      "text": "The value 299,792,458 metres per second is approximately 1 billion kilometres per hour; 700 million miles per hour. For other approximations of c, valid for various units and size scales see the infobox. The shorter form, speed of light, means speed of light in vacuum in any context where the vacuum is implied. ] As a result of this definition, the value of the speed of light in vacuum is exactly 299792458 m/s and has become a defined constant in the SI system of units.",
      "stance": "SUPPORTING",
      "charOffsetStart": 509,
      "charOffsetEnd": 984
    },
    {
      "id": "psg-3",
      "sourceId": "src-1",
      "text": "Improved experimental techniques that, prior to 1983, would have measured the speed of light no longer affect the known value of the speed of light in SI units, but instead allow a more precise realization of the metre by more accurately measuring the wavelength of krypton-86 and other light sources.",
      "stance": "NEUTRAL",
      "charOffsetStart": 988,
      "charOffsetEnd": 1289
    },
    {
      "id": "psg-4",
      "sourceId": "src-2",
      "text": "The speed of light in a vacuum is exactly c = 299,792,458 m/s. This is not a measured approximation — since 1983, the General Conference on Weights and Measures fixed c at this exact value and redefined the metre accordingly. One metre is now defined as the distance light travels in exactly 1/299,792,458 of a second. [...] What is the speed of light in m/s?",
      "stance": "SUPPORTING",
      "charOffsetStart": 0,
      "charOffsetEnd": 359
    },
    {
      "id": "psg-5",
      "sourceId": "src-2",
      "text": "The speed of light in a vacuum is exactly c = 299,792,458 m/s — not an approximation, but a defined value. Since 1983, the metre has been defined so that c is precisely this number. For calculations, c ≈ 3 × 10⁸ m/s (accurate to 0.07%) is sufficient for most physics problems at GCSE, A-Level, or AP Physics level.",
      "stance": "SUPPORTING",
      "charOffsetStart": 361,
      "charOffsetEnd": 675
    },
    {
      "id": "psg-6",
      "sourceId": "src-2",
      "text": "What is the speed of light in km/h? [...] The speed of light is c = 299,792,458 m/s — exactly, not approximately. In round numbers: 3 × 10⁸ m/s, or about 300,000 km/s. In imperial units that is about 186,282 miles per second, or roughly 670.6 million miles per hour (mph). Since 1983 this value has been fixed by definition; the metre is now derived from c, not the other way around. Light covers the Moon's distance in about 1.3 seconds and the Sun's in 8.3 minutes.",
      "stance": "SUPPORTING",
      "charOffsetStart": 677,
      "charOffsetEnd": 1145
    },
    {
      "id": "psg-7",
      "sourceId": "src-2",
      "text": "Speed of light in a vacuum — quick reference",
      "stance": "NEUTRAL",
      "charOffsetStart": 1147,
      "charOffsetEnd": 1191
    },
    {
      "id": "psg-8",
      "sourceId": "src-3",
      "text": "It follows that the speed of light in vacuum is exactly 299 792 458 metres per second and there is no caveat to this statement.  \n As with the definition of the second quoting the speed of light to that number of significant figures means that the old definition of the metre using the light form Krypton 86 and the new definition of the metre agree to the uncertainties of the apparatus used to produce the practical realisation of the metre. [...] # Image 1: site logoJoin Physics",
      "stance": "SUPPORTING",
      "charOffsetStart": 0,
      "charOffsetEnd": 482
    },
    {
      "id": "psg-9",
      "sourceId": "src-3",
      "text": "By clicking “Sign up”, you agree to our terms of service and acknowledge you have read our privacy policy.",
      "stance": "NEUTRAL",
      "charOffsetStart": 484,
      "charOffsetEnd": 590
    },
    {
      "id": "psg-10",
      "sourceId": "src-3",
      "text": "Already have an account? Log in",
      "stance": "NEUTRAL",
      "charOffsetStart": 648,
      "charOffsetEnd": 679
    },
    {
      "id": "psg-11",
      "sourceId": "src-3",
      "text": "Skip to main content",
      "stance": "NEUTRAL",
      "charOffsetStart": 681,
      "charOffsetEnd": 701
    },
    {
      "id": "psg-12",
      "sourceId": "src-3",
      "text": "Closed 10 years ago.",
      "stance": "NEUTRAL",
      "charOffsetStart": 706,
      "charOffsetEnd": 726
    },
    {
      "id": "psg-13",
      "sourceId": "src-3",
      "text": "From Wikipedia - \"Its exact value is 299792458 metres per second\" [...] Add a comment|",
      "stance": "SUPPORTING",
      "charOffsetStart": 728,
      "charOffsetEnd": 814
    },
    {
      "id": "psg-14",
      "sourceId": "src-3",
      "text": "isn't really known in terms of other units, but instead, other units are defined in terms of $c$ (because it is constant).",
      "stance": "NEUTRAL",
      "charOffsetStart": 816,
      "charOffsetEnd": 939
    },
    {
      "id": "psg-15",
      "sourceId": "src-3",
      "text": "It's more accurate (and less misleading) to say that one meter is the distance light travels (in a vacuum) in $\\dfrac{1}{299792458}$ s, instead of saying that light travels $299792458 \\text{ m}$ in one second.",
      "stance": "NEUTRAL",
      "charOffsetStart": 941,
      "charOffsetEnd": 1150
    },
    {
      "id": "psg-16",
      "sourceId": "src-4",
      "text": "(../../index.html) - (../../Administrivia/copyright.html)",
      "stance": "NEUTRAL",
      "charOffsetStart": 0,
      "charOffsetEnd": 57
    },
    {
      "id": "psg-17",
      "sourceId": "src-4",
      "text": "Updated 2014 by Don Koks.  Original by Steve Carlip (1997) and Philip Gibbs, 1996.",
      "stance": "NEUTRAL",
      "charOffsetStart": 59,
      "charOffsetEnd": 141
    },
    {
      "id": "psg-18",
      "sourceId": "src-4",
      "text": "# Is The Speed of Light Everywhere the Same?",
      "stance": "NEUTRAL",
      "charOffsetStart": 143,
      "charOffsetEnd": 187
    },
    {
      "id": "psg-19",
      "sourceId": "src-4",
      "text": "The short answer is that it depends on who is doing the measuring: the speed of light is only guaranteed to have a value of 299,792,458 m/s in a vacuum when measured by someone situated right next to it.  But let's approach the question by considering its various meanings. [...] > The metre is the length of the path travelled by light in vacuum during a time interval of 1/299,792,458 of a second.",
      "stance": "SUPPORTING",
      "charOffsetStart": 189,
      "charOffsetEnd": 588
    },
    {
      "id": "psg-20",
      "sourceId": "src-4",
      "text": "This defines the speed of light in vacuum to be exactly 299,792,458 m/s.  Unfortunately, it doesn't mention anything about inertial frames, but you can consider a measurement in an inertial frame to be implied. [...] to variations in the units of measurement than to changes in the speed of light itself, but by the same token it's nonsense to say that the speed of light is now constant just because the SI definitions of units define its numerical value to be constant.",
      "stance": "SUPPORTING",
      "charOffsetStart": 590,
      "charOffsetEnd": 1061
    }
  ],
  "citations": [
    {
      "id": "cit-1",
      "sentence": "The speed of light in vacuum is exactly 299,792,458 m/s, which equals exactly 299,792.458 km/s, supporting the approximate value of 299,792 km/s.",
      "passageId": "psg-1",
      "sourceId": "src-1",
      "exactQuote": "The speed of light in vacuum is a universal physical constant denoted c ... exactly equal to 299792458 m⋅s−1.",
      "validationStatus": "FAILED",
      "verificationScope": "SEARCH_SNIPPET"
    },
    {
      "id": "cit-2",
      "sentence": "The exact value 299,792,458 m/s has been fixed by definition since 1983, and the metre is defined as the distance light travels in vacuum during 1/299,792,458 of a second.",
      "passageId": "psg-4",
      "sourceId": "src-2",
      "exactQuote": "One metre is now defined as the distance light travels in exactly 1/299,792,458 of a second.",
      "validationStatus": "VERIFIED",
      "verificationScope": "SEARCH_SNIPPET"
    },
    {
      "id": "cit-3",
      "sentence": "The speed of light in vacuum is exactly 299 792 458 metres per second with no caveat, which is exactly 299,792.458 km/s.",
      "passageId": "psg-8",
      "sourceId": "src-3",
      "exactQuote": "It follows that the speed of light in vacuum is exactly 299 792 458 metres per second and there is no caveat to this statement.",
      "validationStatus": "VERIFIED",
      "verificationScope": "SEARCH_SNIPPET"
    }
  ],
  "contradictions": [],
  "metadata": {
    "pipelineVersion": "2.0.0",
    "createdAt": "2026-10-30T03:35:27.420Z",
    "searchesConducted": 2,
    "modelUsed": "nvidia/nemotron-3.5-super-vl-120b-a12b"
  }
} as const;
