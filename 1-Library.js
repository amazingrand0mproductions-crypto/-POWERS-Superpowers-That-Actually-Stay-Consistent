/*
 * POWERS — Intelligent Superpower Continuity Engine for AI Dungeon
 * Library
 *
 * Design goals:
 * - Scenario agnostic: superhero, fantasy, sci-fi, horror, anime, modern, etc.
 * - Evidence first: claims, attempts, observed feats and limitations are different things.
 * - Narrative first: no mandatory dice, levels or visible stat blocks.
 * - Conservative continuity: do not invent upgrades, counters, origins or immunities.
 * - Lightweight: parses only new text and keeps bounded state for AI Dungeon's sandbox.
 */

var POWERS = (function () {
  "use strict";

  var ENGINE_NAME = "POWERS";
  var NS = "powers";

  var DEFAULTS = {
    enabled: true,
    configPreset: "custom",            // custom | story | strict | lightweight
    mode: "narrative",                 // narrative | balanced | simulation
    detection: "balanced",             // conservative | balanced | aggressive
    trackPlayer: true,
    trackNPCs: true,
    allowCustomPowers: true,
    inferFromFeats: true,
    trackProgression: true,
    trackForms: true,
    trackDefenses: true,
    trackTemporaryEffects: true,
    trackPowerSources: true,
    trackInteractions: true,
    ontologyDetection: true,
    trackApplications: true,
    trackTraits: true,
    strictMechanics: true,
    highTierGuard: true,
    trackActivation: true,
    trackPowerLinks: true,

    // Deep continuity systems.
    timelineAwareness: true,
    dedupeByAction: true,
    subjectAwareClauses: true,
    strictAttemptMatching: true,
    trackAccessModes: true,
    trackOperationalState: true,
    trackVariants: true,
    trackEnvironment: true,
    trackTechniques: true,
    trackReliability: true,
    trackPrecision: true,
    trackResources: true,
    trackSignatures: true,
    trackTraining: true,
    trackSynergies: true,
    trackCollateral: true,
    authoredMetadata: true,
    authoredReconciliation: true,

    // Inner Current: evidence-anchored private character continuity.
    trackPsyche: true,
    trackPsycheCards: true,
    protectPlayerAgency: true,
    allowPlayerExplicitPsyche: true,
    trackBeliefs: true,
    trackGoals: true,
    trackSecrets: true,
    trackEmotions: true,
    trackVows: true,
    trackSelfImage: true,
    trackPowerAttitudes: true,
    trackRelationships: true,
    trackEmotionPowerLinks: true,
    attemptReferee: true,
    emotionMemoryTurns: 12,

    autoStoryCards: true,
    cleanGeneratedCards: true,
    storyCardInterval: 6,
    contextDetail: "medium",           // low | medium | high
    contextChars: 3400,
    psycheContextChars: 1100,
    contextSafetyMargin: 240,
    maxContextEntities: 6,
    maxPsycheEntities: 4,
    maxPowersPerEntity: 9,
    maxPowersStored: 30,
    maxAliases: 10,
    maxEvidencePerPower: 10,
    maxFeatsPerPower: 8,
    maxNotesPerPower: 8,
    maxRecentEvents: 16,
    maxApplicationsPerPower: 10,
    maxTraitsPerPower: 10,
    maxInteractions: 24,
    maxTechniquesPerPower: 10,
    maxVariantsPerPower: 6,
    maxEnvironmentRulesPerPower: 8,
    maxResourcesPerPower: 8,
    maxTrainingNotesPerPower: 8,
    maxPsychePerType: 8,
    maxTrackedEntities: 60,
    staleEntityTurns: 30,
    pendingAttemptTurns: 2,
    bootstrapHistoryEntries: 8,
    confirmScore: 2.4,
    probableScore: 1.25,
    failedAttemptPenalty: 0.0,
    featScore: 1.6,
    explicitScore: 2.6,
    claimScore: 1.1,
    debug: false,
    showMessages: false
  };

  var CONFIG_ENUMS = {
    configPreset: { custom: 1, story: 1, strict: 1, lightweight: 1 },
    mode: { narrative: 1, balanced: 1, simulation: 1 },
    detection: { conservative: 1, balanced: 1, aggressive: 1 },
    contextDetail: { low: 1, medium: 1, high: 1 }
  };

  var BOOL_KEYS = {
    enabled:1, trackPlayer:1, trackNPCs:1, allowCustomPowers:1, inferFromFeats:1, trackProgression:1, trackForms:1, trackDefenses:1, trackTemporaryEffects:1, trackPowerSources:1, trackInteractions:1, ontologyDetection:1, trackApplications:1, trackTraits:1, strictMechanics:1, highTierGuard:1, trackActivation:1, trackPowerLinks:1, timelineAwareness:1, dedupeByAction:1, subjectAwareClauses:1, strictAttemptMatching:1, trackAccessModes:1, trackOperationalState:1, trackVariants:1, trackEnvironment:1, trackTechniques:1, trackReliability:1, trackPrecision:1, trackResources:1, trackSignatures:1, trackTraining:1, trackSynergies:1, trackCollateral:1, authoredMetadata:1, authoredReconciliation:1, trackPsyche:1, trackPsycheCards:1, protectPlayerAgency:1, allowPlayerExplicitPsyche:1, trackBeliefs:1, trackGoals:1, trackSecrets:1, trackEmotions:1, trackVows:1, trackSelfImage:1, trackPowerAttitudes:1, trackRelationships:1, trackEmotionPowerLinks:1, attemptReferee:1, autoStoryCards:1, cleanGeneratedCards:1, debug:1, showMessages:1
  };

  var NUM_KEYS = {
    storyCardInterval: [1, 50],
    contextChars: [800, 8000],
    psycheContextChars: [300, 4000],
    contextSafetyMargin: [0, 1500],
    maxContextEntities: [1, 12],
    maxPsycheEntities: [1, 10],
    maxPowersPerEntity: [1, 18],
    maxPowersStored: [8, 60],
    maxAliases: [2, 20],
    maxEvidencePerPower: [2, 20],
    maxFeatsPerPower: [2, 18],
    maxNotesPerPower: [2, 16],
    maxRecentEvents: [4, 40],
    maxApplicationsPerPower: [2, 18],
    maxTraitsPerPower: [2, 18],
    maxInteractions: [4, 50],
    maxTechniquesPerPower: [2, 18],
    maxVariantsPerPower: [1, 12],
    maxEnvironmentRulesPerPower: [2, 16],
    maxResourcesPerPower: [2, 16],
    maxTrainingNotesPerPower: [2, 16],
    maxPsychePerType: [2, 16],
    maxTrackedEntities: [20, 120],
    staleEntityTurns: [10, 250],
    pendingAttemptTurns: [1, 6],
    bootstrapHistoryEntries: [0, 24],
    emotionMemoryTurns: [1, 100],
    confirmScore: [1, 6],
    probableScore: [0.25, 5],
    failedAttemptPenalty: [-2, 1],
    featScore: [0.1, 2],
    explicitScore: [0.5, 5],
    claimScore: [0.1, 3]
  };

  var INTEGER_CONFIG_KEYS = {storyCardInterval:1,contextSafetyMargin:1,maxContextEntities:1,maxPsycheEntities:1,maxPowersPerEntity:1,maxPowersStored:1,maxAliases:1,maxEvidencePerPower:1,maxFeatsPerPower:1,maxNotesPerPower:1,maxRecentEvents:1,maxApplicationsPerPower:1,maxTraitsPerPower:1,maxInteractions:1,maxTechniquesPerPower:1,maxVariantsPerPower:1,maxEnvironmentRulesPerPower:1,maxResourcesPerPower:1,maxTrainingNotesPerPower:1,maxPsychePerType:1,maxTrackedEntities:1,staleEntityTurns:1,pendingAttemptTurns:1,bootstrapHistoryEntries:1,emotionMemoryTurns:1};

  var CONFIG_PRESETS = {
    custom: {},
    story: {
      mode:"narrative", detection:"balanced", contextDetail:"medium", contextChars:3200, psycheContextChars:1000,
      maxContextEntities:6, maxPsycheEntities:4, autoStoryCards:true, storyCardInterval:6, attemptReferee:true
    },
    strict: {
      mode:"simulation", detection:"conservative", contextDetail:"high", contextChars:4200, psycheContextChars:1300,
      maxContextEntities:7, maxPsycheEntities:5, strictMechanics:true, highTierGuard:true, strictAttemptMatching:true,
      attemptReferee:true, autoStoryCards:true, storyCardInterval:5
    },
    lightweight: {
      mode:"narrative", detection:"balanced", contextDetail:"low", contextChars:1600, psycheContextChars:550,
      maxContextEntities:4, maxPsycheEntities:2, maxPowersPerEntity:6, storyCardInterval:10,
      trackSignatures:false, trackTraining:false, trackSynergies:false, trackCollateral:false
    }
  };

  var CONFIG_KEY_LOOKUP = null;
  function normalizedConfigKey(value){return lower(String(value||"")).replace(/[^a-z0-9]/g,"");}
  function canonicalConfigKey(value){
    var k,n=normalizedConfigKey(value);
    if(!CONFIG_KEY_LOOKUP){CONFIG_KEY_LOOKUP={};for(k in DEFAULTS)if(hasOwn(DEFAULTS,k))CONFIG_KEY_LOOKUP[normalizedConfigKey(k)]=k;}
    return CONFIG_KEY_LOOKUP[n]||"";
  }
  function applyConfigPreset(cfg,preset){var p=CONFIG_PRESETS[preset]||CONFIG_PRESETS.custom,k;for(k in p)if(hasOwn(p,k))cfg[k]=p[k];cfg.configPreset=preset||"custom";return cfg;}

  function normalizeConfig(cfg){
    if(!cfg)return copyDefaults();
    if(cfg.probableScore>=cfg.confirmScore)cfg.probableScore=Math.max(0.25,round2(cfg.confirmScore-0.25));
    if(cfg.maxPowersPerEntity>cfg.maxPowersStored)cfg.maxPowersPerEntity=cfg.maxPowersStored;
    if(cfg.psycheContextChars>cfg.contextChars)cfg.psycheContextChars=Math.max(300,Math.min(cfg.psycheContextChars,cfg.contextChars));
    if(cfg.maxPsycheEntities>cfg.maxTrackedEntities)cfg.maxPsycheEntities=cfg.maxTrackedEntities;
    if(cfg.maxContextEntities>cfg.maxTrackedEntities)cfg.maxContextEntities=cfg.maxTrackedEntities;
    return cfg;
  }

  // Canonical powers. Dynamic/custom abilities can coexist with this list.
  // "terms" are direct mentions. "feats" are intentionally narrower and are
  // used only as low-weight evidence when the narration demonstrates an ability.
  var POWER_DEFS = [
    {id:"flight", name:"Flight", cat:"mobility", terms:["flight","flying","fly","flies","levitation","levitate","hovering","hover","airborne"], feats:["takes flight","takes off into the air","soars through","hovers above","rises into the air","flies toward","flies over"]},
    {id:"super_strength", name:"Super Strength", cat:"physical", terms:["super strength","superstrength","superhuman strength","enhanced strength","immense strength","great strength"], feats:["lifts the car","lifts a car","throws the car","bends steel","tears through steel","punches through concrete","rips the door off","lifts the truck"]},
    {id:"super_speed", name:"Super Speed", cat:"mobility", terms:["super speed","superspeed","superhuman speed","enhanced speed","speedster","hyper speed"], feats:["moves in a blur","vanishes in a blur","faster than the eye","crosses the room instantly","outruns the car","runs across water"]},
    {id:"durability", name:"Superhuman Durability", cat:"physical", terms:["superhuman durability","enhanced durability","super durability","bulletproof","near invulnerable","nigh invulnerable"], feats:["bullet bounces off","bullets bounce off","walks away from the explosion","survives the explosion","shrugs off the blow"]},
    {id:"invulnerability", name:"Invulnerability", cat:"defense", terms:["invulnerability","invulnerable","indestructible","impervious"], feats:["without a scratch","cannot be harmed","has no effect on him","has no effect on her","has no effect on them"]},
    {id:"regeneration", name:"Regeneration", cat:"recovery", terms:["regeneration","regenerative healing","healing factor","rapid healing","regenerate","regenerates"], feats:["wound closes","wounds close","flesh knits","heals in seconds","bone resets itself","regrows"]},
    {id:"healing", name:"Healing", cat:"recovery", terms:["healing power","healing ability","heal others","healing touch","restoration magic"], feats:["wound closes under","heals his wound","heals her wound","heals their wound"]},
    {id:"telekinesis", name:"Telekinesis", cat:"psychic", terms:["telekinesis","telekinetic","psychokinesis","move things with his mind","move things with her mind","move things with their mind","move objects with the mind"], feats:["without touching it","with a thought, the","with his mind","with her mind","with their mind"]},
    {id:"telepathy", name:"Telepathy", cat:"psychic", terms:["telepathy","telepathic","mind reading","read minds","reads minds","hear thoughts","hears thoughts"], feats:["voice inside your head","speaks directly into your mind","hears your thoughts","reads your thoughts"]},
    {id:"mind_control", name:"Mind Control", cat:"psychic", terms:["mind control","mental domination","control minds","controls minds","compulsion"], feats:["forces him to obey","forces her to obey","forces them to obey","compels him","compels her","compels them"]},
    {id:"empathy", name:"Empathy", cat:"psychic", terms:["empathy power","empathic power","empath","sense emotions","feel emotions","read emotions"], feats:["feels his fear as if","feels her fear as if","senses the emotion"]},
    {id:"precognition", name:"Precognition", cat:"perception", terms:["precognition","precognitive","see the future","sees the future","future sight","foresight","premonition"], feats:["vision of the future","sees what will happen","seconds before it happens"]},
    {id:"clairvoyance", name:"Clairvoyance", cat:"perception", terms:["clairvoyance","clairvoyant","remote viewing","see distant places","scrying"], feats:["sees a distant room","vision shifts to a distant"]},
    {id:"enhanced_senses", name:"Enhanced Senses", cat:"perception", terms:["enhanced senses","super senses","superhuman senses","heightened senses","enhanced hearing","super hearing","enhanced smell"], feats:["hears the heartbeat","hears a whisper from","smells blood from"]},
    {id:"xray_vision", name:"X-Ray Vision", cat:"perception", terms:["x-ray vision","xray vision","see through walls","sees through walls"], feats:["looks through the wall","sees through the wall"]},
    {id:"invisibility", name:"Invisibility", cat:"stealth", terms:["invisibility","invisible","turn invisible","turns invisible","become invisible","becomes invisible","vanish from sight"], feats:["turns invisible","fades from sight","disappears from view","becomes invisible"]},
    {id:"intangibility", name:"Intangibility / Phasing", cat:"defense", terms:["intangibility","intangible","phasing","phase through","phases through","walk through walls","pass through solid matter"], feats:["passes through the wall","phases through the wall","attack passes through"]},
    {id:"teleportation", name:"Teleportation", cat:"mobility", terms:["teleportation","teleport","teleports","blink travel","blink away","instant teleport"], feats:["vanishes and reappears","disappears and reappears","appears several meters away","appears behind"]},
    {id:"portals", name:"Portal Creation", cat:"mobility", terms:["portal creation","create portals","opens a portal","open portals","gateway creation","wormhole creation"], feats:["portal opens","gateway opens","rift opens in the air"]},
    {id:"shapeshifting", name:"Shapeshifting", cat:"transformation", terms:["shapeshifting","shapeshift","shapeshifter","shape-shifting","shape shifter","change shape","changes shape","transform into animals","morph into"], feats:["body reshapes into","form changes into","morphs into"]},
    {id:"size_change", name:"Size Manipulation", cat:"transformation", terms:["size manipulation","size changing","grow giant","shrink down","change size","giant form","miniaturization"], feats:["grows to twice","shrinks to the size","becomes gigantic","grows enormous"]},
    {id:"elasticity", name:"Elasticity", cat:"physical", terms:["elasticity","stretching powers","stretch his body","stretch her body","stretch their body","rubber body"], feats:["arm stretches","arms stretch","body stretches"]},
    {id:"duplication", name:"Duplication", cat:"transformation", terms:["duplication","duplicate himself","duplicate herself","duplicate themselves","create clones","cloning power","copies of himself","copies of herself"], feats:["another copy of him","another copy of her","duplicate steps out"]},
    {id:"density", name:"Density Manipulation", cat:"transformation", terms:["density manipulation","change density","increase density","decrease density"], feats:["becomes impossibly heavy","body turns light as air"]},
    {id:"adaptation", name:"Adaptive Evolution", cat:"physical", terms:["adaptive evolution","reactive adaptation","adapt to threats","adapts to threats","evolve in response"], feats:["body adapts to","develops resistance to"]},
    {id:"pyrokinesis", name:"Fire Manipulation", cat:"elemental", terms:["pyrokinesis","fire manipulation","control fire","controls fire","manipulate fire","manipulates fire","flame manipulation","control flames","controls flames"], feats:["flames bend around","flames coil around","existing fire twists","existing flames move"]},
    {id:"cryokinesis", name:"Ice Manipulation", cat:"elemental", terms:["cryokinesis","ice manipulation","control ice","controls ice","manipulate ice","manipulates ice","control frost","ice control"], feats:["existing ice bends","ice shards hover","ice twists around","frost is reshaped"]},
    {id:"electrokinesis", name:"Electricity Manipulation", cat:"elemental", terms:["electrokinesis","electricity manipulation","electric manipulation","control electricity","controls electricity","manipulate electricity","manipulates electricity"], feats:["existing current bends","electric current changes course","electricity is redirected"]},
    {id:"hydrokinesis", name:"Water Manipulation", cat:"elemental", terms:["hydrokinesis","water manipulation","control water","controls water","water powers"], feats:["water rises at","water coils around","shapes the water"]},
    {id:"aerokinesis", name:"Air / Wind Manipulation", cat:"elemental", terms:["aerokinesis","wind manipulation","air manipulation","control wind","control air","wind powers"], feats:["gust erupts","wind whips around","air blasts outward"]},
    {id:"geokinesis", name:"Earth Manipulation", cat:"elemental", terms:["geokinesis","earth manipulation","stone manipulation","control earth","control stone","earth powers"], feats:["ground rises","stone bends","earth splits at"]},
    {id:"plant_control", name:"Plant Manipulation", cat:"elemental", terms:["plant manipulation","control plants","controls plants","chlorokinesis","plant powers"], feats:["vines surge","roots burst from","plants twist toward"]},
    {id:"weather", name:"Weather Manipulation", cat:"elemental", terms:["weather manipulation","control weather","storm control","atmospheric manipulation","weather powers"], feats:["storm gathers overhead","clouds gather at his will","clouds gather at her will"]},
    {id:"magnetism", name:"Magnetism Manipulation", cat:"fundamental", terms:["magnetism manipulation","magnetic powers","control magnetism","magnetokinesis"], feats:["metal tears toward","metal objects fly toward"]},
    {id:"gravity", name:"Gravity Manipulation", cat:"fundamental", terms:["gravity manipulation","gravity control","control gravity","gravitokinesis","gravity powers"], feats:["gravity intensifies","gravity reverses","weight vanishes"]},
    {id:"energy_projection", name:"Energy Projection", cat:"energy", terms:["energy projection","energy blast","energy blasts","energy beam","energy beams","energy bolt","energy bolts","project energy"], feats:["beam of energy","bolt of energy","energy erupts from"]},
    {id:"force_fields", name:"Force Fields", cat:"defense", terms:["force field","force fields","energy shield","barrier creation","protective barrier"], feats:["barrier snaps into place","shield of energy","invisible barrier"]},
    {id:"energy_absorption", name:"Energy Absorption", cat:"energy", terms:["energy absorption","absorb energy","absorbs energy","drain energy","energy drain"], feats:["absorbs the blast","drinks in the energy"]},
    {id:"power_absorption", name:"Power Absorption", cat:"meta", terms:["power absorption","absorb powers","absorbs powers","steal powers","steals powers","drain powers"], feats:["power drains into","ability fades as he takes","ability fades as she takes"]},
    {id:"power_copying", name:"Power Copying", cat:"meta", terms:["power copying","copy powers","copies powers","mimic powers","mimic abilities","power mimicry"], feats:["copies the ability","gains the same power"]},
    {id:"power_nullification", name:"Power Nullification", cat:"meta", terms:["power nullification","nullify powers","nullifies powers","suppress powers","suppresses powers","power dampening","anti-power field"], feats:["powers stop working","ability cuts out","power dies in his presence","power dies in her presence"]},
    {id:"power_amplification", name:"Power Amplification", cat:"meta", terms:["power amplification","amplify powers","boost powers","enhance powers","empower others"], feats:["power surges stronger","ability suddenly intensifies"]},
    {id:"magic", name:"Magic / Sorcery", cat:"mystic", terms:["magic powers","sorcery","spellcasting","spell-casting","arcane magic","witchcraft","wizardry","casts spells"], feats:["casts a spell","runes ignite","arcane energy","spell takes hold"]},
    {id:"necromancy", name:"Necromancy", cat:"mystic", terms:["necromancy","raise the dead","raises the dead","command undead","death magic"], feats:["corpse rises","dead rise at","skeleton claws free"]},
    {id:"summoning", name:"Summoning", cat:"mystic", terms:["summoning power","summon creatures","summons creatures","conjuration","conjure beings"], feats:["summons a","conjures a","creature materializes"]},
    {id:"spirit", name:"Spirit Manipulation", cat:"mystic", terms:["spirit manipulation","soul manipulation","control spirits","controls spirits","manipulate souls","soul control"], feats:["spirit is compelled","soul is pulled","ghost is forced to move"]},
    {id:"shadow", name:"Shadow Manipulation", cat:"mystic", terms:["shadow manipulation","control shadows","shadow powers","darkness manipulation","umbra powers"], feats:["shadows coil","darkness gathers","shadow rises"]},
    {id:"light", name:"Light Manipulation", cat:"energy", terms:["light manipulation","control light","photokinesis","light powers"], feats:["light bends around","burst of light","hard light"]},
    {id:"sound", name:"Sound Manipulation", cat:"energy", terms:["sound manipulation","sonic powers","sonokinesis","control sound","sonic scream"], feats:["sonic boom erupts","voice shatters","sound wave blasts"]},
    {id:"heat_vision", name:"Heat Vision", cat:"energy", terms:["heat vision","laser eyes","eye beams","optic blast","optic beams"], feats:["beams shoot from his eyes","beams shoot from her eyes","eyes fire beams","red beams from his eyes","red beams from her eyes"]},
    {id:"radiation", name:"Radiation Manipulation", cat:"energy", terms:["radiation manipulation","radiation powers","radioactive energy","emit radiation"], feats:["geiger counter screams","radiation pours from"]},
    {id:"poison", name:"Toxin / Poison Generation", cat:"biological", terms:["poison generation","toxin generation","venom powers","toxic secretion","poison powers"], feats:["venom drips","toxin spreads","poison seeps"]},
    {id:"biokinesis", name:"Biokinesis", cat:"biological", terms:["biokinesis","biological manipulation","flesh manipulation","control biology","body manipulation"], feats:["flesh reshapes","biology changes","cells rewrite"]},
    {id:"technopathy", name:"Technopathy", cat:"technology", terms:["technopathy","technokinesis","control technology","communicate with machines","machine control"], feats:["machine obeys without touching","computer responds to his thoughts","computer responds to her thoughts"]},
    {id:"cyberpathy", name:"Cyberpathy", cat:"technology", terms:["cyberpathy","interface with computers mentally","mind-machine interface","mentally access computers"], feats:["enters the network with his mind","enters the network with her mind"]},
    {id:"time", name:"Time Manipulation", cat:"fundamental", terms:["time manipulation","control time","temporal manipulation","manipulate time","manipulates time"], feats:["time distorts around","temporal flow bends","local time is altered"]},
    {id:"space", name:"Space Manipulation", cat:"fundamental", terms:["space manipulation","spatial manipulation","bend space","fold space","warp space"], feats:["space folds","distance collapses","space bends around"]},
    {id:"reality", name:"Reality Warping", cat:"fundamental", terms:["reality warping","reality manipulation","alter reality","rewrite reality","reality powers"], feats:["reality rewrites","world changes at his word","world changes at her word"]},
    {id:"probability", name:"Probability Manipulation", cat:"fundamental", terms:["probability manipulation","luck manipulation","control probability","probability powers","supernatural luck"], feats:["impossible coincidence","odds twist","luck bends"]},
    {id:"matter", name:"Matter Manipulation", cat:"fundamental", terms:["matter manipulation","control matter","rearrange matter","matter transmutation"], feats:["matter reshapes","material transforms at"]},
    {id:"transmutation", name:"Transmutation", cat:"fundamental", terms:["transmutation","transmute matter","turn lead into gold","change one material into another"], feats:["turns to gold at","material becomes"]},
    {id:"creation", name:"Object Creation", cat:"fundamental", terms:["object creation","create matter","materialize objects","manifest objects","construct creation"], feats:["object materializes in","weapon appears in his hand","weapon appears in her hand"]},
    {id:"destruction", name:"Disintegration", cat:"fundamental", terms:["disintegration","disintegrate","turn to dust","molecular destruction"], feats:["crumbles to dust at","disintegrates on contact"]},
    {id:"chi", name:"Chi / Life-Energy Manipulation", cat:"martial", terms:["chi manipulation","ki manipulation","chakra manipulation","life energy","chi powers","ki blast","aura control"], feats:["aura flares","ki blast","chi surges"]},
    {id:"wall_crawling", name:"Wall Crawling", cat:"mobility", terms:["wall crawling","wall-crawling","stick to walls","cling to walls","crawl on walls"], feats:["clings to the wall","crawls up the wall"]},
    {id:"webbing", name:"Web Generation", cat:"biological", terms:["web generation","webbing","shoot webs","web shooters","organic webs"], feats:["web shoots from","strand of web","web line snaps"]},
    {id:"underwater", name:"Aquatic Adaptation", cat:"physical", terms:["breathe underwater","underwater breathing","aquatic adaptation","gills","survive underwater"], feats:["breathes underwater","gills open"]},
    {id:"super_jump", name:"Super Jumping", cat:"mobility", terms:["super jump","super jumping","enhanced jumping","leap great distances","massive leaps"], feats:["leaps over the building","jumps onto the roof in one bound","clears the street in a single leap"]},
    {id:"reflexes", name:"Enhanced Reflexes", cat:"physical", terms:["enhanced reflexes","superhuman reflexes","super reflexes","accelerated reflexes"], feats:["dodges before","catches the bullet","reacts before the gunshot"]},
    {id:"agility", name:"Enhanced Agility", cat:"physical", terms:["enhanced agility","superhuman agility","super agility","acrobatic powers"], feats:["twists through the air impossibly","lands with impossible balance"]},
    {id:"danger_sense", name:"Danger Sense", cat:"perception", terms:["danger sense","danger-sense","spider sense","precognitive danger sense","sense danger"], feats:["warning prickles","danger sense screams","knows the attack is coming"]},
    {id:"echolocation", name:"Echolocation", cat:"perception", terms:["echolocation","sonar sense","sonar vision","see with sound"], feats:["maps the room by sound","clicks reveal the room"]},
    {id:"thermal_vision", name:"Thermal Vision", cat:"perception", terms:["thermal vision","infrared vision","heat vision sense","see heat signatures"], feats:["sees the heat signature","warm bodies glow"]},
    {id:"night_vision", name:"Night Vision", cat:"perception", terms:["night vision","darkvision","see in the dark","low-light vision"], feats:["sees clearly in total darkness","darkness looks bright"]},
    {id:"psychometry", name:"Psychometry", cat:"psychic", terms:["psychometry","object reading","read an object's past","see memories from objects"], feats:["memories flood in from the object","touch reveals its past"]},
    {id:"memory", name:"Memory Manipulation", cat:"psychic", terms:["memory manipulation","alter memories","erase memories","implant memories","memory powers"], feats:["memory disappears","rewrites the memory","forgets the event instantly"]},
    {id:"emotion", name:"Emotion Manipulation", cat:"psychic", terms:["emotion manipulation","control emotions","alter emotions","emotional manipulation","induce emotions"], feats:["fear vanishes at","anger floods through","emotion changes against"]},
    {id:"fear", name:"Fear Manipulation", cat:"psychic", terms:["fear manipulation","fear powers","induce fear","terror aura","fear aura"], feats:["unnatural terror grips","fear floods the room"]},
    {id:"dream", name:"Dream Manipulation", cat:"psychic", terms:["dream manipulation","dream walking","enter dreams","control dreams","dream powers"], feats:["steps into the dream","dream reshapes around"]},
    {id:"possession", name:"Possession", cat:"mystic", terms:["possession power","possess people","possesses bodies","body possession","spirit possession"], feats:["takes control of his body","takes control of her body","enters the host"]},
    {id:"astral_projection", name:"Astral Projection", cat:"mystic", terms:["astral projection","astral form","project the spirit","project astral body","leave the body as a spirit"], feats:["astral body rises","spirit steps out of the body","projects her astral body","projects his astral body","projects their astral body","astral body leaves"]},
    {id:"resurrection", name:"Resurrection", cat:"recovery", terms:["resurrection","resurrect the dead","revive the dead","bring back the dead","raise someone to life"], feats:["returns the dead to life","heartbeat starts again after death"]},
    {id:"dimensional_travel", name:"Dimensional Travel", cat:"mobility", terms:["dimensional travel","travel between dimensions","cross dimensions","interdimensional travel","plane shifting","realm travel"], feats:["steps into another dimension","crosses into another reality"]},
    {id:"pocket_dimension", name:"Pocket Dimension", cat:"fundamental", terms:["pocket dimension","personal dimension","create a dimension","dimensional storage","subspace storage"], feats:["opens a private dimension","stores it outside normal space"]},
    {id:"vibration", name:"Vibration Manipulation", cat:"fundamental", terms:["vibration manipulation","control vibrations","vibration powers","vibrate molecules"], feats:["vibrates through","vibration shatters","molecules begin vibrating"]},
    {id:"kinetic", name:"Kinetic Energy Manipulation", cat:"energy", terms:["kinetic energy manipulation","kinetic absorption","kinetic control","store kinetic energy","redirect kinetic energy"], feats:["absorbs the impact","stores the force of the blow","releases the stolen momentum"]},
    {id:"friction", name:"Friction Manipulation", cat:"fundamental", terms:["friction manipulation","control friction","remove friction","increase friction"], feats:["surface becomes frictionless","feet lock as friction spikes"]},
    {id:"plasma", name:"Plasma Manipulation", cat:"elemental", terms:["plasma manipulation","plasma powers","generate plasma","control plasma"], feats:["plasma gathers","plasma bolt","white-hot plasma"]},
    {id:"lava", name:"Lava / Magma Manipulation", cat:"elemental", terms:["lava manipulation","magma manipulation","control lava","control magma","lavakinesis"], feats:["magma rises","lava coils","ground melts into lava"]},
    {id:"metal", name:"Metal Manipulation", cat:"elemental", terms:["metal manipulation","control metal","ferrokinesis","bend metal with the mind"], feats:["metal bends toward","steel twists at"]},
    {id:"sand", name:"Sand Manipulation", cat:"elemental", terms:["sand manipulation","control sand","sand powers","arenakinesis"], feats:["sand rises in a wave","sand coils around"]},
    {id:"smoke", name:"Smoke Manipulation", cat:"elemental", terms:["smoke manipulation","control smoke","controls smoke","manipulate smoke","smoke control"], feats:["smoke coils at","existing smoke bends"]},
    {id:"acid", name:"Acid Manipulation", cat:"elemental", terms:["acid manipulation","control acid","controls acid","manipulate acid"], feats:["existing acid bends","acid changes direction"]},
    {id:"crystal", name:"Crystal Manipulation", cat:"elemental", terms:["crystal manipulation","control crystals","controls crystals","manipulate crystals"], feats:["existing crystals bend","crystal shards hover"]},
    {id:"glass", name:"Glass Manipulation", cat:"elemental", terms:["glass manipulation","control glass","glass powers"], feats:["glass bends like liquid","shards hover around"]},
    {id:"blood", name:"Blood Manipulation", cat:"biological", terms:["blood manipulation","blood control","hemokinesis","blood powers"], feats:["blood rises against gravity","controls the blood"]},
    {id:"bone", name:"Bone Manipulation", cat:"biological", terms:["bone manipulation","bone powers","control bone","grow bone weapons"], feats:["bone blade grows","bones reshape"]},
    {id:"camouflage", name:"Adaptive Camouflage", cat:"stealth", terms:["adaptive camouflage","camouflage power","blend into surroundings","chameleon skin"], feats:["skin matches the wall","blends perfectly into"]},
    {id:"animal_control", name:"Animal Control", cat:"psychic", terms:["animal control","control animals","controls animals","command animals","commands animals","compel animals"], feats:["animals obey the silent command","animal obeys against its will"]},
    {id:"animal_communication", name:"Animal Communication", cat:"communication", terms:["animal communication","speak to animals","speaks to animals","communicate with animals","communicates with animals","understand animals","animal language"], feats:["speaks with the animal","understands the animal reply","animal answers and is understood"]},
    {id:"seismic_sense", name:"Seismic Sense", cat:"perception", terms:["seismic sense","tremor sense","sense vibrations through the ground","earth sense"], feats:["feels footsteps through the ground","maps movement through vibrations"]},
    {id:"solar_absorption", name:"Solar Energy Absorption", cat:"energy", terms:["solar absorption","solar energy absorption","absorb sunlight","powered by sunlight","solar-powered abilities"], feats:["strength returns in sunlight","sunlight charges the power"]},
    {id:"cosmic_awareness", name:"Cosmic Awareness", cat:"perception", terms:["cosmic awareness","universal awareness","sense cosmic events","cosmic perception"], feats:["feels the disturbance across the universe","awareness expands across space"]},
    {id:"power_detection", name:"Power Detection", cat:"meta", terms:["power detection","detect powers","sense powers","sense abilities","identify superpowers"], feats:["senses the power inside","identifies the ability at a glance"]},
    {id:"power_bestowal", name:"Power Bestowal", cat:"meta", terms:["power bestowal","grant powers","give powers","bestow abilities","empower someone with a power"], feats:["grants him a power","grants her a power","awakens a new ability in"]},
    {id:"power_resistance", name:"Power Resistance", cat:"meta", terms:["power resistance","resist superpowers","resistant to powers","superpower resistance"], feats:["power has reduced effect","ability struggles to affect"]},
    {id:"power_storage", name:"Power Storage", cat:"meta", terms:["power storage","store powers","bank abilities","hold stolen powers"], feats:["stores the copied ability","keeps the absorbed power"]},
    {id:"ability_evolution", name:"Ability Evolution", cat:"meta", terms:["power evolution","ability evolution","evolving powers","powers evolve","ability mutates"], feats:["power develops a new function","ability evolves in response"]},
    {id:"constructs", name:"Energy Constructs", cat:"energy", terms:["energy constructs","hard-light constructs","create energy weapons","solid energy constructs"], feats:["energy forms a weapon","construct solidifies"]},
    {id:"aura", name:"Aura Projection", cat:"energy", terms:["aura projection","power aura","energy aura","project an aura"], feats:["aura flares around","pressure rolls off"]},
    {id:"life_drain", name:"Life Drain", cat:"biological", terms:["life drain","drain life","drain vitality","steal life force"], feats:["victim weakens as vitality flows","drains the life from"]},
    {id:"age_manipulation", name:"Age Manipulation", cat:"biological", terms:["age manipulation","alter age","de-age","accelerated aging","reverse aging"], feats:["years vanish from","ages decades in seconds"]},
    {id:"gravity_flight", name:"Gravity-Driven Flight", cat:"mobility", terms:["gravity flight","fly by controlling gravity","levitate by gravity"], feats:["cancels his own gravity","cancels her own gravity"]},
    {id:"immortality", name:"Immortality", cat:"recovery", terms:["immortality","immortal","cannot die","ageless","eternal life"], feats:["returns from death","comes back to life"]}
  ];

  // Extended Power Atlas — exact-title recognition for broad power fiction.
  // These entries are intentionally exact/low-ambiguity. Power Genome handles novel combinations.
  var EXTENDED_POWER_ATLAS = [
    {
      id:"atlas_fire_manipulation",
      name:"Fire Manipulation",
      cat:"elemental",
      terms:["fire manipulation"],
      feats:[]
    },
    {
      id:"atlas_fire_generation",
      name:"Fire Generation",
      cat:"elemental",
      terms:["fire generation"],
      feats:[]
    },
    {
      id:"atlas_water_manipulation",
      name:"Water Manipulation",
      cat:"elemental",
      terms:["water manipulation"],
      feats:[]
    },
    {
      id:"atlas_water_generation",
      name:"Water Generation",
      cat:"elemental",
      terms:["water generation"],
      feats:[]
    },
    {
      id:"atlas_ice_manipulation",
      name:"Ice Manipulation",
      cat:"elemental",
      terms:["ice manipulation"],
      feats:[]
    },
    {
      id:"atlas_ice_generation",
      name:"Ice Generation",
      cat:"elemental",
      terms:["ice generation"],
      feats:[]
    },
    {
      id:"atlas_air_manipulation",
      name:"Air Manipulation",
      cat:"elemental",
      terms:["air manipulation"],
      feats:[]
    },
    {
      id:"atlas_air_generation",
      name:"Air Generation",
      cat:"elemental",
      terms:["air generation"],
      feats:[]
    },
    {
      id:"atlas_earth_manipulation",
      name:"Earth Manipulation",
      cat:"elemental",
      terms:["earth manipulation"],
      feats:[]
    },
    {
      id:"atlas_earth_generation",
      name:"Earth Generation",
      cat:"elemental",
      terms:["earth generation"],
      feats:[]
    },
    {
      id:"atlas_lightning_manipulation",
      name:"Lightning Manipulation",
      cat:"elemental",
      terms:["lightning manipulation"],
      feats:[]
    },
    {
      id:"atlas_lightning_generation",
      name:"Lightning Generation",
      cat:"elemental",
      terms:["lightning generation"],
      feats:[]
    },
    {
      id:"atlas_electricity_manipulation",
      name:"Electricity Manipulation",
      cat:"energy",
      terms:["electricity manipulation"],
      feats:[]
    },
    {
      id:"atlas_electricity_generation",
      name:"Electricity Generation",
      cat:"energy",
      terms:["electricity generation"],
      feats:[]
    },
    {
      id:"atlas_plasma_manipulation",
      name:"Plasma Manipulation",
      cat:"energy",
      terms:["plasma manipulation"],
      feats:[]
    },
    {
      id:"atlas_plasma_generation",
      name:"Plasma Generation",
      cat:"energy",
      terms:["plasma generation"],
      feats:[]
    },
    {
      id:"atlas_light_manipulation",
      name:"Light Manipulation",
      cat:"energy",
      terms:["light manipulation"],
      feats:[]
    },
    {
      id:"atlas_light_generation",
      name:"Light Generation",
      cat:"energy",
      terms:["light generation"],
      feats:[]
    },
    {
      id:"atlas_darkness_manipulation",
      name:"Darkness Manipulation",
      cat:"elemental",
      terms:["darkness manipulation"],
      feats:[]
    },
    {
      id:"atlas_darkness_generation",
      name:"Darkness Generation",
      cat:"elemental",
      terms:["darkness generation"],
      feats:[]
    },
    {
      id:"atlas_shadow_manipulation",
      name:"Shadow Manipulation",
      cat:"elemental",
      terms:["shadow manipulation"],
      feats:[]
    },
    {
      id:"atlas_shadow_generation",
      name:"Shadow Generation",
      cat:"elemental",
      terms:["shadow generation"],
      feats:[]
    },
    {
      id:"atlas_smoke_manipulation",
      name:"Smoke Manipulation",
      cat:"elemental",
      terms:["smoke manipulation"],
      feats:[]
    },
    {
      id:"atlas_smoke_generation",
      name:"Smoke Generation",
      cat:"elemental",
      terms:["smoke generation"],
      feats:[]
    },
    {
      id:"atlas_steam_manipulation",
      name:"Steam Manipulation",
      cat:"elemental",
      terms:["steam manipulation"],
      feats:[]
    },
    {
      id:"atlas_steam_generation",
      name:"Steam Generation",
      cat:"elemental",
      terms:["steam generation"],
      feats:[]
    },
    {
      id:"atlas_lava_manipulation",
      name:"Lava Manipulation",
      cat:"elemental",
      terms:["lava manipulation"],
      feats:[]
    },
    {
      id:"atlas_lava_generation",
      name:"Lava Generation",
      cat:"elemental",
      terms:["lava generation"],
      feats:[]
    },
    {
      id:"atlas_magma_manipulation",
      name:"Magma Manipulation",
      cat:"elemental",
      terms:["magma manipulation"],
      feats:[]
    },
    {
      id:"atlas_magma_generation",
      name:"Magma Generation",
      cat:"elemental",
      terms:["magma generation"],
      feats:[]
    },
    {
      id:"atlas_metal_manipulation",
      name:"Metal Manipulation",
      cat:"material",
      terms:["metal manipulation"],
      feats:[]
    },
    {
      id:"atlas_metal_generation",
      name:"Metal Generation",
      cat:"material",
      terms:["metal generation"],
      feats:[]
    },
    {
      id:"atlas_iron_manipulation",
      name:"Iron Manipulation",
      cat:"material",
      terms:["iron manipulation"],
      feats:[]
    },
    {
      id:"atlas_iron_generation",
      name:"Iron Generation",
      cat:"material",
      terms:["iron generation"],
      feats:[]
    },
    {
      id:"atlas_steel_manipulation",
      name:"Steel Manipulation",
      cat:"material",
      terms:["steel manipulation"],
      feats:[]
    },
    {
      id:"atlas_steel_generation",
      name:"Steel Generation",
      cat:"material",
      terms:["steel generation"],
      feats:[]
    },
    {
      id:"atlas_gold_manipulation",
      name:"Gold Manipulation",
      cat:"material",
      terms:["gold manipulation"],
      feats:[]
    },
    {
      id:"atlas_gold_generation",
      name:"Gold Generation",
      cat:"material",
      terms:["gold generation"],
      feats:[]
    },
    {
      id:"atlas_silver_manipulation",
      name:"Silver Manipulation",
      cat:"material",
      terms:["silver manipulation"],
      feats:[]
    },
    {
      id:"atlas_silver_generation",
      name:"Silver Generation",
      cat:"material",
      terms:["silver generation"],
      feats:[]
    },
    {
      id:"atlas_glass_manipulation",
      name:"Glass Manipulation",
      cat:"material",
      terms:["glass manipulation"],
      feats:[]
    },
    {
      id:"atlas_glass_generation",
      name:"Glass Generation",
      cat:"material",
      terms:["glass generation"],
      feats:[]
    },
    {
      id:"atlas_crystal_manipulation",
      name:"Crystal Manipulation",
      cat:"material",
      terms:["crystal manipulation"],
      feats:[]
    },
    {
      id:"atlas_crystal_generation",
      name:"Crystal Generation",
      cat:"material",
      terms:["crystal generation"],
      feats:[]
    },
    {
      id:"atlas_sand_manipulation",
      name:"Sand Manipulation",
      cat:"elemental",
      terms:["sand manipulation"],
      feats:[]
    },
    {
      id:"atlas_sand_generation",
      name:"Sand Generation",
      cat:"elemental",
      terms:["sand generation"],
      feats:[]
    },
    {
      id:"atlas_dust_manipulation",
      name:"Dust Manipulation",
      cat:"elemental",
      terms:["dust manipulation"],
      feats:[]
    },
    {
      id:"atlas_dust_generation",
      name:"Dust Generation",
      cat:"elemental",
      terms:["dust generation"],
      feats:[]
    },
    {
      id:"atlas_ash_manipulation",
      name:"Ash Manipulation",
      cat:"elemental",
      terms:["ash manipulation"],
      feats:[]
    },
    {
      id:"atlas_ash_generation",
      name:"Ash Generation",
      cat:"elemental",
      terms:["ash generation"],
      feats:[]
    },
    {
      id:"atlas_mud_manipulation",
      name:"Mud Manipulation",
      cat:"elemental",
      terms:["mud manipulation"],
      feats:[]
    },
    {
      id:"atlas_mud_generation",
      name:"Mud Generation",
      cat:"elemental",
      terms:["mud generation"],
      feats:[]
    },
    {
      id:"atlas_clay_manipulation",
      name:"Clay Manipulation",
      cat:"material",
      terms:["clay manipulation"],
      feats:[]
    },
    {
      id:"atlas_clay_generation",
      name:"Clay Generation",
      cat:"material",
      terms:["clay generation"],
      feats:[]
    },
    {
      id:"atlas_stone_manipulation",
      name:"Stone Manipulation",
      cat:"elemental",
      terms:["stone manipulation"],
      feats:[]
    },
    {
      id:"atlas_stone_generation",
      name:"Stone Generation",
      cat:"elemental",
      terms:["stone generation"],
      feats:[]
    },
    {
      id:"atlas_rock_manipulation",
      name:"Rock Manipulation",
      cat:"elemental",
      terms:["rock manipulation"],
      feats:[]
    },
    {
      id:"atlas_rock_generation",
      name:"Rock Generation",
      cat:"elemental",
      terms:["rock generation"],
      feats:[]
    },
    {
      id:"atlas_wood_manipulation",
      name:"Wood Manipulation",
      cat:"nature",
      terms:["wood manipulation"],
      feats:[]
    },
    {
      id:"atlas_wood_generation",
      name:"Wood Generation",
      cat:"nature",
      terms:["wood generation"],
      feats:[]
    },
    {
      id:"atlas_plant_manipulation",
      name:"Plant Manipulation",
      cat:"nature",
      terms:["plant manipulation"],
      feats:[]
    },
    {
      id:"atlas_plant_generation",
      name:"Plant Generation",
      cat:"nature",
      terms:["plant generation"],
      feats:[]
    },
    {
      id:"atlas_vine_manipulation",
      name:"Vine Manipulation",
      cat:"nature",
      terms:["vine manipulation"],
      feats:[]
    },
    {
      id:"atlas_vine_generation",
      name:"Vine Generation",
      cat:"nature",
      terms:["vine generation"],
      feats:[]
    },
    {
      id:"atlas_flower_manipulation",
      name:"Flower Manipulation",
      cat:"nature",
      terms:["flower manipulation"],
      feats:[]
    },
    {
      id:"atlas_flower_generation",
      name:"Flower Generation",
      cat:"nature",
      terms:["flower generation"],
      feats:[]
    },
    {
      id:"atlas_paper_manipulation",
      name:"Paper Manipulation",
      cat:"material",
      terms:["paper manipulation"],
      feats:[]
    },
    {
      id:"atlas_paper_generation",
      name:"Paper Generation",
      cat:"material",
      terms:["paper generation"],
      feats:[]
    },
    {
      id:"atlas_ink_manipulation",
      name:"Ink Manipulation",
      cat:"material",
      terms:["ink manipulation"],
      feats:[]
    },
    {
      id:"atlas_ink_generation",
      name:"Ink Generation",
      cat:"material",
      terms:["ink generation"],
      feats:[]
    },
    {
      id:"atlas_paint_manipulation",
      name:"Paint Manipulation",
      cat:"material",
      terms:["paint manipulation"],
      feats:[]
    },
    {
      id:"atlas_paint_generation",
      name:"Paint Generation",
      cat:"material",
      terms:["paint generation"],
      feats:[]
    },
    {
      id:"atlas_cloth_manipulation",
      name:"Cloth Manipulation",
      cat:"material",
      terms:["cloth manipulation"],
      feats:[]
    },
    {
      id:"atlas_cloth_generation",
      name:"Cloth Generation",
      cat:"material",
      terms:["cloth generation"],
      feats:[]
    },
    {
      id:"atlas_thread_manipulation",
      name:"Thread Manipulation",
      cat:"material",
      terms:["thread manipulation"],
      feats:[]
    },
    {
      id:"atlas_thread_generation",
      name:"Thread Generation",
      cat:"material",
      terms:["thread generation"],
      feats:[]
    },
    {
      id:"atlas_rubber_manipulation",
      name:"Rubber Manipulation",
      cat:"material",
      terms:["rubber manipulation"],
      feats:[]
    },
    {
      id:"atlas_rubber_generation",
      name:"Rubber Generation",
      cat:"material",
      terms:["rubber generation"],
      feats:[]
    },
    {
      id:"atlas_plastic_manipulation",
      name:"Plastic Manipulation",
      cat:"material",
      terms:["plastic manipulation"],
      feats:[]
    },
    {
      id:"atlas_plastic_generation",
      name:"Plastic Generation",
      cat:"material",
      terms:["plastic generation"],
      feats:[]
    },
    {
      id:"atlas_oil_manipulation",
      name:"Oil Manipulation",
      cat:"chemical",
      terms:["oil manipulation"],
      feats:[]
    },
    {
      id:"atlas_oil_generation",
      name:"Oil Generation",
      cat:"chemical",
      terms:["oil generation"],
      feats:[]
    },
    {
      id:"atlas_acid_manipulation",
      name:"Acid Manipulation",
      cat:"chemical",
      terms:["acid manipulation"],
      feats:[]
    },
    {
      id:"atlas_acid_generation",
      name:"Acid Generation",
      cat:"chemical",
      terms:["acid generation"],
      feats:[]
    },
    {
      id:"atlas_poison_manipulation",
      name:"Poison Manipulation",
      cat:"chemical",
      terms:["poison manipulation"],
      feats:[]
    },
    {
      id:"atlas_poison_generation",
      name:"Poison Generation",
      cat:"chemical",
      terms:["poison generation"],
      feats:[]
    },
    {
      id:"atlas_toxin_manipulation",
      name:"Toxin Manipulation",
      cat:"chemical",
      terms:["toxin manipulation"],
      feats:[]
    },
    {
      id:"atlas_toxin_generation",
      name:"Toxin Generation",
      cat:"chemical",
      terms:["toxin generation"],
      feats:[]
    },
    {
      id:"atlas_gas_manipulation",
      name:"Gas Manipulation",
      cat:"chemical",
      terms:["gas manipulation"],
      feats:[]
    },
    {
      id:"atlas_gas_generation",
      name:"Gas Generation",
      cat:"chemical",
      terms:["gas generation"],
      feats:[]
    },
    {
      id:"atlas_oxygen_manipulation",
      name:"Oxygen Manipulation",
      cat:"chemical",
      terms:["oxygen manipulation"],
      feats:[]
    },
    {
      id:"atlas_oxygen_generation",
      name:"Oxygen Generation",
      cat:"chemical",
      terms:["oxygen generation"],
      feats:[]
    },
    {
      id:"atlas_carbon_manipulation",
      name:"Carbon Manipulation",
      cat:"material",
      terms:["carbon manipulation"],
      feats:[]
    },
    {
      id:"atlas_carbon_generation",
      name:"Carbon Generation",
      cat:"material",
      terms:["carbon generation"],
      feats:[]
    },
    {
      id:"atlas_salt_manipulation",
      name:"Salt Manipulation",
      cat:"material",
      terms:["salt manipulation"],
      feats:[]
    },
    {
      id:"atlas_salt_generation",
      name:"Salt Generation",
      cat:"material",
      terms:["salt generation"],
      feats:[]
    },
    {
      id:"atlas_sugar_manipulation",
      name:"Sugar Manipulation",
      cat:"material",
      terms:["sugar manipulation"],
      feats:[]
    },
    {
      id:"atlas_sugar_generation",
      name:"Sugar Generation",
      cat:"material",
      terms:["sugar generation"],
      feats:[]
    },
    {
      id:"atlas_cheese_manipulation",
      name:"Cheese Manipulation",
      cat:"material",
      terms:["cheese manipulation"],
      feats:[]
    },
    {
      id:"atlas_cheese_generation",
      name:"Cheese Generation",
      cat:"material",
      terms:["cheese generation"],
      feats:[]
    },
    {
      id:"atlas_food_manipulation",
      name:"Food Manipulation",
      cat:"material",
      terms:["food manipulation"],
      feats:[]
    },
    {
      id:"atlas_food_generation",
      name:"Food Generation",
      cat:"material",
      terms:["food generation"],
      feats:[]
    },
    {
      id:"atlas_sound_manipulation",
      name:"Sound Manipulation",
      cat:"energy",
      terms:["sound manipulation"],
      feats:[]
    },
    {
      id:"atlas_sound_generation",
      name:"Sound Generation",
      cat:"energy",
      terms:["sound generation"],
      feats:[]
    },
    {
      id:"atlas_music_manipulation",
      name:"Music Manipulation",
      cat:"energy",
      terms:["music manipulation"],
      feats:[]
    },
    {
      id:"atlas_music_generation",
      name:"Music Generation",
      cat:"energy",
      terms:["music generation"],
      feats:[]
    },
    {
      id:"atlas_vibration_manipulation",
      name:"Vibration Manipulation",
      cat:"energy",
      terms:["vibration manipulation"],
      feats:[]
    },
    {
      id:"atlas_vibration_generation",
      name:"Vibration Generation",
      cat:"energy",
      terms:["vibration generation"],
      feats:[]
    },
    {
      id:"atlas_friction_manipulation",
      name:"Friction Manipulation",
      cat:"physics",
      terms:["friction manipulation"],
      feats:[]
    },
    {
      id:"atlas_friction_generation",
      name:"Friction Generation",
      cat:"physics",
      terms:["friction generation"],
      feats:[]
    },
    {
      id:"atlas_pressure_manipulation",
      name:"Pressure Manipulation",
      cat:"physics",
      terms:["pressure manipulation"],
      feats:[]
    },
    {
      id:"atlas_pressure_generation",
      name:"Pressure Generation",
      cat:"physics",
      terms:["pressure generation"],
      feats:[]
    },
    {
      id:"atlas_heat_manipulation",
      name:"Heat Manipulation",
      cat:"energy",
      terms:["heat manipulation"],
      feats:[]
    },
    {
      id:"atlas_heat_generation",
      name:"Heat Generation",
      cat:"energy",
      terms:["heat generation"],
      feats:[]
    },
    {
      id:"atlas_cold_manipulation",
      name:"Cold Manipulation",
      cat:"energy",
      terms:["cold manipulation"],
      feats:[]
    },
    {
      id:"atlas_cold_generation",
      name:"Cold Generation",
      cat:"energy",
      terms:["cold generation"],
      feats:[]
    },
    {
      id:"atlas_radiation_manipulation",
      name:"Radiation Manipulation",
      cat:"energy",
      terms:["radiation manipulation"],
      feats:[]
    },
    {
      id:"atlas_radiation_generation",
      name:"Radiation Generation",
      cat:"energy",
      terms:["radiation generation"],
      feats:[]
    },
    {
      id:"atlas_magnetism_manipulation",
      name:"Magnetism Manipulation",
      cat:"physics",
      terms:["magnetism manipulation"],
      feats:[]
    },
    {
      id:"atlas_magnetism_generation",
      name:"Magnetism Generation",
      cat:"physics",
      terms:["magnetism generation"],
      feats:[]
    },
    {
      id:"atlas_gravity_manipulation",
      name:"Gravity Manipulation",
      cat:"physics",
      terms:["gravity manipulation"],
      feats:[]
    },
    {
      id:"atlas_gravity_generation",
      name:"Gravity Generation",
      cat:"physics",
      terms:["gravity generation"],
      feats:[]
    },
    {
      id:"atlas_momentum_manipulation",
      name:"Momentum Manipulation",
      cat:"physics",
      terms:["momentum manipulation"],
      feats:[]
    },
    {
      id:"atlas_momentum_generation",
      name:"Momentum Generation",
      cat:"physics",
      terms:["momentum generation"],
      feats:[]
    },
    {
      id:"atlas_inertia_manipulation",
      name:"Inertia Manipulation",
      cat:"physics",
      terms:["inertia manipulation"],
      feats:[]
    },
    {
      id:"atlas_inertia_generation",
      name:"Inertia Generation",
      cat:"physics",
      terms:["inertia generation"],
      feats:[]
    },
    {
      id:"atlas_vector_manipulation",
      name:"Vector Manipulation",
      cat:"physics",
      terms:["vector manipulation"],
      feats:[]
    },
    {
      id:"atlas_vector_generation",
      name:"Vector Generation",
      cat:"physics",
      terms:["vector generation"],
      feats:[]
    },
    {
      id:"atlas_force_manipulation",
      name:"Force Manipulation",
      cat:"physics",
      terms:["force manipulation"],
      feats:[]
    },
    {
      id:"atlas_force_generation",
      name:"Force Generation",
      cat:"physics",
      terms:["force generation"],
      feats:[]
    },
    {
      id:"atlas_kinetic_energy_manipulation",
      name:"Kinetic Energy Manipulation",
      cat:"energy",
      terms:["kinetic energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_kinetic_energy_generation",
      name:"Kinetic Energy Generation",
      cat:"energy",
      terms:["kinetic energy generation"],
      feats:[]
    },
    {
      id:"atlas_potential_energy_manipulation",
      name:"Potential Energy Manipulation",
      cat:"energy",
      terms:["potential energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_potential_energy_generation",
      name:"Potential Energy Generation",
      cat:"energy",
      terms:["potential energy generation"],
      feats:[]
    },
    {
      id:"atlas_nuclear_energy_manipulation",
      name:"Nuclear Energy Manipulation",
      cat:"energy",
      terms:["nuclear energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_nuclear_energy_generation",
      name:"Nuclear Energy Generation",
      cat:"energy",
      terms:["nuclear energy generation"],
      feats:[]
    },
    {
      id:"atlas_solar_energy_manipulation",
      name:"Solar Energy Manipulation",
      cat:"energy",
      terms:["solar energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_solar_energy_generation",
      name:"Solar Energy Generation",
      cat:"energy",
      terms:["solar energy generation"],
      feats:[]
    },
    {
      id:"atlas_stellar_energy_manipulation",
      name:"Stellar Energy Manipulation",
      cat:"energy",
      terms:["stellar energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_stellar_energy_generation",
      name:"Stellar Energy Generation",
      cat:"energy",
      terms:["stellar energy generation"],
      feats:[]
    },
    {
      id:"atlas_cosmic_energy_manipulation",
      name:"Cosmic Energy Manipulation",
      cat:"energy",
      terms:["cosmic energy manipulation"],
      feats:[]
    },
    {
      id:"atlas_cosmic_energy_generation",
      name:"Cosmic Energy Generation",
      cat:"energy",
      terms:["cosmic energy generation"],
      feats:[]
    },
    {
      id:"atlas_wind_manipulation",
      name:"Wind Manipulation",
      cat:"elemental",
      terms:["wind manipulation"],
      feats:[]
    },
    {
      id:"atlas_wind_generation",
      name:"Wind Generation",
      cat:"elemental",
      terms:["wind generation"],
      feats:[]
    },
    {
      id:"atlas_rain_manipulation",
      name:"Rain Manipulation",
      cat:"weather",
      terms:["rain manipulation"],
      feats:[]
    },
    {
      id:"atlas_rain_generation",
      name:"Rain Generation",
      cat:"weather",
      terms:["rain generation"],
      feats:[]
    },
    {
      id:"atlas_snow_manipulation",
      name:"Snow Manipulation",
      cat:"weather",
      terms:["snow manipulation"],
      feats:[]
    },
    {
      id:"atlas_snow_generation",
      name:"Snow Generation",
      cat:"weather",
      terms:["snow generation"],
      feats:[]
    },
    {
      id:"atlas_cloud_manipulation",
      name:"Cloud Manipulation",
      cat:"weather",
      terms:["cloud manipulation"],
      feats:[]
    },
    {
      id:"atlas_cloud_generation",
      name:"Cloud Generation",
      cat:"weather",
      terms:["cloud generation"],
      feats:[]
    },
    {
      id:"atlas_weather_manipulation",
      name:"Weather Manipulation",
      cat:"weather",
      terms:["weather manipulation"],
      feats:[]
    },
    {
      id:"atlas_weather_generation",
      name:"Weather Generation",
      cat:"weather",
      terms:["weather generation"],
      feats:[]
    },
    {
      id:"atlas_storm_manipulation",
      name:"Storm Manipulation",
      cat:"weather",
      terms:["storm manipulation"],
      feats:[]
    },
    {
      id:"atlas_storm_generation",
      name:"Storm Generation",
      cat:"weather",
      terms:["storm generation"],
      feats:[]
    },
    {
      id:"atlas_thunder_manipulation",
      name:"Thunder Manipulation",
      cat:"weather",
      terms:["thunder manipulation"],
      feats:[]
    },
    {
      id:"atlas_thunder_generation",
      name:"Thunder Generation",
      cat:"weather",
      terms:["thunder generation"],
      feats:[]
    },
    {
      id:"atlas_ocean_manipulation",
      name:"Ocean Manipulation",
      cat:"nature",
      terms:["ocean manipulation"],
      feats:[]
    },
    {
      id:"atlas_ocean_generation",
      name:"Ocean Generation",
      cat:"nature",
      terms:["ocean generation"],
      feats:[]
    },
    {
      id:"atlas_river_manipulation",
      name:"River Manipulation",
      cat:"nature",
      terms:["river manipulation"],
      feats:[]
    },
    {
      id:"atlas_river_generation",
      name:"River Generation",
      cat:"nature",
      terms:["river generation"],
      feats:[]
    },
    {
      id:"atlas_forest_manipulation",
      name:"Forest Manipulation",
      cat:"nature",
      terms:["forest manipulation"],
      feats:[]
    },
    {
      id:"atlas_forest_generation",
      name:"Forest Generation",
      cat:"nature",
      terms:["forest generation"],
      feats:[]
    },
    {
      id:"atlas_mountain_manipulation",
      name:"Mountain Manipulation",
      cat:"nature",
      terms:["mountain manipulation"],
      feats:[]
    },
    {
      id:"atlas_mountain_generation",
      name:"Mountain Generation",
      cat:"nature",
      terms:["mountain generation"],
      feats:[]
    },
    {
      id:"atlas_volcano_manipulation",
      name:"Volcano Manipulation",
      cat:"nature",
      terms:["volcano manipulation"],
      feats:[]
    },
    {
      id:"atlas_volcano_generation",
      name:"Volcano Generation",
      cat:"nature",
      terms:["volcano generation"],
      feats:[]
    },
    {
      id:"atlas_blood_manipulation",
      name:"Blood Manipulation",
      cat:"biological",
      terms:["blood manipulation"],
      feats:[]
    },
    {
      id:"atlas_blood_resistance",
      name:"Blood Resistance",
      cat:"defense",
      terms:["blood resistance"],
      feats:[]
    },
    {
      id:"atlas_bone_manipulation",
      name:"Bone Manipulation",
      cat:"biological",
      terms:["bone manipulation"],
      feats:[]
    },
    {
      id:"atlas_bone_resistance",
      name:"Bone Resistance",
      cat:"defense",
      terms:["bone resistance"],
      feats:[]
    },
    {
      id:"atlas_flesh_manipulation",
      name:"Flesh Manipulation",
      cat:"biological",
      terms:["flesh manipulation"],
      feats:[]
    },
    {
      id:"atlas_flesh_resistance",
      name:"Flesh Resistance",
      cat:"defense",
      terms:["flesh resistance"],
      feats:[]
    },
    {
      id:"atlas_muscle_manipulation",
      name:"Muscle Manipulation",
      cat:"biological",
      terms:["muscle manipulation"],
      feats:[]
    },
    {
      id:"atlas_muscle_resistance",
      name:"Muscle Resistance",
      cat:"defense",
      terms:["muscle resistance"],
      feats:[]
    },
    {
      id:"atlas_nerve_manipulation",
      name:"Nerve Manipulation",
      cat:"biological",
      terms:["nerve manipulation"],
      feats:[]
    },
    {
      id:"atlas_nerve_resistance",
      name:"Nerve Resistance",
      cat:"defense",
      terms:["nerve resistance"],
      feats:[]
    },
    {
      id:"atlas_cell_manipulation",
      name:"Cell Manipulation",
      cat:"biological",
      terms:["cell manipulation"],
      feats:[]
    },
    {
      id:"atlas_cell_resistance",
      name:"Cell Resistance",
      cat:"defense",
      terms:["cell resistance"],
      feats:[]
    },
    {
      id:"atlas_dna_manipulation",
      name:"DNA Manipulation",
      cat:"biological",
      terms:["dna manipulation"],
      feats:[]
    },
    {
      id:"atlas_dna_resistance",
      name:"DNA Resistance",
      cat:"defense",
      terms:["dna resistance"],
      feats:[]
    },
    {
      id:"atlas_gene_manipulation",
      name:"Gene Manipulation",
      cat:"biological",
      terms:["gene manipulation"],
      feats:[]
    },
    {
      id:"atlas_gene_resistance",
      name:"Gene Resistance",
      cat:"defense",
      terms:["gene resistance"],
      feats:[]
    },
    {
      id:"atlas_disease_manipulation",
      name:"Disease Manipulation",
      cat:"biological",
      terms:["disease manipulation"],
      feats:[]
    },
    {
      id:"atlas_disease_resistance",
      name:"Disease Resistance",
      cat:"defense",
      terms:["disease resistance"],
      feats:[]
    },
    {
      id:"atlas_virus_manipulation",
      name:"Virus Manipulation",
      cat:"biological",
      terms:["virus manipulation"],
      feats:[]
    },
    {
      id:"atlas_virus_resistance",
      name:"Virus Resistance",
      cat:"defense",
      terms:["virus resistance"],
      feats:[]
    },
    {
      id:"atlas_bacteria_manipulation",
      name:"Bacteria Manipulation",
      cat:"biological",
      terms:["bacteria manipulation"],
      feats:[]
    },
    {
      id:"atlas_bacteria_resistance",
      name:"Bacteria Resistance",
      cat:"defense",
      terms:["bacteria resistance"],
      feats:[]
    },
    {
      id:"atlas_fungus_manipulation",
      name:"Fungus Manipulation",
      cat:"biological",
      terms:["fungus manipulation"],
      feats:[]
    },
    {
      id:"atlas_fungus_resistance",
      name:"Fungus Resistance",
      cat:"defense",
      terms:["fungus resistance"],
      feats:[]
    },
    {
      id:"atlas_parasite_manipulation",
      name:"Parasite Manipulation",
      cat:"biological",
      terms:["parasite manipulation"],
      feats:[]
    },
    {
      id:"atlas_parasite_resistance",
      name:"Parasite Resistance",
      cat:"defense",
      terms:["parasite resistance"],
      feats:[]
    },
    {
      id:"atlas_pheromone_manipulation",
      name:"Pheromone Manipulation",
      cat:"biological",
      terms:["pheromone manipulation"],
      feats:[]
    },
    {
      id:"atlas_pheromone_resistance",
      name:"Pheromone Resistance",
      cat:"defense",
      terms:["pheromone resistance"],
      feats:[]
    },
    {
      id:"atlas_hormone_manipulation",
      name:"Hormone Manipulation",
      cat:"biological",
      terms:["hormone manipulation"],
      feats:[]
    },
    {
      id:"atlas_hormone_resistance",
      name:"Hormone Resistance",
      cat:"defense",
      terms:["hormone resistance"],
      feats:[]
    },
    {
      id:"atlas_adrenaline_manipulation",
      name:"Adrenaline Manipulation",
      cat:"biological",
      terms:["adrenaline manipulation"],
      feats:[]
    },
    {
      id:"atlas_adrenaline_resistance",
      name:"Adrenaline Resistance",
      cat:"defense",
      terms:["adrenaline resistance"],
      feats:[]
    },
    {
      id:"atlas_pain_manipulation",
      name:"Pain Manipulation",
      cat:"psychic",
      terms:["pain manipulation"],
      feats:[]
    },
    {
      id:"atlas_pain_resistance",
      name:"Pain Resistance",
      cat:"defense",
      terms:["pain resistance"],
      feats:[]
    },
    {
      id:"atlas_sleep_manipulation",
      name:"Sleep Manipulation",
      cat:"psychic",
      terms:["sleep manipulation"],
      feats:[]
    },
    {
      id:"atlas_sleep_resistance",
      name:"Sleep Resistance",
      cat:"defense",
      terms:["sleep resistance"],
      feats:[]
    },
    {
      id:"atlas_dream_manipulation",
      name:"Dream Manipulation",
      cat:"psychic",
      terms:["dream manipulation"],
      feats:[]
    },
    {
      id:"atlas_dream_resistance",
      name:"Dream Resistance",
      cat:"defense",
      terms:["dream resistance"],
      feats:[]
    },
    {
      id:"atlas_nightmare_manipulation",
      name:"Nightmare Manipulation",
      cat:"psychic",
      terms:["nightmare manipulation"],
      feats:[]
    },
    {
      id:"atlas_nightmare_resistance",
      name:"Nightmare Resistance",
      cat:"defense",
      terms:["nightmare resistance"],
      feats:[]
    },
    {
      id:"atlas_emotion_manipulation",
      name:"Emotion Manipulation",
      cat:"psychic",
      terms:["emotion manipulation"],
      feats:[]
    },
    {
      id:"atlas_emotion_resistance",
      name:"Emotion Resistance",
      cat:"defense",
      terms:["emotion resistance"],
      feats:[]
    },
    {
      id:"atlas_fear_manipulation",
      name:"Fear Manipulation",
      cat:"psychic",
      terms:["fear manipulation"],
      feats:[]
    },
    {
      id:"atlas_fear_resistance",
      name:"Fear Resistance",
      cat:"defense",
      terms:["fear resistance"],
      feats:[]
    },
    {
      id:"atlas_memory_manipulation",
      name:"Memory Manipulation",
      cat:"psychic",
      terms:["memory manipulation"],
      feats:[]
    },
    {
      id:"atlas_memory_resistance",
      name:"Memory Resistance",
      cat:"defense",
      terms:["memory resistance"],
      feats:[]
    },
    {
      id:"atlas_thought_manipulation",
      name:"Thought Manipulation",
      cat:"psychic",
      terms:["thought manipulation"],
      feats:[]
    },
    {
      id:"atlas_thought_resistance",
      name:"Thought Resistance",
      cat:"defense",
      terms:["thought resistance"],
      feats:[]
    },
    {
      id:"atlas_mind_manipulation",
      name:"Mind Manipulation",
      cat:"psychic",
      terms:["mind manipulation"],
      feats:[]
    },
    {
      id:"atlas_mind_resistance",
      name:"Mind Resistance",
      cat:"defense",
      terms:["mind resistance"],
      feats:[]
    },
    {
      id:"atlas_soul_manipulation",
      name:"Soul Manipulation",
      cat:"spiritual",
      terms:["soul manipulation"],
      feats:[]
    },
    {
      id:"atlas_soul_resistance",
      name:"Soul Resistance",
      cat:"defense",
      terms:["soul resistance"],
      feats:[]
    },
    {
      id:"atlas_spirit_manipulation",
      name:"Spirit Manipulation",
      cat:"spiritual",
      terms:["spirit manipulation"],
      feats:[]
    },
    {
      id:"atlas_spirit_resistance",
      name:"Spirit Resistance",
      cat:"defense",
      terms:["spirit resistance"],
      feats:[]
    },
    {
      id:"atlas_life_manipulation",
      name:"Life Manipulation",
      cat:"conceptual",
      terms:["life manipulation"],
      feats:[]
    },
    {
      id:"atlas_life_resistance",
      name:"Life Resistance",
      cat:"defense",
      terms:["life resistance"],
      feats:[]
    },
    {
      id:"atlas_death_manipulation",
      name:"Death Manipulation",
      cat:"conceptual",
      terms:["death manipulation"],
      feats:[]
    },
    {
      id:"atlas_death_resistance",
      name:"Death Resistance",
      cat:"defense",
      terms:["death resistance"],
      feats:[]
    },
    {
      id:"atlas_age_manipulation",
      name:"Age Manipulation",
      cat:"biological",
      terms:["age manipulation"],
      feats:[]
    },
    {
      id:"atlas_age_resistance",
      name:"Age Resistance",
      cat:"defense",
      terms:["age resistance"],
      feats:[]
    },
    {
      id:"atlas_time_manipulation",
      name:"Time Manipulation",
      cat:"temporal",
      terms:["time manipulation"],
      feats:[]
    },
    {
      id:"atlas_time_detection",
      name:"Time Detection",
      cat:"perception",
      terms:["time detection"],
      feats:[]
    },
    {
      id:"atlas_space_manipulation",
      name:"Space Manipulation",
      cat:"spatial",
      terms:["space manipulation"],
      feats:[]
    },
    {
      id:"atlas_space_detection",
      name:"Space Detection",
      cat:"perception",
      terms:["space detection"],
      feats:[]
    },
    {
      id:"atlas_distance_manipulation",
      name:"Distance Manipulation",
      cat:"spatial",
      terms:["distance manipulation"],
      feats:[]
    },
    {
      id:"atlas_distance_detection",
      name:"Distance Detection",
      cat:"perception",
      terms:["distance detection"],
      feats:[]
    },
    {
      id:"atlas_dimension_manipulation",
      name:"Dimension Manipulation",
      cat:"spatial",
      terms:["dimension manipulation"],
      feats:[]
    },
    {
      id:"atlas_dimension_detection",
      name:"Dimension Detection",
      cat:"perception",
      terms:["dimension detection"],
      feats:[]
    },
    {
      id:"atlas_reality_manipulation",
      name:"Reality Manipulation",
      cat:"reality",
      terms:["reality manipulation"],
      feats:[]
    },
    {
      id:"atlas_reality_detection",
      name:"Reality Detection",
      cat:"perception",
      terms:["reality detection"],
      feats:[]
    },
    {
      id:"atlas_probability_manipulation",
      name:"Probability Manipulation",
      cat:"conceptual",
      terms:["probability manipulation"],
      feats:[]
    },
    {
      id:"atlas_probability_detection",
      name:"Probability Detection",
      cat:"perception",
      terms:["probability detection"],
      feats:[]
    },
    {
      id:"atlas_luck_manipulation",
      name:"Luck Manipulation",
      cat:"conceptual",
      terms:["luck manipulation"],
      feats:[]
    },
    {
      id:"atlas_luck_detection",
      name:"Luck Detection",
      cat:"perception",
      terms:["luck detection"],
      feats:[]
    },
    {
      id:"atlas_fate_manipulation",
      name:"Fate Manipulation",
      cat:"conceptual",
      terms:["fate manipulation"],
      feats:[]
    },
    {
      id:"atlas_fate_detection",
      name:"Fate Detection",
      cat:"perception",
      terms:["fate detection"],
      feats:[]
    },
    {
      id:"atlas_destiny_manipulation",
      name:"Destiny Manipulation",
      cat:"conceptual",
      terms:["destiny manipulation"],
      feats:[]
    },
    {
      id:"atlas_destiny_detection",
      name:"Destiny Detection",
      cat:"perception",
      terms:["destiny detection"],
      feats:[]
    },
    {
      id:"atlas_causality_manipulation",
      name:"Causality Manipulation",
      cat:"conceptual",
      terms:["causality manipulation"],
      feats:[]
    },
    {
      id:"atlas_causality_detection",
      name:"Causality Detection",
      cat:"perception",
      terms:["causality detection"],
      feats:[]
    },
    {
      id:"atlas_law_manipulation",
      name:"Law Manipulation",
      cat:"conceptual",
      terms:["law manipulation"],
      feats:[]
    },
    {
      id:"atlas_law_detection",
      name:"Law Detection",
      cat:"perception",
      terms:["law detection"],
      feats:[]
    },
    {
      id:"atlas_rule_manipulation",
      name:"Rule Manipulation",
      cat:"conceptual",
      terms:["rule manipulation"],
      feats:[]
    },
    {
      id:"atlas_rule_detection",
      name:"Rule Detection",
      cat:"perception",
      terms:["rule detection"],
      feats:[]
    },
    {
      id:"atlas_truth_manipulation",
      name:"Truth Manipulation",
      cat:"conceptual",
      terms:["truth manipulation"],
      feats:[]
    },
    {
      id:"atlas_truth_detection",
      name:"Truth Detection",
      cat:"perception",
      terms:["truth detection"],
      feats:[]
    },
    {
      id:"atlas_lie_manipulation",
      name:"Lie Manipulation",
      cat:"conceptual",
      terms:["lie manipulation"],
      feats:[]
    },
    {
      id:"atlas_lie_detection",
      name:"Lie Detection",
      cat:"perception",
      terms:["lie detection"],
      feats:[]
    },
    {
      id:"atlas_information_manipulation",
      name:"Information Manipulation",
      cat:"conceptual",
      terms:["information manipulation"],
      feats:[]
    },
    {
      id:"atlas_information_detection",
      name:"Information Detection",
      cat:"perception",
      terms:["information detection"],
      feats:[]
    },
    {
      id:"atlas_knowledge_manipulation",
      name:"Knowledge Manipulation",
      cat:"conceptual",
      terms:["knowledge manipulation"],
      feats:[]
    },
    {
      id:"atlas_knowledge_detection",
      name:"Knowledge Detection",
      cat:"perception",
      terms:["knowledge detection"],
      feats:[]
    },
    {
      id:"atlas_language_manipulation",
      name:"Language Manipulation",
      cat:"conceptual",
      terms:["language manipulation"],
      feats:[]
    },
    {
      id:"atlas_language_detection",
      name:"Language Detection",
      cat:"perception",
      terms:["language detection"],
      feats:[]
    },
    {
      id:"atlas_name_manipulation",
      name:"Name Manipulation",
      cat:"conceptual",
      terms:["name manipulation"],
      feats:[]
    },
    {
      id:"atlas_name_detection",
      name:"Name Detection",
      cat:"perception",
      terms:["name detection"],
      feats:[]
    },
    {
      id:"atlas_identity_manipulation",
      name:"Identity Manipulation",
      cat:"conceptual",
      terms:["identity manipulation"],
      feats:[]
    },
    {
      id:"atlas_identity_detection",
      name:"Identity Detection",
      cat:"perception",
      terms:["identity detection"],
      feats:[]
    },
    {
      id:"atlas_concept_manipulation",
      name:"Concept Manipulation",
      cat:"conceptual",
      terms:["concept manipulation"],
      feats:[]
    },
    {
      id:"atlas_concept_detection",
      name:"Concept Detection",
      cat:"perception",
      terms:["concept detection"],
      feats:[]
    },
    {
      id:"atlas_idea_manipulation",
      name:"Idea Manipulation",
      cat:"conceptual",
      terms:["idea manipulation"],
      feats:[]
    },
    {
      id:"atlas_idea_detection",
      name:"Idea Detection",
      cat:"perception",
      terms:["idea detection"],
      feats:[]
    },
    {
      id:"atlas_belief_manipulation",
      name:"Belief Manipulation",
      cat:"conceptual",
      terms:["belief manipulation"],
      feats:[]
    },
    {
      id:"atlas_belief_detection",
      name:"Belief Detection",
      cat:"perception",
      terms:["belief detection"],
      feats:[]
    },
    {
      id:"atlas_desire_manipulation",
      name:"Desire Manipulation",
      cat:"conceptual",
      terms:["desire manipulation"],
      feats:[]
    },
    {
      id:"atlas_desire_detection",
      name:"Desire Detection",
      cat:"perception",
      terms:["desire detection"],
      feats:[]
    },
    {
      id:"atlas_order_manipulation",
      name:"Order Manipulation",
      cat:"conceptual",
      terms:["order manipulation"],
      feats:[]
    },
    {
      id:"atlas_order_detection",
      name:"Order Detection",
      cat:"perception",
      terms:["order detection"],
      feats:[]
    },
    {
      id:"atlas_chaos_manipulation",
      name:"Chaos Manipulation",
      cat:"conceptual",
      terms:["chaos manipulation"],
      feats:[]
    },
    {
      id:"atlas_chaos_detection",
      name:"Chaos Detection",
      cat:"perception",
      terms:["chaos detection"],
      feats:[]
    },
    {
      id:"atlas_entropy_manipulation",
      name:"Entropy Manipulation",
      cat:"conceptual",
      terms:["entropy manipulation"],
      feats:[]
    },
    {
      id:"atlas_entropy_detection",
      name:"Entropy Detection",
      cat:"perception",
      terms:["entropy detection"],
      feats:[]
    },
    {
      id:"atlas_creation_manipulation",
      name:"Creation Manipulation",
      cat:"conceptual",
      terms:["creation manipulation"],
      feats:[]
    },
    {
      id:"atlas_creation_detection",
      name:"Creation Detection",
      cat:"perception",
      terms:["creation detection"],
      feats:[]
    },
    {
      id:"atlas_destruction_manipulation",
      name:"Destruction Manipulation",
      cat:"conceptual",
      terms:["destruction manipulation"],
      feats:[]
    },
    {
      id:"atlas_destruction_detection",
      name:"Destruction Detection",
      cat:"perception",
      terms:["destruction detection"],
      feats:[]
    },
    {
      id:"atlas_nothingness_manipulation",
      name:"Nothingness Manipulation",
      cat:"conceptual",
      terms:["nothingness manipulation"],
      feats:[]
    },
    {
      id:"atlas_nothingness_detection",
      name:"Nothingness Detection",
      cat:"perception",
      terms:["nothingness detection"],
      feats:[]
    },
    {
      id:"atlas_void_manipulation",
      name:"Void Manipulation",
      cat:"conceptual",
      terms:["void manipulation"],
      feats:[]
    },
    {
      id:"atlas_void_detection",
      name:"Void Detection",
      cat:"perception",
      terms:["void detection"],
      feats:[]
    },
    {
      id:"atlas_boundary_manipulation",
      name:"Boundary Manipulation",
      cat:"conceptual",
      terms:["boundary manipulation"],
      feats:[]
    },
    {
      id:"atlas_boundary_detection",
      name:"Boundary Detection",
      cat:"perception",
      terms:["boundary detection"],
      feats:[]
    },
    {
      id:"atlas_connection_manipulation",
      name:"Connection Manipulation",
      cat:"conceptual",
      terms:["connection manipulation"],
      feats:[]
    },
    {
      id:"atlas_connection_detection",
      name:"Connection Detection",
      cat:"perception",
      terms:["connection detection"],
      feats:[]
    },
    {
      id:"atlas_separation_manipulation",
      name:"Separation Manipulation",
      cat:"conceptual",
      terms:["separation manipulation"],
      feats:[]
    },
    {
      id:"atlas_separation_detection",
      name:"Separation Detection",
      cat:"perception",
      terms:["separation detection"],
      feats:[]
    },
    {
      id:"atlas_change_manipulation",
      name:"Change Manipulation",
      cat:"conceptual",
      terms:["change manipulation"],
      feats:[]
    },
    {
      id:"atlas_change_detection",
      name:"Change Detection",
      cat:"perception",
      terms:["change detection"],
      feats:[]
    },
    {
      id:"atlas_stasis_manipulation",
      name:"Stasis Manipulation",
      cat:"conceptual",
      terms:["stasis manipulation"],
      feats:[]
    },
    {
      id:"atlas_stasis_detection",
      name:"Stasis Detection",
      cat:"perception",
      terms:["stasis detection"],
      feats:[]
    },
    {
      id:"atlas_motion_manipulation",
      name:"Motion Manipulation",
      cat:"physics",
      terms:["motion manipulation"],
      feats:[]
    },
    {
      id:"atlas_motion_detection",
      name:"Motion Detection",
      cat:"perception",
      terms:["motion detection"],
      feats:[]
    },
    {
      id:"atlas_direction_manipulation",
      name:"Direction Manipulation",
      cat:"physics",
      terms:["direction manipulation"],
      feats:[]
    },
    {
      id:"atlas_direction_detection",
      name:"Direction Detection",
      cat:"perception",
      terms:["direction detection"],
      feats:[]
    },
    {
      id:"atlas_number_manipulation",
      name:"Number Manipulation",
      cat:"conceptual",
      terms:["number manipulation"],
      feats:[]
    },
    {
      id:"atlas_number_detection",
      name:"Number Detection",
      cat:"perception",
      terms:["number detection"],
      feats:[]
    },
    {
      id:"atlas_mathematics_manipulation",
      name:"Mathematics Manipulation",
      cat:"conceptual",
      terms:["mathematics manipulation"],
      feats:[]
    },
    {
      id:"atlas_mathematics_detection",
      name:"Mathematics Detection",
      cat:"perception",
      terms:["mathematics detection"],
      feats:[]
    },
    {
      id:"atlas_geometry_manipulation",
      name:"Geometry Manipulation",
      cat:"conceptual",
      terms:["geometry manipulation"],
      feats:[]
    },
    {
      id:"atlas_geometry_detection",
      name:"Geometry Detection",
      cat:"perception",
      terms:["geometry detection"],
      feats:[]
    },
    {
      id:"atlas_color_manipulation",
      name:"Color Manipulation",
      cat:"conceptual",
      terms:["color manipulation"],
      feats:[]
    },
    {
      id:"atlas_color_detection",
      name:"Color Detection",
      cat:"perception",
      terms:["color detection"],
      feats:[]
    },
    {
      id:"atlas_size_manipulation",
      name:"Size Manipulation",
      cat:"physical",
      terms:["size manipulation"],
      feats:[]
    },
    {
      id:"atlas_size_detection",
      name:"Size Detection",
      cat:"perception",
      terms:["size detection"],
      feats:[]
    },
    {
      id:"atlas_mass_manipulation",
      name:"Mass Manipulation",
      cat:"physics",
      terms:["mass manipulation"],
      feats:[]
    },
    {
      id:"atlas_mass_detection",
      name:"Mass Detection",
      cat:"perception",
      terms:["mass detection"],
      feats:[]
    },
    {
      id:"atlas_density_manipulation",
      name:"Density Manipulation",
      cat:"physics",
      terms:["density manipulation"],
      feats:[]
    },
    {
      id:"atlas_density_detection",
      name:"Density Detection",
      cat:"perception",
      terms:["density detection"],
      feats:[]
    },
    {
      id:"atlas_weight_manipulation",
      name:"Weight Manipulation",
      cat:"physics",
      terms:["weight manipulation"],
      feats:[]
    },
    {
      id:"atlas_weight_detection",
      name:"Weight Detection",
      cat:"perception",
      terms:["weight detection"],
      feats:[]
    },
    {
      id:"atlas_temperature_manipulation",
      name:"Temperature Manipulation",
      cat:"physics",
      terms:["temperature manipulation"],
      feats:[]
    },
    {
      id:"atlas_temperature_detection",
      name:"Temperature Detection",
      cat:"perception",
      terms:["temperature detection"],
      feats:[]
    },
    {
      id:"atlas_door_manipulation",
      name:"Door Manipulation",
      cat:"object",
      terms:["door manipulation"],
      feats:[]
    },
    {
      id:"atlas_door_creation",
      name:"Door Creation",
      cat:"creation",
      terms:["door creation"],
      feats:[]
    },
    {
      id:"atlas_key_manipulation",
      name:"Key Manipulation",
      cat:"object",
      terms:["key manipulation"],
      feats:[]
    },
    {
      id:"atlas_key_creation",
      name:"Key Creation",
      cat:"creation",
      terms:["key creation"],
      feats:[]
    },
    {
      id:"atlas_mirror_manipulation",
      name:"Mirror Manipulation",
      cat:"object",
      terms:["mirror manipulation"],
      feats:[]
    },
    {
      id:"atlas_mirror_creation",
      name:"Mirror Creation",
      cat:"creation",
      terms:["mirror creation"],
      feats:[]
    },
    {
      id:"atlas_book_manipulation",
      name:"Book Manipulation",
      cat:"object",
      terms:["book manipulation"],
      feats:[]
    },
    {
      id:"atlas_book_creation",
      name:"Book Creation",
      cat:"creation",
      terms:["book creation"],
      feats:[]
    },
    {
      id:"atlas_writing_manipulation",
      name:"Writing Manipulation",
      cat:"object",
      terms:["writing manipulation"],
      feats:[]
    },
    {
      id:"atlas_writing_creation",
      name:"Writing Creation",
      cat:"creation",
      terms:["writing creation"],
      feats:[]
    },
    {
      id:"atlas_story_manipulation",
      name:"Story Manipulation",
      cat:"conceptual",
      terms:["story manipulation"],
      feats:[]
    },
    {
      id:"atlas_story_creation",
      name:"Story Creation",
      cat:"creation",
      terms:["story creation"],
      feats:[]
    },
    {
      id:"atlas_picture_manipulation",
      name:"Picture Manipulation",
      cat:"object",
      terms:["picture manipulation"],
      feats:[]
    },
    {
      id:"atlas_picture_creation",
      name:"Picture Creation",
      cat:"creation",
      terms:["picture creation"],
      feats:[]
    },
    {
      id:"atlas_photograph_manipulation",
      name:"Photograph Manipulation",
      cat:"object",
      terms:["photograph manipulation"],
      feats:[]
    },
    {
      id:"atlas_photograph_creation",
      name:"Photograph Creation",
      cat:"creation",
      terms:["photograph creation"],
      feats:[]
    },
    {
      id:"atlas_television_manipulation",
      name:"Television Manipulation",
      cat:"technology",
      terms:["television manipulation"],
      feats:[]
    },
    {
      id:"atlas_television_creation",
      name:"Television Creation",
      cat:"creation",
      terms:["television creation"],
      feats:[]
    },
    {
      id:"atlas_phone_manipulation",
      name:"Phone Manipulation",
      cat:"technology",
      terms:["phone manipulation"],
      feats:[]
    },
    {
      id:"atlas_phone_creation",
      name:"Phone Creation",
      cat:"creation",
      terms:["phone creation"],
      feats:[]
    },
    {
      id:"atlas_computer_manipulation",
      name:"Computer Manipulation",
      cat:"technology",
      terms:["computer manipulation"],
      feats:[]
    },
    {
      id:"atlas_computer_creation",
      name:"Computer Creation",
      cat:"creation",
      terms:["computer creation"],
      feats:[]
    },
    {
      id:"atlas_machine_manipulation",
      name:"Machine Manipulation",
      cat:"technology",
      terms:["machine manipulation"],
      feats:[]
    },
    {
      id:"atlas_machine_creation",
      name:"Machine Creation",
      cat:"creation",
      terms:["machine creation"],
      feats:[]
    },
    {
      id:"atlas_weapon_manipulation",
      name:"Weapon Manipulation",
      cat:"object",
      terms:["weapon manipulation"],
      feats:[]
    },
    {
      id:"atlas_weapon_creation",
      name:"Weapon Creation",
      cat:"creation",
      terms:["weapon creation"],
      feats:[]
    },
    {
      id:"atlas_armor_manipulation",
      name:"Armor Manipulation",
      cat:"object",
      terms:["armor manipulation"],
      feats:[]
    },
    {
      id:"atlas_armor_creation",
      name:"Armor Creation",
      cat:"creation",
      terms:["armor creation"],
      feats:[]
    },
    {
      id:"atlas_chain_manipulation",
      name:"Chain Manipulation",
      cat:"object",
      terms:["chain manipulation"],
      feats:[]
    },
    {
      id:"atlas_chain_creation",
      name:"Chain Creation",
      cat:"creation",
      terms:["chain creation"],
      feats:[]
    },
    {
      id:"atlas_rope_manipulation",
      name:"Rope Manipulation",
      cat:"object",
      terms:["rope manipulation"],
      feats:[]
    },
    {
      id:"atlas_rope_creation",
      name:"Rope Creation",
      cat:"creation",
      terms:["rope creation"],
      feats:[]
    },
    {
      id:"atlas_coin_manipulation",
      name:"Coin Manipulation",
      cat:"object",
      terms:["coin manipulation"],
      feats:[]
    },
    {
      id:"atlas_coin_creation",
      name:"Coin Creation",
      cat:"creation",
      terms:["coin creation"],
      feats:[]
    },
    {
      id:"atlas_card_manipulation",
      name:"Card Manipulation",
      cat:"object",
      terms:["card manipulation"],
      feats:[]
    },
    {
      id:"atlas_card_creation",
      name:"Card Creation",
      cat:"creation",
      terms:["card creation"],
      feats:[]
    },
    {
      id:"atlas_dice_manipulation",
      name:"Dice Manipulation",
      cat:"object",
      terms:["dice manipulation"],
      feats:[]
    },
    {
      id:"atlas_dice_creation",
      name:"Dice Creation",
      cat:"creation",
      terms:["dice creation"],
      feats:[]
    },
    {
      id:"atlas_toy_manipulation",
      name:"Toy Manipulation",
      cat:"object",
      terms:["toy manipulation"],
      feats:[]
    },
    {
      id:"atlas_toy_creation",
      name:"Toy Creation",
      cat:"creation",
      terms:["toy creation"],
      feats:[]
    },
    {
      id:"atlas_doll_manipulation",
      name:"Doll Manipulation",
      cat:"object",
      terms:["doll manipulation"],
      feats:[]
    },
    {
      id:"atlas_doll_creation",
      name:"Doll Creation",
      cat:"creation",
      terms:["doll creation"],
      feats:[]
    },
    {
      id:"atlas_vehicle_manipulation",
      name:"Vehicle Manipulation",
      cat:"object",
      terms:["vehicle manipulation"],
      feats:[]
    },
    {
      id:"atlas_vehicle_creation",
      name:"Vehicle Creation",
      cat:"creation",
      terms:["vehicle creation"],
      feats:[]
    },
    {
      id:"atlas_building_manipulation",
      name:"Building Manipulation",
      cat:"object",
      terms:["building manipulation"],
      feats:[]
    },
    {
      id:"atlas_building_creation",
      name:"Building Creation",
      cat:"creation",
      terms:["building creation"],
      feats:[]
    },
    {
      id:"atlas_city_manipulation",
      name:"City Manipulation",
      cat:"environment",
      terms:["city manipulation"],
      feats:[]
    },
    {
      id:"atlas_city_creation",
      name:"City Creation",
      cat:"creation",
      terms:["city creation"],
      feats:[]
    },
    {
      id:"atlas_road_manipulation",
      name:"Road Manipulation",
      cat:"object",
      terms:["road manipulation"],
      feats:[]
    },
    {
      id:"atlas_road_creation",
      name:"Road Creation",
      cat:"creation",
      terms:["road creation"],
      feats:[]
    },
    {
      id:"atlas_bridge_manipulation",
      name:"Bridge Manipulation",
      cat:"object",
      terms:["bridge manipulation"],
      feats:[]
    },
    {
      id:"atlas_bridge_creation",
      name:"Bridge Creation",
      cat:"creation",
      terms:["bridge creation"],
      feats:[]
    },
    {
      id:"atlas_treasure_manipulation",
      name:"Treasure Manipulation",
      cat:"object",
      terms:["treasure manipulation"],
      feats:[]
    },
    {
      id:"atlas_treasure_creation",
      name:"Treasure Creation",
      cat:"creation",
      terms:["treasure creation"],
      feats:[]
    },
    {
      id:"atlas_jewelry_manipulation",
      name:"Jewelry Manipulation",
      cat:"object",
      terms:["jewelry manipulation"],
      feats:[]
    },
    {
      id:"atlas_jewelry_creation",
      name:"Jewelry Creation",
      cat:"creation",
      terms:["jewelry creation"],
      feats:[]
    },
    {
      id:"atlas_crown_manipulation",
      name:"Crown Manipulation",
      cat:"object",
      terms:["crown manipulation"],
      feats:[]
    },
    {
      id:"atlas_crown_creation",
      name:"Crown Creation",
      cat:"creation",
      terms:["crown creation"],
      feats:[]
    },
    {
      id:"atlas_mask_manipulation",
      name:"Mask Manipulation",
      cat:"object",
      terms:["mask manipulation"],
      feats:[]
    },
    {
      id:"atlas_mask_creation",
      name:"Mask Creation",
      cat:"creation",
      terms:["mask creation"],
      feats:[]
    },
    {
      id:"atlas_moon_manipulation",
      name:"Moon Manipulation",
      cat:"cosmic",
      terms:["moon manipulation"],
      feats:[]
    },
    {
      id:"atlas_moon_empowerment",
      name:"Moon Empowerment",
      cat:"augmentation",
      terms:["moon empowerment"],
      feats:[]
    },
    {
      id:"atlas_sun_manipulation",
      name:"Sun Manipulation",
      cat:"cosmic",
      terms:["sun manipulation"],
      feats:[]
    },
    {
      id:"atlas_sun_empowerment",
      name:"Sun Empowerment",
      cat:"augmentation",
      terms:["sun empowerment"],
      feats:[]
    },
    {
      id:"atlas_star_manipulation",
      name:"Star Manipulation",
      cat:"cosmic",
      terms:["star manipulation"],
      feats:[]
    },
    {
      id:"atlas_star_empowerment",
      name:"Star Empowerment",
      cat:"augmentation",
      terms:["star empowerment"],
      feats:[]
    },
    {
      id:"atlas_planet_manipulation",
      name:"Planet Manipulation",
      cat:"cosmic",
      terms:["planet manipulation"],
      feats:[]
    },
    {
      id:"atlas_planet_empowerment",
      name:"Planet Empowerment",
      cat:"augmentation",
      terms:["planet empowerment"],
      feats:[]
    },
    {
      id:"atlas_comet_manipulation",
      name:"Comet Manipulation",
      cat:"cosmic",
      terms:["comet manipulation"],
      feats:[]
    },
    {
      id:"atlas_comet_empowerment",
      name:"Comet Empowerment",
      cat:"augmentation",
      terms:["comet empowerment"],
      feats:[]
    },
    {
      id:"atlas_meteor_manipulation",
      name:"Meteor Manipulation",
      cat:"cosmic",
      terms:["meteor manipulation"],
      feats:[]
    },
    {
      id:"atlas_meteor_empowerment",
      name:"Meteor Empowerment",
      cat:"augmentation",
      terms:["meteor empowerment"],
      feats:[]
    },
    {
      id:"atlas_asteroid_manipulation",
      name:"Asteroid Manipulation",
      cat:"cosmic",
      terms:["asteroid manipulation"],
      feats:[]
    },
    {
      id:"atlas_asteroid_empowerment",
      name:"Asteroid Empowerment",
      cat:"augmentation",
      terms:["asteroid empowerment"],
      feats:[]
    },
    {
      id:"atlas_galaxy_manipulation",
      name:"Galaxy Manipulation",
      cat:"cosmic",
      terms:["galaxy manipulation"],
      feats:[]
    },
    {
      id:"atlas_galaxy_empowerment",
      name:"Galaxy Empowerment",
      cat:"augmentation",
      terms:["galaxy empowerment"],
      feats:[]
    },
    {
      id:"atlas_universe_manipulation",
      name:"Universe Manipulation",
      cat:"cosmic",
      terms:["universe manipulation"],
      feats:[]
    },
    {
      id:"atlas_universe_empowerment",
      name:"Universe Empowerment",
      cat:"augmentation",
      terms:["universe empowerment"],
      feats:[]
    },
    {
      id:"atlas_aurora_manipulation",
      name:"Aurora Manipulation",
      cat:"cosmic",
      terms:["aurora manipulation"],
      feats:[]
    },
    {
      id:"atlas_aurora_empowerment",
      name:"Aurora Empowerment",
      cat:"augmentation",
      terms:["aurora empowerment"],
      feats:[]
    },
    {
      id:"atlas_eclipse_manipulation",
      name:"Eclipse Manipulation",
      cat:"cosmic",
      terms:["eclipse manipulation"],
      feats:[]
    },
    {
      id:"atlas_eclipse_empowerment",
      name:"Eclipse Empowerment",
      cat:"augmentation",
      terms:["eclipse empowerment"],
      feats:[]
    },
    {
      id:"atlas_tide_manipulation",
      name:"Tide Manipulation",
      cat:"nature",
      terms:["tide manipulation"],
      feats:[]
    },
    {
      id:"atlas_tide_empowerment",
      name:"Tide Empowerment",
      cat:"augmentation",
      terms:["tide empowerment"],
      feats:[]
    },
    {
      id:"atlas_lunar_manipulation",
      name:"Lunar Manipulation",
      cat:"cosmic",
      terms:["lunar manipulation"],
      feats:[]
    },
    {
      id:"atlas_lunar_empowerment",
      name:"Lunar Empowerment",
      cat:"augmentation",
      terms:["lunar empowerment"],
      feats:[]
    },
    {
      id:"atlas_solar_manipulation",
      name:"Solar Manipulation",
      cat:"cosmic",
      terms:["solar manipulation"],
      feats:[]
    },
    {
      id:"atlas_solar_empowerment",
      name:"Solar Empowerment",
      cat:"augmentation",
      terms:["solar empowerment"],
      feats:[]
    },
    {
      id:"atlas_stellar_manipulation",
      name:"Stellar Manipulation",
      cat:"cosmic",
      terms:["stellar manipulation"],
      feats:[]
    },
    {
      id:"atlas_stellar_empowerment",
      name:"Stellar Empowerment",
      cat:"augmentation",
      terms:["stellar empowerment"],
      feats:[]
    },
    {
      id:"atlas_wall_crawling",
      name:"Wall Crawling",
      cat:"mobility",
      terms:["wall crawling"],
      feats:[]
    },
    {
      id:"atlas_super_jump",
      name:"Super Jump",
      cat:"mobility",
      terms:["super jump"],
      feats:[]
    },
    {
      id:"atlas_enhanced_agility",
      name:"Enhanced Agility",
      cat:"physical",
      terms:["enhanced agility"],
      feats:[]
    },
    {
      id:"atlas_enhanced_reflexes",
      name:"Enhanced Reflexes",
      cat:"physical",
      terms:["enhanced reflexes"],
      feats:[]
    },
    {
      id:"atlas_enhanced_stamina",
      name:"Enhanced Stamina",
      cat:"physical",
      terms:["enhanced stamina"],
      feats:[]
    },
    {
      id:"atlas_enhanced_endurance",
      name:"Enhanced Endurance",
      cat:"physical",
      terms:["enhanced endurance"],
      feats:[]
    },
    {
      id:"atlas_enhanced_balance",
      name:"Enhanced Balance",
      cat:"physical",
      terms:["enhanced balance"],
      feats:[]
    },
    {
      id:"atlas_enhanced_dexterity",
      name:"Enhanced Dexterity",
      cat:"physical",
      terms:["enhanced dexterity"],
      feats:[]
    },
    {
      id:"atlas_enhanced_coordination",
      name:"Enhanced Coordination",
      cat:"physical",
      terms:["enhanced coordination"],
      feats:[]
    },
    {
      id:"atlas_natural_weaponry",
      name:"Natural Weaponry",
      cat:"physical",
      terms:["natural weaponry"],
      feats:[]
    },
    {
      id:"atlas_claw_retraction",
      name:"Claw Retraction",
      cat:"physical",
      terms:["claw retraction"],
      feats:[]
    },
    {
      id:"atlas_wing_manifestation",
      name:"Wing Manifestation",
      cat:"transformation",
      terms:["wing manifestation"],
      feats:[]
    },
    {
      id:"atlas_underwater_breathing",
      name:"Underwater Breathing",
      cat:"physiology",
      terms:["underwater breathing"],
      feats:[]
    },
    {
      id:"atlas_vacuum_adaptation",
      name:"Vacuum Adaptation",
      cat:"physiology",
      terms:["vacuum adaptation"],
      feats:[]
    },
    {
      id:"atlas_environmental_adaptation",
      name:"Environmental Adaptation",
      cat:"adaptation",
      terms:["environmental adaptation"],
      feats:[]
    },
    {
      id:"atlas_pressure_immunity",
      name:"Pressure Immunity",
      cat:"defense",
      terms:["pressure immunity"],
      feats:[]
    },
    {
      id:"atlas_heat_resistance",
      name:"Heat Resistance",
      cat:"defense",
      terms:["heat resistance"],
      feats:[]
    },
    {
      id:"atlas_cold_resistance",
      name:"Cold Resistance",
      cat:"defense",
      terms:["cold resistance"],
      feats:[]
    },
    {
      id:"atlas_radiation_resistance",
      name:"Radiation Resistance",
      cat:"defense",
      terms:["radiation resistance"],
      feats:[]
    },
    {
      id:"atlas_disease_immunity",
      name:"Disease Immunity",
      cat:"defense",
      terms:["disease immunity"],
      feats:[]
    },
    {
      id:"atlas_poison_immunity",
      name:"Poison Immunity",
      cat:"defense",
      terms:["poison immunity"],
      feats:[]
    },
    {
      id:"atlas_astral_projection",
      name:"Astral Projection",
      cat:"spiritual",
      terms:["astral projection"],
      feats:[]
    },
    {
      id:"atlas_possession",
      name:"Possession",
      cat:"spiritual",
      terms:["possession"],
      feats:[]
    },
    {
      id:"atlas_dream_walking",
      name:"Dream Walking",
      cat:"psychic",
      terms:["dream walking"],
      feats:[]
    },
    {
      id:"atlas_dream_sharing",
      name:"Dream Sharing",
      cat:"psychic",
      terms:["dream sharing"],
      feats:[]
    },
    {
      id:"atlas_memory_reading",
      name:"Memory Reading",
      cat:"psychic",
      terms:["memory reading"],
      feats:[]
    },
    {
      id:"atlas_memory_erasure",
      name:"Memory Erasure",
      cat:"psychic",
      terms:["memory erasure"],
      feats:[]
    },
    {
      id:"atlas_memory_implantation",
      name:"Memory Implantation",
      cat:"psychic",
      terms:["memory implantation"],
      feats:[]
    },
    {
      id:"atlas_emotion_detection",
      name:"Emotion Detection",
      cat:"psychic",
      terms:["emotion detection"],
      feats:[]
    },
    {
      id:"atlas_emotion_inducement",
      name:"Emotion Inducement",
      cat:"psychic",
      terms:["emotion inducement"],
      feats:[]
    },
    {
      id:"atlas_fear_inducement",
      name:"Fear Inducement",
      cat:"psychic",
      terms:["fear inducement"],
      feats:[]
    },
    {
      id:"atlas_pain_inducement",
      name:"Pain Inducement",
      cat:"psychic",
      terms:["pain inducement"],
      feats:[]
    },
    {
      id:"atlas_sleep_inducement",
      name:"Sleep Inducement",
      cat:"psychic",
      terms:["sleep inducement"],
      feats:[]
    },
    {
      id:"atlas_illusion_creation",
      name:"Illusion Creation",
      cat:"psychic",
      terms:["illusion creation"],
      feats:[]
    },
    {
      id:"atlas_sensory_manipulation",
      name:"Sensory Manipulation",
      cat:"psychic",
      terms:["sensory manipulation"],
      feats:[]
    },
    {
      id:"atlas_mind_shield",
      name:"Mind Shield",
      cat:"defense",
      terms:["mind shield"],
      feats:[]
    },
    {
      id:"atlas_mental_resistance",
      name:"Mental Resistance",
      cat:"defense",
      terms:["mental resistance"],
      feats:[]
    },
    {
      id:"atlas_psychic_constructs",
      name:"Psychic Constructs",
      cat:"psychic",
      terms:["psychic constructs"],
      feats:[]
    },
    {
      id:"atlas_thought_projection",
      name:"Thought Projection",
      cat:"psychic",
      terms:["thought projection"],
      feats:[]
    },
    {
      id:"atlas_thought_suppression",
      name:"Thought Suppression",
      cat:"psychic",
      terms:["thought suppression"],
      feats:[]
    },
    {
      id:"atlas_time_stop",
      name:"Time Stop",
      cat:"temporal",
      terms:["time stop","stop time","stops time","stopping time","freeze time","freezes time","freezing time"],
      feats:["time stops around","time freezes around","world freezes around","stops time for","freezes time for"]
    },
    {
      id:"atlas_time_rewind",
      name:"Time Rewind",
      cat:"temporal",
      terms:["time rewind"],
      feats:[]
    },
    {
      id:"atlas_time_acceleration",
      name:"Time Acceleration",
      cat:"temporal",
      terms:["time acceleration"],
      feats:[]
    },
    {
      id:"atlas_time_deceleration",
      name:"Time Deceleration",
      cat:"temporal",
      terms:["time deceleration"],
      feats:[]
    },
    {
      id:"atlas_time_travel",
      name:"Time Travel",
      cat:"temporal",
      terms:["time travel"],
      feats:[]
    },
    {
      id:"atlas_temporal_looping",
      name:"Temporal Looping",
      cat:"temporal",
      terms:["temporal looping"],
      feats:[]
    },
    {
      id:"atlas_postcognition",
      name:"Postcognition",
      cat:"perception",
      terms:["postcognition"],
      feats:[]
    },
    {
      id:"atlas_precognition",
      name:"Precognition",
      cat:"perception",
      terms:["precognition"],
      feats:[]
    },
    {
      id:"atlas_spatial_folding",
      name:"Spatial Folding",
      cat:"spatial",
      terms:["spatial folding"],
      feats:[]
    },
    {
      id:"atlas_spatial_locking",
      name:"Spatial Locking",
      cat:"spatial",
      terms:["spatial locking"],
      feats:[]
    },
    {
      id:"atlas_portal_creation",
      name:"Portal Creation",
      cat:"mobility",
      terms:["portal creation"],
      feats:[]
    },
    {
      id:"atlas_dimensional_travel",
      name:"Dimensional Travel",
      cat:"mobility",
      terms:["dimensional travel"],
      feats:[]
    },
    {
      id:"atlas_dimensional_storage",
      name:"Dimensional Storage",
      cat:"utility",
      terms:["dimensional storage"],
      feats:[]
    },
    {
      id:"atlas_pocket_dimension_creation",
      name:"Pocket Dimension Creation",
      cat:"creation",
      terms:["pocket dimension creation"],
      feats:[]
    },
    {
      id:"atlas_distance_reduction",
      name:"Distance Reduction",
      cat:"spatial",
      terms:["distance reduction"],
      feats:[]
    },
    {
      id:"atlas_location_exchange",
      name:"Location Exchange",
      cat:"mobility",
      terms:["location exchange"],
      feats:[]
    },
    {
      id:"atlas_power_copying",
      name:"Power Copying",
      cat:"meta",
      terms:["power copying"],
      feats:[]
    },
    {
      id:"atlas_power_mimicry",
      name:"Power Mimicry",
      cat:"meta",
      terms:["power mimicry"],
      feats:[]
    },
    {
      id:"atlas_power_theft",
      name:"Power Theft",
      cat:"meta",
      terms:["power theft"],
      feats:[]
    },
    {
      id:"atlas_power_absorption",
      name:"Power Absorption",
      cat:"meta",
      terms:["power absorption"],
      feats:[]
    },
    {
      id:"atlas_power_negation",
      name:"Power Negation",
      cat:"meta",
      terms:["power negation"],
      feats:[]
    },
    {
      id:"atlas_power_suppression",
      name:"Power Suppression",
      cat:"meta",
      terms:["power suppression"],
      feats:[]
    },
    {
      id:"atlas_power_amplification",
      name:"Power Amplification",
      cat:"meta",
      terms:["power amplification"],
      feats:[]
    },
    {
      id:"atlas_power_bestowal",
      name:"Power Bestowal",
      cat:"meta",
      terms:["power bestowal"],
      feats:[]
    },
    {
      id:"atlas_power_detection",
      name:"Power Detection",
      cat:"meta",
      terms:["power detection"],
      feats:[]
    },
    {
      id:"atlas_power_sealing",
      name:"Power Sealing",
      cat:"meta",
      terms:["power sealing"],
      feats:[]
    },
    {
      id:"atlas_power_evolution",
      name:"Power Evolution",
      cat:"meta",
      terms:["power evolution"],
      feats:[]
    },
    {
      id:"atlas_power_fusion",
      name:"Power Fusion",
      cat:"meta",
      terms:["power fusion"],
      feats:[]
    },
    {
      id:"atlas_power_separation",
      name:"Power Separation",
      cat:"meta",
      terms:["power separation"],
      feats:[]
    },
    {
      id:"atlas_power_transfer",
      name:"Power Transfer",
      cat:"meta",
      terms:["power transfer"],
      feats:[]
    },
    {
      id:"atlas_power_immunity",
      name:"Power Immunity",
      cat:"defense",
      terms:["power immunity"],
      feats:[]
    },
    {
      id:"atlas_power_resistance",
      name:"Power Resistance",
      cat:"defense",
      terms:["power resistance"],
      feats:[]
    },
    {
      id:"atlas_power_reflection",
      name:"Power Reflection",
      cat:"meta",
      terms:["power reflection"],
      feats:[]
    },
    {
      id:"atlas_power_redirection",
      name:"Power Redirection",
      cat:"meta",
      terms:["power redirection"],
      feats:[]
    },
    {
      id:"atlas_power_modification",
      name:"Power Modification",
      cat:"meta",
      terms:["power modification"],
      feats:[]
    },
    {
      id:"atlas_power_reversal",
      name:"Power Reversal",
      cat:"meta",
      terms:["power reversal"],
      feats:[]
    },
    {
      id:"atlas_power_randomization",
      name:"Power Randomization",
      cat:"meta",
      terms:["power randomization"],
      feats:[]
    },
    {
      id:"atlas_power_restoration",
      name:"Power Restoration",
      cat:"meta",
      terms:["power restoration"],
      feats:[]
    },
    {
      id:"atlas_rune_magic",
      name:"Rune Magic",
      cat:"magic",
      terms:["rune magic"],
      feats:[]
    },
    {
      id:"atlas_curse_magic",
      name:"Curse Magic",
      cat:"magic",
      terms:["curse magic"],
      feats:[]
    },
    {
      id:"atlas_blessing_magic",
      name:"Blessing Magic",
      cat:"magic",
      terms:["blessing magic"],
      feats:[]
    },
    {
      id:"atlas_necromancy",
      name:"Necromancy",
      cat:"magic",
      terms:["necromancy"],
      feats:[]
    },
    {
      id:"atlas_divination_magic",
      name:"Divination Magic",
      cat:"magic",
      terms:["divination magic"],
      feats:[]
    },
    {
      id:"atlas_summoning_magic",
      name:"Summoning Magic",
      cat:"magic",
      terms:["summoning magic"],
      feats:[]
    },
    {
      id:"atlas_healing_magic",
      name:"Healing Magic",
      cat:"magic",
      terms:["healing magic"],
      feats:[]
    },
    {
      id:"atlas_barrier_magic",
      name:"Barrier Magic",
      cat:"magic",
      terms:["barrier magic"],
      feats:[]
    },
    {
      id:"atlas_transformation_magic",
      name:"Transformation Magic",
      cat:"magic",
      terms:["transformation magic"],
      feats:[]
    },
    {
      id:"atlas_illusion_magic",
      name:"Illusion Magic",
      cat:"magic",
      terms:["illusion magic"],
      feats:[]
    },
    {
      id:"atlas_blood_magic",
      name:"Blood Magic",
      cat:"magic",
      terms:["blood magic"],
      feats:[]
    },
    {
      id:"atlas_dream_magic",
      name:"Dream Magic",
      cat:"magic",
      terms:["dream magic"],
      feats:[]
    },
    {
      id:"atlas_soul_magic",
      name:"Soul Magic",
      cat:"magic",
      terms:["soul magic"],
      feats:[]
    },
    {
      id:"atlas_space_magic",
      name:"Space Magic",
      cat:"magic",
      terms:["space magic"],
      feats:[]
    },
    {
      id:"atlas_time_magic",
      name:"Time Magic",
      cat:"magic",
      terms:["time magic"],
      feats:[]
    },
    {
      id:"atlas_elemental_magic",
      name:"Elemental Magic",
      cat:"magic",
      terms:["elemental magic"],
      feats:[]
    },
    {
      id:"atlas_enchanting",
      name:"Enchanting",
      cat:"magic",
      terms:["enchanting"],
      feats:[]
    },
    {
      id:"atlas_alchemy",
      name:"Alchemy",
      cat:"magic",
      terms:["alchemy"],
      feats:[]
    },
    {
      id:"atlas_ritual_magic",
      name:"Ritual Magic",
      cat:"magic",
      terms:["ritual magic"],
      feats:[]
    },
    {
      id:"atlas_contract_magic",
      name:"Contract Magic",
      cat:"magic",
      terms:["contract magic"],
      feats:[]
    },
    {
      id:"atlas_technopathy",
      name:"Technopathy",
      cat:"technology",
      terms:["technopathy"],
      feats:[]
    },
    {
      id:"atlas_cyberpathy",
      name:"Cyberpathy",
      cat:"technology",
      terms:["cyberpathy"],
      feats:[]
    },
    {
      id:"atlas_machine_possession",
      name:"Machine Possession",
      cat:"technology",
      terms:["machine possession"],
      feats:[]
    },
    {
      id:"atlas_digital_travel",
      name:"Digital Travel",
      cat:"technology",
      terms:["digital travel"],
      feats:[]
    },
    {
      id:"atlas_data_manipulation",
      name:"Data Manipulation",
      cat:"technology",
      terms:["data manipulation"],
      feats:[]
    },
    {
      id:"atlas_hologram_projection",
      name:"Hologram Projection",
      cat:"technology",
      terms:["hologram projection"],
      feats:[]
    },
    {
      id:"atlas_nanite_manipulation",
      name:"Nanite Manipulation",
      cat:"technology",
      terms:["nanite manipulation"],
      feats:[]
    },
    {
      id:"atlas_cybernetic_enhancement",
      name:"Cybernetic Enhancement",
      cat:"technology",
      terms:["cybernetic enhancement"],
      feats:[]
    },
    {
      id:"atlas_remote_hacking",
      name:"Remote Hacking",
      cat:"technology",
      terms:["remote hacking"],
      feats:[]
    },
    {
      id:"atlas_artificial_intelligence_communion",
      name:"Artificial Intelligence Communion",
      cat:"technology",
      terms:["artificial intelligence communion"],
      feats:[]
    },
    {
      id:"atlas_dragon_physiology",
      name:"Dragon Physiology",
      cat:"physiology",
      terms:["dragon physiology"],
      feats:[]
    },
    {
      id:"atlas_vampire_physiology",
      name:"Vampire Physiology",
      cat:"physiology",
      terms:["vampire physiology"],
      feats:[]
    },
    {
      id:"atlas_werewolf_physiology",
      name:"Werewolf Physiology",
      cat:"physiology",
      terms:["werewolf physiology"],
      feats:[]
    },
    {
      id:"atlas_angel_physiology",
      name:"Angel Physiology",
      cat:"physiology",
      terms:["angel physiology"],
      feats:[]
    },
    {
      id:"atlas_demon_physiology",
      name:"Demon Physiology",
      cat:"physiology",
      terms:["demon physiology"],
      feats:[]
    },
    {
      id:"atlas_phoenix_physiology",
      name:"Phoenix Physiology",
      cat:"physiology",
      terms:["phoenix physiology"],
      feats:[]
    },
    {
      id:"atlas_slime_physiology",
      name:"Slime Physiology",
      cat:"physiology",
      terms:["slime physiology"],
      feats:[]
    },
    {
      id:"atlas_robot_physiology",
      name:"Robot Physiology",
      cat:"physiology",
      terms:["robot physiology"],
      feats:[]
    },
    {
      id:"atlas_cyborg_physiology",
      name:"Cyborg Physiology",
      cat:"physiology",
      terms:["cyborg physiology"],
      feats:[]
    },
    {
      id:"atlas_alien_physiology",
      name:"Alien Physiology",
      cat:"physiology",
      terms:["alien physiology"],
      feats:[]
    },
    {
      id:"atlas_ghost_physiology",
      name:"Ghost Physiology",
      cat:"physiology",
      terms:["ghost physiology"],
      feats:[]
    },
    {
      id:"atlas_undead_physiology",
      name:"Undead Physiology",
      cat:"physiology",
      terms:["undead physiology"],
      feats:[]
    },
    {
      id:"atlas_plant_physiology",
      name:"Plant Physiology",
      cat:"physiology",
      terms:["plant physiology"],
      feats:[]
    },
    {
      id:"atlas_aquatic_physiology",
      name:"Aquatic Physiology",
      cat:"physiology",
      terms:["aquatic physiology"],
      feats:[]
    },
    {
      id:"atlas_insect_physiology",
      name:"Insect Physiology",
      cat:"physiology",
      terms:["insect physiology"],
      feats:[]
    },
    {
      id:"atlas_reptile_physiology",
      name:"Reptile Physiology",
      cat:"physiology",
      terms:["reptile physiology"],
      feats:[]
    },
    {
      id:"atlas_avian_physiology",
      name:"Avian Physiology",
      cat:"physiology",
      terms:["avian physiology"],
      feats:[]
    },
    {
      id:"atlas_feline_physiology",
      name:"Feline Physiology",
      cat:"physiology",
      terms:["feline physiology"],
      feats:[]
    },
    {
      id:"atlas_canine_physiology",
      name:"Canine Physiology",
      cat:"physiology",
      terms:["canine physiology"],
      feats:[]
    },
    {
      id:"atlas_eldritch_physiology",
      name:"Eldritch Physiology",
      cat:"physiology",
      terms:["eldritch physiology"],
      feats:[]
    },
    {
      id:"atlas_causal_veto",
      name:"Causal Veto",
      cat:"conceptual",
      terms:["causal veto"],
      feats:[]
    },
    {
      id:"atlas_vector_redirection",
      name:"Vector Redirection",
      cat:"physics",
      terms:["vector redirection"],
      feats:[]
    },
    {
      id:"atlas_momentum_banking",
      name:"Momentum Banking",
      cat:"physics",
      terms:["momentum banking"],
      feats:[]
    },
    {
      id:"atlas_threshold_folding",
      name:"Threshold Folding",
      cat:"spatial",
      terms:["threshold folding"],
      feats:[]
    },
    {
      id:"atlas_injury_mapping",
      name:"Injury Mapping",
      cat:"biological",
      terms:["injury mapping"],
      feats:[]
    },
    {
      id:"atlas_static_borrowing",
      name:"Static Borrowing",
      cat:"energy",
      terms:["static borrowing"],
      feats:[]
    },
    {
      id:"atlas_gravity_anchoring",
      name:"Gravity Anchoring",
      cat:"physics",
      terms:["gravity anchoring"],
      feats:[]
    },
    {
      id:"atlas_voice_echo_projection",
      name:"Voice Echo Projection",
      cat:"sound",
      terms:["voice echo projection"],
      feats:[]
    },
    {
      id:"atlas_heat_sink",
      name:"Heat Sink",
      cat:"energy",
      terms:["heat sink"],
      feats:[]
    },
    {
      id:"atlas_door_memory",
      name:"Door Memory",
      cat:"conceptual",
      terms:["door memory"],
      feats:[]
    },
    {
      id:"atlas_lie_to_glass_transmutation",
      name:"Lie-to-Glass Transmutation",
      cat:"transformation",
      terms:["lie-to-glass transmutation"],
      feats:[]
    },
    {
      id:"atlas_null_field",
      name:"Null Field",
      cat:"meta",
      terms:["null field"],
      feats:[]
    },
    {
      id:"atlas_mirrorbody_physiology",
      name:"Mirrorbody Physiology",
      cat:"physiology",
      terms:["mirrorbody physiology"],
      feats:[]
    },
    {
      id:"atlas_kinetic_resistance",
      name:"Kinetic Resistance",
      cat:"defense",
      terms:["kinetic resistance"],
      feats:[]
    },
    {
      id:"atlas_signature_masking",
      name:"Signature Masking",
      cat:"stealth",
      terms:["signature masking"],
      feats:[]
    },
    {
      id:"atlas_signature_reading",
      name:"Signature Reading",
      cat:"perception",
      terms:["signature reading"],
      feats:[]
    },
    {
      id:"atlas_reality_anchoring",
      name:"Reality Anchoring",
      cat:"defense",
      terms:["reality anchoring"],
      feats:[]
    },
    {
      id:"atlas_probability_anchoring",
      name:"Probability Anchoring",
      cat:"defense",
      terms:["probability anchoring"],
      feats:[]
    },
    {
      id:"atlas_causality_resistance",
      name:"Causality Resistance",
      cat:"defense",
      terms:["causality resistance"],
      feats:[]
    },
    {
      id:"atlas_conceptual_resistance",
      name:"Conceptual Resistance",
      cat:"defense",
      terms:["conceptual resistance"],
      feats:[]
    }
  ];

  var EXTENDED_ATLAS_INSTALLED = false;

  function installExtendedAtlas() {
    if (EXTENDED_ATLAS_INSTALLED) return;
    EXTENDED_ATLAS_INSTALLED = true;
    var existingNames = {}, existingIds = {}, i, d;
    for (i = 0; i < POWER_DEFS.length; i++) { d = POWER_DEFS[i]; existingIds[d.id] = 1; existingNames[lower(d.name)] = 1; }
    for (i = 0; i < EXTENDED_POWER_ATLAS.length; i++) {
      d = EXTENDED_POWER_ATLAS[i];
      if (existingIds[d.id] || existingNames[lower(d.name)]) continue;
      POWER_DEFS.push(d); existingIds[d.id] = 1; existingNames[lower(d.name)] = 1;
    }
  }

  // Superpower ontology layer.  The Superpower Wiki contains tens of thousands of
  // named abilities.  Hard-coding every title would be slow, brittle and would still
  // miss original powers.  POWERS instead recognizes the compositional grammar used
  // across power fiction: domain + mechanic + tier/source/trait.  This lets descriptive
  // abilities such as \"Blood Manipulation\", \"Dream Embodiment\", \"Cheese Mimicry\",
  // \"Absolute Spatial Negation\" and new user-created abilities enter the same evidence
  // model without a giant lookup table.
  var ONTOLOGY_MECHANICS = [
    {key:"manipulation", cat:"manipulation", re:/\b(manipulation|control|bending|kinesis)\b/i},
    {key:"generation", cat:"creation", re:/\b(generation|production|emission)\b/i},
    {key:"creation", cat:"creation", re:/\b(creation|construction|materialization|manifestation)\b/i},
    {key:"mimicry", cat:"transformation", re:/\b(mimicry|mimicking)\b/i},
    {key:"physiology", cat:"physiology", re:/\b(physiology|biology|body)\b/i},
    {key:"embodiment", cat:"state", re:/\b(embodiment|personification|incarnation)\b/i},
    {key:"empowerment", cat:"augmentation", re:/\b(empowerment|empowering|augmentation|enhancement)\b/i},
    {key:"absorption", cat:"absorption", re:/\b(absorption|absorbing|drain|devouring)\b/i},
    {key:"immunity", cat:"defense", re:/\b(immunity|immune)\b/i},
    {key:"resistance", cat:"defense", re:/\b(resistance|resistant)\b/i},
    {key:"negation", cat:"meta", re:/\b(negation|nullification|cancellation|suppression)\b/i},
    {key:"sealing", cat:"control", re:/\b(sealing|seal|imprisonment|binding)\b/i},
    {key:"summoning", cat:"summoning", re:/\b(summoning|conjuration|calling)\b/i},
    {key:"bestowal", cat:"meta", re:/\b(bestowal|granting|imprinting|inheritance)\b/i},
    {key:"replication", cat:"meta", re:/\b(replication|copying|adoption|duplication)\b/i},
    {key:"detection", cat:"perception", re:/\b(detection|sensing|sense|awareness|perception|vision)\b/i},
    {key:"communication", cat:"communication", re:/\b(communication|speech|language|telepathy)\b/i},
    {key:"projection", cat:"projection", re:/\b(projection|projecting|blast|beam)\b/i},
    {key:"constructs", cat:"creation", re:/\b(constructs?|construct creation)\b/i},
    {key:"transmutation", cat:"transformation", re:/\b(transmutation|conversion|alteration)\b/i},
    {key:"restoration", cat:"recovery", re:/\b(restoration|healing|regeneration|resurrection|revival)\b/i},
    {key:"inducement", cat:"effect", re:/\b(inducement|inducing|infliction)\b/i},
    {key:"infusion", cat:"augmentation", re:/\b(infusion|charging|imbuement|enchantment)\b/i},
    {key:"evolution", cat:"adaptation", re:/\b(evolution|adaptation|mutation)\b/i},
    {key:"transformation", cat:"transformation", re:/\b(transformation|shapeshifting|morphing|morphism)\b/i},
    {key:"transportation", cat:"mobility", re:/\b(transportation|teleportation|portation|travel|movement)\b/i},
    {key:"intangibility", cat:"defense", re:/\b(intangibility|phasing)\b/i},
    {key:"invisibility", cat:"stealth", re:/\b(invisibility|concealment)\b/i},
    {key:"storage", cat:"utility", re:/\b(storage|containment|inventory)\b/i},
    {key:"exchange", cat:"effect", re:/\b(exchange|swapping|transfer)\b/i},
    {key:"fusion", cat:"combination", re:/\b(fusion|combination|amalgamation)\b/i},
    {key:"separation", cat:"effect", re:/\b(separation|division|splitting)\b/i},
    {key:"connection", cat:"effect", re:/\b(connection|link|bonding|symbiosis)\b/i},
    {key:"mastery", cat:"skill", re:/\b(mastery|proficiency|expertise)\b/i},
    {key:"magic", cat:"magic", re:/\b(magic|sorcery|witchcraft|mancy)\b/i},
    {key:"science", cat:"science", re:/\b(science|scientific)\b/i},
    {key:"combat", cat:"combat", re:/\b(combat|martial|weaponization)\b/i},
    {key:"boundary", cat:"meta", re:/\b(boundary|border)\b/i},
    {key:"interaction", cat:"interaction", re:/\binteraction\b/i}
  ];

  var ONTOLOGY_POWER_ENDING_RE = /\b(manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|constructs?|transmutation|restoration|regeneration|healing|inducement|infusion|augmentation|enhancement|evolution|adaptation|transformation|shapeshifting|transportation|teleportation|control|mastery|magic|science|combat|boundary|interaction|intangibility|invisibility|storage|exchange|conversion|fusion|separation|connection|awareness|vision|sense)\b/i;
  var ONTOLOGY_SUFFIX_WORD_RE = /\b[A-Za-z][A-Za-z'’.-]{2,45}(?:kinesis|mancy|pathy|portation|morphism)\b/i;
  var HIGH_TIER_RE = /\b(absolute|almighty|omni(?:potent|potence|scient|science|present|presence)?|transcendent|boundless|ultimate|infinite|primordial|supreme)\b/i;
  var PASSIVE_RE = /\b(passive|automatically|automatic|always active|constantly active|instinctive|reflexive)\b/i;
  var ACTIVE_RE = /\b(at will|activate[sd]?|activation|manually|on command|when (?:he|she|they|you) chooses?|consciously)\b/i;
  var CHARGE_RE = /\b(charge[sd]?|charging|builds? up|winds? up|stores? energy before|requires? preparation)\b/i;
  var LINK_RE = /\b(derived from|derives from|comes from|evolves from|upgrades? from|combines? with|fusion of|requires? another power|depends? on|grants?|bestows?|copies?|replicates?|inherits?)\b/i;

  var APPLICATION_PATTERNS = [
    ["offense", /\b(attack|strike|blast|beam|bolt|punch|kick|burn|cut|pierce|crush|destroy|damage|weapon)\b/i],
    ["defense", /\b(block|shield|barrier|deflect|protect|armor|guard|survive|resist)\b/i],
    ["mobility", /\b(move|travel|dash|fly|teleport|portal|jump|leap|escape|cross|ride|surf)\b/i],
    ["control", /\b(restrain|bind|trap|hold|immobil|control|redirect|push|pull|disarm)\b/i],
    ["sensing", /\b(sense|detect|see|hear|track|locate|perceive|scan|identify|awareness)\b/i],
    ["healing", /\b(heal|restore|regenerate|revive|cure|repair)\b/i],
    ["construct", /\b(construct|weapon|wall|shield|barrier|platform|bridge|cage|armor|tool|build|built)\b/i],
    ["stealth", /\b(hide|conceal|invisible|silent|stealth|disguise|mask)\b/i],
    ["utility", /\b(open|carry|lift|build|repair|light|clean|write|unlock|search|translate|communicate)\b/i],
    ["support", /\b(ally|boost|empower|enhance|protect|share|grant|assist)\b/i],
    ["summoning", /\b(summon|conjure|call forth|manifest creature|create servant)\b/i],
    ["transformation", /\b(transform|morph|shift form|become|mimic)\b/i],
    ["environment", /\b(weather|terrain|room|building|ground|air|water|environment|area)\b/i],
    ["creation", /\b(create|generate|produce|manifest|materialize|form)\b/i],
    ["destruction", /\b(destroy|erase|disintegrate|shatter|annihilate|break down)\b/i],
    ["sealing", /\b(seal|bind|banish|contain|imprison|nullify|suppress)\b/i]
  ];

  var SOURCE_PATTERNS = [
    ["magic", /\b(magic|magical|spell|sorcer|witch|arcane|mystic|enchanted|curse)\b/i],
    ["mutation", /\b(mutant|mutation|mutated|metagene|genetic anomaly|evolved gene)\b/i],
    ["technology", /\b(technology|technological|cybernetic|implant|nanotech|nanite|armor|suit|device|machine|gadget)\b/i],
    ["artifact", /\b(artifact|relic|ring|amulet|talisman|weapon|staff|crystal|stone)\b/i],
    ["divine", /\b(divine|god|goddess|deity|angelic|holy|blessing|celestial)\b/i],
    ["infernal", /\b(demonic|demon|infernal|hellish|devilish)\b/i],
    ["alien", /\b(alien|extraterrestrial|off-world|kryptonian|martian)\b/i],
    ["cosmic", /\b(cosmic|cosmos|stellar|universal energy|space-borne)\b/i],
    ["psychic", /\b(psychic|psionic|mental power|mind power)\b/i],
    ["biological", /\b(biological|organic|symbiote|parasite|venom|gland|species trait)\b/i],
    ["martial", /\b(chi|ki|chakra|martial art|inner energy|life force)\b/i],
    ["chemical", /\b(serum|chemical|drug|compound|formula|experiment)\b/i],
    ["supernatural", /\b(supernatural|occult|ghost|spirit|vampir|werewolf|eldritch)\b/i],
    ["elemental", /\b(elemental|primordial element|natural element)\b/i],
    ["dimensional", /\b(dimensional|other dimension|higher dimension|lower dimension|extradimensional)\b/i],
    ["temporal", /\b(temporal|time energy|chronal|chrono)\b/i],
    ["quantum", /\b(quantum|zero-point|subatomic|particle field)\b/i],
    ["emotional", /\b(emotion|anger|rage|fear|love|hope|despair)\b/i],
    ["dream", /\b(dream|nightmare|oneiric)\b/i],
    ["soul", /\b(soul|spiritual essence|spirit energy)\b/i],
    ["bloodline", /\b(bloodline|ancestral|ancestor|inherited gene|heritage)\b/i],
    ["infection", /\b(infection|virus|fungus|parasite|pathogen)\b/i]
  ];

  var LIMIT_RE = /\b(only|limited to|cannot|can't|unable to|doesn't work|does not work|fails against|requires|needs|must be|has to be|range|within (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few)|for (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few) (?:seconds?|minutes?|hours?)|cooldown|recharge|once per|twice per|while touching|line of sight|when injured|when angry|under moonlight|in sunlight|at night)\b/i;
  var COST_RE = /\b(costs?|drains?|exhausts?|tires?|fatigues?|hurts?|painful|pain|migraine|headache|bleed|bleeding|burns? him|burns? her|burns? them|shortens? (?:his|her|their) life|consumes?|uses up|strain|overload|overheats?)\b/i;
  var FAILURE_RE = /\b(fails?|failed|nothing happens|fizzles?|sputters?|can't|cannot|unable|doesn't work|does not work|no effect|loses? control|backfires?|interrupted)\b/i;
  var SUCCESS_RE = /\b(succeeds?|works?|erupts?|bursts?|appears?|vanishes?|reappears?|lifts?|moves?|freezes?|burns?|shatters?|breaks?|pass through|passes through|phase through|phases through|teleports?|heals?|regenerates?|blocks?|stops?|deflects?|push(?:es|ed)?|shoves?|pulls?|throws?|redirects?|absorbs?|controls?|summons?|transforms?|changes?|surges?|strikes?|hits?)\b/i;
  var PARTIAL_RE = /\b(barely|partially|briefly|weakly|power flickers?|ability flickers?|energy flickers?|unstable|struggles?|with effort|for a moment|momentarily|almost fails)\b/i;
  var LOSS_RE = /\b(loses? (?:his|her|their|the) powers?|lost (?:his|her|their) powers?|powers? (?:is|are) gone|powerless|stripped of (?:his|her|their) powers?|no longer (?:has|have|can use)|permanently nullified|lost (?:the )?ability to|ability is gone|power is gone)\b/i;
  var SUPPRESS_RE = /\b(powers? (?:is|are) (?:suppressed|blocked|nullified|dampened|sealed|disabled)|can't use (?:his|her|their) powers? (?:right now|for now)|temporarily powerless|power dampener|nullification field)\b/i;
  var RESTORE_RE = /\b(regains? (?:his|her|their) powers?|powers? return|power returns|abilities return|gets? (?:his|her|their) powers? back|suppression ends|seal breaks)\b/i;
  var MASTERY_RE = /\b(masters?|mastered|perfect control|complete control|effortlessly controls?|expert control|fully mastered)\b/i;
  var IMPROVE_RE = /\b(improves?|improved|learning to|learns? to control|better control|more precise|more reliable|practice pays off|training pays off)\b/i;
  var REGRESS_RE = /\b(loses? control|less control|unstable|weaker than before|struggles? to control|power deteriorates)\b/i;
  var DEFENSE_RE = /\b(immune|immunity|resistant|resistance|vulnerable|vulnerability|weak|weakness|susceptible)\b/i;
  var TEMP_RESTRICT_RE = /\b(right now|for now|currently|temporarily|today|at the moment|while the [^.!?;]{1,50}(?:field|collar|seal|ward|effect) is active)\b/i;
  var STRAIN_RE = /\b(dizzy|dizziness|exhausted|exhaustion|drained|winded|fatigued|fatigue|nosebleed|migraine|headache|overheated|overheating|trembling|shaking|weakness|weakened|collapses?|stumbles?|vision blurs?)\b/i;
  var SCALE_DURATION_RE = /\bfor\s+(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|several|a few)\s+(?:seconds?|minutes?|hours?|days?)\b/i;
  var SCALE_RANGE_RE = /\b(?:within|up to|from|at a range of|range of)\s+(?:about\s+|roughly\s+|nearly\s+)?(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|several|a few)\s+(?:feet|foot|meters?|metres?|yards?|miles?|kilometers?|kilometres?)\b/i;
  var SCALE_SCOPE_RE = /\b(single room|one room|room-sized|room|house|building|city block|block|neighborhood|neighbourhood|district|city|region|country|continent|planet|world|solar system|galaxy|universe)\b/i;
  var SCALE_TARGET_RE = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|several|dozens? of|hundreds? of|everyone|everybody|all)\s+(?:people|person|targets?|enemies|allies|creatures|objects)\b/i;
  var SCALE_MAGNITUDE_RE = /\b(car|truck|bus|tank|train|aircraft|airplane|jet|ship|boulder|house|building|skyscraper|bridge|mountain|meteor|asteroid)\b/i;
  var FORM_BIND_RE = /\b(?:only\s+)?(?:while\s+in|when\s+in|in)\s+(?:his|her|their|your)?\s*([^,.!?;]{1,45}?)\s+form\b/i;
  var TRANSFORM_RE = /\b(transforms?|transformed|turns?|turned|shifts?|shifted|morphs?|morphed|changes? form|changed form)\s+(?:himself|herself|themselves|itself\s+)?(?:into|to)\s+([^.!?;]{2,80})/i;
  var REVERT_RE = /\b(reverts?|returns?)\s+(?:back\s+)?to\s+(?:his|her|their|its)?\s*(?:normal|human|base|original)\s+form\b/i;

  var GENERIC_ABILITY_HINT_RE = /\b(teleport|phase|transform|morph|summon|conjure|manifest|project|generate|emit|produce|manipulate|control|bend|warp|rewrite|reshape|transmute|disintegrate|possess|resurrect|revive|freeze time|stop time|read minds?|hear thoughts?|become invisible|turn invisible|heal instantly|regenerate|duplicate|clone|absorb powers?|copy powers?|nullify powers?|alter reality|walk through walls?|breathe underwater|grow giant|shrink|stretch|fly|levitate|empower|bestow|grant powers?|seal|bind|banish|reflect|convert|fuse|separate|evolve|adapt|sense powers?|detect powers?|channel|invoke|cast)\b/i;

  // Deep continuity patterns.
  var HYPOTHETICAL_RE = /\b(?:if|imagine|suppose|assuming|hypothetically|would be able to|could theoretically|might someday)\b/i;
  var NEGATED_ABILITY_RE = /\b(?:cannot|can't|can not|unable to|doesn't have|does not have|never had|lacks?|without the ability to|isn't able to|is not able to)\b/i;
  var ACCESS_INNATE_RE = /\b(?:born with|innate|natural ability|inborn|biological trait|species trait)\b/i;
  var ACCESS_INHERITED_RE = /\b(?:inherited|bloodline|ancestral|passed down|runs in (?:the|his|her|their) family)\b/i;
  var ACCESS_LEARNED_RE = /\b(?:learned|trained|studied|taught|mastered through training|developed through practice)\b/i;
  var ACCESS_GRANTED_RE = /\b(?:granted|bestowed|gifted by|blessed by|empowered by)\b/i;
  var ACCESS_COPIED_RE = /\b(?:copied|mimicked|replicated from|borrowed the pattern of)\b/i;
  var ACCESS_STOLEN_RE = /\b(?:stole|stolen|drained from|ripped from|took the power from)\b/i;
  var ACCESS_BORROWED_RE = /\b(?:borrowed|temporarily granted|on loan|temporary power|for a limited time)\b/i;
  var ACCESS_ARTIFACT_RE = /\b(?:only works through|requires? (?:the|an?) (?:ring|relic|artifact|device|suit|weapon|staff|amulet|talisman)|bound to (?:the|an?) (?:ring|relic|artifact|device|suit|weapon|staff|amulet|talisman)|artifact-dependent|device-dependent)\b/i;

  var OP_COOLDOWN_RE = /\b(?:cooling down|on cooldown|cooldown active|must wait before|cannot be used again yet)\b/i;
  var OP_DEPLETED_RE = /\b(?:depleted|(?:power|energy|mana|charges?|fuel|reserve|reserves|battery|tank)\s+(?:is|are)\s+empty|empty\s+(?:reserve|reserves|battery|tank)|out of (?:energy|mana|charges|fuel|power)|no charges? left|spent all (?:energy|mana|charges|fuel|power)|resource exhausted)\b/i;
  var OP_CHARGING_RE = /\b(?:charging up|is charging|begins? charging|building charge|gathering energy|winding up)\b/i;
  var OP_OVERCHARGED_RE = /\b(?:overcharged|overloaded with power|too much energy|surging beyond safe limits)\b/i;
  var OP_UNSTABLE_RE = /\b(?:unstable|erratic|flickering unpredictably|misfiring|behaving unpredictably|out of control)\b/i;
  var OP_RECOVERING_RE = /\b(?:recovering|recharging|regaining energy|restoring charges|cooldown is ending|recovering from overuse)\b/i;
  var OP_READY_RE = /\b(?:fully recharged|ready again|cooldown ends?|recovered enough to use|charges? restored|back to full power|operational again)\b/i;
  var OP_STRAINED_RE = /\b(?:strained|exhausted|drained|overheated|shaking from exertion|nosebleed|migraine|power fatigue)\b/i;

  var VARIANT_RE = /\b(?:echo state|second signature|altered variant|power variant|inverted form|corrupted form|mutated form|changed version|post-minute behavior|post-minute change|anomalous version|alternate manifestation)\b/i;
  var VARIANT_CLEAR_RE = /\b(?:returns?|reverts?|settles?)\s+(?:back\s+)?to\s+(?:(?:his|her|their|its|the)\s+)?(?:normal|baseline|original|usual)(?:\s+(?:state|form|behavior|behaviour|manifestation))?|\b(?:echo state|altered variant|power variant|second signature)\s+(?:ends?|fades?|stops?|deactivates?)\b/i;
  var ENV_REQUIRE_RE = /\b(?:requires?|only works? (?:in|under|while|when)|must be (?:in|under|near)|depends? on)\s+([^.!?;]{2,90})/i;
  var ENV_BOOST_RE = /\b(?:stronger|amplified|boosted|more powerful|more reliable)\s+(?:in|under|during|near|when)\s+([^.!?;]{2,90})/i;
  var ENV_WEAK_RE = /\b(?:weaker|diminished|reduced|less reliable|less powerful)\s+(?:in|under|during|near|when)\s+([^.!?;]{2,90})/i;
  var ENV_BLOCK_RE = /\b(?:fails?|doesn't work|does not work|cannot function|is blocked|is nullified)\s+(?:in|under|during|near|when)\s+([^.!?;]{2,90})/i;
  var ENV_TRIGGER_RE = /\b(?:activates?|triggers?|awakens?|turns on)\s+(?:in|under|during|near|when)\s+([^.!?;]{2,90})/i;

  var TECHNIQUE_RE = /\b(?:technique|move|maneuver|manoeuvre|signature move|named attack|named technique)\s*(?:called|named|:)?\s*["“']?([^.!?;"”']{2,70})/i;
  var RESOURCE_RE = /\b(?:uses?|consumes?|spends?|requires?|draws on|powered by)\s+(?:a finite amount of\s+)?([^.!?;]{2,80})\s+(?:as fuel|as a resource|per use|to activate|to function)?\b/i;
  var SIGNATURE_RE = /\b(?:signature|tell|power signature|sensory tell|visual tell|aura)\s*(?:is|:)?\s*([^.!?;]{2,100})/i;
  var TRAINING_RE = /\b(?:trains?|trained|practices?|practiced|studies?|studied|drills?|learned from|taught by|breakthrough|discovered how to)\b/i;
  var SYNERGY_RE = /\b(?:combines? with|synerg(?:y|izes?) with|works? together with|amplifies?|is amplified by|pairs? with)\b/i;
  var COLLATERAL_RE = /\b(?:collateral damage|damages? the surroundings|destroys? nearby|uncontrolled blast|friendly fire|spillover|area damage|loses? control and)\b/i;

  var PSYCHE_BELIEF_RE = /\b(?:believes?|thinks?|suspects?|assumes?|is convinced|is certain)\s+(?:that\s+)?([^.!?;]{3,180})/i;
  var PSYCHE_FEAR_RE = /\b(?:fears?|is afraid of|is terrified of|dreads?|worries? that|is scared of)\s+([^.!?;]{3,180})/i;
  var PSYCHE_GOAL_RE = /\b(?:wants? to|hopes? to|aims? to|seeks? to|intends? to|goal is to|determined to)\s+([^.!?;]{3,180})/i;
  var PSYCHE_PLAN_RE = /\b(?:plans? to|intends? to|is going to|has decided to|strategy is to)\s+([^.!?;]{3,180})/i;
  var PSYCHE_SECRET_RE = /\b(?:keeps? secret|hides?|conceals?|hasn't told|has not told|secretly knows?|secret is)\s+([^.!?;]{3,180})/i;
  var PSYCHE_VOW_RE = /\b(?:swears? (?:never )?to|promises? (?:never )?to|vows? (?:never )?to|refuses? to|will never)\s+([^.!?;]{3,180})/i;
  var PSYCHE_SELF_RE = /\b(?:sees? (?:himself|herself|themselves|yourself) as|thinks? of (?:himself|herself|themselves|yourself) as|believes? (?:he|she|they|you) (?:is|are) a)\s+([^.!?;]{2,120})/i;
  var PSYCHE_CONFLICT_RE = /\b(?:torn between|conflicted about|struggles? between|can't decide between|cannot decide between)\s+([^.!?;]{3,180})/i;
  var PSYCHE_REL_RE = /\b(?:trusts?|distrusts?|loves?|hates?|resents?|admires?|fears?|protects?|is loyal to|is protective of|depends on|cares about)\s+([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\b/i;
  var PSYCHE_POWER_ATT_RE = /\b(?:loves?|hates?|fears?|resents?|is ashamed of|is proud of|depends on|doesn't trust|does not trust|is tempted by)\s+(?:his|her|their|your|the)\s+(?:power|powers|ability|abilities)\b/i;
  var PSYCHE_RESOLVE_RE = /\b(?:no longer|stops? fearing|overcomes?|abandons? (?:the )?plan|changes? (?:his|her|their|your) mind|reveals? (?:the )?secret|breaks? (?:the )?vow|lets? go of|resolves? (?:the )?conflict)\b/i;
  var EMOTION_RE = /\b(?:angry|furious|afraid|fearful|terrified|sad|grieving|ashamed|guilty|proud|hopeful|desperate|calm|anxious|jealous|resentful|happy|elated|numb)\b/i;
  var EMOTION_POWER_CAUSAL_RE = /\b(?:becomes?|gets?|grows?|is)\s+(?:stronger|weaker|faster|slower|more powerful|less powerful|more stable|less stable|more precise|less precise)\s+(?:when|while|whenever|if)\s+([^.!?;]{2,80})|\b([^.!?;]{2,80})\s+(?:triggers?|activates?|strengthens?|weakens?|stabilizes?|destabilizes?)\s+(?:the\s+)?(?:power|ability)\b/i;

  var NAME_STOP = makeSet([
    "The","A","An","You","I","He","She","They","It","We","This","That","These","Those","His","Her","Their","Your","My","Our",
    "Suddenly","Then","Now","Later","Meanwhile","However","But","And","As","After","Before","When","While","If","Because","Despite","Inside","Outside",
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July","August","September","October","November","December",
    "Earth","Moon","Sun","North","South","East","West","Chapter","Scene","Story","Recent","World","Lore","Author","Note","Powers","Power","Ability","Abilities"
  ]);

  var NON_CHARACTER_SUBJECTS = makeSet(["time","sparks","bullets","arrows","debris","flames","flame","fire","smoke","wind","rain","snow","lightning","thunder","dust","water","light","darkness","energy","heat","cold","sound","blood"]);

  var LOCATION_WORDS = makeSet(["city","town","village","street","road","avenue","lane","country","kingdom","empire","planet","moon","station","school","academy","hospital","tower","building","forest","desert","mountain","river","lake","ocean","sea","island","base","headquarters","castle","palace","district","state","county"]);

  var TERM_INDEX = null;
  var FEAT_INDEX = null;

  function makeSet(arr) {
    var out = {};
    var i;
    for (i = 0; i < arr.length; i++) out[String(arr[i]).toLowerCase()] = 1;
    return out;
  }

  function lower(v) { return String(v == null ? "" : v).toLowerCase(); }
  function trim(v) { return String(v == null ? "" : v).replace(/^\s+|\s+$/g, ""); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function escRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function logDebug() {
    var st = getState(false);
    if (!st || !st.config || !st.config.debug) return;
    try {
      if (typeof console !== "undefined" && console.log) console.log.apply(console, arguments);
      else if (typeof log === "function") log(Array.prototype.join.call(arguments, " "));
    } catch (e) {}
  }

  function copyDefaults() {
    var o = {}, k;
    for (k in DEFAULTS) if (hasOwn(DEFAULTS, k)) o[k] = DEFAULTS[k];
    return o;
  }

  function currentActionCount() {
    try { if (typeof info !== "undefined" && info && typeof info.actionCount === "number") return info.actionCount; } catch (e) {}
    return -1;
  }

  function currentSourceId(st) { return st && st._sourceId ? st._sourceId : ""; }

  function recordWithProvenance(st, obj, source) {
    obj = obj || {};
    if (obj.turn == null) obj.turn = st ? st.turn : 0;
    if (obj.action == null) obj.action = (source === "storycard" || source === "author" || (st && st._sourceId && !st._processingSource)) ? -1 : currentActionCount();
    if (!obj.source && source) obj.source = source;
    if (!obj.sourceId && st && st._sourceId) obj.sourceId = st._sourceId;
    if (!obj.hookSource && st && st._processingSource) obj.hookSource = st._processingSource;
    return obj;
  }

  function deepClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
  }

  function resolvePlaceholdersText(textValue) {
    var t = String(textValue == null ? "" : textValue), arr, i, q, a;
    try { arr = (typeof state !== "undefined" && state && state.placeholders) ? state.placeholders : []; } catch (e) { arr = []; }
    if (!arr || !arr.length || t.indexOf("${") < 0) return t;
    for (i = 0; i < arr.length; i++) {
      q = String(arr[i] && arr[i].question || ""); a = String(arr[i] && arr[i].answer || "");
      if (!q) continue;
      t = t.replace(new RegExp("\\$\\{" + escRe(q) + "\\}", "g"), a);
    }
    return t;
  }

  function isHumanControlledName(name) {
    var q = lower(normalizeName(name)), i, names;
    if (q === "you") return true;
    try { names = (typeof info !== "undefined" && info && info.characterNames) ? info.characterNames : []; } catch (e) { names = []; }
    for (i = 0; i < names.length; i++) if (lower(normalizeName(names[i])) === q) return true;
    return false;
  }

  function removeActionHookFromArray(arr,action,hookSource){if(!arr)return;for(var i=arr.length-1;i>=0;i--){var r=arr[i];if(r&&r.action===action&&(r.hookSource===hookSource||(!r.hookSource&&r.source===hookSource)))arr.splice(i,1);}}

  function clearActionHookRecords(st,action,hookSource){
    var i,j,e,p,k,fields=["availability","accessMode","operationalState","operationalNote","activeVariant","activation","mastery","reliability","precision","control"];
    removeActionHookFromArray(st.pendingAttempts,action,hookSource);removeActionHookFromArray(st.recentEvents,action,hookSource);removeActionHookFromArray(st.interactions,action,hookSource);
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(!e)continue;
      if(e.psyche)for(k in e.psyche)if(hasOwn(e.psyche,k)){removeActionHookFromArray(e.psyche[k],action,hookSource);for(var pri=0;pri<e.psyche[k].length;pri++){var pr=e.psyche[k][pri];if(pr&&pr.resolvedAction===action){pr.status="active";delete pr.resolvedAction;delete pr.resolvedReason;}}}
      removeActionHookFromArray(e.defenses,action,hookSource);removeActionHookFromArray(e.vulnerabilities,action,hookSource);removeActionHookFromArray(e.contradictions,action,hookSource);removeActionHookFromArray(e.sourceRecords,action,hookSource);rebuildSourceStrings(e);
      if(e.forms)for(k in e.forms)if(hasOwn(e.forms,k)&&e.forms[k]){removeActionHookFromArray(e.forms[k].notes,action,hookSource);if(e.forms[k].firstAction===action&&(!e.forms[k].notes||!e.forms[k].notes.length))delete e.forms[k];}
      if(e.stateHistory)for(k in e.stateHistory)if(hasOwn(e.stateHistory,k)){removeActionHookFromArray(e.stateHistory[k],action,hookSource);restoreScalarFromHistory(e,k,k==="activeForm"?"":(k==="globalState"?"normal":""),Number.MAX_SAFE_INTEGER||9007199254740991);}
      for(j=e.powerOrder.length-1;j>=0;j--){p=e.powers[e.powerOrder[j]];if(!p)continue;var arrays=[p.evidence,p.feats,p.limits,p.costs,p.counters,p.conditions,p.scaleNotes,p.applications,p.links,p.techniques,p.variants,p.environmentRules,p.resources,p.signatures,p.training,p.synergies,p.collateral,p.structuredNotes,p.contradictions,p.sourceRecords];for(var ai=0;ai<arrays.length;ai++)removeActionHookFromArray(arrays[ai],action,hookSource);if(p.scale)for(k in p.scale)if(hasOwn(p.scale,k))removeActionHookFromArray(p.scale[k],action,hookSource);if(p.stateHistory)for(var fi=0;fi<fields.length;fi++)if(p.stateHistory[fields[fi]]){removeActionHookFromArray(p.stateHistory[fields[fi]],action,hookSource);restoreScalarFromHistory(p,fields[fi],defaultPowerScalar(fields[fi]),Number.MAX_SAFE_INTEGER||9007199254740991);}rebuildSourceStrings(p);p.successfulUses=0;p.partialUses=0;p.failedUses=0;for(k=0;k<p.feats.length;k++){if(p.feats[k].outcome==="success")p.successfulUses++;else if(p.feats[k].outcome==="partial")p.partialUses++;else if(p.feats[k].outcome==="failure")p.failedUses++;}recomputePowerScore(st,p);if(!p.evidence.length&&!powerHasDurableMetadata(p)){delete e.powers[p.id];e.powerOrder.splice(j,1);}}
    }
  }

  function reconcileSameActionRevision(st,source,textValue){
    if(!st||!st.config.dedupeByAction||(source!=="input"&&source!=="output"))return;var action=currentActionCount();if(action<0)return;var key=action+"|"+source,fp=lower(shortText(textValue,1200)),old=st.actionFingerprints[key],k;if(old&&old!==fp){clearActionHookRecords(st,action,source);for(k in st.processedActions)if(hasOwn(st.processedActions,k)&&k.indexOf(action+"|"+source+"|")===0)delete st.processedActions[k];}st.actionFingerprints[key]=fp;
  }

  function markProcessed(st, source, textValue) {
    if (!st || !st.config.dedupeByAction || source === "history" || source === "storycard") return false;
    if (!st.processedActions) st.processedActions = {};
    var action = currentActionCount(), actionKey = action >= 0 ? String(action) : ("na"+String(st.turn)+"h"+String(st.hookCount)), key = actionKey + "|" + source + "|" + lower(shortText(textValue, 260));
    if (st.processedActions[key]) return true;
    st.processedActions[key] = st.turn;
    var keys = [], k;
    for (k in st.processedActions) if (hasOwn(st.processedActions,k)) keys.push(k);
    if (keys.length > 80) {
      keys.sort(function(a,b){return st.processedActions[a]-st.processedActions[b];});
      while (keys.length > 60) { k=keys.shift(); delete st.processedActions[k]; }
    }
    return false;
  }

  function recomputePowerScore(st, p) {
    var i, score = 0;
    for (i = 0; i < (p.evidence || []).length; i++) score += Number(p.evidence[i].delta || 0);
    p.score = round2(clamp(score, -4, 12));
    updateStatus(st,p);
  }

  function trimTimelineArray(arr, action) {
    var i;
    if (!arr || !arr.length) return;
    for (i = arr.length - 1; i >= 0; i--) if (arr[i] && arr[i].action != null && arr[i].action >= 0 && arr[i].action > action) arr.splice(i,1);
  }

  function restoreScalarFromHistory(obj, field, fallback, action) {
    var h = obj && obj.stateHistory && obj.stateHistory[field], i;
    if (!h || !h.length) { obj[field] = fallback; return; }
    trimTimelineArray(h,action);
    if (!h.length) { obj[field] = fallback; return; }
    for (i=h.length-1;i>=0;i--) if (h[i]) { obj[field]=h[i].value; return; }
    obj[field]=fallback;
  }

  function setPowerState(st,p,field,value,reason,source) {
    if (!p.stateHistory) p.stateHistory = {};
    if (!p.stateHistory[field]) p.stateHistory[field] = [];
    var rec=recordWithProvenance(st,{value:value,reason:shortText(reason||"",160)},source||"narrative");
    pushBounded(p.stateHistory[field],rec,20,function(x){return String(x.action)+"|"+String(x.value)+"|"+String(x.reason);});
    p[field]=value;
    return value;
  }

  function setEntityState(st,e,field,value,reason,source) {
    if (!e.stateHistory) e.stateHistory={};
    if (!e.stateHistory[field]) e.stateHistory[field]=[];
    var rec=recordWithProvenance(st,{value:value,reason:shortText(reason||"",160)},source||"narrative");
    pushBounded(e.stateHistory[field],rec,20,function(x){return String(x.action)+"|"+String(x.value)+"|"+String(x.reason);});
    e[field]=value;
  }

  function rollbackTimeline(st, action) {
    var i,j,e,p,k,fields=["availability","accessMode","operationalState","operationalNote","activeVariant","activation","mastery","reliability","precision","control"];
    if (!st || !st.config.timelineAwareness || action < 0) return;
    trimTimelineArray(st.pendingAttempts,action); trimTimelineArray(st.recentEvents,action); trimTimelineArray(st.interactions,action);
    for (i=0;i<st.entityOrder.length;i++) {
      e=st.entities[st.entityOrder[i]]; if(!e) continue;
      trimPsycheTimeline(e,action);trimTimelineArray(e.defenses,action);trimTimelineArray(e.vulnerabilities,action);trimTimelineArray(e.contradictions,action);trimTimelineArray(e.sourceRecords,action);rebuildSourceStrings(e);
      for(var ef in e.forms)if(hasOwn(e.forms,ef)&&e.forms[ef]){trimTimelineArray(e.forms[ef].notes,action);if(e.forms[ef].firstAction!=null&&e.forms[ef].firstAction>=0&&e.forms[ef].firstAction>action)delete e.forms[ef];}
      if(e.stateHistory){restoreScalarFromHistory(e,"activeForm","",action);restoreScalarFromHistory(e,"globalState","normal",action);restoreScalarFromHistory(e,"globalStateNote","",action);}
      for(j=e.powerOrder.length-1;j>=0;j--){
        p=e.powers[e.powerOrder[j]]; if(!p) continue;
        trimTimelineArray(p.evidence,action);trimTimelineArray(p.feats,action);trimTimelineArray(p.limits,action);trimTimelineArray(p.costs,action);trimTimelineArray(p.counters,action);trimTimelineArray(p.conditions,action);trimTimelineArray(p.scaleNotes,action);trimTimelineArray(p.applications,action);trimTimelineArray(p.links,action);trimTimelineArray(p.techniques,action);trimTimelineArray(p.variants,action);trimTimelineArray(p.environmentRules,action);trimTimelineArray(p.resources,action);trimTimelineArray(p.signatures,action);trimTimelineArray(p.training,action);trimTimelineArray(p.synergies,action);trimTimelineArray(p.collateral,action);trimTimelineArray(p.structuredNotes,action);trimTimelineArray(p.contradictions,action);trimTimelineArray(p.sourceRecords,action);rebuildSourceStrings(p);
        if(p.scale){for(k in p.scale)if(hasOwn(p.scale,k))trimTimelineArray(p.scale[k],action);}
        for(k=0;k<fields.length;k++) if(p.stateHistory&&p.stateHistory[fields[k]]) restoreScalarFromHistory(p,fields[k],defaultPowerScalar(fields[k]),action);
        p.successfulUses=0;p.partialUses=0;p.failedUses=0;
        for(k=0;k<p.feats.length;k++){if(p.feats[k].outcome==="success")p.successfulUses++;else if(p.feats[k].outcome==="partial")p.partialUses++;else if(p.feats[k].outcome==="failure")p.failedUses++;}
        recomputePowerScore(st,p);
        if(!p.evidence.length&&!powerHasDurableMetadata(p)){delete e.powers[p.id];e.powerOrder.splice(j,1);}
      }
    }
    if(st.actionFingerprints)for(k in st.actionFingerprints)if(hasOwn(st.actionFingerprints,k)){var af=parseInt(String(k).split("|")[0],10);if(!isNaN(af)&&af>action)delete st.actionFingerprints[k];}
    if(st.processedActions)for(k in st.processedActions)if(hasOwn(st.processedActions,k)){var pa=parseInt(String(k).split("|")[0],10);if(!isNaN(pa)&&pa>action)delete st.processedActions[k];}
    st.lastActionCount=action;st.stats.rollbacks=(st.stats.rollbacks||0)+1;
    addEvent(st,"Timeline reconciled to action "+action,"rollback");
  }

  function defaultPowerScalar(field) {
    if(field==="availability") return "unknown";
    if(field==="accessMode") return "unknown";
    if(field==="operationalState") return "ready";
    if(field==="operationalNote") return "";
    if(field==="activeVariant") return "";
    if(field==="activation") return "unknown";
    if(field==="mastery") return "unknown";
    if(field==="reliability") return "unknown";
    if(field==="precision") return "unknown";
    if(field==="control") return 0;
    return "";
  }

  function reconcileActionCount(st) {
    if(!st || !st.config.timelineAwareness) return;
    var a=currentActionCount(); if(a<0) return;
    if(st.lastActionCount!=null && st.lastActionCount>=0 && a<st.lastActionCount) rollbackTimeline(st,a);
    st.lastActionCount=a;
  }

  function getState(create) {
    if (typeof state === "undefined") return null;
    if (!state[NS] && create !== false) {
      state[NS] = {
        engine: ENGINE_NAME,
        schema: 8,
        turn: 0,
        hookCount: 0,
        lastActionCount: -1,
        entities: {},
        entityOrder: [],
        focusEntity: "You",
        lastPowerByEntity: {},
        pendingAttempts: [],
        recentEvents: [],
        interactions: [],
        config: copyDefaults(),
        configSignature: "",
        configWarnings: [],
        storyCardSeeds: {},
        authoredSources: {},
        processedActions: {},
        actionFingerprints: {},
        lastCardSync: -999,
        bootstrapDone: false,
        stats: {sentences:0,powersCreated:0,ontologyCreated:0,feats:0,contradictions:0,rollbacks:0,psycheRecords:0,variants:0}
      };
    }
    return state[NS] || null;
  }

  function mergeDefaults(st) {
    var k,i,e,j,p;
    if (!st.config) st.config = copyDefaults();
    for (k in DEFAULTS) if (hasOwn(DEFAULTS, k) && st.config[k] == null) st.config[k] = DEFAULTS[k];
    if (!st.entities) st.entities = {};
    if (!st.entityOrder) st.entityOrder = [];
    if (!st.lastPowerByEntity) st.lastPowerByEntity = {};
    if (!st.pendingAttempts) st.pendingAttempts = [];
    if (!st.recentEvents) st.recentEvents = [];
    if (!st.interactions) st.interactions = [];
    if (!st.storyCardSeeds) st.storyCardSeeds = {};
    if (!st.authoredSources) st.authoredSources = {};
    if (!st.processedActions) st.processedActions = {};
    if (!st.actionFingerprints) st.actionFingerprints = {};
    if (!st.configWarnings) st.configWarnings = [];
    if (!st.stats) st.stats = {sentences:0,powersCreated:0,ontologyCreated:0,feats:0,contradictions:0,rollbacks:0,psycheRecords:0,variants:0};
    if (st.stats.ontologyCreated == null) st.stats.ontologyCreated = 0;
    if (st.stats.rollbacks == null) st.stats.rollbacks = 0;
    if (st.stats.psycheRecords == null) st.stats.psycheRecords = 0;
    if (st.stats.variants == null) st.stats.variants = 0;
    if (st.lastActionCount == null) st.lastActionCount = -1;
    st.schema = 8; st.engine = ENGINE_NAME;
    for(i=0;i<st.entityOrder.length;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      if(!e.aliases)e.aliases=[];if(!e.powers)e.powers={};if(!e.powerOrder)e.powerOrder=[];if(!e.defenses)e.defenses=[];if(!e.vulnerabilities)e.vulnerabilities=[];if(!e.forms)e.forms={};if(!e.stateHistory)e.stateHistory={};
      if(!e.sourceRecords){e.sourceRecords=[];for(var es=0;es<(e.sources||[]).length;es++)e.sourceRecords.push({text:e.sources[es],turn:0,action:-1,source:"legacy"});}
      ensurePsyche(e);
      for(j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]];if(p)ensurePowerDeepFields(p);}
    }
  }

  function findConfigCard() {
    if (typeof storyCards === "undefined" || !storyCards || !storyCards.length) return null;
    var i, c, keys, type, entry;
    for (i = 0; i < storyCards.length; i++) {
      c = storyCards[i] || {};
      keys = lower(c.keys);
      type = lower(c.type);
      entry = trim(c.entry);
      if (keys.indexOf("powers config") >= 0 || keys.indexOf("powers_config") >= 0 || type === "powers config" || /^\[?powers config\]?/i.test(entry)) return c;
    }
    return null;
  }

  function parseBoolean(v) {
    v = lower(trim(v));
    if (v === "true" || v === "on" || v === "yes" || v === "1") return true;
    if (v === "false" || v === "off" || v === "no" || v === "0") return false;
    return null;
  }

  function loadConfig(st) {
    var card = findConfigCard();
    if (!card) {
      if (st.configSignature) { st.config = copyDefaults(); st.configSignature = ""; st.configWarnings = []; }
      return;
    }
    var raw = String(card.entry || "");
    if (raw === st.configSignature) return;
    var lines = raw.replace(/;/g, "\n").split(/\n/), pairs=[], preset="custom";
    var i, m, rawKey, key, val, b, n, range, enumSet, cfg, warning;
    st.configWarnings=[];
    for (i = 0; i < lines.length; i++) {
      lines[i]=lines[i].replace(/\s+(?:#|\/\/).*$/," ");
      m = lines[i].match(/^\s*([A-Za-z][A-Za-z0-9_\- ]*)\s*[:=]\s*(.*?)\s*$/);
      if (!m) continue;
      rawKey=m[1]; key=canonicalConfigKey(rawKey); val=trim(m[2]);
      if(!key){st.configWarnings.push("Unknown config option: "+trim(rawKey));continue;}
      pairs.push({key:key,val:val});
      if(key==="configPreset"){var pv=lower(val);if(CONFIG_PRESETS[pv])preset=pv;else st.configWarnings.push("Invalid configPreset: "+val);}
    }
    cfg=applyConfigPreset(copyDefaults(),preset);
    for(i=0;i<pairs.length;i++){
      key=pairs[i].key;val=pairs[i].val;
      if(key==="configPreset"){if(CONFIG_PRESETS[lower(val)])cfg.configPreset=lower(val);continue;}
      if (BOOL_KEYS[key]) {
        b = parseBoolean(val); if (b != null) cfg[key] = b; else st.configWarnings.push("Invalid boolean for "+key+": "+val);
      } else if (NUM_KEYS[key]) {
        n = parseFloat(val); range = NUM_KEYS[key];
        if (!isNaN(n)) { n=clamp(n, range[0], range[1]); cfg[key]=INTEGER_CONFIG_KEYS[key]?Math.round(n):n; }
        else st.configWarnings.push("Invalid number for "+key+": "+val);
      } else if (CONFIG_ENUMS[key]) {
        enumSet = CONFIG_ENUMS[key]; val = lower(val);
        if (enumSet[val]) cfg[key] = val; else st.configWarnings.push("Invalid value for "+key+": "+pairs[i].val);
      }
    }
    st.config = normalizeConfig(cfg);
    st.configSignature = raw;
    if(st.configWarnings.length&&st.config.debug)logDebug("POWERS config warnings",st.configWarnings.join(" | "));
    logDebug("POWERS config loaded", JSON.stringify(st.config));
  }

  function init() {
    var st = getState(true);
    if (!st) return null;
    mergeDefaults(st);
    loadConfig(st);
    reconcileActionCount(st);
    seedEntitiesFromStoryCards(st);
    seedPowersFromStoryCards(st);
    seedPsycheFromStoryCards(st);
    return st;
  }

  function splitSentences(textValue) {
    var t = String(textValue || "").replace(/\r/g, "\n");
    var rough = t.match(/[^.!?\n]+[.!?]?/g) || [];
    var out = [], i, s;
    for (i = 0; i < rough.length; i++) {
      s = trim(rough[i]);
      if (!s) continue;
      if (s.length > 600) s = s.slice(0, 600);
      out.push(s);
      if (out.length >= 40) break;
    }
    return out;
  }

  function normalizeName(name) {
    name = trim(name).replace(/^["'“”‘’]+|["'“”‘’,:;.!?]+$/g, "");
    name = name.replace(/\s+/g, " ");
    name = name.replace(/[’']s$/i, "");
    return name;
  }

  function entityKey(name) { return lower(normalizeName(name)).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown"; }
  function powerKey(name) { return lower(name).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "custom_power"; }

  function isLikelyLocationName(name) {
    var words = lower(name).split(/\s+/), i;
    for (i = 0; i < words.length; i++) if (LOCATION_WORDS[words[i]]) return true;
    return false;
  }

  function cleanCandidateName(name) {
    name = normalizeName(name);
    name = name.replace(/^(?:and|but|then|while|when|as)\s+/i, "");
    if (!name || name.length > 60) return "";
    if (NAME_STOP[lower(name)]) return "";
    if (isLikelyLocationName(name)) return "";
    return name;
  }

  function rejectNewNonCharacterSubject(st,name){var k=entityKey(name);return !!(NON_CHARACTER_SUBJECTS[lower(normalizeName(name))]&&!st.entities[k]);}

  function getOrCreateEntity(st, name, kind) {
    name = normalizeName(resolvePlaceholdersText(name));
    if (!name) return null;
    if (lower(name) === "i" || lower(name) === "me" || lower(name) === "my" || lower(name) === "myself" || lower(name) === "you" || lower(name) === "your" || lower(name) === "yourself") name = "You";
    var key = entityKey(name), e = st.entities[key];
    if (!e) {
      e = st.entities[key] = {
        id:key,name:name,kind:kind || (name === "You" ? "player" : "character"),aliases:[],
        powers:{},powerOrder:[],defenses:[],vulnerabilities:[],forms:{},activeForm:"",
        globalState:"normal",globalStateNote:"",sources:[],sourceRecords:[],lastSeen:st.turn,mentions:0,contradictions:[],stateHistory:{}
      };
      ensurePsyche(e); st.entityOrder.push(key);
    } else if (name.length > e.name.length && lower(name).indexOf(lower(e.name)) >= 0 && e.name !== "You") {
      pushBounded(e.aliases,e.name,st.config.maxAliases,function(x){return lower(x);}); e.name=name;
    }
    e.lastSeen=st.turn;e.mentions+=1;return e;
  }

  function seedEntitiesFromStoryCards(st) {
    if (typeof storyCards === "undefined" || !storyCards) return;
    if (st.hookCount % 4 !== 0 && st.bootstrapDone) return;
    var i,c,type,keys,keyParts,rawFirst,first,e,ai,alias;
    for(i=0;i<storyCards.length && i<350;i++){
      c=storyCards[i]||{};type=lower(c.type);keys=resolvePlaceholdersText(String(c.keys||""));
      if(type.indexOf("character")<0&&type.indexOf("person")<0&&type.indexOf("npc")<0&&type.indexOf("creature")<0&&type.indexOf("companion")<0)continue;
      keyParts=keys.split(/[,;|]/);rawFirst=normalizeName(keyParts[0]);
      if(lower(rawFirst)==="you") first="You"; else first=cleanCandidateName(rawFirst);
      if(!first)continue;
      e=getOrCreateEntity(st,first,type.indexOf("creature")>=0?"creature":(first==="You"?"player":"character"));
      if(!e)continue;e.seededFromCard=true;
      for(ai=1;ai<keyParts.length&&ai<12;ai++){
        alias=cleanCandidateName(resolvePlaceholdersText(keyParts[ai]));
        if(alias&&lower(alias)!==lower(e.name))pushBounded(e.aliases,alias,st.config.maxAliases,function(x){return lower(x);});
      }
    }
  }

  function storyCardSourceKey(c,index) { return "card:" + String(c && c.id != null ? c.id : index); }

  function storyCardEntityName(keys,type) {
    keys=resolvePlaceholdersText(String(keys||""));
    var first=normalizeName(keys.split(/[,;|]/)[0]);
    first=first.replace(/^(?:powers canon|psyche canon|powers psyche canon)::/i,"");
    if(lower(first)==="you")return "You";
    return cleanCandidateName(first);
  }

  function removeAuthoredSource(st,sourceId) {
    var i,j,e,p,arrays,k;
    for(i=0;i<st.entityOrder.length;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      removePsycheSource(e,sourceId);removeRecordsBySource(e.defenses,sourceId);removeRecordsBySource(e.vulnerabilities,sourceId);removeRecordsBySource(e.contradictions,sourceId);removeRecordsBySource(e.sourceRecords,sourceId);rebuildSourceStrings(e);
      if(e.stateHistory){for(var esf in e.stateHistory)if(hasOwn(e.stateHistory,esf))removeRecordsBySource(e.stateHistory[esf],sourceId);restoreScalarFromHistory(e,"activeForm","",9007199254740991);restoreScalarFromHistory(e,"globalState","normal",9007199254740991);restoreScalarFromHistory(e,"globalStateNote","",9007199254740991);}
      for(var fk in e.forms)if(hasOwn(e.forms,fk)&&e.forms[fk]&&e.forms[fk].notes){removeRecordsBySource(e.forms[fk].notes,sourceId);if(!e.forms[fk].notes.length&&e.forms[fk].sourceId===sourceId)delete e.forms[fk];}
      for(j=e.powerOrder.length-1;j>=0;j--){
        p=e.powers[e.powerOrder[j]];if(!p)continue;
        arrays=[p.evidence,p.feats,p.limits,p.costs,p.counters,p.conditions,p.scaleNotes,p.applications,p.links,p.techniques,p.variants,p.environmentRules,p.resources,p.signatures,p.training,p.synergies,p.collateral,p.structuredNotes,p.contradictions,p.sourceRecords];
        for(k=0;k<arrays.length;k++)removeRecordsBySource(arrays[k],sourceId);
        if(p.scale){for(var sk in p.scale)if(hasOwn(p.scale,sk))removeRecordsBySource(p.scale[sk],sourceId);}
        if(p.stateHistory){for(var sf in p.stateHistory)if(hasOwn(p.stateHistory,sf))removeRecordsBySource(p.stateHistory[sf],sourceId);var rsf=["availability","accessMode","operationalState","operationalNote","activeVariant","activation","mastery","reliability","precision","control"];for(var rsi=0;rsi<rsf.length;rsi++)restoreScalarFromHistory(p,rsf[rsi],defaultPowerScalar(rsf[rsi]),9007199254740991);}
        rebuildSourceStrings(p);recomputePowerScore(st,p);
        if(!p.evidence.length&&!powerHasDurableMetadata(p)){delete e.powers[p.id];e.powerOrder.splice(j,1);}
      }
    }
  }

  function removeRecordsBySource(arr,sourceId){if(!arr)return;for(var i=arr.length-1;i>=0;i--)if(arr[i]&&arr[i].sourceId===sourceId)arr.splice(i,1);}
  function powerHasDurableMetadata(p){
    if(!p)return false;
    if((p.feats&&p.feats.length)||(p.limits&&p.limits.length)||(p.costs&&p.costs.length)||(p.counters&&p.counters.length)||(p.conditions&&p.conditions.length)||(p.scaleNotes&&p.scaleNotes.length)||(p.applications&&p.applications.length)||(p.links&&p.links.length)||(p.techniques&&p.techniques.length)||(p.variants&&p.variants.length)||(p.environmentRules&&p.environmentRules.length)||(p.resources&&p.resources.length)||(p.signatures&&p.signatures.length)||(p.training&&p.training.length)||(p.synergies&&p.synergies.length)||(p.collateral&&p.collateral.length)||(p.structuredNotes&&p.structuredNotes.length)||(p.contradictions&&p.contradictions.length)||(p.sourceRecords&&p.sourceRecords.length))return true;
    if(p.forms&&p.forms.length)return true;
    if(p.traits&&p.traits.length)return true;
    if(p.scale){for(var dk in p.scale)if(hasOwn(p.scale,dk)&&p.scale[dk]&&p.scale[dk].length)return true;}
    if(p.availability&&p.availability!=="unknown")return true;
    if(p.accessMode&&p.accessMode!=="unknown")return true;
    if(p.operationalState&&p.operationalState!=="ready")return true;
    if(p.activation&&p.activation!=="unknown")return true;
    if(p.mastery&&p.mastery!=="unknown")return true;
    if(p.reliability&&p.reliability!=="unknown")return true;
    if(p.precision&&p.precision!=="unknown")return true;
    if(Number(p.control||0)!==0)return true;
    return false;
  }

  function reconcileAuthoredCards(st,present) {
    if(!st.config.authoredReconciliation)return;
    var k;
    for(k in st.authoredSources)if(hasOwn(st.authoredSources,k)&&k.slice(-7)!==":psyche"&&!present[k]){removeAuthoredSource(st,k);delete st.authoredSources[k];delete st.storyCardSeeds[k];}
  }

  function reconcileAuthoredPsycheCards(st,present){
    if(!st.config.authoredReconciliation)return;var k;
    for(k in st.authoredSources)if(hasOwn(st.authoredSources,k)&&k.slice(-7)===":psyche"&&!present[k]){removePsycheSourceFromAll(st,k);delete st.authoredSources[k];delete st.storyCardSeeds[k];}
  }

  function splitPowerList(textValue){
    var raw=String(textValue||"").replace(/^\s*(?:powers?|abilities?)\s*:\s*/i,"").replace(/[.]+$/g,"");
    var parts=raw.split(/\s*,\s*|\s*;\s*|\s+and\s+/i),out=[],i,p;
    for(i=0;i<parts.length&&out.length<18;i++){p=trim(parts[i]).replace(/^(?:and|or)\s+/i,"");if(p&&p.length<=90)out.push(p);}
    return out;
  }

  function defForDeclaredPower(name){
    var d=findDefForApi(name); if(d) return d;
    return {id:"custom_"+powerKey(name),name:titleCasePhrase(name),cat:"custom",terms:[],feats:[],semantic:semanticFromName(name)};
  }

  function firstMeaningfulPower(powers){return powers&&powers.length?powers[0]:null;}

  function environmentKindFromText(value){if(ENV_BLOCK_RE.test(value)||/\b(?:blocked|fails?|cannot function|does not work|doesn't work)\b/i.test(value))return "block";if(ENV_BOOST_RE.test(value)||/\b(?:stronger|boosted|amplified)\b/i.test(value))return "boost";if(ENV_WEAK_RE.test(value)||/\b(?:weaker|diminished|reduced)\b/i.test(value))return "weaken";if(ENV_TRIGGER_RE.test(value)||/\b(?:triggers?|activates?|awakens?)\b/i.test(value))return "trigger";if(ENV_REQUIRE_RE.test(value)||/\b(?:requires?|only works?|depends? on|must be)\b/i.test(value))return "require";return "rule";}

  function attachStructuredMetadata(st,e,powers,label,value,sourceId){
    if(!st.config.authoredMetadata||!powers||!powers.length)return;
    label=lower(trim(label));value=trim(value);if(!value)return;
    var i,p,rec;
    for(i=0;i<powers.length;i++){
      p=powers[i];ensurePowerDeepFields(p);
      if(label==="function"||label==="mechanics"||label==="mechanical function"){
        pushBounded(p.structuredNotes,recordWithProvenance(st,{kind:"function",text:shortText(value,220)},"storycard"),st.config.maxNotesPerPower,function(x){return x.kind+"|"+lower(x.text);});
      }else if(label.indexOf("activation")>=0||label.indexOf("control method")>=0){
        pushBounded(p.structuredNotes,recordWithProvenance(st,{kind:"activation detail",text:shortText(value,180)},"storycard"),st.config.maxNotesPerPower,function(x){return x.kind+"|"+lower(x.text);});
        setPowerState(st,p,"activation",shortText(value,90),value,"storycard");
      }else if(label.indexOf("signature")>=0||label.indexOf("tell")>=0){
        recordSignature(st,p,value,"storycard");
      }else if(label.indexOf("technique")>=0||label.indexOf("move")>=0){
        recordTechnique(st,p,value,"storycard");
      }else if(label.indexOf("reliability")>=0||label.indexOf("precision")>=0){
        detectReliabilityPrecisionFromText(st,p,value,"storycard");
      }else if(label.indexOf("limitation")>=0||label==="limit"||label.indexOf("cannot do")>=0){
        pushBounded(p.limits,recordWithProvenance(st,{text:shortText(value,190)},"storycard"),st.config.maxNotesPerPower,function(x){return lower(x.text);});
      }else if(label.indexOf("environment")>=0||label.indexOf("condition")>=0){
        recordEnvironmentRule(st,p,environmentKindFromText(value),value,"storycard");
      }else if(label.indexOf("cost")>=0||label.indexOf("drawback")>=0){
        pushBounded(p.costs,recordWithProvenance(st,{text:shortText(value,190)},"storycard"),st.config.maxNotesPerPower,function(x){return lower(x.text);});
      }else if(label.indexOf("resource")>=0||label.indexOf("fuel")>=0){
        recordResource(st,p,value,"storycard");
      }else if(label.indexOf("feat")>=0||label.indexOf("demonstrated")>=0){
        addFeat(st,e,p,value,"success","storycard");
      }else if(label.indexOf("white minute anomaly")>=0||label.indexOf("post-minute")>=0||label.indexOf("variant")>=0||label.indexOf("echo state")>=0){
        recordVariant(st,p,"Echo/altered state",value,"storycard");
      }else if(label.indexOf("access")>=0||label.indexOf("ownership")>=0){
        detectAccessModeText(st,p,value,"storycard");
      }else if(label.indexOf("source")>=0||label.indexOf("origin")>=0){
        recordPowerSource(st,e,p,"via "+shortText(value,80),"storycard");
      }else if(label.indexOf("training")>=0){
        recordTraining(st,p,value,"storycard");
      }else if(label.indexOf("operational")>=0||label.indexOf("readiness")>=0){
        detectOperationalText(st,p,value,"storycard");
      }
    }
  }

  function seedPowersFromStoryCards(st) {
    if (typeof storyCards === "undefined" || !storyCards) return;
    var present={},i,c,type,keys,entry,sourceId,sig,first,e,lines,li,line,m,list,j,d,p,declared=[],sentences,k,sentence,mentioned;
    for(i=0;i<storyCards.length&&i<350;i++){
      c=storyCards[i]||{};type=lower(c.type);keys=resolvePlaceholdersText(String(c.keys||""));entry=resolvePlaceholdersText(String(c.entry||""));
      if(!entry)continue;
      if(type==="powers"||type==="powers psyche"||type==="powers config"||lower(keys).indexOf("powers config")>=0)continue;
      if(type.indexOf("character")<0&&type.indexOf("person")<0&&type.indexOf("npc")<0&&type.indexOf("creature")<0&&type!=="powers canon")continue;
      sourceId=storyCardSourceKey(c,i);present[sourceId]=1;sig=sourceId+"|"+keys+"|"+entry;
      if(st.storyCardSeeds[sourceId]===sig)continue;
      if(st.storyCardSeeds[sourceId]&&st.config.authoredReconciliation)removeAuthoredSource(st,sourceId);
      st.storyCardSeeds[sourceId]=sig;st.authoredSources[sourceId]=1;st._sourceId=sourceId;
      first=storyCardEntityName(keys,type);if(!first){st._sourceId="";continue;}
      e=getOrCreateEntity(st,first,type.indexOf("creature")>=0?"creature":(first==="You"?"player":"character"));if(!e){st._sourceId="";continue;}

      lines=entry.replace(/\r/g,"\n").split(/\n|(?<=\.)\s+(?=[A-Z][A-Za-z /-]{1,40}:)/);
      declared=[];
      for(li=0;li<lines.length;li++){
        line=trim(lines[li]);if(!line)continue;
        m=line.match(/^\s*(?:powers?|abilities?)\s*:\s*(.+)$/i);
        if(m){
          list=splitPowerList(m[1]);
          for(j=0;j<list.length;j++){
            d=defForDeclaredPower(list[j]);p=getOrCreatePower(st,e,d);declared.push(p);
            addEvidence(st,e,p,st.config.explicitScore,"authored canon",line,"storycard");
            setPowerState(st,p,"availability","available","Authored Story Card establishes access","storycard");
          }
          continue;
        }
        m=line.match(/^\s*([A-Za-z][A-Za-z /_-]{1,45})\s*:\s*(.+)$/);
        if(m&&declared.length){attachStructuredMetadata(st,e,declared,m[1],m[2],sourceId);continue;}
      }

      // If no compact Powers: field exists, process authored prose conservatively.
      if(!declared.length){
        sentences=splitSentences(entry);
        for(k=0;k<sentences.length;k++){
          sentence=sentences[k];
          if((NEGATED_ABILITY_RE.test(sentence)||authoredNonOwnershipSentence(sentence))&&!pureClaimCue(sentence))continue;
          mentioned=processMentionedPowers(st,sentence,"storycard",e);
          if(mentioned.length){for(j=0;j<mentioned.length;j++)if(mentioned[j].availability==="unknown")setPowerState(st,mentioned[j],"availability","available","Authored lore","storycard");}
          detectLimitsCosts(st,e,sentence,mentioned);detectScale(st,e,sentence,mentioned);detectFormBinding(st,e,sentence,mentioned);detectDefense(st,e,sentence);detectApplications(st,e,sentence,mentioned,"storycard");detectTraitsActivation(st,e,sentence,mentioned);detectAccessModes(st,e,sentence,mentioned,"storycard");detectDeepPowerMetadata(st,e,sentence,mentioned,"storycard");
        }
      } else {
        // Descriptive prose enriches the parent powers; do not mine every noun as a new ability.
        sentences=splitSentences(entry);
        for(k=0;k<sentences.length;k++){
          sentence=sentences[k];
          if(/^\s*(?:powers?|abilities?)\s*:/i.test(sentence))continue;
          if(/^\s*[A-Za-z][A-Za-z /_-]{1,45}\s*:/i.test(sentence))continue;
          detectLimitsCosts(st,e,sentence,declared);detectScale(st,e,sentence,declared);detectFormBinding(st,e,sentence,declared);detectDefense(st,e,sentence);detectTraitsActivation(st,e,sentence,declared);detectAccessModes(st,e,sentence,declared,"storycard");detectDeepPowerMetadata(st,e,sentence,declared,"storycard");
        }
      }
      st._sourceId="";
    }
    reconcileAuthoredCards(st,present);
  }

  function knownEntityInSentence(st, sentence) {
    var low = lower(sentence), best = null, i, e, nm, aliases, j;
    for (i = 0; i < st.entityOrder.length; i++) {
      e = st.entities[st.entityOrder[i]]; if (!e) continue;
      nm = lower(e.name);
      if (nm && new RegExp("(?:^|[^a-z0-9])" + escRe(nm) + "(?:$|[^a-z0-9])", "i").test(low)) {
        if (!best || e.name.length > best.name.length) best = e;
      }
      aliases = e.aliases || [];
      for (j = 0; j < aliases.length; j++) {
        if (new RegExp("(?:^|[^a-z0-9])" + escRe(lower(aliases[j])) + "(?:$|[^a-z0-9])", "i").test(low)) { best = e; break; }
      }
    }
    return best;
  }

  function resolvePronoun(st, token, source) {
    token = lower(token);
    if (token === "you" || token === "your" || token === "yourself") return getOrCreateEntity(st, "You", "player");
    if ((token === "i" || token === "me" || token === "my" || token === "myself") && source === "input") return getOrCreateEntity(st, "You", "player");
    if (token === "he" || token === "she" || token === "they" || token === "him" || token === "her" || token === "them" || token === "his" || token === "their") {
      return st.entities[entityKey(st.focusEntity || "")] || null;
    }
    return null;
  }

  function sentenceHasPowerSignal(st,sentence){
    if(strongPowerContext(sentence)||uniqueDefsFromTerms(sentence).length||uniqueDefsFromFeats(sentence).length)return true;
    if(st&&st.config&&st.config.ontologyDetection&&(uniqueDefsFromNaturalMechanics(sentence).length||uniqueDefsFromOntology(sentence).length))return true;
    return false;
  }

  function embeddedPowerActor(st,sentence,source) {
    if(!sentenceHasPowerSignal(st,sentence))return null;
    var re=/\b([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(?=(?:can\s+|could\s+|uses?\s+|used\s+|activates?\s+|activated\s+|unleashes?\s+|channels?\s+|casts?\s+|wields?\s+|teleports?\b|flies\b|phases?\b|regenerates?\b|controls?\b|manipulates?\b|generates?\b|creates?\b|summons?\b|projects?\b|transforms?\b|heals?\b|absorbs?\b|copies\b|nullifies?\b|blocks?\b|deflects?\b|stops?\b|freezes?\b|bends?\b|redirects?\b))/g,m,candidate=null,pre,name;
    while((m=re.exec(sentence))!==null){
      pre=sentence.slice(Math.max(0,m.index-55),m.index);
      if(/(?:['’]s\s*)$/i.test(pre))continue; // "Mara's Force Field blocks...": Force Field is not a person.
      if(/\b(?:technique|move|maneuver|manoeuvre|spell|attack|application)\s+(?:called|named)\s*$/i.test(pre))continue;
      name=cleanCandidateName(m[1]);if(!name||rejectNewNonCharacterSubject(st,name))continue;
      candidate=getOrCreateEntity(st,name,"character");
    }
    return candidate;
  }

  function extractSubjectEntity(st, sentence, source) {
    var m, token, e;
    // Possessive named-power phrasing: "Mara's Force Field blocks...".
    // Resolve the possessor before the power title can be mistaken for a person.
    m=sentence.match(/^\s*>?\s*([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})['’]s\s+/);
    if(m&&sentenceHasPowerSignal(st,sentence)){token=cleanCandidateName(m[1]);if(token&&!rejectNewNonCharacterSubject(st,token))return getOrCreateEntity(st,token,"character");}
    e=embeddedPowerActor(st,sentence,source); if(e)return e;
    var verbCue = "(?:try\\b|tries\\b|attempt\\b|attempts\\b|can\\b|could\\b|is able to\\b|has\\b|possesses\\b|uses\\b|used\\b|wields?\\b|activates?\\b|unleashes?\\b|channels?\\b|invokes?\\b|casts?\\b|fires?\\b|flies\\b|teleports?\\b|transforms?\\b|phases?\\b|regenerates?\\b|controls?\\b|summons?\\b|projects?\\b|creates?\\b|generates?\\b|absorbs?\\b|copies\\b|nullifies\\b|manipulates?\\b|bends?\\b|freezes?\\b|stops?\\b|reads?\\b|heals?\\b)";

    // Pronouns are handled separately so case-insensitive matching never makes
    // a lowercase verb look like part of a Proper Name.
    m = sentence.match(/^\s*>?\s*(I|You|He|She|They)\s+/i);
    if (m && new RegExp("^\\s*>?\\s*" + escRe(m[1]) + "\\s+" + verbCue, "i").test(sentence)) {
      e = resolvePronoun(st, m[1], source); if (e) return e;
    }

    // Proper-name subject. This portion is deliberately case-sensitive.
    m = sentence.match(/^\s*>?\s*([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+/);
    if (m && new RegExp("^\\s*>?\\s*" + escRe(m[1]) + "\\s+" + verbCue, "i").test(sentence) && sentenceHasPowerSignal(st,sentence)) {
      token = cleanCandidateName(m[1]); if (token&&!rejectNewNonCharacterSubject(st,token)) return getOrCreateEntity(st, token, "character");
    }

    // Possessive power phrasing: "Mara's power...", "his ability...".
    m = sentence.match(/\b(I|You|He|She|They|His|Her|Their|Your|My)['’]?s?\s+(?:power|powers|ability|abilities|gift|gifts)\b/i);
    if (m) { e = resolvePronoun(st, m[1], source); if (e) return e; }
    m = sentence.match(/\b([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})['’]s\s+(?:power|powers|ability|abilities|gift|gifts)\b/);
    if (m) { token = cleanCandidateName(m[1]); if (token) return getOrCreateEntity(st, token, "character"); }

    e = knownEntityInSentence(st, sentence);
    if (e) return e;
    // If the sentence is power-relevant and has only a pronoun, resolve it to
    // the most recently focused character rather than inventing a new entity.
    if (GENERIC_ABILITY_HINT_RE.test(sentence) || uniqueDefsFromTerms(sentence).length || (st.config.ontologyDetection && (ONTOLOGY_POWER_ENDING_RE.test(sentence) || ONTOLOGY_SUFFIX_WORD_RE.test(sentence))) || /\b(power|powers|ability|abilities|superhuman|supernatural)\b/i.test(sentence)) {
      m = sentence.match(/\b(he|she|they|him|her|them|his|their)\b/i);
      if (m) { e = resolvePronoun(st,m[1],source); if(e) return e; }
    }
    return null;
  }

  function candidateNamesFromPowerSentence(st, sentence, source) {
    var out = [], subject = extractSubjectEntity(st, sentence, source), m, name;
    if (subject) out.push(subject);
    if (out.length) return out;
    if (!sentenceHasPowerSignal(st,sentence)) return out;
    m = sentence.match(/\b([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\b/);
    if (m) {
      name = cleanCandidateName(m[1]);
      if (name&&!rejectNewNonCharacterSubject(st,name)) out.push(getOrCreateEntity(st, name, "character"));
    }
    return out;
  }

  function buildIndexes() {
    installExtendedAtlas();
    if (TERM_INDEX) return;
    TERM_INDEX = []; FEAT_INDEX = [];
    var i, j, d;
    for (i = 0; i < POWER_DEFS.length; i++) {
      d = POWER_DEFS[i];
      for (j = 0; j < d.terms.length; j++) TERM_INDEX.push({term:lower(d.terms[j]), def:d});
      for (j = 0; j < d.feats.length; j++) FEAT_INDEX.push({term:lower(d.feats[j]), def:d});
    }
    TERM_INDEX.sort(function(a,b){ return b.term.length - a.term.length; });
    FEAT_INDEX.sort(function(a,b){ return b.term.length - a.term.length; });
  }

  function containsIndexedTerm(lowText, term) {
    // Avoid matching short power words inside unrelated words (e.g. "fly" in "butterfly").
    var re = new RegExp("(?:^|[^a-z0-9])" + escRe(term) + "(?:$|[^a-z0-9])", "i");
    return re.test(lowText);
  }

  function uniqueDefsFromTerms(sentence) {
    buildIndexes();
    var low = lower(sentence), found = {}, out = [], i, x;
    for (i = 0; i < TERM_INDEX.length; i++) {
      x = TERM_INDEX[i];
      if (containsIndexedTerm(low, x.term) && !found[x.def.id]) { found[x.def.id] = 1; out.push(x.def); }
    }
    return out;
  }

  function uniqueDefsFromFeats(sentence) {
    buildIndexes();
    var low = lower(sentence), found = {}, out = [], i, x;
    for (i = 0; i < FEAT_INDEX.length; i++) {
      x = FEAT_INDEX[i];
      if (containsIndexedTerm(low, x.term) && !found[x.def.id]) { found[x.def.id] = 1; out.push(x.def); }
    }
    return out;
  }

  function canonicalDefByName(name){
    var q=lower(trim(name)),i,d,j;buildIndexes();
    for(i=0;i<POWER_DEFS.length;i++){d=POWER_DEFS[i];if(lower(d.name)===q)return d;for(j=0;j<(d.terms||[]).length;j++)if(lower(d.terms[j])===q)return d;}
    return ontologyPowerDefFromName(name);
  }

  var SAFE_NATURAL_POWER_DOMAIN_RE = /^(?:fire|flame|water|air|wind|earth|stone|rock|metal|glass|ice|snow|electricity|lightning|plasma|light|darkness|shadow|gravity|time|space|spacetime|probability|luck|energy|force|momentum|kinetic energy|heat|cold|temperature|sound|vibration|blood|bone|flesh|plants?|vines?|wood|smoke|sand|dust|crystals?|magnetism|radiation|matter|antimatter|atoms?|molecules?|dreams?|memories?|memory|emotions?|fear|souls?|spirits?|weather|clouds?|storms?|gravity fields?|vectors?|motion)$/i;
  var GENERIC_MECHANIC_NAME_RE = /^(?:manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|constructs?|transmutation|restoration|regeneration|healing|inducement|infusion|augmentation|enhancement|evolution|adaptation|transformation|shapeshifting|transportation|teleportation|control|mastery|magic|science|combat|boundary|interaction|intangibility|invisibility|storage|exchange|conversion|fusion|separation|connection|awareness|vision|sense)$/i;

  function strongPowerContext(sentence){return /\b(?:power|powers|ability|abilities|superpower|superpowers|supernatural|magic|magical|psychic|psionic|mutation|mutant|gifted|powered)\b/i.test(sentence);}

  function naturalMechanicDomain(raw){
    raw=trim(raw||"").replace(/^(?:(?:the|a|an)\s+)?(?:existing|nearby|surrounding|ambient|available)\s+/i,"");
    raw=raw.replace(/^(?:the|a|an)\s+/i,"");
    raw=raw.replace(/\b(?:with|using|but|although|though|while|however|except|unless|when|if|after|before|without|into|onto|from|toward|towards|through|around|across|against|at|to|for|on|over|under|near|inside|outside|upon|off|as)\b.*$/i,"");
    raw=raw.replace(/[^A-Za-z0-9'’ -].*$/,"").replace(/\s+/g," ");
    if(raw.split(/\s+/).length>5)return"";
    if(/^(?:it|them|him|her|this|that|things?|objects?|something|anything|everything)$/i.test(raw))return"";
    return trim(raw);
  }

  function uniqueDefsFromNaturalMechanics(sentence){
    var out=[],seen={},patterns=[
      {re:/\b(?:can\s+|could\s+|is able to\s+)?(?:manipulat(?:e|es|ed|ing)|control(?:s|led|ling)?|bend(?:s|ing)?|shap(?:e|es|ed|ing))\s+([^,.!?;]{2,55})/gi,suffix:" Manipulation"},
      {re:/\b(?:can\s+|could\s+|is able to\s+)?(?:generat(?:e|es|ed|ing)|produc(?:e|es|ed|ing)|emit(?:s|ted|ting)?)\s+([^,.!?;]{2,55})/gi,suffix:" Generation"},
      {re:/\b(?:can\s+|could\s+|is able to\s+)?(?:creat(?:e|es|ed|ing)|materializ(?:e|es|ed|ing)|conjur(?:e|es|ed|ing)|construct(?:s|ed|ing)?)\s+([^,.!?;]{2,55})/gi,suffix:" Creation"}
    ],i,m,domain,name,d;
    for(i=0;i<patterns.length;i++){patterns[i].re.lastIndex=0;while((m=patterns[i].re.exec(sentence))!==null&&out.length<6){
      var pre=sentence.slice(Math.max(0,m.index-18),m.index+m[0].indexOf(m[1]));
      if(/\b(?:cannot|can't|cant|unable to|could not|couldn't|never)\s*$/i.test(pre))continue;
      domain=naturalMechanicDomain(m[1]);if(!domain)continue;
      name=titleCasePhrase(domain)+patterns[i].suffix;d=canonicalDefByName(name);
      if(d&&d.ontology&&!SAFE_NATURAL_POWER_DOMAIN_RE.test(domain)&&!strongPowerContext(sentence))continue;
      if(!seen[d.id]){seen[d.id]=1;out.push(d);}
    }}
    return out;
  }

  function titleCasePhrase(s) {
    s = trim(s).replace(/[,.!?;:].*$/, "").replace(/\s+/g, " ");
    if (s.length > 64) s = s.slice(0, 64);
    var words = s.split(" "), i;
    for (i = 0; i < words.length; i++) if (words[i]) words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    return words.join(" ");
  }

  function extractCustomAbility(sentence, detectionMode) {
    var m,p,explicit=false;
    m=sentence.match(/\b(?:power|ability|gift)\s+(?:is\s+)?(?:called|named)\s+["“']?([^.!?;"”']{2,80})/i); if(m)explicit=true;
    if(!m){m=sentence.match(/\b(?:power|ability|gift)\s*:\s*(?:can\s+)?([^.!?;]{3,90})/i);if(m)explicit=true;}
    if(!m){m=sentence.match(/\b(?:power|ability|gift)\s+(?:is|allows? (?:him|her|them|you) to|lets? (?:him|her|them|you))\s+([^.!?;]{3,90})/i);if(m)explicit=true;}
    if(!m){m=sentence.match(/\b(?:has|possesses)\s+(?:the\s+)?(?:power|ability|gift)\s+to\s+([^.!?;]{3,90})/i);if(m)explicit=true;}
    if(!m&&detectionMode!=="conservative")m=sentence.match(/\b(?:can|is able to)\s+([^.!?;]{3,80})/i);
    if(!m)return null;
    p=trim(m[1]).replace(/\b(?:but|although|though|however)\b.*$/i,"");
    if(!explicit&&!GENERIC_ABILITY_HINT_RE.test(p)&&!ONTOLOGY_POWER_ENDING_RE.test(p)&&!ONTOLOGY_SUFFIX_WORD_RE.test(p))return null;
    if(/^(?:only\s+)?(?:remain|stay|keep|continue|see|hear|say|speak|walk|run|eat|drink|sleep|think|know|remember)\b/i.test(p)&&!GENERIC_ABILITY_HINT_RE.test(p))return null;
    if(!explicit&&/^(?:create|generate|control|manipulate)\b/i.test(p)){var nd=naturalMechanicDomain(p.replace(/^(?:create|generate|control|manipulate)\s+(?:his|her|their|your)?\s*/i,""));if(nd&&!SAFE_NATURAL_POWER_DOMAIN_RE.test(nd)&&!strongPowerContext(sentence))return null;}
    p=p.replace(/^(?:use|create|generate|control|manipulate)\s+(?:his|her|their|your)?\s*/i,function(x){return trim(x);});
    if(p.length<3)return null;
    return {id:"custom_"+powerKey(p),name:titleCasePhrase(p),cat:"custom",terms:[],feats:[],semantic:semanticFromName(p)};
  }

  function semanticFromName(name) {
    var low=lower(name), mechanics=[], cat="custom", tier="unspecified", i, domain=trim(name), meta=false;
    for(i=0;i<ONTOLOGY_MECHANICS.length;i++) if(ONTOLOGY_MECHANICS[i].re.test(name)) { mechanics.push(ONTOLOGY_MECHANICS[i].key); if(cat==="custom") cat=ONTOLOGY_MECHANICS[i].cat; }
    if(/\bpeak\b/i.test(name)) tier="peak";
    else if(/\benhanced|superhuman|superior\b/i.test(name)) tier="enhanced";
    else if(/\bsupernatural\b/i.test(name)) tier="supernatural";
    else if(/\btranscendent\b/i.test(name)) tier="transcendent";
    else if(/\babsolute\b/i.test(name)) tier="absolute";
    else if(/\balmighty|omni(?:potent|potence)?\b/i.test(name)) tier="almighty/omni";
    domain=domain.replace(/^(?:absolute|almighty|omni(?:potent|potence)?|transcendent|boundless|ultimate|infinite|primordial|supreme|peak|enhanced|superhuman|supernatural|superior)\s+/i,"");
    domain=domain.replace(/\s+(?:manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|constructs?|transmutation|restoration|regeneration|healing|inducement|infusion|augmentation|enhancement|evolution|adaptation|transformation|shapeshifting|transportation|teleportation|control|mastery|magic|science|combat|boundary|interaction|intangibility|invisibility|storage|exchange|conversion|fusion|separation|connection|awareness|vision|sense)$/i,"");
    if(/(?:kinesis|mancy|pathy|portation|morphism)$/i.test(domain)) domain=domain.replace(/(?:kinesis|mancy|pathy|portation|morphism)$/i,"");
    domain=trim(domain);
    if(!domain || domain.length>70) domain="unspecified";
    meta=/\b(power|powers|ability|abilities|superpower|supernatural power|magic manipulation)\b/i.test(name);
    return {domain:domain, mechanics:mechanics, category:cat, tier:tier, highTier:HIGH_TIER_RE.test(name), meta:meta};
  }

  function ontologyPowerDefFromName(name) {
    name=titleCasePhrase(name);
    var sem=semanticFromName(name), i, j, d, q=lower(name);
    // Prefer an existing curated family when the ontology phrase is already a
    // known canonical name/term. This prevents Fire Manipulation + pyrokinesis
    // from becoming two separate records for the same demonstrated ability.
    for(i=0;i<POWER_DEFS.length;i++) {
      d=POWER_DEFS[i];
      if(lower(d.name)===q) return d;
      for(j=0;j<d.terms.length;j++) if(lower(d.terms[j])===q) return d;
    }
    return {id:"ontology_"+powerKey(name), name:name, cat:sem.category||"custom", terms:[], feats:[], semantic:sem, ontology:true};
  }

  function cleanOntologyCandidate(raw) {
    raw=trim(raw).replace(/^[\s:;,.-]+|[\s:;,.-]+$/g,"");
    raw=raw.replace(/^(?:[A-Z][A-Za-z0-9'’.-]{1,40}[’']s)\s+/i,"");
    raw=raw.replace(/^(?:you|i|he|she|they|we|it|[A-Z][A-Za-z0-9'’.-]{1,40})\s+(?:can|could|may|might|will|would)\s+/i,"");
    var parts=raw.split(/\s+/),i,cut=-1;
    var cues={"has":1,"have":1,"had":1,"uses":1,"use":1,"used":1,"with":1,"wields":1,"wield":1,"unleashes":1,"unleash":1,"activates":1,"activate":1,"channels":1,"channel":1,"possesses":1,"possess":1,"is":1,"are":1,"called":1,"named":1,"power":1,"ability":1,"powers":1,"abilities":1};
    for(i=0;i<parts.length-1;i++)if(cues[lower(parts[i])])cut=i;
    if(cut>=0)parts=parts.slice(cut+1);
    while(parts.length&&/^(?:the|a|an|his|her|their|your|my|its|this|that)$/i.test(parts[0]))parts.shift();
    if(parts.length>7)parts=parts.slice(parts.length-7);
    raw=trim(parts.join(" "));
    if(!raw||/^(?:power|ability|powers|abilities)$/i.test(raw))return "";
    return raw;
  }

  function uniqueDefsFromOntology(sentence) {
    var out=[], seen={}, re, m, raw, def, low=lower(sentence), i;
    if(!ONTOLOGY_POWER_ENDING_RE.test(sentence) && !ONTOLOGY_SUFFIX_WORD_RE.test(sentence) && !/\b(omnipotence|omniscience|omnipresence|psionics|magic|superpowers?)\b/i.test(sentence)) return out;
    re=/\b((?:(?:absolute|almighty|omni(?:potent|potence)?|transcendent|boundless|ultimate|infinite|primordial|supreme|peak|enhanced|superhuman|supernatural|superior|divine|cosmic|magical|psychic|psionic|quantum|dimensional)\s+){0,2}(?:[A-Za-z0-9][A-Za-z0-9'’.-]*\s+){0,6}(?:manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|constructs?|transmutation|restoration|regeneration|healing|inducement|infusion|augmentation|enhancement|evolution|adaptation|transformation|shapeshifting|transportation|teleportation|control|mastery|magic|science|combat|boundary|interaction|intangibility|invisibility|storage|exchange|conversion|fusion|separation|connection|awareness|vision|sense))\b/gi;
    while((m=re.exec(sentence))!==null && out.length<6) {
      raw=cleanOntologyCandidate(m[1]);
      if(!raw || raw.split(/\s+/).length>7) continue;
      if(/^(?:normal|human|ordinary|social|story|recent|current)\s+(?:power|ability)/i.test(raw)) continue;
      if(/^(?:immune|resistant|vulnerable|weak|susceptible)\s+(?:to|against)\b/i.test(raw)||/\b(?:resistance|immunity|vulnerability|weakness)\s+(?:to|against)\b/i.test(raw))continue;
      if(GENERIC_MECHANIC_NAME_RE.test(raw)&&!strongPowerContext(sentence))continue;
      def=ontologyPowerDefFromName(raw);
      if(!seen[def.id]) { seen[def.id]=1; out.push(def); }
    }
    re=/\b([A-Za-z][A-Za-z'’.-]{2,45}(?:kinesis|mancy|pathy|portation|morphism))\b/gi;
    while((m=re.exec(sentence))!==null && out.length<8) {
      raw=cleanOntologyCandidate(m[1]); if(!raw) continue;
      def=ontologyPowerDefFromName(raw); if(!seen[def.id]) { seen[def.id]=1; out.push(def); }
    }
    if(/\bomnipotence\b/i.test(sentence)) {def=ontologyPowerDefFromName("Omnipotence"); if(!seen[def.id]) out.push(def);}
    if(/\bomniscience\b/i.test(sentence)) {def=ontologyPowerDefFromName("Omniscience"); if(!seen[def.id]) out.push(def);}
    if(/\bomnipresence\b/i.test(sentence)) {def=ontologyPowerDefFromName("Omnipresence"); if(!seen[def.id]) out.push(def);}
    return out;
  }

  function mergeDefs(primary, extra) {
    var out=[], seen={}, i,d;
    for(i=0;i<primary.length;i++){d=primary[i];seen[d.id]=1;out.push(d);}
    for(i=0;i<extra.length;i++){d=extra[i];if(!seen[d.id]){seen[d.id]=1;out.push(d);}}
    return out;
  }

  function ensurePowerSemantics(p, def) {
    if(!p.semantic)p.semantic=(def&&def.semantic)?def.semantic:semanticFromName(p.name);
    if(!p.applications)p.applications=[];if(!p.traits)p.traits=[];if(!p.links)p.links=[];
    if(p.activation==null)p.activation="unknown";
  }

  function ensurePowerDeepFields(p) {
    if(!p)return;
    ensurePowerSemantics(p,null);
    if(!p.stateHistory)p.stateHistory={};
    if(p.accessMode==null)p.accessMode="unknown";
    if(p.operationalState==null)p.operationalState="ready";
    if(p.operationalNote==null)p.operationalNote="";
    if(p.activeVariant==null)p.activeVariant="";
    if(p.reliability==null)p.reliability="unknown";
    if(p.precision==null)p.precision="unknown";
    if(!p.variants)p.variants=[];if(!p.environmentRules)p.environmentRules=[];if(!p.techniques)p.techniques=[];if(!p.resources)p.resources=[];if(!p.signatures)p.signatures=[];if(!p.training)p.training=[];if(!p.synergies)p.synergies=[];if(!p.collateral)p.collateral=[];if(!p.structuredNotes)p.structuredNotes=[];
  }

  function getOrCreatePower(st, entity, def) {
    var id=def.id||powerKey(def.name),p=entity.powers[id];
    if(!p){
      p=entity.powers[id]={id:id,name:def.name,category:def.cat||"custom",score:0,status:"rumored",availability:"unknown",accessMode:"unknown",operationalState:"ready",operationalNote:"",activeVariant:"",firstSeen:st.turn,lastSeen:st.turn,sources:[],sourceRecords:[],evidence:[],feats:[],limits:[],costs:[],counters:[],conditions:[],successfulUses:0,partialUses:0,failedUses:0,control:0,mastery:"unknown",reliability:"unknown",precision:"unknown",scaleNotes:[],scale:{duration:[],range:[],scope:[],targets:[],magnitude:[]},forms:[],contradictions:[],semantic:(def.semantic||semanticFromName(def.name)),applications:[],traits:[],links:[],activation:"unknown",stateHistory:{},variants:[],environmentRules:[],techniques:[],resources:[],signatures:[],training:[],synergies:[],collateral:[],structuredNotes:[]};
      entity.powerOrder.push(id);st.stats.powersCreated+=1;if(def.ontology)st.stats.ontologyCreated+=1;
    }
    if(!p.scale)p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};if(!p.forms)p.forms=[];ensurePowerDeepFields(p);p.lastSeen=st.turn;st.lastPowerByEntity[entity.id]=id;return p;
  }

  function provenanceGroup(value){
    if(!value||typeof value!=="object")return "";
    if(value.sourceId)return "card:"+String(value.sourceId);
    if(value.source==="api")return "api";
    return "live";
  }

  function pushBounded(arr, value, cap, keyFn) {
    if (!arr) return;
    var i, key = keyFn ? keyFn(value) : String(value), vg=provenanceGroup(value), eg;
    for (i = 0; i < arr.length; i++) {
      if ((keyFn ? keyFn(arr[i]) : String(arr[i])) === key) {
        eg=provenanceGroup(arr[i]);
        // Keep independent authored/API/live support as separate bounded records so
        // retracting one source cannot erase another source's evidence.
        if(vg&&eg&&vg!==eg)continue;
        // Refresh the existing record if it has turn metadata.
        if (value && typeof value === "object" && value.turn != null) arr[i].turn = value.turn;
        return;
      }
    }
    arr.push(value);
    while (arr.length > cap) arr.shift();
  }

  function updateStatus(st, p) {
    var cfg = st.config;
    if (p.availability === "lost") { p.status = "lost"; return; }
    if (p.score >= cfg.confirmScore) p.status = "confirmed";
    else if (p.score >= cfg.probableScore) p.status = "probable";
    else p.status = "rumored";
  }

  function addEvidence(st, entity, p, amount, kind, sentence, source) {
    p.score=round2(clamp(p.score+amount,-4,12));p.lastSeen=st.turn;
    pushBounded(p.evidence,recordWithProvenance(st,{kind:kind,delta:amount,text:shortText(sentence,180)},source),st.config.maxEvidencePerPower,function(x){return String(x.action)+"|"+x.kind+"|"+x.text;});
    updateStatus(st,p);addEvent(st,entity.name+": "+p.name+" "+kind,kind);
  }

  function shortText(s, max) {
    s = trim(s).replace(/\s+/g, " ");
    if (s.length > max) return s.slice(0, max - 1) + "…";
    return s;
  }

  function addEvent(st, textValue, kind) {
    pushBounded(st.recentEvents,recordWithProvenance(st,{kind:kind||"event",text:shortText(textValue,200)},"narrative"),st.config.maxRecentEvents,function(x){return String(x.action)+"|"+x.kind+"|"+x.text;});
  }

  function detectSourceTags(sentence) {
    var out = [], i, m, freeSource, explicit=/\b(powered by|draws? (?:his|her|their|your)?\s*power from|power source(?: is|:)|powers? (?:come|comes) from|origin(?: is|:)|source(?: is|:)|granted by|derived from|empowered by|channels? power from|created by|caused by)\b/i.test(sentence);
    if (/\b(immune|resistant|vulnerable|weak|against|counter|nullif)\b/i.test(sentence) && !explicit) return out;
    if(explicit){for (i = 0; i < SOURCE_PATTERNS.length; i++) if (SOURCE_PATTERNS[i][1].test(sentence)) out.push(SOURCE_PATTERNS[i][0]);}
    else {
      // Descriptive origin adjectives may establish a source only when they
      // directly modify power/ability/gift, not when an amplifier happens to
      // be present in the same sentence.
      var typed=sentence.match(/\b(magical|arcane|psychic|psionic|mutant|genetic|technological|cybernetic|divine|infernal|demonic|alien|cosmic|biological|chemical|elemental|dimensional|temporal|quantum|dream|oneiric|soul|spiritual)\s+(?:power|powers|ability|abilities|gift|gifts)\b/i);
      if(typed)for(i=0;i<SOURCE_PATTERNS.length;i++)if(SOURCE_PATTERNS[i][1].test(typed[1]))out.push(SOURCE_PATTERNS[i][0]);
    }
    m=sentence.match(/\b(?:powered by|draws? (?:his|her|their|your)?\s*power from|power source(?: is|:) ?|powers? (?:come|comes) from|origin(?: is|:) ?|source(?: is|:) ?|granted by|derived from|empowered by|channels? power from)\s+([^.!?;]{2,80})/i);
    if(m){ freeSource=shortText(trim(m[1]).replace(/\b(?:but|although|however|while)\b.*$/i,""),70); if(freeSource) out.push("via "+freeSource); }
    return out;
  }

  function rebuildSourceStrings(obj){
    if(!obj)return;var out=[],seen={},i,r,t;obj.sourceRecords=obj.sourceRecords||[];
    for(i=0;i<obj.sourceRecords.length;i++){r=obj.sourceRecords[i];t=trim(r&&r.text||"");if(t&&!seen[lower(t)]){seen[lower(t)]=1;out.push(t);}}
    obj.sources=out.slice(0,obj.powerOrder?6:5);
  }

  function recordSourceOn(st,obj,textValue,source,maxItems){
    if(!obj)return;ensureArrayField(obj,"sourceRecords");var rec=recordWithProvenance(st,{text:shortText(textValue,90)},source||"narrative");
    pushBounded(obj.sourceRecords,rec,maxItems||8,function(x){return lower(x.text);});rebuildSourceStrings(obj);
  }

  function recordPowerSource(st,entity,p,textValue,source){recordSourceOn(st,entity,textValue,source,8);recordSourceOn(st,p,textValue,source,7);}

  function ensureArrayField(obj,key){if(!obj[key])obj[key]=[];return obj[key];}

  function attachSources(st, entity, powers, sentence) {
    if (!st.config.trackPowerSources || epistemicUncertaintyCue(sentence)) return;
    var srcs = detectSourceTags(sentence), i, j, p;
    if (!srcs.length) return;
    for (j = 0; j < powers.length; j++) {
      p = powers[j];
      for (i = 0; i < srcs.length; i++) recordPowerSource(st,entity,p,srcs[i],st._processingSource||"narrative");
    }
  }

  function isAttemptSentence(sentence, source) {
    if (source !== "input") return false;
    return /^\s*>/.test(sentence) || /\b(?:try|tries|attempt|attempts|attempting|I want to|I use|You try|You attempt)\b/i.test(sentence);
  }

  function explicitPowerCue(sentence) {
    return /\b(?:has|have|possesses?|gained?|developed?|born with|gifted with)\s+(?:(?:the|a|an)\s+)?(?:(?:supernatural|superhuman|magical|psychic|psionic|mutant|powered|extraordinary|special|unique)\s+){0,2}(?:power|powers|ability|abilities|gift|superpower|superpowers)\b/i.test(sentence) ||
           /\b(?:power|ability|gift)\s+(?:is|allows?|lets?)\b/i.test(sentence) ||
           /\b(?:can|is able to)\s+(?:fly|teleport|phase|regenerate|read minds?|control|manipulate|generate|summon|transform|turn invisible|stop time|freeze time|alter reality|bend space|create portals?)\b/i.test(sentence) ||
           (/\bcan\s+(?:use|access|activate|call upon|draw on)\b/i.test(sentence) && (uniqueDefsFromTerms(sentence).length > 0 || uniqueDefsFromOntology(sentence).length > 0)) ||
           (/\b(?:has|have|possesses?|wields?|uses?|activates?|unleashes?|channels?)\b/i.test(sentence) && (ONTOLOGY_POWER_ENDING_RE.test(sentence) || ONTOLOGY_SUFFIX_WORD_RE.test(sentence)));
  }

  function pureClaimCue(sentence) {
    // Claim language must govern the power proposition itself. A character
    // "thinking fast" or "saying nothing" elsewhere in a feat is not hearsay.
    if (/\b(?:rumou?red?|supposedly|allegedly|reportedly)\b/i.test(sentence)) return true;
    if (/\b(?:might|may|could)\s+have\s+(?:the\s+)?(?:power|ability)\b/i.test(sentence)) return true;
    var m=sentence.match(/\b(?:claims?|says?|said|reports?|reported|believes?|thinks?|suspects?|theorizes?|theorises?|speculates?)\b/i),tail,pm;
    if(!m)return false;
    tail=trim(sentence.slice((m.index||0)+m[0].length));
    tail=tail.replace(/^that\s+/i,"");
    if(/^(?:you|i|he|she|they|we)\s+(?:can|could|has|have|possesses?|wields?|uses?|is\s+able\s+to|is\s+capable\s+of)\b/i.test(tail))return true;
    pm=tail.match(/^([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(?:can|could|has|have|possesses?|wields?|uses?|is\s+able\s+to|is\s+capable\s+of)\b/);
    return !!pm;
  }

  function epistemicUncertaintyCue(sentence) {
    return /\b(?:rumou?red?|supposedly|allegedly|reportedly|perhaps|maybe|possibly)\b/i.test(sentence) ||
      /\b(?:claims?|says?|said|reports?|reported|believes?|suspects?|theorizes?|theorises?|speculates?)\s+(?:that\s+)?/i.test(sentence) ||
      /\bthinks?\s+(?:that\s+)?(?:the|his|her|their|your|my|its|[A-Z])/i.test(sentence);
  }

  function powerFailureCue(sentence,p) {
    if (FAILURE_RE.test(sentence)) return true;
    var names=[],i,n,rx;
    if(p){names.push(p.name);for(i=0;i<POWER_DEFS.length;i++)if(POWER_DEFS[i].id===p.id){names=names.concat((POWER_DEFS[i].terms||[]).slice(0,12));break;}}
    names.push("power","ability");
    for(i=0;i<names.length;i++){
      n=trim(names[i]); if(!n)continue;
      rx=new RegExp("(?:"+escRe(n)+"|(?:his|her|their|your|the)\\s+(?:power|ability))\\s+(?:is|was|gets?|got|becomes?|became)\\s+(?:blocked|stopped|nullified|suppressed|interrupted|sealed|dampened)","i");
      if(rx.test(sentence))return true;
    }
    return /\b(?:attempt|power|ability)\s+(?:is|was)\s+(?:blocked|stopped|nullified|suppressed|interrupted)\b/i.test(sentence);
  }

  function powerSuccessCue(sentence,p) {
    return !powerFailureCue(sentence,p) && SUCCESS_RE.test(sentence);
  }

  function authoredNonOwnershipSentence(sentence){return /\b(?:unpowered|non[- ]?powered|has no (?:known )?(?:powers?|abilities?|supernatural abilities?)|does not possess (?:a |any )?(?:power|ability)|possesses no (?:power|ability)|not (?:a |an )?(?:supernatural|superhuman|magical|psychic|psionic|powered) (?:power|ability|perception|sense|gift))\b/i.test(sentence);}

  function subjectOwnsOrUsesPower(sentence,entity,def,source) {
    if(!entity||!def)return false;
    if(source==="storycard")return !authoredNonOwnershipSentence(sentence);
    if(entity.powers&&entity.powers[def.id])return true;
    if(isAttemptSentence(sentence,source))return true;
    if(explicitPowerCue(sentence))return true;
    var names=[entity.name].concat(entity.aliases||[]), powerNames=[def.name].concat((def.terms||[]).slice(0,12)),i,j,nm,pn,actorVerb=/\b(?:can|could|uses?|used|activates?|activated|unleashes?|unleashed|channels?|channeled|casts?|cast|wields?|wielded|teleports?|teleported|flies|flew|phases?|phased|regenerates?|regenerated|controls?|controlled|manipulates?|manipulated|generates?|generated|creates?|created|summons?|summoned|projects?|projected|transforms?|transformed|heals?|healed|absorbs?|absorbed|copies|copied|nullifies?|nullified|blocks?|blocked|deflects?|deflected|stops?|stopped|freezes?|froze|bends?|bent|redirects?|redirected)\b/i;
    for(i=0;i<names.length;i++){
      nm=trim(names[i]);if(!nm)continue;
      if(new RegExp("(?:^|[^A-Za-z0-9])"+escRe(nm)+"\\s+(?:(?:suddenly|quickly|slowly|deliberately|instinctively|reflexively|successfully|carefully|then|again)\\s+){0,2}"+actorVerb.source,"i").test(sentence))return true;
      for(j=0;j<powerNames.length;j++){pn=trim(powerNames[j]);if(!pn)continue;
        if(new RegExp("(?:^|[^A-Za-z0-9])"+escRe(nm)+"['’]s\\s+(?:"+escRe(pn)+"|power|ability)\\b","i").test(sentence))return true;
        if(new RegExp("(?:^|[^A-Za-z0-9])"+escRe(nm)+"\\s+(?:has|have|possesses?|wields?)\\s+(?:the\\s+)?"+escRe(pn)+"\\b","i").test(sentence))return true;
      }
    }
    // Pronoun-led clauses after subject routing still count as use evidence.
    if(/^(?:\s*>?\s*)?(?:you|i|he|she|they)\s+[^.!?;]{0,28}/i.test(sentence)&&actorVerb.test(sentence))return true;
    // A demonstrated family-specific feat is also an ownership/use relation.
    var feats=uniqueDefsFromFeats(sentence);for(i=0;i<feats.length;i++)if(feats[i].id===def.id)return true;
    return false;
  }

  function detectionFactor(st, kind) {
    var mode = st.config.detection;
    if (mode === "conservative") {
      if (kind === "claim") return 0.75;
      if (kind === "feat") return 0.8;
      if (kind === "explicit") return 0.95;
    } else if (mode === "aggressive") {
      if (kind === "claim") return 1.2;
      if (kind === "feat") return 1.15;
      if (kind === "explicit") return 1.05;
    }
    return 1;
  }

  function knownPowerDefsInSentence(entity,sentence){
    var out=[],seen={},low=lower(sentence),i,p,d;
    if(!entity)return out;
    for(i=0;i<entity.powerOrder.length;i++){p=entity.powers[entity.powerOrder[i]];if(!p)continue;if(containsIndexedTerm(low,lower(p.name))){d=findDefForApi(p.name);if(!seen[d.id]){seen[d.id]=1;out.push(d);}}}
    return out;
  }

  function negationTargetsDef(sentence,def){
    if(!NEGATED_ABILITY_RE.test(sentence))return false;
    var low=lower(sentence),name=lower(def.name),idx=low.indexOf(name),pre,i,sem=def.semantic||semanticFromName(def.name),domain=lower((sem&&sem.domain)||"");
    if(idx<0){for(i=0;i<(def.terms||[]).length;i++){idx=low.indexOf(lower(def.terms[i]));if(idx>=0)break;}}
    if(idx>=0){pre=low.slice(Math.max(0,idx-55),idx);return NEGATED_ABILITY_RE.test(pre);}
    if(domain&&domain!=="unspecified"){
      var dr=escRe(domain).replace(/\\ /g,"\\s+");
      if(sem&&sem.mechanics&&sem.mechanics.indexOf("manipulation")>=0){if(new RegExp("(?:manipulat(?:e|es|ed|ing)|control(?:s|led|ling)?|bend(?:s|ing)?|shap(?:e|es|ed|ing))\\s+(?:existing\\s+)?"+dr,"i").test(sentence))return false;}
      if(sem&&sem.mechanics&&sem.mechanics.indexOf("generation")>=0){if(new RegExp("(?:cannot|can't|unable to|never)\\s+(?:generat(?:e|es|ed|ing)|produc(?:e|es|ed|ing)|emit(?:s|ted|ting)?)\\s+"+dr,"i").test(sentence))return true;}
      if(sem&&sem.mechanics&&sem.mechanics.indexOf("creation")>=0){if(new RegExp("(?:cannot|can't|unable to|never)\\s+(?:creat(?:e|es|ed|ing)|materializ(?:e|es|ed|ing)|conjur(?:e|es|ed|ing))\\s+"+dr,"i").test(sentence))return true;}
    }
    return false;
  }

  function defenseStatementTargetsDef(sentence,def){
    if(!def||!DEFENSE_RE.test(sentence))return false;var low=lower(sentence),names=[lower(def.name)],i,j,idx,pre;for(i=0;i<(def.terms||[]).length&&i<12;i++)names.push(lower(def.terms[i]));
    for(j=0;j<names.length;j++){if(!names[j])continue;idx=low.indexOf(names[j]);if(idx<0)continue;pre=low.slice(Math.max(0,idx-90),idx);if(/(?:immune|immunity|resistant|resistance|vulnerable|vulnerability|weak|weakness|susceptible)\s+(?:to|against)\s*$/i.test(pre))return true;}return false;
  }

  function figurativePowerUse(sentence,def){
    if(!def)return false;
    if(def.id==="invisibility"&&/\b(?:feels?|felt|feeling|made\s+\w+\s+feel)\s+(?:completely\s+|almost\s+)?invisible\b/i.test(sentence))return true;
    return false;
  }

  function processMentionedPowers(st, sentence, source, entity) {
    var defs=uniqueDefsFromTerms(sentence),created=[],i,p,custom,attempt,amount,kind,known,hyp=HYPOTHETICAL_RE.test(sentence);
    if(st.config.ontologyDetection){defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));defs=mergeDefs(defs,uniqueDefsFromNaturalMechanics(sentence));}
    if(!entity)return created;
    known=knownPowerDefsInSentence(entity,sentence);defs=mergeDefs(defs,known);
    attempt=isAttemptSentence(sentence,source);
    if(!defs.length&&st.config.allowCustomPowers){custom=extractCustomAbility(sentence,st.config.detection);if(custom)defs.push(custom);}
    for(i=0;i<defs.length;i++){
      if(figurativePowerUse(sentence,defs[i])||defenseStatementTargetsDef(sentence,defs[i]))continue;
      if(negationTargetsDef(sentence,defs[i])&&!entity.powers[defs[i].id])continue;
      if(!entity.powers[defs[i].id]&&!subjectOwnsOrUsesPower(sentence,entity,defs[i],source))continue;
      p=getOrCreatePower(st,entity,defs[i]);created.push(p);
      if(negationTargetsDef(sentence,defs[i])){pushBounded(p.limits,recordWithProvenance(st,{text:shortText(sentence,180)},source),st.config.maxNotesPerPower,function(x){return lower(x.text);});continue;}
      if(hyp){addEvidence(st,entity,p,0.02,"hypothetical mention",sentence,source);}
      else if(attempt){addPendingAttempt(st,entity,p,sentence);addEvidence(st,entity,p,0.12,"attempted",sentence,source);}
      else if(pureClaimCue(sentence)){addEvidence(st,entity,p,st.config.claimScore*detectionFactor(st,"claim"),"claimed",sentence,source);}
      else if(source==="output"&&powerFailureCue(sentence,p)){addFeat(st,entity,p,sentence,"failure",source);}
      else if(source==="output"&&powerSuccessCue(sentence,p)){addFeat(st,entity,p,sentence,PARTIAL_RE.test(sentence)?"partial":"success",source);}
      else if(explicitPowerCue(sentence)||source==="storycard"){
        amount=st.config.explicitScore*detectionFactor(st,"explicit");if(source==="input"&&/^\s*>/.test(sentence))amount=0.2;kind=source==="storycard"?"authored lore":"explicit";addEvidence(st,entity,p,amount,kind,sentence,source);if(p.availability==="unknown")setPowerState(st,p,"availability","available",sentence,source);
      }else addEvidence(st,entity,p,0.05,"mentioned",sentence,source);
    }
    attachSources(st,entity,created,sentence);return created;
  }

  function addPendingAttempt(st, entity, p, sentence) {
    pushBounded(st.pendingAttempts,recordWithProvenance(st,{entityId:entity.id,powerId:p.id,text:shortText(sentence,160)},"input"),8,function(x){return String(x.action)+"|"+x.entityId+"|"+x.powerId+"|"+x.text;});
  }

  function addFeat(st, entity, p, sentence, outcome, source) {
    var existingText=shortText(sentence,190),di;
    for(di=0;di<p.feats.length;di++)if(p.feats[di].outcome===outcome&&p.feats[di].text===existingText&&p.feats[di].action===((source==="storycard")?-1:currentActionCount()))return;
    if(outcome==="success"){
      addEvidence(st,entity,p,st.config.featScore*detectionFactor(st,"feat"),"successful feat",sentence,source);p.successfulUses+=1;
      if(p.availability==="suppressed"||p.availability==="restricted"||p.availability==="unknown")setPowerState(st,p,"availability","available","Successful use demonstrated access",source);
      if(st.config.trackProgression)setPowerState(st,p,"control",clamp(Number(p.control||0)+2,0,100),"Successful use",source);
    }else if(outcome==="partial"){
      addEvidence(st,entity,p,st.config.featScore*0.5*detectionFactor(st,"feat"),"partial feat",sentence,source);p.partialUses+=1;if(st.config.trackProgression)setPowerState(st,p,"control",clamp(Number(p.control||0)+1,0,100),"Partial use",source);
    }else if(outcome==="failure"){
      addEvidence(st,entity,p,st.config.failedAttemptPenalty,"failed use",sentence,source);p.failedUses+=1;if(st.config.trackProgression)setPowerState(st,p,"control",clamp(Number(p.control||0)-1,0,100),"Failed use",source);
    }
    pushBounded(p.feats,recordWithProvenance(st,{outcome:outcome,text:existingText},source),st.config.maxFeatsPerPower,function(x){return String(x.action)+"|"+x.outcome+"|"+x.text;});st.stats.feats+=1;
  }

  function inferFeats(st, sentence, source, entity) {
    if (!st.config.inferFromFeats || source !== "output" || !entity) return;
    var defs = uniqueDefsFromFeats(sentence), i, p, outcome;
    if (!defs.length) return;
    for (i = 0; i < defs.length; i++) {
      if(!entity.powers[defs[i].id]&&!subjectOwnsOrUsesPower(sentence,entity,defs[i],source))continue;
      p = getOrCreatePower(st, entity, defs[i]);
      outcome = powerFailureCue(sentence,p) ? "failure" : (PARTIAL_RE.test(sentence) ? "partial" : "success");
      addFeat(st, entity, p, sentence, outcome, source);
    }
  }

  function resolvePendingFromOutput(st, sentence) {
    if(!st.pendingAttempts.length)return;
    var i,a,e,p,age,outcome=null,entityMatch,powerMatch;
    for(i=st.pendingAttempts.length-1;i>=0;i--){
      a=st.pendingAttempts[i];age=st.turn-a.turn;if(age>2){st.pendingAttempts.splice(i,1);continue;}
      e=st.entities[a.entityId];p=e&&e.powers[a.powerId];if(!e||!p){st.pendingAttempts.splice(i,1);continue;}
      entityMatch=(e.name==="You"?/\b(?:you|your|yourself)\b/i.test(sentence):containsIndexedTerm(lower(sentence),lower(e.name)));
      powerMatch=sentenceMentionsPower(sentence,p);
      outcome=powerFailureCue(sentence,p)?"failure":(powerSuccessCue(sentence,p)?(PARTIAL_RE.test(sentence)?"partial":"success"):null);if(!outcome)continue;
      if(st.config.strictAttemptMatching){if(!powerMatch&&!entityMatch)continue;if(!powerMatch&&entityMatch&&uniqueDefsFromTerms(sentence).length)continue;}
      else if(!powerMatch&&!entityMatch&&age>0)continue;
      addFeat(st,e,p,sentence,outcome,"output-result");st.pendingAttempts.splice(i,1);break;
    }
  }

  function sentenceMentionsPower(sentence, p) {
    var low = lower(sentence), def, i, j;
    if (low.indexOf(lower(p.name)) >= 0) return true;
    for (i = 0; i < POWER_DEFS.length; i++) if (POWER_DEFS[i].id === p.id) {
      def = POWER_DEFS[i]; for (j = 0; j < def.terms.length; j++) if (low.indexOf(lower(def.terms[j])) >= 0) return true;
    }
    if(p.id.indexOf("ontology_")===0 && low.indexOf(lower(p.name))>=0) return true;
    return false;
  }

  function targetPowersForNote(st, entity, sentence, mentioned) {
    if (mentioned && mentioned.length) return mentioned;
    if(!entity)return [];
    var out = [], id = st.lastPowerByEntity[entity.id], p;
    if (id && entity.powers[id]) out.push(entity.powers[id]);
    else if (entity.powerOrder.length === 1) { p = entity.powers[entity.powerOrder[0]]; if (p) out.push(p); }
    return out;
  }

  function recordApplication(st,p,tag,sentence,source) {
    if(!st.config.trackApplications || !p || !tag) return;
    pushBounded(p.applications,recordWithProvenance(st,{tag:tag,text:shortText(sentence,150)},source||st._processingSource||"narrative"),st.config.maxApplicationsPerPower,function(x){return x.tag;});
  }

  function detectAccessModeText(st,p,textValue,source){
    if(!st.config.trackAccessModes||!p)return;
    var mode="";
    if(ACCESS_ARTIFACT_RE.test(textValue))mode="artifact-dependent";
    else if(ACCESS_INNATE_RE.test(textValue))mode="innate";
    else if(ACCESS_INHERITED_RE.test(textValue))mode="inherited";
    else if(ACCESS_LEARNED_RE.test(textValue))mode="learned/trained";
    else if(ACCESS_GRANTED_RE.test(textValue))mode="granted";
    else if(ACCESS_COPIED_RE.test(textValue))mode="copied/mimicked";
    else if(ACCESS_STOLEN_RE.test(textValue))mode="stolen/drained";
    else if(ACCESS_BORROWED_RE.test(textValue))mode="borrowed/temporary";
    if(mode)setPowerState(st,p,"accessMode",mode,textValue,source||"narrative");
  }

  function detectAccessModes(st,e,sentence,mentioned,source){var ps=targetPowersForNote(st,e,sentence,mentioned),i;for(i=0;i<ps.length;i++)detectAccessModeText(st,ps[i],sentence,source);}

  function detectOperationalText(st,p,textValue,source){
    if(!st.config.trackOperationalState||!p)return;
    var op="";
    if(OP_READY_RE.test(textValue))op="ready";else if(OP_COOLDOWN_RE.test(textValue))op="cooldown";else if(OP_DEPLETED_RE.test(textValue))op="depleted";else if(OP_OVERCHARGED_RE.test(textValue))op="overcharged";else if(OP_CHARGING_RE.test(textValue))op="charging";else if(OP_RECOVERING_RE.test(textValue))op="recovering";else if(OP_UNSTABLE_RE.test(textValue))op="unstable";else if(OP_STRAINED_RE.test(textValue))op="strained";
    if(op){setPowerState(st,p,"operationalState",op,textValue,source||"narrative");setPowerState(st,p,"operationalNote",shortText(textValue,170),textValue,source||"narrative");}
  }

  function recordVariant(st,p,name,evidence,source,activate){
    if(!st.config.trackVariants||!p)return;
    name=shortText(name||"Altered variant",80);var rec=recordWithProvenance(st,{name:name,kind:/echo|second signature|white minute/i.test(name+" "+evidence)?"echo":"variant",text:shortText(evidence||name,190)},source||"narrative");
    pushBounded(p.variants,rec,st.config.maxVariantsPerPower,function(x){return lower(x.name)+"|"+lower(x.text);});
    if(activate!==false)setPowerState(st,p,"activeVariant",name,evidence||name,source||"narrative");
    st.stats.variants+=1;
  }
  function clearActiveVariant(st,p,evidence,source){if(!st.config.trackVariants||!p)return;setPowerState(st,p,"activeVariant","",evidence||"Returned to baseline",source||"narrative");}

  function recordEnvironmentRule(st,p,kind,textValue,source){if(!st.config.trackEnvironment||!p)return;pushBounded(p.environmentRules,recordWithProvenance(st,{kind:kind||"rule",text:shortText(textValue,190)},source||"narrative"),st.config.maxEnvironmentRulesPerPower,function(x){return x.kind+"|"+lower(x.text);});}
  function recordTechnique(st,p,name,source){if(!st.config.trackTechniques||!p)return;var full=trim(name).replace(/^["“']|["”']$/g,""),clean=full.split(/\s+(?:—|–|-)\s+/)[0];if(!clean||clean.length>90)return;pushBounded(p.techniques,recordWithProvenance(st,{name:shortText(clean,80),text:shortText(full,140)},source||"narrative"),st.config.maxTechniquesPerPower,function(x){return lower(x.name);});}
  function recordResource(st,p,textValue,source){if(!st.config.trackResources||!p)return;pushBounded(p.resources,recordWithProvenance(st,{text:shortText(textValue,170)},source||"narrative"),st.config.maxResourcesPerPower,function(x){return lower(x.text);});}
  function recordSignature(st,p,textValue,source){if(!st.config.trackSignatures||!p)return;pushBounded(p.signatures,recordWithProvenance(st,{text:shortText(textValue,170)},source||"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}
  function recordTraining(st,p,textValue,source){if(!st.config.trackTraining||!p)return;pushBounded(p.training,recordWithProvenance(st,{text:shortText(textValue,180)},source||"narrative"),st.config.maxTrainingNotesPerPower,function(x){return lower(x.text);});}

  function detectReliabilityPrecisionFromText(st,p,textValue,source){
    if(!p)return;
    if(st.config.trackReliability){if(/\b(?:reliable|consistent|works every time|dependable)\b/i.test(textValue))setPowerState(st,p,"reliability","reliable",textValue,source||"narrative");else if(/\b(?:unreliable|inconsistent|intermittent|sometimes fails|erratic)\b/i.test(textValue))setPowerState(st,p,"reliability","unreliable",textValue,source||"narrative");}
    if(st.config.trackPrecision){if(/\b(?:extremely precise|highly precise|fine precision|fine control|surgical precision|pinpoint|precise)\b/i.test(textValue))setPowerState(st,p,"precision","fine/precise",textValue,source||"narrative");else if(/\b(?:imprecise|coarse control|poor precision|wide spread|hard to aim)\b/i.test(textValue))setPowerState(st,p,"precision","coarse/imprecise",textValue,source||"narrative");}
  }

  function detectDeepPowerMetadata(st,e,sentence,mentioned,source){
    if(!e)return;var ps=targetPowersForNote(st,e,sentence,mentioned),i,m,kind,env;
    if(!ps.length)return;
    for(i=0;i<ps.length;i++){
      ensurePowerDeepFields(ps[i]);detectOperationalText(st,ps[i],sentence,source);detectReliabilityPrecisionFromText(st,ps[i],sentence,source);
      if(st.config.trackVariants&&VARIANT_CLEAR_RE.test(sentence))clearActiveVariant(st,ps[i],sentence,source);
      else if(st.config.trackVariants&&VARIANT_RE.test(sentence))recordVariant(st,ps[i],/\becho state\b/i.test(sentence)?"Echo State":"Altered variant",sentence,source,true);
      if(st.config.trackEnvironment){if((m=sentence.match(ENV_BLOCK_RE)))recordEnvironmentRule(st,ps[i],"block",m[1],source);else if((m=sentence.match(ENV_BOOST_RE)))recordEnvironmentRule(st,ps[i],"boost",m[1],source);else if((m=sentence.match(ENV_WEAK_RE)))recordEnvironmentRule(st,ps[i],"weaken",m[1],source);else if((m=sentence.match(ENV_TRIGGER_RE)))recordEnvironmentRule(st,ps[i],"trigger",m[1],source);else if((m=sentence.match(ENV_REQUIRE_RE)))recordEnvironmentRule(st,ps[i],"require",m[1],source);}
      if(st.config.trackTechniques&&(m=sentence.match(TECHNIQUE_RE)))recordTechnique(st,ps[i],m[1],source);
      if(st.config.trackResources&&/\b(?:mana|charges?|fuel|stored momentum|stamina|blood|life force|ammunition|ammo|battery|reserve|resource)\b/i.test(sentence))recordResource(st,ps[i],sentence,source);
      if(st.config.trackSignatures&&(m=sentence.match(SIGNATURE_RE)))recordSignature(st,ps[i],m[1],source);
      if(st.config.trackTraining&&TRAINING_RE.test(sentence))recordTraining(st,ps[i],sentence,source);
      if(st.config.trackSynergies&&SYNERGY_RE.test(sentence))pushBounded(ps[i].synergies,recordWithProvenance(st,{text:shortText(sentence,180)},source||"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});
      if(st.config.trackCollateral&&COLLATERAL_RE.test(sentence))pushBounded(ps[i].collateral,recordWithProvenance(st,{text:shortText(sentence,180)},source||"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});
    }
  }

  function detectApplications(st, entity, sentence, mentioned, source) {
    if(!entity || !st.config.trackApplications) return;
    if(source!=="output" && !explicitPowerCue(sentence)) return;
    if(source==="output" && (!SUCCESS_RE.test(sentence) || powerFailureCue(sentence,null)) && !/\bdemonstrates?|uses?|used|application\b/i.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i,j;
    if(!powers.length) return;
    for(i=0;i<APPLICATION_PATTERNS.length;i++) if(APPLICATION_PATTERNS[i][1].test(sentence)) for(j=0;j<powers.length;j++) recordApplication(st,powers[j],APPLICATION_PATTERNS[i][0],sentence,source);
  }

  function detectTraitsActivation(st,entity,sentence,mentioned) {
    if(!entity || (!st.config.trackTraits && !st.config.trackActivation)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i,p, traits=[];
    if(!powers.length) return;
    if(st.config.trackActivation){
      for(i=0;i<powers.length;i++){p=powers[i]; if(PASSIVE_RE.test(sentence)) setPowerState(st,p,"activation","passive/automatic",sentence,"narrative"); else if(ACTIVE_RE.test(sentence)) setPowerState(st,p,"activation","activated/at-will",sentence,"narrative"); else if(CHARGE_RE.test(sentence)) setPowerState(st,p,"activation","charged/prepared",sentence,"narrative");}
    }
    if(!st.config.trackTraits) return;
    if(/\b(?:touch|contact|skin contact)\b/i.test(sentence)) traits.push("touch/contact");
    if(/\bline of sight\b/i.test(sentence)) traits.push("line-of-sight");
    if(/\bself[- ]only|only affects? (?:himself|herself|themselves|yourself)\b/i.test(sentence)) traits.push("self-only");
    if(/\barea of effect|area-effect|aoe|everyone nearby|surrounding area\b/i.test(sentence)) traits.push("area-effect");
    if(/\bconcentration|must concentrate|requires focus|maintain focus\b/i.test(sentence)) traits.push("concentration");
    if(/\bverbal|spoken command|incantation|say the words|chant\b/i.test(sentence)) traits.push("verbal");
    if(/\bgesture|hand sign|somatic|movement required\b/i.test(sentence)) traits.push("gesture/somatic");
    if(/\bpassive|automatic|always active\b/i.test(sentence)) traits.push("passive");
    if(/\bonce per|twice per|charges?|ammo|ammunition|uses remaining\b/i.test(sentence)) traits.push("limited-use/resource");
    for(i=0;i<powers.length;i++) for(var j=0;j<traits.length;j++) pushBounded(powers[i].traits,traits[j],st.config.maxTraitsPerPower,function(x){return lower(x);});
  }

  function detectPowerLinks(st,entity,sentence,mentioned) {
    if(!entity || !st.config.trackPowerLinks || !LINK_RE.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned),i;
    for(i=0;i<powers.length;i++) pushBounded(powers[i].links,recordWithProvenance(st,{text:shortText(sentence,180)},st._processingSource||"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});
  }

  function detectInteractionLedger(st,sentence) {
    if(!st.config.trackInteractions || !/\b(counter|counters|negates?|nullif(?:y|ies|ied)|blocks?|bypasses?|pierces?|overcomes?|resists?|immune|suppresses?|amplifies?|boosts?|weakens?|absorbs?|reflects?)\b/i.test(sentence)) return;
    var defs=uniqueDefsFromTerms(sentence); if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));
    var names=[],seen={},i;
    for(i=0;i<defs.length;i++) if(!seen[defs[i].id]){seen[defs[i].id]=1;names.push(defs[i].name);}
    if(names.length<1) return;
    pushBounded(st.interactions,recordWithProvenance(st,{powers:names.slice(0,4),text:shortText(sentence,200)},st._processingSource||"narrative"),st.config.maxInteractions,function(x){return lower(x.text);});
  }

  function detectLimitsCosts(st, entity, sentence, mentioned) {
    if (!entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (!powers.length) return;
    for (i = 0; i < powers.length; i++) {
      p = powers[i];
      if (LIMIT_RE.test(sentence)) pushBounded(p.limits, recordWithProvenance(st,{text:shortText(sentence,190)},st._processingSource||"narrative"), st.config.maxNotesPerPower, function(x){return x.text;});
      if (COST_RE.test(sentence)) pushBounded(p.costs, recordWithProvenance(st,{text:shortText(sentence,190)},st._processingSource||"narrative"), st.config.maxNotesPerPower, function(x){return x.text;});
    }
  }

  function pushScale(p, kind, textValue, st) {
    if (!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if (!p.scale[kind]) p.scale[kind]=[];
    pushBounded(p.scale[kind],recordWithProvenance(st,{text:shortText(textValue,90)},st._processingSource||"narrative"),4,function(x){return lower(x.text);});
  }

  function detectScale(st, entity, sentence, mentioned) {
    if (!entity) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i, m;
    if (!powers.length) return;
    var captures=[];
    m=sentence.match(SCALE_DURATION_RE); if(m) captures.push(["duration",m[0]]);
    m=sentence.match(SCALE_RANGE_RE); if(m) captures.push(["range",m[0]]);
    m=sentence.match(SCALE_SCOPE_RE); if(m && (SUCCESS_RE.test(sentence)||explicitPowerCue(sentence)||LIMIT_RE.test(sentence))) captures.push(["scope",m[0]]);
    m=sentence.match(SCALE_TARGET_RE); if(m) captures.push(["targets",m[0]]);
    m=sentence.match(SCALE_MAGNITUDE_RE); if(m && sourceLooksLikeFeat(sentence)) captures.push(["magnitude",m[0]]);
    for(i=0;i<powers.length;i++) for(var j=0;j<captures.length;j++) pushScale(powers[i],captures[j][0],captures[j][1],st);
  }

  function sourceLooksLikeFeat(sentence) {
    return powerSuccessCue(sentence,null);
  }

  function detectFormBinding(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackForms) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), m=sentence.match(FORM_BIND_RE), form="", i;
    if (!powers.length) return;
    if (m) form=trim(m[1]);
    else if (/\b(?:in this form|while transformed|while in this form)\b/i.test(sentence) && entity.activeForm) form=entity.activeForm;
    if (!form) return;
    for(i=0;i<powers.length;i++) {
      pushBounded(powers[i].forms,form,5,function(x){return lower(x);});
      if (/\bonly\b/i.test(sentence)) pushBounded(powers[i].limits,recordWithProvenance(st,{text:shortText(sentence,190)},"narrative"),st.config.maxNotesPerPower,function(x){return x.text;});
    }
  }

  function detectRecentStrain(st, entity, sentence, mentioned) {
    if (!entity || !STRAIN_RE.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i;
    for(i=0;i<powers.length;i++) pushBounded(powers[i].conditions,recordWithProvenance(st,{text:shortText(sentence,180)},st._processingSource||"narrative"),st.config.maxNotesPerPower,function(x){return x.text;});
  }

  function powerStatePhrase(sentence,p,kind){
    if(!p||!p.name)return false;
    var n=escRe(p.name).replace(/\s+/g,"\\s+"),words;
    if(kind==="restore")words="(?:returns?|is\s+restored|are\s+restored|comes?\s+back|reactivates?|works?\s+again|is\s+back|are\s+back)";
    else if(kind==="loss")words="(?:is\s+gone|are\s+gone|is\s+lost|are\s+lost|disappears?|is\s+stripped|are\s+stripped|permanently\s+nullified|no\s+longer\s+works?)";
    else words="(?:is\s+suppressed|are\s+suppressed|remains?\s+suppressed|is\s+nullified|are\s+nullified|is\s+dampened|are\s+dampened|is\s+disabled|are\s+disabled|is\s+sealed|are\s+sealed|suppresses?|nullifies?|dampens?|disables?|seals?)";
    return new RegExp("\\b"+n+"\\b[^.;,]{0,65}\\b"+words+"\\b","i").test(sentence)||new RegExp("\\b"+words+"\\b[^.;,]{0,65}\\b"+n+"\\b","i").test(sentence);
  }

  function detectAvailability(st, entity, sentence, mentioned) {
    if(!entity||!st.config.trackTemporaryEffects)return;
    // Readiness problems are not ownership/access restrictions. Cooldown,
    // depletion, charging and recovery are handled by Operational State.
    if((OP_COOLDOWN_RE.test(sentence)||OP_DEPLETED_RE.test(sentence)||OP_CHARGING_RE.test(sentence)||OP_RECOVERING_RE.test(sentence)||OP_STRAINED_RE.test(sentence)||OP_UNSTABLE_RE.test(sentence))&&!/\b(nullif|suppress|dampen|seal(?:ed)? by|blocked by|anti[- ]?power|quiet glass|ward prevents)\b/i.test(sentence))return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned),i,p,restored=[],lost=[],suppressed=[];
    for(i=0;i<powers.length;i++){p=powers[i];if(powerStatePhrase(sentence,p,"restore"))restored.push(p);if(powerStatePhrase(sentence,p,"loss"))lost.push(p);if(powerStatePhrase(sentence,p,"suppress"))suppressed.push(p);}
    if(powers.length&&TEMP_RESTRICT_RE.test(sentence)&&/\b(can't|cannot|unable|blocked|nullified|dampened|sealed|disabled|doesn't work|does not work)\b/i.test(sentence)){
      for(i=0;i<powers.length;i++){p=powers[i];setPowerState(st,p,"availability","restricted",sentence,"narrative");pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}addEvent(st,entity.name+" temporary power restriction","restriction");
    }
    if(restored.length||lost.length||suppressed.length){
      for(i=0;i<restored.length;i++)setPowerState(st,restored[i],"availability","available",sentence,"narrative");
      for(i=0;i<lost.length;i++){p=lost[i];setPowerState(st,p,"availability","lost",sentence,"narrative");pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});updateStatus(st,p);}
      for(i=0;i<suppressed.length;i++){p=suppressed[i];setPowerState(st,p,"availability","suppressed",sentence,"narrative");pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}
      if(restored.length)addEvent(st,entity.name+" named power restored","restored");if(lost.length)addEvent(st,entity.name+" named power lost","loss");if(suppressed.length)addEvent(st,entity.name+" named power suppressed","suppression");return;
    }
    if(RESTORE_RE.test(sentence)){
      if(powers.length){for(i=0;i<powers.length;i++)setPowerState(st,powers[i],"availability","available",sentence,"narrative");}
      else{setEntityState(st,entity,"globalState","normal",sentence,"narrative");setEntityState(st,entity,"globalStateNote",shortText(sentence,180),sentence,"narrative");for(i=0;i<entity.powerOrder.length;i++)if(entity.powers[entity.powerOrder[i]])setPowerState(st,entity.powers[entity.powerOrder[i]],"availability","available",sentence,"narrative");}
      addEvent(st,entity.name+(powers.length?" power restored":" powers restored"),"restored");return;
    }
    if(LOSS_RE.test(sentence)){
      if(powers.length){for(i=0;i<powers.length;i++){p=powers[i];setPowerState(st,p,"availability","lost",sentence,"narrative");pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});updateStatus(st,p);}}
      else{setEntityState(st,entity,"globalState","lost",sentence,"narrative");setEntityState(st,entity,"globalStateNote",shortText(sentence,180),sentence,"narrative");}addEvent(st,entity.name+" power loss","loss");return;
    }
    if(SUPPRESS_RE.test(sentence)){
      if(powers.length){for(i=0;i<powers.length;i++){p=powers[i];setPowerState(st,p,"availability","suppressed",sentence,"narrative");pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}}
      else{setEntityState(st,entity,"globalState","suppressed",sentence,"narrative");setEntityState(st,entity,"globalStateNote",shortText(sentence,180),sentence,"narrative");}addEvent(st,entity.name+" powers suppressed","suppression");
    }
  }

  function detectProgression(st, entity, sentence, mentioned) {
    if(!entity||!st.config.trackProgression)return;var powers=targetPowersForNote(st,entity,sentence,mentioned),i,p;if(!powers.length)return;
    for(i=0;i<powers.length;i++){p=powers[i];
      if(MASTERY_RE.test(sentence)){setPowerState(st,p,"mastery","mastered",sentence,"narrative");setPowerState(st,p,"control",Math.max(Number(p.control||0),92),sentence,"narrative");addEvidence(st,entity,p,0.5,"mastery evidence",sentence,"narrative");}
      else if(IMPROVE_RE.test(sentence)){if(p.mastery==="unknown")setPowerState(st,p,"mastery","developing",sentence,"narrative");setPowerState(st,p,"control",clamp(Number(p.control||0)+6,0,100),sentence,"narrative");pushBounded(p.scaleNotes,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}
      else if(REGRESS_RE.test(sentence)){setPowerState(st,p,"control",clamp(Number(p.control||0)-6,0,100),sentence,"narrative");pushBounded(p.scaleNotes,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),st.config.maxNotesPerPower,function(x){return lower(x.text);});}
    }
  }

  var MUNDANE_DEFENSE_TARGET_RE = /^(?:change|flattery|criticism|advice|persuasion|temptation|authority|management|marketing|advertising|sales pitches?|the proposal|proposal|the plan|plan|the idea|idea|peer pressure)$/i;

  function detectDefense(st, entity, sentence) {
    if (!entity || !st.config.trackDefenses || !DEFENSE_RE.test(sentence)) return;
    var parts=sentence.split(/\b(?:but|while|whereas|and)\b/i),i,m,kind,note,rec,matched=false;
    for(i=0;i<parts.length;i++){
      m=parts[i].match(/\b(?:is|are|seems?|appears?)?\s*(immune|resistant|vulnerable|weak|susceptible)\s+(?:to|against)\s+([^.!?;]{2,100})/i);
      if(!m)m=parts[i].match(/\b(?:has|have)\s+(?:(?:an?|supernatural|superhuman|enhanced|partial|complete|strong|high)\s+){0,2}(immunity|resistance|vulnerability|weakness)\s+(?:to|against)\s+([^.!?;]{2,100})/i);
      if(!m)continue;kind=lower(m[1]);note=shortText(trim(m[2]),120);if(MUNDANE_DEFENSE_TARGET_RE.test(note)&&!strongPowerContext(sentence))continue;matched=true;rec=recordWithProvenance(st,{text:note},st._processingSource||"narrative");
      if(kind.indexOf("vulner")>=0||kind.indexOf("weak")>=0||kind.indexOf("suscept")>=0)pushBounded(entity.vulnerabilities,rec,8,function(x){return lower(x.text);});else pushBounded(entity.defenses,rec,8,function(x){return lower(x.text);});
    }
    if(!matched)return;
  }

  function detectTransform(st, entity, sentence) {
    if(!entity||!st.config.trackForms)return;
    if(REVERT_RE.test(sentence)){setEntityState(st,entity,"activeForm","",sentence,"narrative");addEvent(st,entity.name+" reverted to base form","form");return;}
    var m=sentence.match(TRANSFORM_RE),form,key;if(!m)return;form=shortText((m[2]||m[1]).replace(/\b(?:and|but)\b.*$/i,""),80);key=powerKey(form);
    if(!entity.forms[key])entity.forms[key]={name:form,firstSeen:st.turn,firstAction:currentActionCount(),sourceId:currentSourceId(st),lastSeen:st.turn,notes:[]};entity.forms[key].lastSeen=st.turn;setEntityState(st,entity,"activeForm",form,sentence,"narrative");pushBounded(entity.forms[key].notes,recordWithProvenance(st,{text:shortText(sentence,180)},"narrative"),5,function(x){return lower(x.text);});addEvent(st,entity.name+" form: "+form,"form");
  }

  function detectCounterInteraction(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackInteractions) return;
    if (!/\b(counter|counters|blocks|negates|nullifies|immune|resistant|doesn't work on|does not work on|pierces|bypasses|overcomes)\b/i.test(sentence)) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i;
    for (i = 0; i < powers.length; i++) pushBounded(powers[i].counters,recordWithProvenance(st,{text:shortText(sentence,190)},st._processingSource||"narrative"),st.config.maxNotesPerPower,function(x){return x.text;});
  }

  function contradictionCheck(st, entity, sentence, mentioned) {
    if (!entity || !mentioned || !mentioned.length) return;
    if (!/\b(?:doesn't have|does not have|never had|cannot possibly|impossible for|isn't able to|is not able to)\b/i.test(sentence)) return;
    var i, p;
    for (i = 0; i < mentioned.length; i++) {
      p = mentioned[i];
      if (p.status === "confirmed" || p.successfulUses > 0) {
        pushBounded(p.contradictions,recordWithProvenance(st,{text:shortText(sentence,180)},st._processingSource||"narrative"),6,function(x){return x.text;});
        pushBounded(entity.contradictions,recordWithProvenance(st,{text:shortText(sentence,180)},st._processingSource||"narrative"),8,function(x){return x.text;});
        st.stats.contradictions += 1;
        addEvent(st, entity.name + ": possible contradiction about " + p.name, "contradiction");
      } else {
        p.score = round2(clamp(p.score - 1.2,-4,12)); updateStatus(st,p);
      }
    }
  }

  function ensurePsyche(e){
    if(!e.psyche)e.psyche={beliefs:[],fears:[],goals:[],plans:[],secrets:[],emotions:[],vows:[],selfImage:[],conflicts:[],powerAttitudes:[],relationships:[],emotionPowerLinks:[]};
    var keys=["beliefs","fears","goals","plans","secrets","emotions","vows","selfImage","conflicts","powerAttitudes","relationships","emotionPowerLinks"],i;for(i=0;i<keys.length;i++)if(!e.psyche[keys[i]])e.psyche[keys[i]]=[];
  }
  function trimPsycheTimeline(e,action){if(!e||!e.psyche)return;for(var k in e.psyche)if(hasOwn(e.psyche,k)){trimTimelineArray(e.psyche[k],action);for(var i=0;i<e.psyche[k].length;i++){var r=e.psyche[k][i];if(r&&r.resolvedAction!=null&&r.resolvedAction>action){r.status="active";delete r.resolvedAction;delete r.resolvedReason;}}}}
  function removePsycheSource(e,sourceId){if(!e||!e.psyche)return;for(var k in e.psyche)if(hasOwn(e.psyche,k))removeRecordsBySource(e.psyche[k],sourceId);}
  function psycheRecord(st,e,kind,textValue,source,confidence){
    if(!st.config.trackPsyche||!e||!e.psyche[kind])return null;
    var rec=recordWithProvenance(st,{text:shortText(textValue,190),confidence:confidence==null?1:confidence,status:"active"},source||"narrative");pushBounded(e.psyche[kind],rec,st.config.maxPsychePerType,function(x){return lower(x.text);});st.stats.psycheRecords+=1;return rec;
  }
  function resolvePsycheCategory(st,e,kind,reason){if(!e||!e.psyche||!e.psyche[kind])return;for(var i=e.psyche[kind].length-1;i>=0;i--)if(e.psyche[kind][i].status!=="resolved"){e.psyche[kind][i].status="resolved";e.psyche[kind][i].resolvedAction=currentActionCount();e.psyche[kind][i].resolvedReason=shortText(reason||"resolved",150);break;}}
  function playerPsycheAllowed(st,e,source,sentence){if(!e||!isHumanControlledName(e.name))return true;if(!st.config.protectPlayerAgency)return true;if(source==="input"&&st.config.allowPlayerExplicitPsyche)return true;if(source==="storycard")return true;return false;}

  function extractBeliefText(sentence){
    var m=sentence.match(/\b(?:believes?|suspects?|assumes?|is convinced|is certain)\s+(?:that\s+)?([^.!?;]{3,180})/i),tail;
    if(m)return m[1];
    m=sentence.match(/\bthinks?\s+([^.!?;]{3,180})/i);if(!m)return"";
    tail=trim(m[1]);
    if(/^(?:fast|quickly|hard|carefully|silently|aloud|again|twice|for\b|about\b|back\b|better\b)/i.test(tail))return"";
    if(/^that\s+/i.test(tail))return tail.replace(/^that\s+/i,"");
    if(/^(?:the|this|that|his|her|their|your|my|our|its|you|i|he|she|they|we)\b/i.test(tail))return tail;
    if(/^[A-Z][A-Za-z0-9'’.-]+\b/.test(tail))return tail;
    return"";
  }

  function nestedMentalReport(sentence){
    return /\b(?:thinks?|believes?|suspects?|assumes?)\s+(?:that\s+)?(?:[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3}|he|she|they|you)\s+(?:plans?|wants?|fears?|believes?|intends?|hopes?)\b/i.test(sentence);
  }

  function detectPsyche(st,e,sentence,source,mentioned){
    if(!st.config.trackPsyche||!e||!playerPsycheAllowed(st,e,source,sentence))return;ensurePsyche(e);
    var m,beliefText,nested=nestedMentalReport(sentence),low=lower(sentence),selfReport=(source==="input"&&e.name==="You")||source==="storycard";
    if(PSYCHE_RESOLVE_RE.test(sentence)){if(/fear/i.test(sentence))resolvePsycheCategory(st,e,"fears",sentence);if(/plan|mind/i.test(sentence))resolvePsycheCategory(st,e,"plans",sentence);if(/secret|reveal/i.test(sentence))resolvePsycheCategory(st,e,"secrets",sentence);if(/vow|promise|swear/i.test(sentence))resolvePsycheCategory(st,e,"vows",sentence);if(/conflict|torn/i.test(sentence))resolvePsycheCategory(st,e,"conflicts",sentence);}
    if(st.config.trackBeliefs&&(beliefText=extractBeliefText(sentence)))psycheRecord(st,e,"beliefs",beliefText,source,selfReport?1:0.8);
    if(!nested&&(m=sentence.match(PSYCHE_FEAR_RE)))psycheRecord(st,e,"fears",m[1],source,selfReport?1:0.85);
    if(!nested&&st.config.trackGoals&&(m=sentence.match(PSYCHE_PLAN_RE)))psycheRecord(st,e,"plans",m[1],source,selfReport?1:0.9);
    else if(!nested&&st.config.trackGoals&&(m=sentence.match(PSYCHE_GOAL_RE)))psycheRecord(st,e,"goals",m[1],source,selfReport?1:0.9);
    if(st.config.trackSecrets&&(m=sentence.match(PSYCHE_SECRET_RE)))psycheRecord(st,e,"secrets",m[1],source,selfReport?1:0.75);
    if(st.config.trackVows&&(m=sentence.match(PSYCHE_VOW_RE)))psycheRecord(st,e,"vows",m[1],source,selfReport?1:0.9);
    if(st.config.trackSelfImage&&(m=sentence.match(PSYCHE_SELF_RE)))psycheRecord(st,e,"selfImage",m[1],source,selfReport?1:0.8);
    if((m=sentence.match(PSYCHE_CONFLICT_RE)))psycheRecord(st,e,"conflicts",m[1],source,selfReport?1:0.8);
    if(st.config.trackPowerAttitudes&&PSYCHE_POWER_ATT_RE.test(sentence))psycheRecord(st,e,"powerAttitudes",sentence,source,selfReport?1:0.85);
    if(st.config.trackRelationships&&(m=sentence.match(PSYCHE_REL_RE)))psycheRecord(st,e,"relationships",sentence,source,selfReport?1:0.8);
    if(st.config.trackEmotions&&EMOTION_RE.test(sentence)&&/\b(?:feels?|is|seems?|looks?|becomes?|gets?)\b/i.test(sentence))psycheRecord(st,e,"emotions",sentence,source,selfReport?1:0.65);
    if(st.config.trackEmotionPowerLinks&&EMOTION_POWER_CAUSAL_RE.test(sentence)){var ps=targetPowersForNote(st,e,sentence,mentioned),link=shortText(sentence,180);psycheRecord(st,e,"emotionPowerLinks",link,source,selfReport?1:0.9);for(var pi=0;pi<ps.length;pi++)pushBounded(ps[pi].links,recordWithProvenance(st,{text:"emotion-power rule: "+link},source),st.config.maxNotesPerPower,function(x){return lower(x.text);});}
  }

  function seedPsycheFromStoryCards(st){
    if(!st.config.trackPsyche||typeof storyCards==="undefined"||!storyCards)return;var present={},i,c,type,keys,entry,sourceId,sig,first,e,lines,j,line,m,label,val;
    for(i=0;i<storyCards.length&&i<350;i++){
      c=storyCards[i]||{};type=lower(c.type);keys=resolvePlaceholdersText(String(c.keys||""));entry=resolvePlaceholdersText(String(c.entry||""));
      if(type!=="powers psyche canon"&&type!=="psyche canon"&&lower(keys).indexOf("psyche canon::")!==0)continue;
      sourceId=storyCardSourceKey(c,i)+":psyche";present[sourceId]=1;sig=sourceId+"|"+keys+"|"+entry;if(st.storyCardSeeds[sourceId]===sig)continue;if(st.storyCardSeeds[sourceId])removePsycheSourceFromAll(st,sourceId);st.storyCardSeeds[sourceId]=sig;st.authoredSources[sourceId]=1;st._sourceId=sourceId;
      first=storyCardEntityName(keys,type);if(!first){st._sourceId="";continue;}e=getOrCreateEntity(st,first,first==="You"?"player":"character");ensurePsyche(e);
      lines=entry.replace(/\r/g,"\n").split(/\n|\.\s+(?=[A-Z][A-Za-z /-]{1,40}:)/);
      for(j=0;j<lines.length;j++){line=trim(lines[j]);m=line.match(/^\s*([A-Za-z][A-Za-z /_-]{1,45})\s*:\s*(.+)$/);if(!m){detectPsyche(st,e,line,"storycard",[]);continue;}label=lower(m[1]);val=m[2];if(label.indexOf("belief")>=0)psycheRecord(st,e,"beliefs",val,"storycard",1);else if(label.indexOf("fear")>=0)psycheRecord(st,e,"fears",val,"storycard",1);else if(label.indexOf("goal")>=0)psycheRecord(st,e,"goals",val,"storycard",1);else if(label.indexOf("plan")>=0)psycheRecord(st,e,"plans",val,"storycard",1);else if(label.indexOf("secret")>=0)psycheRecord(st,e,"secrets",val,"storycard",1);else if(label.indexOf("emotion")>=0)psycheRecord(st,e,"emotions",val,"storycard",1);else if(label.indexOf("vow")>=0||label.indexOf("restraint")>=0)psycheRecord(st,e,"vows",val,"storycard",1);else if(label.indexOf("self")>=0||label.indexOf("identity")>=0)psycheRecord(st,e,"selfImage",val,"storycard",1);else if(label.indexOf("conflict")>=0)psycheRecord(st,e,"conflicts",val,"storycard",1);else if(label.indexOf("attitude")>=0)psycheRecord(st,e,"powerAttitudes",val,"storycard",1);else if(label.indexOf("relationship")>=0||label.indexOf("attachment")>=0)psycheRecord(st,e,"relationships",val,"storycard",1);else if(label.indexOf("emotion-power")>=0||label.indexOf("power trigger")>=0)psycheRecord(st,e,"emotionPowerLinks",val,"storycard",1);}
      st._sourceId="";
    }
    reconcileAuthoredPsycheCards(st,present);
  }
  function removePsycheSourceFromAll(st,sourceId){for(var i=0;i<st.entityOrder.length;i++){var e=st.entities[st.entityOrder[i]];if(e)removePsycheSource(e,sourceId);}}

  function resolveNamedOrPronounEntity(st,token,source){
    var e=resolvePronoun(st,token,source),name;if(e)return e;name=cleanCandidateName(token);if(!name||rejectNewNonCharacterSubject(st,name))return null;return getOrCreateEntity(st,name,"character");
  }

  function reportedPowerRelation(st,sentence,source){
    if(!sentenceHasPowerSignal(st,sentence))return null;
    var m=sentence.match(/^\s*>?\s*(You|I|He|She|They|[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(?:claims?|says?|said|reports?|reported|believes?|thinks?|suspects?)\s+(?:that\s+)?(You|I|He|She|They|[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(?:can|could|has|have|possesses?|wields?|uses?|is\s+able\s+to|is\s+capable\s+of)\b/);
    if(!m)return null;
    var reporter=resolveNamedOrPronounEntity(st,m[1],source),subject=resolveNamedOrPronounEntity(st,m[2],source);
    if(!reporter||!subject)return null;
    return {reporter:reporter,subject:subject};
  }

  function splitSubjectClauses(sentence){
    if(!sentence)return[];var marker="\u241E",re=/\b(while|whereas|but|and|then)\s+(?=(?:You|I|He|She|They|We|[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(?:can|could|has|have|is|are|uses|use|activates|wields|possesses|thinks|believes|plans|fears|wants|says))/g;var t=sentence.replace(re,function(m){return marker+m;});var parts=t.split(marker),out=[],i;for(i=0;i<parts.length;i++)if(trim(parts[i]))out.push(trim(parts[i]));return out;
  }

  function processSentence(st, sentence, source) {
    st.stats.sentences+=1;
    var report=reportedPowerRelation(st,sentence,source),entities=report?[]:candidateNamesFromPowerSentence(st,sentence,source),entity=report?report.subject:(entities.length?entities[0]:extractSubjectEntity(st,sentence,source)),psycheEntity=report?report.reporter:entity,sm;
    if(!entity&&source==="input"&&/^\s*>?\s*I\b/i.test(sentence)&&/(?:plan|intend|want|fear|believe|think|hope|promise|vow|swear|feel|secret|goal)/i.test(sentence)){entity=getOrCreateEntity(st,"You","player");if(!report)psycheEntity=entity;}
    if(!entity){
      sm=sentence.match(/^\s*([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+(.+)$/);
      if(sm&&/^(?:thinks?|believes?|plans?|fears?|wants?|intends?|hopes?|promises?|vows?|swears?|feels?|is\s+(?:resistant|immune|vulnerable|weak)|are\s+(?:resistant|immune|vulnerable|weak))\b/i.test(sm[2]))entity=getOrCreateEntity(st,cleanCandidateName(sm[1]),"character");
      if(!report)psycheEntity=entity;
    }
    if(entity){if(entity.name!=="You")st.focusEntity=entity.name;if(entity.name==="You"&&!st.config.trackPlayer)return;if(entity.name!=="You"&&!st.config.trackNPCs)return;}
    var mentioned=processMentionedPowers(st,sentence,source,entity);
    inferFeats(st,sentence,source,entity);detectLimitsCosts(st,entity,sentence,mentioned);detectScale(st,entity,sentence,mentioned);detectFormBinding(st,entity,sentence,mentioned);detectRecentStrain(st,entity,sentence,mentioned);detectAvailability(st,entity,sentence,mentioned);detectProgression(st,entity,sentence,mentioned);detectDefense(st,entity,sentence);detectTransform(st,entity,sentence);detectCounterInteraction(st,entity,sentence,mentioned);detectApplications(st,entity,sentence,mentioned,source);detectTraitsActivation(st,entity,sentence,mentioned);detectPowerLinks(st,entity,sentence,mentioned);detectInteractionLedger(st,sentence);detectAccessModes(st,entity,sentence,mentioned,source);detectDeepPowerMetadata(st,entity,sentence,mentioned,source);detectPsyche(st,psycheEntity,sentence,source,mentioned);contradictionCheck(st,entity,sentence,mentioned);if(source==="output")resolvePendingFromOutput(st,sentence);
  }

  function processText(st, textValue, source) {
    if(!st||!st.config.enabled||!textValue)return;reconcileSameActionRevision(st,source,textValue);if(markProcessed(st,source,textValue))return;
    var sentences=splitSentences(textValue),i,parts,j,prevSource=st._processingSource;st._processingSource=source;
    try{for(i=0;i<sentences.length;i++){
      parts=st.config.subjectAwareClauses?splitSubjectClauses(sentences[i]):[sentences[i]];
      for(j=0;j<parts.length;j++)processSentence(st,parts[j],source);
    }}finally{st._processingSource=prevSource||"";}
    pruneState(st);
  }

  function pruneState(st) {
    var maxEntities = st.config.maxTrackedEntities, i, j, e, p, keys;
    // Remove stale entities with no meaningful power data only.
    if (st.entityOrder.length > maxEntities) {
      for (i = st.entityOrder.length - 1; i >= 0 && st.entityOrder.length > maxEntities; i--) {
        e = st.entities[st.entityOrder[i]];
        if (e && e.powerOrder.length === 0 && !entityHasPsyche(e) && st.turn - e.lastSeen > st.config.staleEntityTurns && e.name !== "You") {
          delete st.entities[e.id]; st.entityOrder.splice(i,1);
        }
      }
    }
    // Bounded power count per entity. Prefer keeping confirmed/recent powers.
    for (i = 0; i < st.entityOrder.length; i++) {
      e = st.entities[st.entityOrder[i]]; if (!e || e.powerOrder.length <= st.config.maxPowersStored) continue;
      keys = e.powerOrder.slice().sort(function(a,b){
        var pa=e.powers[a], pb=e.powers[b];
        return ((pb.status==="confirmed")?100:0)+pb.score+pb.lastSeen*0.01 - (((pa.status==="confirmed")?100:0)+pa.score+pa.lastSeen*0.01);
      });
      for (j = st.config.maxPowersStored; j < keys.length; j++) delete e.powers[keys[j]];
      e.powerOrder = keys.slice(0,st.config.maxPowersStored);
    }
    // Expire very old unresolved attempts.
    for (i = st.pendingAttempts.length - 1; i >= 0; i--) if (st.turn - st.pendingAttempts[i].turn > st.config.pendingAttemptTurns) st.pendingAttempts.splice(i,1);
  }

  function bootstrapFromHistory(st) {
    if (st.bootstrapDone) return;
    st.bootstrapDone = true;
    if (typeof history === "undefined" || !history || !history.length) return;
    var keep=st.config.bootstrapHistoryEntries,start=Math.max(0,history.length-keep),i,h,src;if(keep<=0)return;
    for (i = start; i < history.length; i++) {
      h = history[i] || {}; src = (h.type === "continue" || h.type === "start") ? "output" : "history";
      processText(st, h.text || h.rawText || "", src);
    }
  }

  function relevanceScore(st, e, currentText) {
    var score = Math.max(0, 20 - (st.turn - e.lastSeen));
    var low = lower(currentText), nm = lower(e.name), i;
    if (e.name === "You") score += 10;
    if (nm && low.indexOf(nm) >= 0) score += 30;
    for (i = 0; i < (e.aliases || []).length; i++) if (low.indexOf(lower(e.aliases[i])) >= 0) score += 15;
    score += Math.min(10, e.powerOrder.length * 2);
    if (e.globalState !== "normal") score += 8;
    return score;
  }

  function availabilityLabel(p) {
    if (p.availability === "lost") return "LOST";
    if (p.availability === "suppressed") return "suppressed";
    if (p.availability === "restricted") return "restricted";
    return "";
  }

  function conciseNote(arr, maxItems) {
    if (!arr || !arr.length) return "";
    var out=[], i;
    for (i = Math.max(0, arr.length-maxItems); i < arr.length; i++) out.push(shortText(arr[i].text || arr[i], 110));
    return out.join(" / ");
  }

  function powerSummary(st, p, detail) {
    var bits = [p.name + " [" + p.status + (availabilityLabel(p) ? ", " + availabilityLabel(p) : "") + "]"];
    if (p.sources.length) bits.push("source: " + p.sources.join("/"));
    if (detail !== "low" && p.semantic) {
      var semBits=[];
      if(p.semantic.domain && p.semantic.domain!=="unspecified") semBits.push("domain "+p.semantic.domain);
      if(p.semantic.mechanics && p.semantic.mechanics.length) semBits.push("mechanic "+p.semantic.mechanics.slice(0,3).join("/"));
      if(p.semantic.tier && p.semantic.tier!=="unspecified") semBits.push("tier-label "+p.semantic.tier);
      if(semBits.length) bits.push(semBits.join(", "));
    }
    if (detail !== "low") {
      if (p.limits.length) bits.push("limits: " + conciseNote(p.limits, detail === "high" ? 2 : 1));
      if (p.costs.length) bits.push("costs: " + conciseNote(p.costs, detail === "high" ? 2 : 1));
      if (p.counters.length) bits.push("interactions: " + conciseNote(p.counters, 1));
      if (p.forms && p.forms.length) bits.push("form-bound: " + p.forms.join("/"));
      if (p.scale) {
        var scaleBits=[];
        if(p.scale.duration&&p.scale.duration.length) scaleBits.push("duration "+conciseNote(p.scale.duration,1));
        if(p.scale.range&&p.scale.range.length) scaleBits.push("range "+conciseNote(p.scale.range,1));
        if(p.scale.scope&&p.scale.scope.length) scaleBits.push("scope "+conciseNote(p.scale.scope,1));
        if(p.scale.targets&&p.scale.targets.length) scaleBits.push("targets "+conciseNote(p.scale.targets,1));
        if(p.scale.magnitude&&p.scale.magnitude.length) scaleBits.push("magnitude "+conciseNote(p.scale.magnitude,1));
        if(scaleBits.length) bits.push("observed scale: "+scaleBits.join(", "));
      }
      if (p.conditions.length && st.turn-(p.conditions[p.conditions.length-1].turn||0)<=3) bits.push("recent condition: "+conciseNote(p.conditions,1));
      if (p.activation && p.activation!=="unknown") bits.push("activation: "+p.activation);
      if (p.traits && p.traits.length) bits.push("traits: "+p.traits.slice(-3).join("/"));
      if (p.applications && p.applications.length) { var apps=[]; for(var ai=Math.max(0,p.applications.length-4);ai<p.applications.length;ai++) apps.push(p.applications[ai].tag); bits.push("demonstrated uses: "+apps.join("/")); }
      if (detail === "high" && p.links && p.links.length) bits.push("power links: "+conciseNote(p.links,1));
      if (p.accessMode && p.accessMode !== "unknown") bits.push("access: " + p.accessMode);
      if (p.operationalState && p.operationalState !== "ready") bits.push("operational: " + p.operationalState + (p.operationalNote ? " (" + shortText(p.operationalNote,85) + ")" : ""));
      if (p.activeVariant) bits.push("active variant: " + p.activeVariant);
      if (p.reliability && p.reliability !== "unknown") bits.push("reliability: " + p.reliability);
      if (p.precision && p.precision !== "unknown") bits.push("precision: " + p.precision);
      if (p.techniques && p.techniques.length) { var tech=[]; for(var ti=Math.max(0,p.techniques.length-3);ti<p.techniques.length;ti++) tech.push(p.techniques[ti].name||p.techniques[ti].text); bits.push("techniques: "+tech.join("/")); }
      if (p.variants && p.variants.length) bits.push("variant: " + shortText(p.variants[p.variants.length-1].name + " — " + p.variants[p.variants.length-1].text,120));
      if (p.environmentRules && p.environmentRules.length) bits.push("environment: " + conciseNote(p.environmentRules, detail === "high" ? 2 : 1));
      if (p.resources && p.resources.length) bits.push("resource: " + conciseNote(p.resources,1));
      if (detail === "high" && p.signatures && p.signatures.length) bits.push("signature: " + conciseNote(p.signatures,1));
      if (detail === "high" && p.training && p.training.length) bits.push("training: " + conciseNote(p.training,1));
      if (detail === "high" && p.synergies && p.synergies.length) bits.push("synergy: " + conciseNote(p.synergies,1));
      if (detail === "high" && p.collateral && p.collateral.length) bits.push("control/collateral: " + conciseNote(p.collateral,1));
      if (p.mastery !== "unknown") bits.push("mastery: " + p.mastery);
      if (p.contradictions.length) bits.push("CONFLICT: " + conciseNote(p.contradictions,1));
    }
    if (detail === "high" && p.feats.length) bits.push("recent feat: " + shortText(p.feats[p.feats.length-1].text,120));
    return bits.join("; ");
  }

  function entitySummary(st, e, detail) {
    var lines = [], ids = e.powerOrder.slice(), i, p, scored=[];
    ids.sort(function(a,b){
      var pa=e.powers[a], pb=e.powers[b], sa=(pa.status==="confirmed"?50:pa.status==="probable"?20:0)+pa.score+pa.lastSeen*0.01, sb=(pb.status==="confirmed"?50:pb.status==="probable"?20:0)+pb.score+pb.lastSeen*0.01;
      return sb-sa;
    });
    lines.push(e.name + (e.activeForm ? " (current form: " + e.activeForm + ")" : "") + (e.globalState !== "normal" ? " [overall powers " + e.globalState + "]" : "") + ":");
    for (i = 0; i < ids.length && scored.length < st.config.maxPowersPerEntity; i++) {
      p = e.powers[ids[i]]; if (!p) continue;
      if (p.status === "rumored" && p.score < 0.2 && detail === "low") continue;
      scored.push("- " + powerSummary(st,p,detail));
    }
    if (!scored.length) return "";
    lines = lines.concat(scored);
    if (st.config.trackDefenses && e.defenses.length) lines.push("- defenses: " + conciseNote(e.defenses, detail === "high" ? 3 : 2));
    if (st.config.trackDefenses && e.vulnerabilities.length) lines.push("- vulnerabilities: " + conciseNote(e.vulnerabilities, detail === "high" ? 3 : 2));
    if (e.globalStateNote && e.globalState !== "normal") lines.push("- state evidence: " + shortText(e.globalStateNote,130));
    return lines.join("\n");
  }

  function activePsycheTexts(arr,max){var out=[],i;if(!arr)return out;for(i=arr.length-1;i>=0&&out.length<max;i--)if(arr[i]&&arr[i].status!=="resolved")out.unshift(shortText(arr[i].text,120));return out;}
  function recentPsycheTexts(arr,max,currentTurn,maxAge){var out=[],i,r;if(!arr)return out;for(i=arr.length-1;i>=0&&out.length<max;i--){r=arr[i];if(!r||r.status==="resolved")continue;if(r.turn!=null&&r.turn>=0&&currentTurn-r.turn>maxAge)continue;out.unshift(shortText(r.text,120));}return out;}
  function psycheSummary(st,e,detail){
    if(!st.config.trackPsyche||!e||!e.psyche)return"";var lines=[],x;
    if((x=activePsycheTexts(e.psyche.goals,2)).length)lines.push("goals: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.plans,2)).length)lines.push("plans: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.fears,2)).length)lines.push("fears: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.beliefs,2)).length)lines.push("beliefs (subjective): "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.vows,2)).length)lines.push("vows/restraint: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.powerAttitudes,2)).length)lines.push("power attitude: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.relationships,2)).length)lines.push("relationships: "+x.join(" / "));
    if((x=recentPsycheTexts(e.psyche.emotions,2,st.turn,st.config.emotionMemoryTurns)).length)lines.push("recent emotions: "+x.join(" / "));
    if(detail==="high"&&(x=activePsycheTexts(e.psyche.conflicts,2)).length)lines.push("inner conflict: "+x.join(" / "));
    if(detail==="high"&&(x=activePsycheTexts(e.psyche.selfImage,1)).length)lines.push("self-image: "+x.join(" / "));
    if((x=activePsycheTexts(e.psyche.emotionPowerLinks,2)).length)lines.push("established emotion-power rules: "+x.join(" / "));
    if(detail==="high"&&(x=activePsycheTexts(e.psyche.secrets,1)).length)lines.push("private secret continuity: "+x.join(" / "));
    return lines.join("\n");
  }

  function buildLedger(st, currentContext) {
    var scored=[], i, e, s, detail=st.config.contextDetail, lines=[], block, max=st.config.contextChars;
    for (i=0;i<st.entityOrder.length;i++) {
      e=st.entities[st.entityOrder[i]]; if (!e || (!e.powerOrder.length && !entityHasPsyche(e))) continue;
      scored.push({e:e, score:relevanceScore(st,e,currentContext)});
    }
    scored.sort(function(a,b){return b.score-a.score;});
    if (!scored.length) return "";

    lines.push("[POWERS — continuity ledger. Treat this as factual bookkeeping, not prose to repeat.]");
    lines.push("Rules: confirmed abilities/limits are continuity. Probable/rumored abilities are not proof. Attempts are not feats. Do not invent upgrades, origins, immunities, counters, extra powers, or larger scale without story evidence. Observed scale is demonstrated capability, not an automatic hard maximum; exceeding it should be earned or established. A failed use can mean circumstance, resistance, exhaustion or suppression; it does not erase an established power.");
    if(st.config.strictMechanics) lines.push("Power grammar matters: manipulation does not automatically grant generation, mimicry, embodiment or immunity; generation does not automatically grant fine control; resistance is not immunity; absorption is not ownership; copying may be temporary; teleportation is not portal creation; time travel is not time stop. Only merge mechanics when the story establishes the link.");
    if(st.config.highTierGuard) lines.push("High-tier names such as Absolute, Omni, Almighty or Transcendent are labels, not blank-cheque proof of infinite range, perfect control, every sub-power or immunity. Use authored statements and demonstrated feats to define what they actually mean in this story.");
    lines.push("Creative use rule: new tactics are welcome when they stay inside an established power's domain + mechanic + known conditions. Treat a successful new tactic as an application of that power, not as permission to silently add a different mechanic.");
    lines.push("State rule: ownership, availability, and readiness are separate. A power can exist yet be suppressed, depleted, cooling down, unstable, charging, or otherwise not ready. Variants/Echo States modify an established ability unless the story explicitly establishes a separate power.");
    if(st.config.trackPsyche) lines.push("Inner Current rule: beliefs, fears, goals, plans and secrets are subjective character continuity, not objective world facts. Never force private psychology onto a human-controlled character unless the player explicitly authored it.");
    if (st.config.mode === "simulation") lines.push("Simulation mode: enforce recorded limits, costs, counters and current suppression strictly; let clever use matter more than unexplained escalation.");
    else if (st.config.mode === "balanced") lines.push("Balanced mode: preserve continuity while allowing creative applications that logically fit an established ability and its known limits.");
    else lines.push("Narrative mode: preserve established continuity while favoring natural prose over visible mechanics or stat language.");
    if(st.config.attemptReferee&&st.pendingAttempts&&st.pendingAttempts.length){var pa=st.pendingAttempts[st.pendingAttempts.length-1],pe=st.entities[pa.entityId],pp=pe&&pe.powers[pa.powerId],ar;if(pe&&pp&&st.turn-(pa.turn||0)<=st.config.pendingAttemptTurns){ar=assessAttemptRecord(st,pe,pp,pa.text,currentContext.slice(-1200));var aw=[];if(ar.blockers.length)aw.push("blockers: "+ar.blockers.join(" / "));if(ar.mechanicWarnings.length)aw.push("mechanic caution: "+ar.mechanicWarnings.join(" / "));if(ar.cautions.length)aw.push("state caution: "+ar.cautions.slice(0,2).join(" / "));if(aw.length)lines.push("Pending attempt referee — "+pe.name+" using "+pp.name+": Do not assume success; "+aw.join("; ")+".");}}

    for (i=0;i<scored.length && i<st.config.maxContextEntities;i++) {
      block=entitySummary(st,scored[i].e,detail); if (!block) continue;
      if ((lines.join("\n").length + block.length + 2) > max) break;
      lines.push(block);
    }
    if (detail !== "low" && st.interactions && st.interactions.length) {
      var inter=[], ii, rec;
      for(ii=st.interactions.length-1;ii>=0 && inter.length<2;ii--){rec=st.interactions[ii]; if(st.turn-(rec.turn||0)<=8) inter.unshift("- "+rec.text);}
      if(inter.length && (lines.join("\n").length+inter.join("\n").length+30)<max){lines.push("Recent power interactions:"); lines=lines.concat(inter);}
    }
    if(st.config.trackPsyche){
      var psycheUsed=0,psb;
      for(i=0;i<scored.length&&psycheUsed<st.config.maxPsycheEntities;i++){
        psb=psycheSummary(st,scored[i].e,detail);if(!psb)continue;
        psb="INNER CURRENT — "+scored[i].e.name+":\n"+psb;
        if((lines.join("\n").length+psb.length+2)>Math.min(max+st.config.psycheContextChars,8000))break;
        lines.push(psb);psycheUsed++;
      }
    }
    if (lines.length <= 3) return "";
    return lines.join("\n");
  }

  function findGeneratedCard(type,marker) {
    if(typeof storyCards==="undefined"||!storyCards)return null;var i,c,parts,j;
    marker=lower(marker);
    for(i=0;i<storyCards.length;i++){c=storyCards[i]||{};if(lower(c.type)!==lower(type))continue;parts=String(c.keys||"").split(/[,;|]/);for(j=0;j<parts.length;j++)if(lower(trim(parts[j]))===marker)return{card:c,index:i};}
    return null;
  }
  function findPowersCard(entityName){return findGeneratedCard("Powers","powers::"+lower(entityName));}
  function findPsycheCard(entityName){return findGeneratedCard("Powers Psyche","powers psyche::"+lower(entityName));}

  function cardEntryFor(st,e) {
    var lines=["[Powers continuity: "+e.name+"]"], i,p, usable=[];
    for (i=0;i<e.powerOrder.length;i++) {
      p=e.powers[e.powerOrder[i]]; if (!p) continue;
      if (p.status==="confirmed" || p.status==="probable" || p.availability==="lost" || p.availability==="suppressed") usable.push(p);
    }
    usable.sort(function(a,b){return (b.status==="confirmed"?20:0)+b.score-(a.status==="confirmed"?20:0)-a.score;});
    for (i=0;i<usable.length && i<10;i++) lines.push("- "+powerSummary(st,usable[i],"medium"));
    if (e.activeForm) lines.push("Current form: "+e.activeForm+".");
    if (e.defenses.length) lines.push("Defenses: "+conciseNote(e.defenses,3));
    if (e.vulnerabilities.length) lines.push("Vulnerabilities: "+conciseNote(e.vulnerabilities,3));
    lines.push("Continuity rule: claims and attempts are not proof; preserve established limits and costs; do not invent upgrades or counters without story evidence.");
    return shortText(lines.join("\n"), 1800);
  }

  function psycheCardEntryFor(st,e){var body=psycheSummary(st,e,"high");if(!body)return"";return shortText("[Private psyche continuity: "+e.name+"]\n"+body+"\nEpistemic rule: these are subjective internal states unless separately established as world facts. Do not expose secrets without a story reason.",1800);}
  function entityHasMeaningfulPower(e){for(var j=0;j<e.powerOrder.length;j++){var p=e.powers[e.powerOrder[j]];if(p&&(p.status==="confirmed"||p.status==="probable"||p.availability==="lost"||p.availability==="suppressed"))return true;}return false;}
  function entityHasPsyche(e){if(!e||!e.psyche)return false;for(var k in e.psyche)if(hasOwn(e.psyche,k)&&activePsycheTexts(e.psyche[k],1).length)return true;return false;}

  function syncStoryCards(st) {
    if(!st.config.autoStoryCards||typeof addStoryCard!=="function")return;if(st.turn-st.lastCardSync<st.config.storyCardInterval)return;
    var didWork=false,i,e,entry,keys,found,pf,pe;
    for(i=0;i<st.entityOrder.length;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      if(entityHasMeaningfulPower(e)){
        entry=cardEntryFor(st,e);keys="powers::"+e.name+", "+e.name+", "+e.name+" powers, "+e.name+" abilities";found=findPowersCard(e.name);
        try{if(found&&typeof updateStoryCard==="function"){if(String(found.card.entry||"")!==entry||String(found.card.keys||"")!==keys){updateStoryCard(found.index,keys,entry,"Powers");didWork=true;}}else{addStoryCard(keys,entry,"Powers");didWork=true;}}catch(err){logDebug("POWERS card sync failed",e.name,err&&err.message);}
      }else if(st.config.cleanGeneratedCards&&(found=findPowersCard(e.name))&&typeof removeStoryCard==="function"){try{removeStoryCard(found.index);didWork=true;}catch(er){} }
      if(st.config.trackPsycheCards&&entityHasPsyche(e)){
        pe=psycheCardEntryFor(st,e);keys="powers psyche::"+e.name+", "+e.name+" psyche";pf=findPsycheCard(e.name);
        try{if(pf&&typeof updateStoryCard==="function"){if(String(pf.card.entry||"")!==pe||String(pf.card.keys||"")!==keys){updateStoryCard(pf.index,keys,pe,"Powers Psyche");didWork=true;}}else{addStoryCard(keys,pe,"Powers Psyche");didWork=true;}}catch(perr){logDebug("POWERS psyche card sync failed",e.name,perr&&perr.message);}
      }else if(st.config.cleanGeneratedCards&&(pf=findPsycheCard(e.name))&&typeof removeStoryCard==="function"){try{removeStoryCard(pf.index);didWork=true;}catch(per){} }
    }
    if(st.config.cleanGeneratedCards&&typeof removeStoryCard==="function"&&typeof storyCards!=="undefined"&&storyCards){
      for(var ci=storyCards.length-1;ci>=0;ci--){var cc=storyCards[ci]||{},ct=lower(cc.type),ck=String(cc.keys||"").split(/[,;|]/)[0],cn="";if(ct!=="powers"&&ct!=="powers psyche")continue;if(ct==="powers"&&lower(ck).indexOf("powers::")===0)cn=trim(ck.slice(8));else if(ct==="powers psyche"&&lower(ck).indexOf("powers psyche::")===0)cn=trim(ck.slice(15));if(cn&&!resolveEntityForApi(st,cn)){try{removeStoryCard(ci);didWork=true;}catch(oe){}}}
    }
    if(didWork)st.lastCardSync=st.turn;
  }

  function maybeMessage(st) {
    if (!st.config.showMessages || typeof state === "undefined") return;
    var confirmed=0,probable=0,i,j,e,p;
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(!e)continue;for(j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]];if(!p)continue;if(p.status==="confirmed")confirmed++;else if(p.status==="probable")probable++;}}
    state.message="Powers: "+confirmed+" confirmed, "+probable+" probable abilities tracked."+(st.configWarnings&&st.configWarnings.length?" Config warnings: "+st.configWarnings.length+".":"");
  }

  function findDefForApi(powerName) {
    buildIndexes();
    var q = lower(trim(powerName)), i, d, j;
    for (i=0;i<POWER_DEFS.length;i++) {
      d=POWER_DEFS[i];
      if (lower(d.id)===q || lower(d.name)===q) return d;
      for (j=0;j<d.terms.length;j++) if (lower(d.terms[j])===q) return d;
    }
    if(ONTOLOGY_POWER_ENDING_RE.test(powerName) || ONTOLOGY_SUFFIX_WORD_RE.test(powerName) || HIGH_TIER_RE.test(powerName)) return ontologyPowerDefFromName(powerName);
    return {id:"custom_"+powerKey(powerName),name:titleCasePhrase(powerName),cat:"custom",terms:[],feats:[],semantic:semanticFromName(powerName)};
  }

  function resolveEntityForApi(st,name) {
    if(!st)return null;var e=st.entities[entityKey(name)],needle=lower(normalizeName(name)),i,j,a;if(e)return e;
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(!e)continue;if(lower(normalizeName(e.name))===needle)return e;a=e.aliases||[];for(j=0;j<a.length;j++)if(lower(normalizeName(a[j]))===needle)return e;}return null;
  }

  function resolveOrCreateEntityForApi(st,name,kind){var e=resolveEntityForApi(st,name);return e||getOrCreateEntity(st,name,kind||"character");}

  function apiGetEntity(name) {
    var st=init(); if(!st) return null;
    return resolveEntityForApi(st,name);
  }

  function apiHasPower(name, powerName, minimumStatus) {
    var st=init(), e, d, p, rank={rumored:1,probable:2,confirmed:3,lost:3};
    if(!st) return false; e=resolveEntityForApi(st,name); if(!e) return false;
    d=findDefForApi(powerName); p=e.powers[d.id]; if(!p) return false;
    minimumStatus=minimumStatus||"probable";
    return (rank[p.status]||0) >= (rank[minimumStatus]||2);
  }

  function apiRecordPower(name, powerName, options) {
    var st=init(), e, d, p, amount;
    if(!st) return null; options=options||{};
    e=resolveOrCreateEntityForApi(st,name,options.kind||"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    amount=options.score!=null?Number(options.score):st.config.explicitScore;
    if(isNaN(amount)) amount=st.config.explicitScore;
    addEvidence(st,e,p,amount,options.kindLabel||"external canon",options.evidence||("External script established "+p.name),options.source||"api");
    if(options.sourceTag) recordPowerSource(st,e,p,String(options.sourceTag),options.source||"api");
    if(options.availability){var av=String(options.availability);if(av!=="available"&&av!=="suppressed"&&av!=="restricted"&&av!=="lost"&&av!=="unknown")av="unknown";setPowerState(st,p,"availability",av,options.evidence||"External script availability","api");}
    updateStatus(st,p); return p;
  }

  function apiRecordFeat(name, powerName, textValue, outcome) {
    var st=init(), e, d, p;
    if(!st) return null; e=resolveOrCreateEntityForApi(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    outcome=outcome||"success"; if(outcome!=="success"&&outcome!=="partial"&&outcome!=="failure") outcome="success";
    addFeat(st,e,p,textValue||("External feat for "+p.name),outcome,"api"); return p;
  }

  function apiAddConstraint(name, powerName, kind, textValue) {
    var st=init(), e, d, p, target;
    if(!st) return null; e=resolveOrCreateEntityForApi(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    target = kind==="cost"?p.costs:(kind==="counter"?p.counters:(kind==="condition"?p.conditions:p.limits));
    pushBounded(target,recordWithProvenance(st,{text:shortText(textValue,190)},"api"),st.config.maxNotesPerPower,function(x){return x.text;}); return p;
  }

  function apiSetAvailability(name, powerName, availability, reason) {
    var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);
    if(availability!=="available"&&availability!=="suppressed"&&availability!=="restricted"&&availability!=="lost"&&availability!=="unknown")availability="unknown";
    setPowerState(st,p,"availability",availability,reason||"API availability update","api");if(reason)pushBounded(p.conditions,recordWithProvenance(st,{text:shortText(reason,190)},"api"),st.config.maxNotesPerPower,function(x){return lower(x.text);});updateStatus(st,p);return p;
  }

  function apiGetSemantics(name,powerName) {
    var st=init(),e,d,p; if(!st) return null; e=resolveEntityForApi(st,name); if(!e) return null; d=findDefForApi(powerName); p=e.powers[d.id]; if(!p) return null; ensurePowerSemantics(p,d); return p.semantic;
  }

  function apiRecordApplication(name,powerName,tag,evidence) {
    var st=init(),e,d,p; if(!st) return null; e=resolveOrCreateEntityForApi(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); recordApplication(st,p,String(tag||"utility"),evidence||("External application of "+p.name),"api"); return p;
  }

  function apiRecordTrait(name,powerName,trait) {
    var st=init(),e,d,p; if(!st) return null; e=resolveOrCreateEntityForApi(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); pushBounded(p.traits,String(trait),st.config.maxTraitsPerPower,function(x){return lower(x);}); return p;
  }

  function apiRecordInteraction(textValue,powerNames) {
    var st=init(); if(!st) return null; pushBounded(st.interactions,recordWithProvenance(st,{powers:(powerNames||[]).slice(0,4),text:shortText(textValue,200)},"api"),st.config.maxInteractions,function(x){return lower(x.text);}); return st.interactions[st.interactions.length-1];
  }

  function apiSetOperationalState(name,powerName,op,reason){var st=init(),e,d,p,allowed={ready:1,strained:1,cooldown:1,depleted:1,charging:1,overcharged:1,unstable:1,recovering:1,unknown:1};if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);op=lower(op);if(!allowed[op])op="unknown";setPowerState(st,p,"operationalState",op,reason||("API set "+op),"api");setPowerState(st,p,"operationalNote",shortText(reason||"",170),reason||("API set "+op),"api");return p;}
  function apiSetAccessMode(name,powerName,mode,reason){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);setPowerState(st,p,"accessMode",String(mode||"unknown"),reason||"API access update","api");return p;}
  function apiRecordVariant(name,powerName,variantName,evidence){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordVariant(st,p,variantName,evidence,"api");return p;}
  function apiRecordEnvironmentRule(name,powerName,kind,textValue){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordEnvironmentRule(st,p,kind,textValue,"api");return p;}
  function apiRecordTechnique(name,powerName,technique){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordTechnique(st,p,technique,"api");return p;}
  function apiRecordResource(name,powerName,textValue){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordResource(st,p,textValue,"api");return p;}
  function apiRecordSignature(name,powerName,textValue){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordSignature(st,p,textValue,"api");return p;}
  function apiRecordTraining(name,powerName,textValue){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);recordTraining(st,p,textValue,"api");return p;}
  function apiSetReliability(name,powerName,value,reason){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);setPowerState(st,p,"reliability",String(value||"unknown"),reason||"API reliability update","api");return p;}
  function apiSetPrecision(name,powerName,value,reason){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);setPowerState(st,p,"precision",String(value||"unknown"),reason||"API precision update","api");return p;}
  function apiRecordPsyche(name,kind,textValue){var st=init(),e,map={belief:"beliefs",beliefs:"beliefs",fear:"fears",fears:"fears",goal:"goals",goals:"goals",plan:"plans",plans:"plans",secret:"secrets",secrets:"secrets",emotion:"emotions",emotions:"emotions",vow:"vows",vows:"vows",selfImage:"selfImage",conflict:"conflicts",relationship:"relationships",relationships:"relationships",powerAttitude:"powerAttitudes",emotionPowerLink:"emotionPowerLinks"};if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");kind=map[kind]||map[lower(kind)]||"beliefs";return psycheRecord(st,e,kind,textValue,"api",1);}
  function apiResolvePsyche(name,kind,reason){var st=init(),e,map={belief:"beliefs",fear:"fears",goal:"goals",plan:"plans",secret:"secrets",emotion:"emotions",vow:"vows",relationship:"relationships",conflict:"conflicts"};if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");kind=map[kind]||map[lower(kind)]||kind;resolvePsycheCategory(st,e,kind,reason);return e;}
  function apiSnapshot(name){var st=init(),e;if(!st)return null;e=resolveEntityForApi(st,name);return e?deepClone(e):null;}
  function cleanEnvironmentPhrase(v){var t=lower(trim(v||""));t=t.replace(/^(?:the|a|an)\s+/,"");t=t.replace(/^(?:requires?|depends? on|must be (?:in|under|near)|only works? (?:in|under|while|when)|fails? (?:in|under|during|near|when)|does(?:n't| not) work (?:in|under|during|near|when)|cannot function (?:in|under|during|near|when)|(?:is )?(?:stronger|amplified|boosted|more powerful|more reliable|weaker|diminished|reduced|less reliable|less powerful) (?:in|under|during|near|when)|(?:activates?|triggers?|awakens?|turns on) (?:in|under|during|near|when))\s+/i,"");t=t.replace(/\s+/g," ");return t;}
  function environmentMatches(ruleText,environment){var r=cleanEnvironmentPhrase(ruleText),e=cleanEnvironmentPhrase(environment);if(!r||!e)return false;if(e.indexOf(r)>=0||r.indexOf(e)>=0)return true;var parts=r.split(/\s+/),hits=0,i,w;for(i=0;i<parts.length;i++){w=parts[i];if(w.length<3||/^(?:the|and|with|under|during|near|when|while|direct|total|high|low)$/.test(w))continue;if(e.indexOf(w)>=0)hits++;else return false;}return hits>0;}
  function assessPowerRecord(st,e,p,environment){var result={exists:!!p,status:p?p.status:"unknown",availability:p?p.availability:"unknown",operational:p?p.operationalState:"unknown",activeVariant:p&&p.activeVariant?p.activeVariant:"",ready:false,conditional:false,blockers:[],cautions:[],bonuses:[],notes:[]},i,r,matched,env=String(environment||"");if(!p)return result;var established=(p.status==="confirmed"||p.status==="probable");result.ready=established;if(!established){result.conditional=true;result.cautions.push("ability is only "+p.status+"; existence/capability is not firmly established");}
    if(p.availability==="lost"||p.availability==="suppressed"||p.availability==="restricted"){result.ready=false;result.blockers.push("availability: "+p.availability);}else if(p.availability==="unknown"){result.conditional=true;result.cautions.push("current availability is unknown");}
    if(p.operationalState==="cooldown"||p.operationalState==="depleted"||p.operationalState==="charging"){result.ready=false;result.blockers.push("operational state: "+p.operationalState);}else if(p.operationalState==="recovering"){result.conditional=true;result.cautions.push("power is still recovering");}else if(p.operationalState==="strained"||p.operationalState==="unstable"||p.operationalState==="overcharged"){result.cautions.push("operational state: "+p.operationalState);}
    if(p.activeVariant)result.notes.push("active variant: "+p.activeVariant);
    if(p.environmentRules){for(i=0;i<p.environmentRules.length;i++){r=p.environmentRules[i];if(!r)continue;matched=environmentMatches(r.text,env);if(r.kind==="require"){if(!env){result.ready=false;result.conditional=true;result.blockers.push("requires environment: "+r.text+" (environment not supplied)");}else if(!matched){result.ready=false;result.blockers.push("requires environment: "+r.text);}else result.bonuses.push("required environment satisfied: "+r.text);}else if(r.kind==="block"&&matched){result.ready=false;result.blockers.push("blocked by environment: "+r.text);}else if(r.kind==="boost"&&matched)result.bonuses.push("environmental boost: "+r.text);else if(r.kind==="weaken"&&matched)result.cautions.push("environmental weakening: "+r.text);else if(r.kind==="trigger"&&matched)result.bonuses.push("environmental trigger present: "+r.text);}}
    if(p.operationalNote&&p.operationalState!=="ready")result.notes.push(shortText(p.operationalNote,140));return result;}
  function mechanicAttemptWarnings(st,p,intent){var out=[],sem=p&&p.semantic?p.semantic:semanticFromName(p?p.name:""),mechs=(sem&&sem.mechanics)||[],low=lower(intent||""),name=lower(p&&p.name||"");function has(m){return mechs.indexOf(m)>=0||name.indexOf(m)>=0;}
    if(st.config.strictMechanics&&has("manipulation")&&/\b(?:generate|create|conjure|materialize|produce)\b|\bfrom (?:nothing|empty air|thin air)\b/i.test(low))out.push("manipulation does not establish generation/creation from nothing");
    if(st.config.strictMechanics&&has("generation")&&/\b(?:fine control|precisely control|manipulate existing|redirect existing|reshape existing)\b/i.test(low))out.push("generation does not automatically establish fine manipulation of existing material");
    if(st.config.strictMechanics&&has("resistance")&&/\b(?:immune|immunity|completely unaffected|no effect at all)\b/i.test(low))out.push("resistance is not immunity");
    if(st.config.strictMechanics&&has("absorption")&&/\b(?:keep permanently|retain forever|permanent ownership|own the power)\b/i.test(low))out.push("absorption does not automatically establish permanent ownership");
    if(st.config.strictMechanics&&(name.indexOf("teleport")>=0)&&/\b(?:portal|gateway|wormhole)\b/i.test(low)&&name.indexOf("portal")<0)out.push("teleportation does not automatically establish portal creation");
    if(st.config.strictMechanics&&name.indexOf("time stop")>=0&&/\b(?:travel|go|jump|send)\b[^.!?]{0,25}\b(?:past|future|back in time|forward in time)\b/i.test(low))out.push("Time Stop does not establish Time Travel");
    if(st.config.strictMechanics&&name.indexOf("time travel")>=0&&/\b(?:stop|freeze|halt)\s+time\b/i.test(low))out.push("Time Travel does not establish Time Stop");
    return out;}
  function assessAttemptRecord(st,e,p,intent,environment){var result=assessPowerRecord(st,e,p,environment);result.intent=shortText(intent||"",180);result.mechanicWarnings=mechanicAttemptWarnings(st,p,intent);if(result.mechanicWarnings.length)result.conditional=true;return result;}
  function apiAssessPower(name,powerName,environment){var st=init(),e,d,p;if(!st)return{exists:false,status:"unknown",availability:"unknown",operational:"unknown",ready:false,conditional:true,blockers:["POWERS state unavailable"],cautions:[],bonuses:[],notes:[]};e=resolveEntityForApi(st,name);if(!e)return{exists:false,status:"unknown",availability:"unknown",operational:"unknown",ready:false,conditional:true,blockers:["entity not found"],cautions:[],bonuses:[],notes:[]};d=findDefForApi(powerName);p=e.powers[d.id];return assessPowerRecord(st,e,p,environment);}
  function apiAssessAttempt(name,powerName,intent,environment){var st=init(),e,d,p;if(!st)return{exists:false,ready:false,conditional:true,blockers:["POWERS state unavailable"],cautions:[],bonuses:[],notes:[],mechanicWarnings:[]};e=resolveEntityForApi(st,name);if(!e)return{exists:false,ready:false,conditional:true,blockers:["entity not found"],cautions:[],bonuses:[],notes:[],mechanicWarnings:[]};d=findDefForApi(powerName);p=e.powers[d.id];if(!p)return{exists:false,ready:false,conditional:true,blockers:["power not established"],cautions:[],bonuses:[],notes:[],mechanicWarnings:[]};return assessAttemptRecord(st,e,p,intent,environment);}
  function apiSetActiveVariant(name,powerName,variantName,reason){var st=init(),e,d,p;if(!st)return null;e=resolveOrCreateEntityForApi(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);if(!variantName){clearActiveVariant(st,p,reason||"API returned power to baseline","api");return p;}recordVariant(st,p,String(variantName),reason||("API activated "+variantName),"api",true);return p;}
  function apiDiagnostics(){var st=init(),out={engine:ENGINE_NAME,turn:0,action:currentActionCount(),entities:0,powers:0,confirmed:0,probable:0,psycheRecords:0,variants:0,operationalNonReady:0,configPreset:"custom",configWarnings:[]};if(!st)return out;out.turn=st.turn;out.entities=st.entityOrder.length;out.configPreset=st.config.configPreset||"custom";out.configWarnings=(st.configWarnings||[]).slice();for(var i=0;i<st.entityOrder.length;i++){var e=st.entities[st.entityOrder[i]];if(!e)continue;for(var j=0;j<e.powerOrder.length;j++){var p=e.powers[e.powerOrder[j]];if(!p)continue;out.powers++;if(p.status==="confirmed")out.confirmed++;else if(p.status==="probable")out.probable++;out.variants+=(p.variants||[]).length;if(p.operationalState&&p.operationalState!=="ready")out.operationalNonReady++;}if(e.psyche)for(var k in e.psyche)if(hasOwn(e.psyche,k))out.psycheRecords+=e.psyche[k].length;}return out;}

  function apiSummary(name) {
    var st=init(), e; if(!st) return ""; e=resolveEntityForApi(st,name); if(!e) return "";
    return entitySummary(st,e,st.config.contextDetail);
  }

  function onInput(textValue) {
    var st=init();if(!st||!st.config.enabled)return textValue;st.hookCount+=1;bootstrapFromHistory(st);processText(st,textValue,"input");maybeMessage(st);return textValue;
  }

  function stripTrailingPowersLedger(textValue){
    var t=String(textValue||""),marker="\n\n[POWERS — continuity ledger.",idx=t.lastIndexOf(marker);
    if(idx<0&&t.indexOf("[POWERS — continuity ledger.")===0)return "";
    return idx>=0?t.slice(0,idx):t;
  }

  function onContext(textValue) {
    var st=init();if(!st||!st.config.enabled)return textValue;st.hookCount+=1;bootstrapFromHistory(st);
    var original=stripTrailingPowersLedger(textValue),ledger=buildLedger(st,original.slice(-7000)),maxChars=0,memoryLength=0,room,dynamicKeep;
    if(!ledger)return original;
    try{if(typeof info!=="undefined"&&info){maxChars=Number(info.maxChars||0);memoryLength=Number(info.memoryLength||0);}}catch(e){}
    if(maxChars>0&&st.config.contextSafetyMargin>0&&maxChars>memoryLength+st.config.contextSafetyMargin+700)maxChars-=st.config.contextSafetyMargin;
    if(maxChars>0&&original.length+ledger.length+2>maxChars){
      room=maxChars-ledger.length-2;if(room<Math.max(400,memoryLength)){ledger=shortText(ledger,Math.max(500,maxChars-Math.max(300,memoryLength)-4));room=maxChars-ledger.length-2;}
      if(room<300)return textValue;
      memoryLength=clamp(memoryLength,0,original.length);dynamicKeep=Math.max(0,room-memoryLength);original=original.slice(0,memoryLength)+(dynamicKeep?original.slice(-dynamicKeep):"");
    }
    return original+"\n\n"+ledger;
  }

  function onOutput(textValue) {
    var st=init();if(!st||!st.config.enabled)return textValue;st.hookCount+=1;st.turn+=1;bootstrapFromHistory(st);processText(st,textValue,"output");syncStoryCards(st);maybeMessage(st);return textValue;
  }

  return {
    name: ENGINE_NAME,
    onInput:onInput,onContext:onContext,onOutput:onOutput,
    api:{
      getEntity:apiGetEntity,hasPower:apiHasPower,recordPower:apiRecordPower,recordFeat:apiRecordFeat,addConstraint:apiAddConstraint,setAvailability:apiSetAvailability,getSemantics:apiGetSemantics,recordApplication:apiRecordApplication,recordTrait:apiRecordTrait,recordInteraction:apiRecordInteraction,
      setOperationalState:apiSetOperationalState,setAccessMode:apiSetAccessMode,recordVariant:apiRecordVariant,recordEnvironmentRule:apiRecordEnvironmentRule,recordTechnique:apiRecordTechnique,recordResource:apiRecordResource,recordSignature:apiRecordSignature,recordTraining:apiRecordTraining,setReliability:apiSetReliability,setPrecision:apiSetPrecision,recordPsyche:apiRecordPsyche,resolvePsyche:apiResolvePsyche,snapshot:apiSnapshot,assessPower:apiAssessPower,assessAttempt:apiAssessAttempt,setActiveVariant:apiSetActiveVariant,diagnostics:apiDiagnostics,summary:apiSummary
    }
  };
})();
