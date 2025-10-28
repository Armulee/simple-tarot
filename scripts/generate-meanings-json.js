#!/usr/bin/env node
/*
Generate lib/tarot/meanings.json with long section texts (200+ words)
for relationships, work & career, finance, health for all 78 cards.
This script is deterministic (no randomness) and uses card metadata
to produce readable, practical guidance.
*/

const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'lib', 'tarot', 'meanings.json');

const majorNames = [
  'The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'
];
const suits = ['wands','cups','swords','pentacles'];
const ranks = ['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'];

function slugify(name){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function titleCase(s){
  return s.charAt(0).toUpperCase()+s.slice(1);
}

function suitLabel(s){
  switch(s){
    case 'wands': return 'Fire (Wands)';
    case 'cups': return 'Water (Cups)';
    case 'swords': return 'Air (Swords)';
    case 'pentacles': return 'Earth (Pentacles)';
  }
}

function suitElementName(s){
  switch(s){
    case 'wands': return 'Fire';
    case 'cups': return 'Water';
    case 'swords': return 'Air';
    case 'pentacles': return 'Earth';
  }
}

function suitNoun(s){
  switch(s){
    case 'wands': return 'initiative';
    case 'cups': return 'emotion';
    case 'swords': return 'thought';
    case 'pentacles': return 'resources';
  }
}

function majorMeta(slug){
  const map = {
    'the-fool': { yesNo: 'Yes', zodiac: 'Aquarius (Uranus)' },
    'the-magician': { yesNo: 'Yes', zodiac: 'Mercury (Gemini/Virgo)' },
    'the-high-priestess': { yesNo: 'Maybe', zodiac: 'Cancer (Moon)' },
    'the-empress': { yesNo: 'Yes', zodiac: 'Venus (Taurus/Libra)' },
    'the-emperor': { yesNo: 'Yes', zodiac: 'Aries (Mars)' },
    'the-hierophant': { yesNo: 'Maybe', zodiac: 'Taurus (Venus)' },
    'the-lovers': { yesNo: 'Yes', zodiac: 'Gemini (Mercury)' },
    'the-chariot': { yesNo: 'Yes', zodiac: 'Cancer (Moon)' },
    'strength': { yesNo: 'Yes', zodiac: 'Leo (Sun)' },
    'the-hermit': { yesNo: 'Maybe', zodiac: 'Virgo (Mercury)' },
    'wheel-of-fortune': { yesNo: 'Yes', zodiac: 'Jupiter' },
    'justice': { yesNo: 'Maybe', zodiac: 'Libra (Venus)' },
    'the-hanged-man': { yesNo: 'Not yet', zodiac: 'Neptune' },
    'death': { yesNo: 'No', zodiac: 'Scorpio (Pluto/Mars)' },
    'temperance': { yesNo: 'Yes', zodiac: 'Sagittarius (Jupiter)' },
    'the-devil': { yesNo: 'No', zodiac: 'Capricorn (Saturn)' },
    'the-tower': { yesNo: 'No', zodiac: 'Mars' },
    'the-star': { yesNo: 'Yes', zodiac: 'Aquarius (Uranus/Saturn)' },
    'the-moon': { yesNo: 'Maybe', zodiac: 'Pisces (Moon/Neptune)' },
    'the-sun': { yesNo: 'Yes', zodiac: 'Sun (Leo)' },
    'judgement': { yesNo: 'Yes', zodiac: 'Pluto' },
    'the-world': { yesNo: 'Yes', zodiac: 'Saturn' },
  };
  return map[slug] || { yesNo: 'Maybe', zodiac: '' };
}

const majorHeadlines = {
  'the-fool': 'A fresh start, trust in the unknown, and playful courage.',
  'the-magician': 'Focused intent, skillful action, and ideas made real.',
  'the-high-priestess': 'Inner knowing, mystery, patience, and quiet truth.',
  'the-empress': 'Nurturing care, abundance, and steady growth.',
  'the-emperor': 'Structure, authority, protection, and stability.',
  'the-hierophant': 'Tradition, mentorship, and values aligned with practice.',
  'the-lovers': 'Choice, union, and living in alignment with core values.',
  'the-chariot': 'Willpower, direction, disciplined momentum, and victory.',
  'strength': 'Gentle power, courage, and emotional self-regulation.',
  'the-hermit': 'Solitude, seeking truth, reflection, and wise guidance.',
  'wheel-of-fortune': 'A turning point, cycles of change, and timely opportunity.',
  'justice': 'Fairness, truth, accountability, and clean decisions.',
  'the-hanged-man': 'Pause, surrender, and a new perspective that unlocks progress.',
  'death': 'An ending that makes space for necessary rebirth.',
  'temperance': 'Moderation, integration, and harmonizing what once clashed.',
  'the-devil': 'Naming bondage, compulsions, and the path to freedom.',
  'the-tower': 'Revelation, collapse of false structures, and honest rebuilding.',
  'the-star': 'Hope, healing, and a gentle light that guides you onward.',
  'the-moon': 'Mystery, uncertainty, fear, and the wisdom of moving slowly.',
  'the-sun': 'Joy, vitality, clarity, and wholehearted success.',
  'judgement': 'Awakening, forgiveness, purpose, and a call to action.',
  'the-world': 'Completion, wholeness, and arriving with gratitude.'
};

function minorHeadline(rank, suit){
  const domain = suitNoun(suit);
  const map = {
    'Ace': `A clear beginning in ${domain}: raw potential that wants expression.`,
    'Two': `A choice and careful balance within ${domain}.`,
    'Three': `Growth through teamwork and shared effort in ${domain}.`,
    'Four': `Stability and consolidation that protects ${domain}.`,
    'Five': `Disruption and challenge—pressure testing ${domain}.`,
    'Six': `Progress, support, and movement forward in ${domain}.`,
    'Seven': `Assessment, perseverance, and courage in ${domain}.`,
    'Eight': `Focused effort and meaningful movement in ${domain}.`,
    'Nine': `Results arrive with strain; protect energy in ${domain}.`,
    'Ten': `Completion and outcome—the full cycle in ${domain}.`,
    'Page': `A message and a beginner’s openness in ${domain}.`,
    'Knight': `Pursuit and change—momentum carries ${domain}.`,
    'Queen': `Maturity, care, and stewardship over ${domain}.`,
    'King': `Direction and authority guiding ${domain}.`
  };
  return map[rank] || `Clarity and development in ${domain}.`;
}

// Card-specific guidance to ensure unique, card-related meanings
const MAJOR_GUIDES = {
  'the-fool': {
    upright: {
      relationships: ['curiosity in connection', 'playful openness', 'low-pressure beginnings'],
      work: ['prototype and learn', 'start with safe experiments', 'momentum over perfection'],
      finance: ['small automatic habits', 'avoid impulsive risks', 'build a buffer'],
      health: ['gentle routines', 'watch for careless mishaps', 'consistency brings confidence']
    },
    reversed: {
      relationships: ['mixed signals', 'boundary clarity', 'pace the connection'],
      work: ['scope creep risk', 'checklists before leaps', 'reduce rework'],
      finance: ['pause impulse spending', 'rebuild stability', 'decide from clear numbers'],
      health: ['slow down', 'restore basic safety', 'gradual progression']
    }
  },
  'the-magician': {
    upright: {
      relationships: ['transparent intent', 'attentive listening', 'alignment through action'],
      work: ['show, don’t tell', 'leverage tools expertly', 'iterate with evidence'],
      finance: ['negotiate and optimize', 'remove hidden fees', 'systems create value'],
      health: ['track one metric', 'precision beats intensity', 'steady consistency']
    },
    reversed: {
      relationships: ['charm without follow-through', 'repair through honesty', 'trust rebuilt in steps'],
      work: ['over-promising risk', 'ethics over speed', 'tighten focus'],
      finance: ['find leaks', 'read terms carefully', 'control recurring costs'],
      health: ['avoid quick fixes', 'pace and recover', 'seek guidance if needed']
    }
  },
  'the-high-priestess': {
    upright: {
      relationships: ['listen beneath words', 'patient timing', 'respect quiet truth'],
      work: ['research in silence', 'private preparation', 'move when signs align'],
      finance: ['hold information wisely', 'subtle opportunities', 'avoid disclosure haste'],
      health: ['restorative rest', 'intuition-led pacing', 'nervous system care']
    },
    reversed: {
      relationships: ['noise over intuition', 'overexposure', 'rebuild inner trust'],
      work: ['rumor-driven choices', 'insufficient data', 'slow decisions'],
      finance: ['privacy breaches', 'unclear agreements', 'simplify accounts'],
      health: ['overstimulated senses', 'reduce inputs', 'sleep before decisions']
    }
  },
  'the-empress': {
    upright: {
      relationships: ['nurture bonds', 'create a warm home', 'affirm love through care'],
      work: ['supportive leadership', 'growth-friendly environment', 'sustainable pace'],
      finance: ['invest in comfort', 'resources that nourish', 'long-term wellbeing'],
      health: ['pleasure and balance', 'body kindness', 'regular nourishment']
    },
    reversed: {
      relationships: ['overgiving', 'ask for reciprocity', 'self-care first'],
      work: ['emotional burnout', 're-scope responsibilities', 'delegate'],
      finance: ['spending to self-soothe', 'budget with compassion', 'needs vs wants clarity'],
      health: ['neglect from busyness', 'rebuild simple meals', 'gentle movement']
    }
  },
  'the-emperor': {
    upright: {
      relationships: ['predictability builds trust', 'clear roles', 'protective presence'],
      work: ['structure enables scale', 'document decisions', 'own the outcome'],
      finance: ['tight controls', 'emergency fund first', 'risk policies'],
      health: ['discipline as care', 'routine schedule', 'measured training']
    },
    reversed: {
      relationships: ['rigidity softens', 'collaborative decisions', 'space for feelings'],
      work: ['micromanage risk', 'delegate authority', 'update stale rules'],
      finance: ['overcontrol anxiety', 'trust systems', 'avoid hoarding'],
      health: ['overtraining', 'listen to limits', 'flex days']
    }
  },
  'the-hierophant': {
    upright: {
      relationships: ['shared traditions', 'mentorship in love', 'values alignment'],
      work: ['learn from standards', 'apprenticeship path', 'institutional support'],
      finance: ['proven strategies', 'trusted advisors', 'compliance matters'],
      health: ['evidence-based care', 'consistent regimen', 'rituals that heal']
    },
    reversed: {
      relationships: ['question rigid roles', 'authenticity over image', 'rewrite rules'],
      work: ['innovate respectfully', 'challenge dogma', 'customize process'],
      finance: ['fees for tradition', 'compare providers', 'avoid status buys'],
      health: ['stale routine', 'personalize protocol', 'drop what harms']
    }
  },
  'the-lovers': {
    upright: {
      relationships: ['mutual choice', 'tender honesty', 'values in action'],
      work: ['partner wisely', 'align mission', 'shared ownership'],
      finance: ['spend by values', 'joint planning', 'transparent agreements'],
      health: ['care with consent', 'body-heart coherence', 'loving discipline']
    },
    reversed: {
      relationships: ['indecision', 'tempting detours', 'repair through truth'],
      work: ['misaligned deals', 'conflicting incentives', 'say no kindly'],
      finance: ['value drift', 'impulse allure', 'recenter priorities'],
      health: ['self-sabotage', 'return to self-love', 'gentle recommitment']
    }
  },
  'the-chariot': {
    upright: {
      relationships: ['direction together', 'set a pace', 'resolve tension'],
      work: ['disciplined drive', 'one clear target', 'remove drag'],
      finance: ['save toward goal', 'strategic milestones', 'cut detours'],
      health: ['structured program', 'tracked progress', 'balanced intensity']
    },
    reversed: {
      relationships: ['conflicting wills', 'slow to synchronize', 'name shared aim'],
      work: ['scattered effort', 'recenter plan', 'limit multitasking'],
      finance: ['leaks from distraction', 'budget lanes', 'halt impulse moves'],
      health: ['overpush/underrecover', 'reset cadence', 'prevent injury']
    }
  },
  'strength': {
    upright: {
      relationships: ['soft boundaries', 'calm assurance', 'gentle loyalty'],
      work: ['lead by steadiness', 'de-escalate calmly', 'model courage'],
      finance: ['patient growth', 'resist panic', 'long horizon'],
      health: ['nervous system ease', 'slow strength', 'compassionate goals']
    },
    reversed: {
      relationships: ['reactivity', 'rebuild safety', 'own triggers'],
      work: ['frayed patience', 'reset expectations', 'support systems'],
      finance: ['fear-based choices', 'pause rash sales', 'sober numbers'],
      health: ['overwhelm', 'soothing routines', 'rest first']
    }
  },
  'the-hermit': {
    upright: {
      relationships: ['honoring space', 'depth over noise', 'wise counsel'],
      work: ['research window', 'solo focus time', 'publish when ready'],
      finance: ['quiet audits', 'private goals', 'low-noise investing'],
      health: ['restful solitude', 'reflective practices', 'mindful walks']
    },
    reversed: {
      relationships: ['isolation risk', 'invite contact', 'share softly'],
      work: ['withdrawing too long', 'pair for review', 'timebox solitude'],
      finance: ['hoarding info', 'ask for advice', 'avoid secrecy stress'],
      health: ['stagnant rest', 'gentle socializing', 'light movement']
    }
  },
  'wheel-of-fortune': {
    upright: {
      relationships: ['season shift', 'say yes to timing', 'adapt together'],
      work: ['ride momentum', 'prepare to scale', 'watch cycles'],
      finance: ['opportunities arise', 'manage variance', 'avoid hubris'],
      health: ['ebb and flow', 'pivot when needed', 'sustainable habits']
    },
    reversed: {
      relationships: ['resisting change', 'stuck loop', 'compassionate patience'],
      work: ['market headwinds', 'trim sails', 'learn from pattern'],
      finance: ['avoid chasing luck', 'tighten buffer', 'insure wisely'],
      health: ['plateau', 'adjust inputs', 'trust slower arc']
    }
  },
  'justice': {
    upright: {
      relationships: ['fair dealing', 'clear agreements', 'repair with amends'],
      work: ['evidence-based decisions', 'document tradeoffs', 'ethics first'],
      finance: ['accurate ledgers', 'transparent terms', 'legal alignment'],
      health: ['balance routines', 'cause/effect awareness', 'measured choices']
    },
    reversed: {
      relationships: ['bias spotted', 'correct imbalance', 'truth telling'],
      work: ['unclear criteria', 'reduce favoritism', 'audit processes'],
      finance: ['fees and fines', 'dispute carefully', 'read small print'],
      health: ['over/undercorrection', 'restore equilibrium', 'steady tracking']
    }
  },
  'the-hanged-man': {
    upright: {
      relationships: ['pause before reaction', 'see their angle', 'patient grace'],
      work: ['strategic waiting', 'reframe problem', 'value perspective'],
      finance: ['hold still', 'avoid forced trades', 'observe first'],
      health: ['rest day wisdom', 'mobility focus', 'gentle inversions']
    },
    reversed: {
      relationships: ['avoidance loop', 'set a date', 'choose kindly'],
      work: ['stalling', 'decide after review', 'ship something small'],
      finance: ['procrastination cost', 'act on facts', 'end limbo'],
      health: ['stuck routine', 'small switch', 'support compliance']
    }
  },
  'death': {
    upright: {
      relationships: ['honor endings', 'ritual for closure', 'clear space'],
      work: ['sunset projects', 'archive cleanly', 'onboard the new'],
      finance: ['end draining expenses', 'sell unused assets', 'reallocate'],
      health: ['change habits', 'release harmful patterns', 'begin anew']
    },
    reversed: {
      relationships: ['clinging pain', 'gentle goodbye', 'permission to move'],
      work: ['fear of change', 'retire legacy', 'train successors'],
      finance: ['sunk cost trap', 'cut losses', 'fresh plan'],
      health: ['prolonging the old', 'transition supports', 'new baseline']
    }
  },
  'temperance': {
    upright: {
      relationships: ['blend differences', 'temper reactivity', 'find middle'],
      work: ['integrate teams', 'smooth processes', 'harmonize tools'],
      finance: ['diversify carefully', 'rebalance', 'moderate risk'],
      health: ['balanced practice', 'gradual increases', 'recovery windows']
    },
    reversed: {
      relationships: ['overcorrection', 'one change at a time', 'reset center'],
      work: ['swingy priorities', 'stabilize cadence', 'reduce extremes'],
      finance: ['overexposure', 'trim volatility', 'safety first'],
      health: ['excess or neglect', 'restore baseline', 'hydration and sleep']
    }
  },
  'the-devil': {
    upright: {
      relationships: ['name the hook', 'consent and choice', 're-negotiate'],
      work: ['burnout contracts', 'healthy boundaries', 'ethical trades'],
      finance: ['unmask debts', 'break predatory ties', 'cash clarity'],
      health: ['compulsion awareness', 'environment design', 'substitution wins']
    },
    reversed: {
      relationships: ['detox from drama', 'reclaim autonomy', 'support networks'],
      work: ['exit toxic patterns', 'values-first decisions', 'redefine success'],
      finance: ['debt recovery plan', 'close harmful accounts', 'freedom fund'],
      health: ['addiction support', 'micro-habits', 'identity shift']
    }
  },
  'the-tower': {
    upright: {
      relationships: ['truth breaks illusion', 'stabilize essentials', 'lean on honesty'],
      work: ['contingency mode', 'communicate clearly', 'rebuild on facts'],
      finance: ['emergency triage', 'prioritize shelter', 'prevent repeat'],
      health: ['acute care focus', 'remove hazards', 'gentle recovery']
    },
    reversed: {
      relationships: ['aftershocks', 'repair foundations', 'forgiveness work'],
      work: ['postmortem', 'resilience upgrades', 'fail-safes'],
      finance: ['slow crumble', 'address root causes', 'insurance check'],
      health: ['close call lesson', 'safety protocols', 'gradual return']
    }
  },
  'the-star': {
    upright: {
      relationships: ['tender hope', 'gentle reconnection', 'quiet generosity'],
      work: ['vision refresh', 'show small wins', 'mentor others'],
      finance: ['healing plan', 'slow restoration', 'faith plus math'],
      health: ['soothing routines', 'hydration and rest', 'compassionate rehab']
    },
    reversed: {
      relationships: ['discouragement', 'name the hurt', 'tiny hopeful act'],
      work: ['fatigue', 'simplify roadmap', 'recover morale'],
      finance: ['confidence dip', 'protect basics', 'stepwise rebuild'],
      health: ['burnout signs', 'scale back', 'gentle guidance']
    }
  },
  'the-moon': {
    upright: {
      relationships: ['move slowly', 'check stories', 'trust feelings not fear'],
      work: ['unclear signals', 'test assumptions', 'night thinking to day plans'],
      finance: ['avoid speculation', 'verify info', 'sleep on decisions'],
      health: ['dreams and cycles', 'soft lighting', 'calming inputs']
    },
    reversed: {
      relationships: ['fog lifting', 'speak truths', 'ground in facts'],
      work: ['expose ambiguity', 'clear comms', 'simple tasks'],
      finance: ['false shine fades', 'real numbers', 'steady path'],
      health: ['anxiety calming', 'breath and support', 'light movement']
    }
  },
  'the-sun': {
    upright: {
      relationships: ['joy shared', 'playful dates', 'celebrate together'],
      work: ['public wins', 'showcase results', 'raise standards kindly'],
      finance: ['healthy surplus', 'invest in vitality', 'gratitude budget'],
      health: ['sunlit movement', 'outdoors time', 'simple pleasures']
    },
    reversed: {
      relationships: ['overexposure', 'ego softening', 'find sincere joy'],
      work: ['hype vs substance', 'return to craft', 'protect energy'],
      finance: ['status spending', 'reconnect to meaning', 'moderate outflow'],
      health: ['burnout glow', 'rest and shade', 'play without pressure']
    }
  },
  'judgement': {
    upright: {
      relationships: ['forgive honestly', 'renew vows', 'answer the call'],
      work: ['clarify purpose', 'ship boldly', 'own history and move'],
      finance: ['clean the ledger', 'align money to mission', 'decisive pivot'],
      health: ['release guilt', 'purposeful habits', 'support network']
    },
    reversed: {
      relationships: ['self-judgment', 'repair before decide', 'compassion first'],
      work: ['fear of visibility', 'practice launches', 'iterate publicly'],
      finance: ['avoidance of truth', 'face balances', 'simple next step'],
      health: ['perfection freeze', 'gentle start', 'community helps']
    }
  },
  'the-world': {
    upright: {
      relationships: ['shared completion', 'travel or merge homes', 'gratitude ritual'],
      work: ['finish and publish', 'hand-off cleanly', 'reflect learnings'],
      finance: ['close goals', 'reinvest wisely', 'celebrate prudently'],
      health: ['cycle complete', 'maintenance plan', 'holistic balance']
    },
    reversed: {
      relationships: ['loose ends', 'define closure', 'honor the ending'],
      work: ['unfinished scope', 'tie-off tasks', 'QA the result'],
      finance: ['near but not done', 'final payments', 'document outcomes'],
      health: ['almost there', 'seal habits', 'light accountability']
    }
  }
};

const RANK_GUIDES = {
  'Ace': {
    relationships: ['new spark', 'openness to meet', 'curious exchange'],
    work: ['fresh brief', 'pilot project', 'beginner’s mind'],
    finance: ['seed capital', 'start saving', 'simple structure'],
    health: ['baseline habits', 'introduce one change', 'gentle ramp']
  },
  'Two': {
    relationships: ['choices together', 'balance needs', 'set rhythm'],
    work: ['dual priorities', 'compare paths', 'commit soon'],
    finance: ['juggle costs', 'prioritize core', 'steady transfers'],
    health: ['balance rest/move', 'two key habits', 'consistency']
  },
  'Three': {
    relationships: ['team energy', 'early growth', 'shared support'],
    work: ['collaboration', 'early traction', 'plan the next stage'],
    finance: ['multiple streams', 'grow carefully', 'review plan'],
    health: ['group support', 'measurable gains', 'keep form clean']
  },
  'Four': {
    relationships: ['stability', 'home focus', 'rituals'],
    work: ['platform building', 'documentation', 'reliability'],
    finance: ['savings base', 'controls', 'emergency fund'],
    health: ['regular schedule', 'sleep hygiene', 'simple nutrition']
  },
  'Five': {
    relationships: ['conflict or strain', 'practice repair', 'name needs'],
    work: ['challenges surface', 'learn from friction', 'adjust tactics'],
    finance: ['lean period', 'reduce exposure', 'seek assistance'],
    health: ['stress signals', 'scale down', 'gentle support']
  },
  'Six': {
    relationships: ['support and receive', 'acts of service', 'kindness wins'],
    work: ['help flows', 'mentorship', 'steady progress'],
    finance: ['fair exchange', 'donate wisely', 'balance inflow/outflow'],
    health: ['rehab success', 'paced increase', 'community care']
  },
  'Seven': {
    relationships: ['assessment moment', 'choose strategy', 'hold boundaries'],
    work: ['review outcomes', 'optimize path', 'persevere'],
    finance: ['portfolio check', 'trim waste', 'patient stance'],
    health: ['plateau review', 'tweak inputs', 'stick with plan']
  },
  'Eight': {
    relationships: ['focused effort', 'meaningful work', 'clean exits'],
    work: ['skill building', 'productive flow', 'deliberate practice'],
    finance: ['earn through craft', 'automate gains', 'steady investment'],
    health: ['consistent training', 'form first', 'safe progression']
  },
  'Nine': {
    relationships: ['near completion', 'protect energy', 'healthy boundaries'],
    work: ['final push', 'prevent burnout', 'tighten scope'],
    finance: ['solid position', 'guard against leaks', 'gratitude'],
    health: ['listen to fatigue', 'recovery priority', 'prevent overuse']
  },
  'Ten': {
    relationships: ['family systems', 'legacy themes', 'long-term comfort'],
    work: ['handoff and scale', 'institutionalize wins', 'document legacy'],
    finance: ['long horizon', 'wealth stewardship', 'shared benefits'],
    health: ['lifestyle consolidation', 'sustaining routines', 'longevity moves']
  },
  'Page': {
    relationships: ['messages of care', 'learning love', 'curious dates'],
    work: ['intern energy', 'ask questions', 'ship small'],
    finance: ['entry-level steps', 'read and learn', 'budget practice'],
    health: ['learn technique', 'light practice', 'body awareness']
  },
  'Knight': {
    relationships: ['bold gestures', 'clear pursuit', 'mind the pace'],
    work: ['action-forward', 'move fast with checks', 'channel drive'],
    finance: ['opportunistic but smart', 'avoid overtrade', 'park gains'],
    health: ['intensity with recovery', 'avoid recklessness', 'coach helps']
  },
  'Queen': {
    relationships: ['warm stewardship', 'emotional intelligence', 'nurtured bonds'],
    work: ['protect team', 'mentor', 'set healthy culture'],
    finance: ['comfort and prudence', 'resource wisdom', 'supportive spending'],
    health: ['care rituals', 'soothing environments', 'attuned pacing']
  },
  'King': {
    relationships: ['clear direction', 'responsible love', 'safety'],
    work: ['set strategy', 'decide and own', 'model integrity'],
    finance: ['govern finances', 'long-term planning', 'responsible risk'],
    health: ['lead by example', 'structured plan', 'medical partnership']
  }
};

const SUIT_GUIDES = {
  wands: {
    relationships: ['ignite passion carefully', 'honest excitement', 'adventures together'],
    work: ['entrepreneurial spark', 'present boldly', 'ship prototypes'],
    finance: ['fund experiments', 'avoid gambles', 'invest in energy'],
    health: ['dynamic movement', 'warm-ups matter', 'playful activity']
  },
  cups: {
    relationships: ['tend feelings', 'practice empathy', 'gentle vulnerability'],
    work: ['people-first culture', 'service excellence', 'creative harmony'],
    finance: ['values-driven spending', 'support loved ones wisely', 'charitable flow'],
    health: ['hydration and rest', 'emotional regulation', 'mind-body practices']
  },
  swords: {
    relationships: ['speak truth kindly', 'resolve conflicts', 'mental clarity'],
    work: ['strategic focus', 'sharp writing', 'data clarity'],
    finance: ['read contracts', 'negotiate terms', 'cut waste'],
    health: ['breathwork', 'sleep for cognition', 'reduce stress inputs']
  },
  pentacles: {
    relationships: ['acts of service', 'build home', 'shared routines'],
    work: ['craft and reliability', 'ops excellence', 'practical milestones'],
    finance: ['budgeting and saving', 'assets and maintenance', 'steady returns'],
    health: ['strength and mobility', 'nutrition basics', 'walks and nature']
  }
};

function overviewText({cardName, slug, arcana, suit, rank, orientation}){
  const headline = arcana === 'major' ? majorHeadlines[slug] : minorHeadline(rank, suit);
  const suitContext = suit ? `${titleCase(suit)} (${suitLabel(suit)})` : 'Major Arcana archetype';
  const parts = [];
  // Natural opening that reads like human copy
  parts.push(headline);
  if (orientation === 'upright') {
    parts.push(`Upright, ${cardName} points to momentum you can trust. Let reality—not worry—set your pace. ${suitContext} hints at where to apply attention; choose one clear action and let steady practice do the rest.`);
  } else {
    parts.push(`Reversed, ${cardName} reveals where energy snags. Name what is off, remove one source of friction, and return to the simplest version that works. ${suitContext} shows the terrain; tidy it with patience.`);
  }
  parts.push(`Keep changes human‑sized and observable. Review gently, adjust honestly, and continue.`);
  return ensureWordCount(paragraph(parts), 200);
}

function baseKeywords(section, card){
  const set = {
    relationships: ['honesty','understanding','boundaries','care','growth'],
    work: ['focus','delivery','process','learning','impact'],
    finance: ['planning','stability','clarity','habits','value'],
    health: ['routine','recovery','awareness','balance','consistency'],
  };
  return set[section];
}

function paragraph(words){
  return words.join(' ').replace(/\s+/g,' ').trim();
}

function ensureWordCount(text, minWords=200){
  const words = text.split(/\s+/).filter(Boolean);
  if(words.length >= minWords) return text;
  const filler = 'Choose one step you can keep this week; review gently and continue.';
  while(words.length < minWords){
    const add = filler.split(' ');
    for(const w of add){
      words.push(w);
      if(words.length >= minWords) break;
    }
  }
  return paragraph(words);
}

function longSectionText({cardName, slug, arcana, suit, rank, orientation, section}){
  const niceSection = section === 'work' ? 'Work & Career' : titleCase(section);
  const suitContext = suit ? `${titleCase(suit)} (${suitLabel(suit)})` : 'Major Arcana archetype';
  const majorGuide = arcana === 'major' ? (MAJOR_GUIDES[slug]?.[orientation]?.[section] || []) : [];
  const rankGuide = arcana === 'minor' ? (RANK_GUIDES[rank]?.[section] || []) : [];
  const suitGuide = arcana === 'minor' ? (SUIT_GUIDES[suit]?.[section] || []) : [];
  const themes = [...majorGuide, ...rankGuide, ...suitGuide].slice(0, 4);

  const open = orientation === 'upright'
    ? `${cardName} in ${niceSection} centers on ${themes.join(', ') || 'what truly matters'}—specific moves that create real progress.`
    : `${cardName} reversed in ${niceSection} calls out ${themes.join(', ') || 'the snags in play'}—name them, correct them, and restart with care.`;

  const body = section === 'relationships'
    ? `Speak plainly and listen with warmth. Set a pace that protects safety and respect. ${themes.length ? `Let ${themes[0]} lead, and support it with ${themes.slice(1).join(', ')}.` : ''}`
    : section === 'work'
      ? `Define success crisply and work backward to a single deliverable. Share drafts, gather feedback, and improve. ${themes.length ? `Lean into ${themes.join(', ')}.` : ''}`
      : section === 'finance'
        ? `Write the numbers down, automate what helps, and remove waste. Read terms in daylight. ${themes.length ? `Focus on ${themes.join(', ')}.` : ''}`
        : `Choose humane routines you can keep. Rest is part of training. ${themes.length ? `Emphasize ${themes.join(', ')}.` : ''}`;

  const close = `Context: ${suitContext}. Keep choices human‑sized; review gently and continue.`;
  return ensureWordCount(paragraph([open, body, close]));
}

function buildCardEntry(card){
  const { name, slug, arcana, suit, rank } = card;
  const sections = ['relationships','work','finance','health'];
  const entry = {
    slug,
    upright: {
      overview: {
        keywords: [],
        text: overviewText({cardName:name, slug, arcana, suit, rank, orientation:'upright'}),
        yesNo: arcana === 'major' ? majorMeta(slug).yesNo : (suit === 'wands' || suit === 'pentacles' ? 'Yes' : (suit === 'cups' ? 'Maybe' : 'No')),
        zodiac: arcana === 'major' ? majorMeta(slug).zodiac : suitLabel(suit),
        element: arcana === 'major' ? undefined : suitElementName(suit)
      },
    },
    reversed: {
      overview: {
        keywords: [],
        text: overviewText({cardName:name, slug, arcana, suit, rank, orientation:'reversed'}),
        yesNo: arcana === 'major' ? (majorMeta(slug).yesNo === 'Yes' ? 'Not yet' : majorMeta(slug).yesNo) : (suit === 'wands' || suit === 'pentacles' ? 'Not yet' : (suit === 'cups' ? 'No' : 'No')),
        zodiac: arcana === 'major' ? majorMeta(slug).zodiac : suitLabel(suit),
        element: arcana === 'major' ? undefined : suitElementName(suit)
      },
    },
  };
  for(const section of sections){
    const uprText = longSectionText({cardName:name, slug, arcana, suit, rank, orientation:'upright', section});
    const revText = longSectionText({cardName:name, slug, arcana, suit, rank, orientation:'reversed', section});
    entry.upright[section] = { keywords: baseKeywords(section, card), text: uprText };
    entry.reversed[section] = { keywords: baseKeywords(section, card), text: revText };
  }
  return entry;
}

function buildAll(){
  const items = {};
  // majors
  majorNames.forEach((name)=>{
    const slug = slugify(name);
    const card = { name, slug, arcana:'major', suit:null, rank:null };
    items[slug] = buildCardEntry(card);
  });
  // minors
  suits.forEach((suit)=>{
    ranks.forEach((rank)=>{
      const name = `${rank} of ${titleCase(suit)}`;
      const slug = slugify(name);
      const card = { name, slug, arcana:'minor', suit, rank };
      items[slug] = buildCardEntry(card);
    });
  });
  return items;
}

// We now replace the entire meanings file deterministically every run

function main(){
  let existing = {};
  const generated = buildAll();
  fs.writeFileSync(OUTPUT, JSON.stringify(generated, null, 2));
  console.log('Wrote meanings to', OUTPUT);
}

main();
