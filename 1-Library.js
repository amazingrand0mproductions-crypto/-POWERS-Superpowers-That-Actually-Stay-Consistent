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
 * - Inner Current: evidence-anchored private psyche continuity for goals, fears, beliefs, secrets, plans, restraint and power identity.
 */

var POWERS = (function () {
  "use strict";

  var ENGINE_VERSION = "6.0";
  var NS = "powers";

  var DEFAULTS = {
    enabled: true,
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
    innerCurrent: true,
    psycheDetection: "balanced",       // conservative | balanced
    protectPlayerAgency: true,
    trackGoals: true,
    trackPlans: true,
    trackFears: true,
    trackBeliefs: true,
    trackSecrets: true,
    trackEmotions: true,
    trackRestraints: true,
    trackSelfImage: true,
    trackInnerConflicts: true,
    trackPowerIdentity: true,
    trackEmotionLinks: true,
    attributionEngine: true,
    hypotheticalGuard: true,
    timelineGuard: true,
    trackAccessModes: true,
    trackLimitTypes: true,
    trackTechniques: true,
    trackReliability: true,
    trackPrecision: true,
    trackResources: true,
    trackSignatures: true,
    trackTraining: true,
    trackSynergies: true,
    trackCollateral: true,
    trackDiscoveries: true,
    autoStoryCards: true,
    autoPsycheCards: true,
    syncOnlyOnChange: true,
    adaptiveContext: true,
    storyCardInterval: 6,
    psycheCardInterval: 8,
    contextDetail: "medium",           // low | medium | high
    contextChars: 3600,
    psycheContextChars: 1400,
    contextReserveChars: 500,
    maxContextEntities: 6,
    maxPowersPerEntity: 8,
    maxEvidencePerPower: 8,
    maxFeatsPerPower: 7,
    maxNotesPerPower: 6,
    maxRecentEvents: 12,
    maxApplicationsPerPower: 8,
    maxTraitsPerPower: 8,
    maxTechniquesPerPower: 8,
    maxResourcesPerPower: 6,
    maxSignaturesPerPower: 5,
    maxTrainingNotesPerPower: 8,
    maxSynergies: 16,
    maxInteractions: 18,
    maxPsycheItems: 6,
    emotionDecayTurns: 8,
    dedupeWindow: 180,
    confirmScore: 2.4,
    probableScore: 1.25,
    failedAttemptPenalty: 0.0,          // failures should not erase an established power
    featScore: 1.6,
    explicitScore: 2.6,
    claimScore: 1.1,
    debug: false,
    showMessages: false
  };

  var CONFIG_ENUMS = {
    mode: { narrative: 1, balanced: 1, simulation: 1 },
    detection: { conservative: 1, balanced: 1, aggressive: 1 },
    psycheDetection: { conservative: 1, balanced: 1 },
    contextDetail: { low: 1, medium: 1, high: 1 }
  };

  var BOOL_KEYS = {
    enabled: 1, trackPlayer: 1, trackNPCs: 1, allowCustomPowers: 1,
    inferFromFeats: 1, trackProgression: 1, trackForms: 1,
    trackDefenses: 1, trackTemporaryEffects: 1, trackPowerSources: 1,
    trackInteractions: 1, ontologyDetection: 1, trackApplications: 1, trackTraits: 1,
    strictMechanics: 1, highTierGuard: 1, trackActivation: 1, trackPowerLinks: 1,
    innerCurrent: 1, protectPlayerAgency: 1, trackGoals: 1, trackPlans: 1, trackFears: 1,
    trackBeliefs: 1, trackSecrets: 1, trackEmotions: 1, trackRestraints: 1, trackSelfImage: 1,
    trackInnerConflicts: 1, trackPowerIdentity: 1, trackEmotionLinks: 1,
    attributionEngine: 1, hypotheticalGuard: 1, timelineGuard: 1, trackAccessModes: 1, trackLimitTypes: 1,
    trackTechniques: 1, trackReliability: 1, trackPrecision: 1, trackResources: 1, trackSignatures: 1,
    trackTraining: 1, trackSynergies: 1, trackCollateral: 1, trackDiscoveries: 1,
    autoStoryCards: 1, autoPsycheCards: 1, syncOnlyOnChange: 1, adaptiveContext: 1, debug: 1, showMessages: 1
  };

  var NUM_KEYS = {
    storyCardInterval: [1, 50], psycheCardInterval: [1, 50], contextChars: [800, 8000], psycheContextChars: [300, 3500], contextReserveChars: [100, 2500],
    maxContextEntities: [1, 12], maxPowersPerEntity: [1, 16],
    maxEvidencePerPower: [2, 16], maxFeatsPerPower: [2, 15],
    maxNotesPerPower: [2, 12], maxRecentEvents: [4, 30],
    maxApplicationsPerPower: [2, 16], maxTraitsPerPower: [2, 16],
    maxTechniquesPerPower: [2, 16], maxResourcesPerPower: [2, 12], maxSignaturesPerPower: [1, 10],
    maxTrainingNotesPerPower: [2, 16], maxSynergies: [2, 30], maxInteractions: [4, 40],
    maxPsycheItems: [2, 12], emotionDecayTurns: [2, 30], dedupeWindow: [40, 400],
    confirmScore: [1, 6], probableScore: [0.25, 5],
    failedAttemptPenalty: [-2, 1], featScore: [0.1, 2],
    explicitScore: [0.5, 5], claimScore: [0.1, 3]
  };

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
    {id:"invisibility", name:"Invisibility", cat:"stealth", terms:["invisibility","invisible","turn invisible","become invisible","vanish from sight"], feats:["fades from sight","disappears from view","becomes invisible"]},
    {id:"intangibility", name:"Intangibility / Phasing", cat:"defense", terms:["intangibility","intangible","phasing","phase through","phases through","walk through walls","pass through solid matter"], feats:["passes through the wall","phases through the wall","attack passes through"]},
    {id:"teleportation", name:"Teleportation", cat:"mobility", terms:["teleportation","teleport","teleports","blink travel","blink away","instant teleport"], feats:["vanishes and reappears","disappears and reappears","appears several meters away","appears behind"]},
    {id:"portals", name:"Portal Creation", cat:"mobility", terms:["portal creation","create portals","opens a portal","open portals","gateway creation","wormhole creation"], feats:["portal opens","gateway opens","rift opens in the air"]},
    {id:"shapeshifting", name:"Shapeshifting", cat:"transformation", terms:["shapeshifting","shapeshift","shapeshifter","shape-shifting","shape shifter","change shape","changes shape","transform into animals","morph into"], feats:["body reshapes into","form changes into","morphs into"]},
    {id:"size_change", name:"Size Manipulation", cat:"transformation", terms:["size manipulation","size changing","grow giant","shrink down","change size","giant form","miniaturization"], feats:["grows to twice","shrinks to the size","becomes gigantic","grows enormous"]},
    {id:"elasticity", name:"Elasticity", cat:"physical", terms:["elasticity","stretching powers","stretch his body","stretch her body","stretch their body","rubber body"], feats:["arm stretches","arms stretch","body stretches"]},
    {id:"duplication", name:"Duplication", cat:"transformation", terms:["duplication","duplicate himself","duplicate herself","duplicate themselves","create clones","cloning power","copies of himself","copies of herself"], feats:["another copy of him","another copy of her","duplicate steps out"]},
    {id:"density", name:"Density Manipulation", cat:"transformation", terms:["density manipulation","change density","increase density","decrease density"], feats:["becomes impossibly heavy","body turns light as air"]},
    {id:"adaptation", name:"Adaptive Evolution", cat:"physical", terms:["adaptive evolution","reactive adaptation","adapt to threats","adapts to threats","evolve in response"], feats:["body adapts to","develops resistance to"]},
    {id:"pyrokinesis", name:"Fire Manipulation", cat:"elemental", terms:["pyrokinesis","fire manipulation","control fire","controls fire","control existing fire","controls existing fire","manipulate fire","manipulates fire","flame manipulation"], feats:["flames coil around","existing flames bend","fire twists around"]},
    {id:"fire_generation", name:"Fire Generation", cat:"elemental", terms:["fire generation","generate fire","create fire","produce fire","flame generation","create flames"], feats:["flames erupt from","fire blooms from","summons fire","creates fire in"]},
    {id:"cryokinesis", name:"Ice Manipulation", cat:"elemental", terms:["cryokinesis","ice manipulation","control ice","controls ice","ice control"], feats:["existing ice bends","ice shifts at","ice reshapes","frost is redirected"]},
    {id:"ice_generation", name:"Ice Generation", cat:"elemental", terms:["ice generation","generate ice","create ice","produce ice","freeze water into ice","ice creation"], feats:["ice forms from nothing","ice spreads from","frost races across","encases in newly formed ice"]},
    {id:"freezing", name:"Freezing / Cold Inducement", cat:"elemental", terms:["freezing power","cold inducement","freeze things","flash freezing","induce freezing","frostbite inducement"], feats:["freezes the","temperature plunges around","flash-freezes"]},
    {id:"electrokinesis", name:"Electricity Manipulation", cat:"elemental", terms:["electrokinesis","electricity manipulation","electric powers","control electricity","lightning manipulation"], feats:["electricity bends toward","current redirects","lightning changes course"]},
    {id:"electric_generation", name:"Electricity Generation", cat:"elemental", terms:["electricity generation","generate electricity","generate lightning","produce electricity","lightning generation","electrical emission"], feats:["lightning arcs from","electricity crackles from","bolt of lightning erupts"]},
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
    {id:"power_absorption", name:"Power Absorption", cat:"meta", terms:["power absorption","absorb powers","absorbs powers","drain powers","power drain"], feats:["power drains into","ability energy is absorbed"]},
    {id:"power_theft", name:"Power Theft", cat:"meta", terms:["steal powers","steals powers","power theft","stolen powers","take someone's power","takes their power"], feats:["ability fades as he takes","ability fades as she takes","power is ripped away"]},
    {id:"power_copying", name:"Power Copying", cat:"meta", terms:["power copying","copy powers","copies powers","mimic powers","mimic abilities","power mimicry"], feats:["copies the ability","gains the same power"]},
    {id:"power_nullification", name:"Power Nullification", cat:"meta", terms:["power nullification","nullify powers","nullifies powers","suppress powers","suppresses powers","power dampening","anti-power field"], feats:["powers stop working","ability cuts out","power dies in his presence","power dies in her presence"]},
    {id:"power_amplification", name:"Power Amplification", cat:"meta", terms:["power amplification","amplify powers","boost powers","enhance powers","empower others"], feats:["power surges stronger","ability suddenly intensifies"]},
    {id:"magic", name:"Magic / Sorcery", cat:"mystic", terms:["magic powers","sorcery","spellcasting","spell-casting","arcane magic","witchcraft","wizardry","casts spells"], feats:["casts a spell","runes ignite","arcane energy","spell takes hold"]},
    {id:"necromancy", name:"Necromancy", cat:"mystic", terms:["necromancy","raise the dead","raises the dead","command undead","death magic"], feats:["corpse rises","dead rise at","skeleton claws free"]},
    {id:"summoning", name:"Summoning", cat:"mystic", terms:["summoning power","summon creatures","summons creatures","conjuration","conjure beings"], feats:["summons a","conjures a","creature materializes"]},
    {id:"spirit", name:"Spirit / Soul Manipulation", cat:"mystic", terms:["spirit manipulation","soul manipulation","control spirits","control souls","soul powers"], feats:["soul is pulled","spirit is bound","ghost is compelled"]},
    {id:"shadow", name:"Shadow Manipulation", cat:"mystic", terms:["shadow manipulation","control shadows","shadow powers","darkness manipulation","umbra powers"], feats:["shadows coil","darkness gathers","shadow rises"]},
    {id:"light", name:"Light Manipulation", cat:"energy", terms:["light manipulation","control light","photokinesis","light powers"], feats:["light bends around","burst of light","hard light"]},
    {id:"sound", name:"Sound Manipulation", cat:"energy", terms:["sound manipulation","sonokinesis","control sound","bend sound","silence manipulation"], feats:["sound bends around","noise vanishes","sound is redirected"]},
    {id:"sonic_emission", name:"Sonic Emission", cat:"energy", terms:["sonic scream","sonic emission","sonic blast","emit sound waves","sound blast"], feats:["sonic boom erupts","voice shatters","sound wave blasts"]},
    {id:"heat_vision", name:"Heat Vision", cat:"energy", terms:["heat vision","laser eyes","eye beams","optic blast","optic beams"], feats:["beams shoot from his eyes","beams shoot from her eyes","eyes fire beams","red beams from his eyes","red beams from her eyes"]},
    {id:"radiation", name:"Radiation Manipulation", cat:"energy", terms:["radiation manipulation","control radiation","redirect radiation","radioactive energy manipulation"], feats:["radiation bends around","redirects the radiation","radiation field shifts"]},
    {id:"radiation_generation", name:"Radiation Generation", cat:"energy", terms:["radiation generation","emit radiation","generate radiation","produce radiation","radiation emission"], feats:["geiger counter screams","radiation pours from","emits a burst of radiation"]},
    {id:"poison", name:"Toxin / Poison Generation", cat:"biological", terms:["poison generation","toxin generation","venom powers","toxic secretion","poison powers"], feats:["venom drips","toxin spreads","poison seeps"]},
    {id:"biokinesis", name:"Biokinesis", cat:"biological", terms:["biokinesis","biological manipulation","flesh manipulation","control biology","body manipulation"], feats:["flesh reshapes","biology changes","cells rewrite"]},
    {id:"technopathy", name:"Technopathy", cat:"technology", terms:["technopathy","technokinesis","control technology","communicate with machines","machine control"], feats:["machine obeys without touching","computer responds to his thoughts","computer responds to her thoughts"]},
    {id:"cyberpathy", name:"Cyberpathy", cat:"technology", terms:["cyberpathy","interface with computers mentally","mind-machine interface","mentally access computers"], feats:["enters the network with his mind","enters the network with her mind"]},
    {id:"time", name:"Time Manipulation", cat:"fundamental", terms:["time manipulation","control time","slow time","slows time","speed up time","accelerate time","temporal manipulation","time dilation"], feats:["time slows around","time accelerates around","temporal flow bends"]},
    {id:"time_stop", name:"Time Stop", cat:"fundamental", terms:["time stop","stop time","stops time","stopping time","freeze time","freezes time","freezing time","temporal stasis"], feats:["time freezes","freezes time","stops time","time stops around","world freezes around"]},
    {id:"time_reversal", name:"Time Reversal", cat:"fundamental", terms:["time reversal","rewind time","rewinds time","reverse time","turn back time","temporal rewind"], feats:["rewinds the last","time runs backward","events reverse themselves"]},
    {id:"time_travel", name:"Time Travel", cat:"mobility", terms:["time travel","travel through time","travel backward through time","travel backwards through time","travel forward through time","travel forwards through time","travel back in time","travel to the past","travel to the future","jump through time","temporal travel"], feats:["appears in the past","jumps forward in time","vanishes into another era"]},
    {id:"space", name:"Space Manipulation", cat:"fundamental", terms:["space manipulation","spatial manipulation","bend space","fold space","warp space"], feats:["space folds","distance collapses","space bends around"]},
    {id:"reality", name:"Reality Warping", cat:"fundamental", terms:["reality warping","reality manipulation","alter reality","rewrite reality","reality powers"], feats:["reality rewrites","world changes at his word","world changes at her word"]},
    {id:"probability", name:"Probability Manipulation", cat:"fundamental", terms:["probability manipulation","luck manipulation","control probability","probability powers","supernatural luck"], feats:["impossible coincidence","odds twist","luck bends"]},
    {id:"matter", name:"Matter Manipulation", cat:"fundamental", terms:["matter manipulation","control matter","rearrange matter","molecular rearrangement"], feats:["matter reshapes","material structure bends"]},
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
    {id:"astral_projection", name:"Astral Projection", cat:"mystic", terms:["astral projection","astral form","project the spirit","leave the body as a spirit"], feats:["astral body rises","spirit steps out of the body"]},
    {id:"resurrection", name:"Resurrection", cat:"recovery", terms:["resurrection","resurrect the dead","revive the dead","bring back the dead","raise someone to life"], feats:["returns the dead to life","heartbeat starts again after death"]},
    {id:"dimensional_travel", name:"Dimensional Travel", cat:"mobility", terms:["dimensional travel","travel between dimensions","cross dimensions","interdimensional travel","plane shifting","realm travel"], feats:["steps into another dimension","crosses into another reality"]},
    {id:"pocket_dimension", name:"Pocket Dimension", cat:"fundamental", terms:["pocket dimension","personal dimension","create a dimension","dimensional storage","subspace storage"], feats:["opens a private dimension","stores it outside normal space"]},
    {id:"vibration", name:"Vibration Manipulation", cat:"fundamental", terms:["vibration manipulation","control vibrations","vibration powers","vibrate molecules"], feats:["vibrates through","vibration shatters","molecules begin vibrating"]},
    {id:"kinetic", name:"Kinetic Energy Manipulation", cat:"energy", terms:["kinetic energy manipulation","kinetic absorption","kinetic control","store kinetic energy","redirect kinetic energy"], feats:["absorbs the impact","stores the force of the blow","releases the stolen momentum"]},
    {id:"friction", name:"Friction Manipulation", cat:"fundamental", terms:["friction manipulation","control friction","remove friction","increase friction"], feats:["surface becomes frictionless","feet lock as friction spikes"]},
    {id:"plasma", name:"Plasma Manipulation", cat:"elemental", terms:["plasma manipulation","control plasma","plasma control"], feats:["plasma bends","plasma coils","existing plasma gathers"]},
    {id:"plasma_generation", name:"Plasma Generation", cat:"elemental", terms:["plasma generation","generate plasma","create plasma","produce plasma","plasma emission"], feats:["plasma bolt erupts","white-hot plasma forms","plasma pours from"]},
    {id:"lava", name:"Lava / Magma Manipulation", cat:"elemental", terms:["lava manipulation","magma manipulation","control lava","control magma","lavakinesis"], feats:["magma rises","lava coils","ground melts into lava"]},
    {id:"metal", name:"Metal Manipulation", cat:"elemental", terms:["metal manipulation","control metal","ferrokinesis","bend metal with the mind"], feats:["metal bends toward","steel twists at"]},
    {id:"sand", name:"Sand Manipulation", cat:"elemental", terms:["sand manipulation","control sand","sand powers","arenakinesis"], feats:["sand rises in a wave","sand coils around"]},
    {id:"smoke", name:"Smoke Manipulation", cat:"elemental", terms:["smoke manipulation","control smoke","smoke powers"], feats:["smoke coils at","smoke bends around"]},
    {id:"smoke_form", name:"Smoke Transformation", cat:"transformation", terms:["become smoke","turn into smoke","smoke form","smoke transformation","body of smoke"], feats:["body dissolves into smoke","turns completely to smoke"]},
    {id:"acid", name:"Acid Manipulation", cat:"elemental", terms:["acid manipulation","control acid","acid control"], feats:["acid bends around","acid rises against gravity"]},
    {id:"acid_generation", name:"Acid Generation", cat:"elemental", terms:["acid generation","generate acid","corrosive secretion","produce acid","secrete acid"], feats:["acid sprays from","corrosive fluid pours from"]},
    {id:"crystal", name:"Crystal Manipulation", cat:"elemental", terms:["crystal manipulation","control crystals","crystal control"], feats:["crystals bend","crystal shards hover"]},
    {id:"crystal_generation", name:"Crystal Generation", cat:"elemental", terms:["crystal generation","create crystals","generate crystals","grow crystals"], feats:["crystals erupt","crystal grows across"]},
    {id:"glass", name:"Glass Manipulation", cat:"elemental", terms:["glass manipulation","control glass","glass powers"], feats:["glass bends like liquid","shards hover around"]},
    {id:"blood", name:"Blood Manipulation", cat:"biological", terms:["blood manipulation","blood control","hemokinesis","blood powers"], feats:["blood rises against gravity","controls the blood"]},
    {id:"bone", name:"Bone Manipulation", cat:"biological", terms:["bone manipulation","bone powers","control bone","grow bone weapons"], feats:["bone blade grows","bones reshape"]},
    {id:"camouflage", name:"Adaptive Camouflage", cat:"stealth", terms:["adaptive camouflage","camouflage power","blend into surroundings","chameleon skin"], feats:["skin matches the wall","blends perfectly into"]},
    {id:"animal_control", name:"Animal Control", cat:"psychic", terms:["animal control","control animals","command animals","compel animals"], feats:["animals obey the silent command","animals move at the command"]},
    {id:"animal_communication", name:"Animal Communication", cat:"psychic", terms:["animal telepathy","speak to animals","communicate with animals","talk to animals"], feats:["speaks with the animal","understands the animal reply"]},
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
    {id:"illusion", name:"Illusion Manipulation", cat:"psychic", terms:["illusion manipulation","control illusions","reshape illusions","alter illusions"], feats:["existing illusion changes","illusion bends around","reshapes the illusion"]},
    {id:"illusion_creation", name:"Illusion Creation / Projection", cat:"psychic", terms:["illusion creation","create illusions","cast illusions","illusion powers","hallucination projection","project illusions"], feats:["illusion appears","false image fills","scene changes without becoming real"]},
    {id:"sensory_manipulation", name:"Sensory Manipulation", cat:"psychic", terms:["sensory manipulation","alter senses","manipulate senses","sensory distortion","sensory deprivation"], feats:["vision distorts","hearing vanishes","senses are rewritten"]},
    {id:"hypnosis", name:"Hypnosis", cat:"psychic", terms:["hypnosis","hypnotic suggestion","mesmerism","hypnotize","hypnotizes"], feats:["falls into a trance","suggestion takes hold"]},
    {id:"body_swap", name:"Body Swapping", cat:"psychic", terms:["body swap","body swapping","swap bodies","switch bodies","exchange bodies"], feats:["wakes in the other body","their minds trade bodies"]},
    {id:"mind_transfer", name:"Mind Transfer", cat:"psychic", terms:["mind transfer","transfer consciousness","consciousness transfer","move mind into another body"], feats:["consciousness moves into","mind leaves one body for another"]},
    {id:"curse", name:"Curse Manipulation", cat:"mystic", terms:["curse manipulation","curse magic","place a curse","remove curses","control curses"], feats:["curse takes hold","curse mark appears"]},
    {id:"blessing", name:"Blessing Bestowal", cat:"mystic", terms:["blessing power","bestow blessings","grant a blessing","divine blessing"], feats:["blessing settles over","divine mark appears"]},
    {id:"sealing", name:"Sealing", cat:"mystic", terms:["sealing power","seal powers","seal magic","seal an entity","mystic sealing"], feats:["seal locks into place","power is sealed away"]},
    {id:"banishment", name:"Banishment", cat:"mystic", terms:["banishment","banish entities","banishing spell","exile to another realm"], feats:["is banished","vanishes into another realm"]},
    {id:"void", name:"Void Manipulation", cat:"fundamental", terms:["void manipulation","void powers","control the void","nothingness manipulation","abyss manipulation"], feats:["void opens","nothingness consumes"]},
    {id:"causality", name:"Causality Manipulation", cat:"fundamental", terms:["causality manipulation","cause and effect manipulation","rewrite causality","causal manipulation"], feats:["cause is severed from effect","outcome occurs without its cause"]},
    {id:"fate", name:"Fate Manipulation", cat:"fundamental", terms:["fate manipulation","destiny manipulation","control fate","rewrite destiny"], feats:["fate twists","destiny changes"]},
    {id:"law", name:"Law Manipulation", cat:"fundamental", terms:["law manipulation","alter natural laws","rewrite laws of physics","rule manipulation"], feats:["physical law changes","rule of reality is rewritten"]},
    {id:"concept", name:"Concept Manipulation", cat:"fundamental", terms:["concept manipulation","conceptual manipulation","alter concepts","erase a concept"], feats:["concept itself changes","idea is erased from reality"]},
    {id:"entropy", name:"Entropy Manipulation", cat:"fundamental", terms:["entropy manipulation","control entropy","accelerate decay","reverse entropy"], feats:["object rapidly decays","decay reverses"]},
    {id:"mass", name:"Mass Manipulation", cat:"fundamental", terms:["mass manipulation","alter mass","increase mass","decrease mass"], feats:["mass increases without changing size","object becomes nearly massless"]},
    {id:"inertia", name:"Inertia Manipulation", cat:"fundamental", terms:["inertia manipulation","control inertia","remove inertia","increase inertia"], feats:["motion stops without impact","object resists acceleration unnaturally"]},
    {id:"vector", name:"Vector Manipulation", cat:"fundamental", terms:["vector manipulation","control vectors","redirect vectors","vector control"], feats:["force changes direction","attack reverses direction"]},
    {id:"pressure", name:"Pressure Manipulation", cat:"fundamental", terms:["pressure manipulation","air pressure control","control pressure","pressure powers"], feats:["pressure spikes","air pressure collapses"]},
    {id:"temperature", name:"Temperature Manipulation", cat:"fundamental", terms:["temperature manipulation","control temperature","thermal manipulation","alter temperature"], feats:["temperature plunges","air heats instantly"]},
    {id:"atomic", name:"Atomic Manipulation", cat:"fundamental", terms:["atomic manipulation","control atoms","atom manipulation","atomic restructuring"], feats:["atomic structure changes","atoms rearrange"]},
    {id:"molecular", name:"Molecular Manipulation", cat:"fundamental", terms:["molecular manipulation","control molecules","molecular restructuring","molecule manipulation"], feats:["molecular structure changes","molecules rearrange"]},
    {id:"information", name:"Information Manipulation", cat:"fundamental", terms:["information manipulation","data manipulation","control information","rewrite information"], feats:["information rewrites itself","data changes without input"]},
    {id:"language", name:"Language Manipulation", cat:"psychic", terms:["language manipulation","linguistic manipulation","control language","alter meaning of words"], feats:["words change meaning","language rewrites itself"]},
    {id:"fusion", name:"Fusion", cat:"transformation", terms:["fusion power","fuse beings","merge bodies","combine into one being"], feats:["bodies merge into one","two forms fuse together"]},
    {id:"separation", name:"Separation", cat:"transformation", terms:["separation power","split beings","separate fused beings","divide body into parts"], feats:["fused form separates","body divides into independent parts"]},
    {id:"immortality", name:"Immortality", cat:"recovery", terms:["immortality","immortal","cannot die","ageless","eternal life"], feats:["returns from death","comes back to life"]}
  ];

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

  // Common classical/genre roots used by compositional power names. These do
  // not rename the authored power; they only make Power Genome semantics more
  // useful for unfamiliar -kinesis/-mancy/-pathy style abilities.
  var ONTOLOGY_ROOT_ALIASES = {
    pyro:"fire", hydro:"water", cryo:"ice/cold", aero:"air/wind", geo:"earth", electro:"electricity",
    thermo:"heat/temperature", chrono:"time", photo:"light", umbra:"shadow/darkness", hemo:"blood",
    bio:"life/biology", necro:"death", oneiro:"dream", techno:"technology", magneto:"magnetism",
    ferro:"metal", gravi:"gravity", astro:"stars/cosmos", atmos:"atmosphere/weather", soni:"sound",
    vibro:"vibration", toxico:"toxins", chemo:"chemistry", psycho:"mind/psyche", anima:"soul/spirit"
  };


  // ================================================================
  // EXTENDED POWER ATLAS
  // ================================================================
  // This data-driven layer expands exact recognition without replacing the
  // compositional Power Genome. Entries are intentionally mechanical and
  // generic: they provide canonical vocabulary, not copyrighted lore.
  var EXTENDED_POWER_ATLAS = [
    {
      id: "atlas_acid_manipulation",
      name: "Acid Manipulation",
      cat: "material",
      terms: ["acid manipulation", "acid control", "control acid", "manipulate acid"],
      feats: []
    },
    {
      id: "atlas_acid_generation",
      name: "Acid Generation",
      cat: "creation",
      terms: ["acid generation", "acid creation", "generate acid", "create acid"],
      feats: []
    },
    {
      id: "atlas_ash_manipulation",
      name: "Ash Manipulation",
      cat: "material",
      terms: ["ash manipulation", "ash control", "control ash", "manipulate ash"],
      feats: []
    },
    {
      id: "atlas_ash_generation",
      name: "Ash Generation",
      cat: "creation",
      terms: ["ash generation", "ash creation", "generate ash", "create ash"],
      feats: []
    },
    {
      id: "atlas_blood_manipulation",
      name: "Blood Manipulation",
      cat: "material",
      terms: ["blood manipulation", "blood control", "control blood", "manipulate blood"],
      feats: []
    },
    {
      id: "atlas_blood_generation",
      name: "Blood Generation",
      cat: "creation",
      terms: ["blood generation", "blood creation", "generate blood", "create blood"],
      feats: []
    },
    {
      id: "atlas_bone_manipulation",
      name: "Bone Manipulation",
      cat: "material",
      terms: ["bone manipulation", "bone control", "control bone", "manipulate bone"],
      feats: []
    },
    {
      id: "atlas_bone_generation",
      name: "Bone Generation",
      cat: "creation",
      terms: ["bone generation", "bone creation", "generate bone", "create bone"],
      feats: []
    },
    {
      id: "atlas_crystal_manipulation",
      name: "Crystal Manipulation",
      cat: "material",
      terms: ["crystal manipulation", "crystal control", "control crystal", "manipulate crystal"],
      feats: []
    },
    {
      id: "atlas_crystal_generation",
      name: "Crystal Generation",
      cat: "creation",
      terms: ["crystal generation", "crystal creation", "generate crystal", "create crystal"],
      feats: []
    },
    {
      id: "atlas_dust_manipulation",
      name: "Dust Manipulation",
      cat: "material",
      terms: ["dust manipulation", "dust control", "control dust", "manipulate dust"],
      feats: []
    },
    {
      id: "atlas_dust_generation",
      name: "Dust Generation",
      cat: "creation",
      terms: ["dust generation", "dust creation", "generate dust", "create dust"],
      feats: []
    },
    {
      id: "atlas_lava_manipulation",
      name: "Lava Manipulation",
      cat: "material",
      terms: ["lava manipulation", "lava control", "control lava", "manipulate lava"],
      feats: []
    },
    {
      id: "atlas_lava_generation",
      name: "Lava Generation",
      cat: "creation",
      terms: ["lava generation", "lava creation", "generate lava", "create lava"],
      feats: []
    },
    {
      id: "atlas_magma_manipulation",
      name: "Magma Manipulation",
      cat: "material",
      terms: ["magma manipulation", "magma control", "control magma", "manipulate magma"],
      feats: []
    },
    {
      id: "atlas_magma_generation",
      name: "Magma Generation",
      cat: "creation",
      terms: ["magma generation", "magma creation", "generate magma", "create magma"],
      feats: []
    },
    {
      id: "atlas_metal_manipulation",
      name: "Metal Manipulation",
      cat: "material",
      terms: ["metal manipulation", "metal control", "control metal", "manipulate metal"],
      feats: []
    },
    {
      id: "atlas_metal_generation",
      name: "Metal Generation",
      cat: "creation",
      terms: ["metal generation", "metal creation", "generate metal", "create metal"],
      feats: []
    },
    {
      id: "atlas_mud_manipulation",
      name: "Mud Manipulation",
      cat: "material",
      terms: ["mud manipulation", "mud control", "control mud", "manipulate mud"],
      feats: []
    },
    {
      id: "atlas_mud_generation",
      name: "Mud Generation",
      cat: "creation",
      terms: ["mud generation", "mud creation", "generate mud", "create mud"],
      feats: []
    },
    {
      id: "atlas_sand_manipulation",
      name: "Sand Manipulation",
      cat: "material",
      terms: ["sand manipulation", "sand control", "control sand", "manipulate sand"],
      feats: []
    },
    {
      id: "atlas_sand_generation",
      name: "Sand Generation",
      cat: "creation",
      terms: ["sand generation", "sand creation", "generate sand", "create sand"],
      feats: []
    },
    {
      id: "atlas_smoke_manipulation",
      name: "Smoke Manipulation",
      cat: "material",
      terms: ["smoke manipulation", "smoke control", "control smoke", "manipulate smoke"],
      feats: []
    },
    {
      id: "atlas_smoke_generation",
      name: "Smoke Generation",
      cat: "creation",
      terms: ["smoke generation", "smoke creation", "generate smoke", "create smoke"],
      feats: []
    },
    {
      id: "atlas_steam_manipulation",
      name: "Steam Manipulation",
      cat: "material",
      terms: ["steam manipulation", "steam control", "control steam", "manipulate steam"],
      feats: []
    },
    {
      id: "atlas_steam_generation",
      name: "Steam Generation",
      cat: "creation",
      terms: ["steam generation", "steam creation", "generate steam", "create steam"],
      feats: []
    },
    {
      id: "atlas_snow_manipulation",
      name: "Snow Manipulation",
      cat: "material",
      terms: ["snow manipulation", "snow control", "control snow", "manipulate snow"],
      feats: []
    },
    {
      id: "atlas_snow_generation",
      name: "Snow Generation",
      cat: "creation",
      terms: ["snow generation", "snow creation", "generate snow", "create snow"],
      feats: []
    },
    {
      id: "atlas_glass_manipulation",
      name: "Glass Manipulation",
      cat: "material",
      terms: ["glass manipulation", "glass control", "control glass", "manipulate glass"],
      feats: []
    },
    {
      id: "atlas_glass_generation",
      name: "Glass Generation",
      cat: "creation",
      terms: ["glass generation", "glass creation", "generate glass", "create glass"],
      feats: []
    },
    {
      id: "atlas_wood_manipulation",
      name: "Wood Manipulation",
      cat: "material",
      terms: ["wood manipulation", "wood control", "control wood", "manipulate wood"],
      feats: []
    },
    {
      id: "atlas_wood_generation",
      name: "Wood Generation",
      cat: "creation",
      terms: ["wood generation", "wood creation", "generate wood", "create wood"],
      feats: []
    },
    {
      id: "atlas_paper_manipulation",
      name: "Paper Manipulation",
      cat: "material",
      terms: ["paper manipulation", "paper control", "control paper", "manipulate paper"],
      feats: []
    },
    {
      id: "atlas_paper_generation",
      name: "Paper Generation",
      cat: "creation",
      terms: ["paper generation", "paper creation", "generate paper", "create paper"],
      feats: []
    },
    {
      id: "atlas_ink_manipulation",
      name: "Ink Manipulation",
      cat: "material",
      terms: ["ink manipulation", "ink control", "control ink", "manipulate ink"],
      feats: []
    },
    {
      id: "atlas_ink_generation",
      name: "Ink Generation",
      cat: "creation",
      terms: ["ink generation", "ink creation", "generate ink", "create ink"],
      feats: []
    },
    {
      id: "atlas_oil_manipulation",
      name: "Oil Manipulation",
      cat: "material",
      terms: ["oil manipulation", "oil control", "control oil", "manipulate oil"],
      feats: []
    },
    {
      id: "atlas_oil_generation",
      name: "Oil Generation",
      cat: "creation",
      terms: ["oil generation", "oil creation", "generate oil", "create oil"],
      feats: []
    },
    {
      id: "atlas_tar_manipulation",
      name: "Tar Manipulation",
      cat: "material",
      terms: ["tar manipulation", "tar control", "control tar", "manipulate tar"],
      feats: []
    },
    {
      id: "atlas_tar_generation",
      name: "Tar Generation",
      cat: "creation",
      terms: ["tar generation", "tar creation", "generate tar", "create tar"],
      feats: []
    },
    {
      id: "atlas_salt_manipulation",
      name: "Salt Manipulation",
      cat: "material",
      terms: ["salt manipulation", "salt control", "control salt", "manipulate salt"],
      feats: []
    },
    {
      id: "atlas_salt_generation",
      name: "Salt Generation",
      cat: "creation",
      terms: ["salt generation", "salt creation", "generate salt", "create salt"],
      feats: []
    },
    {
      id: "atlas_mercury_manipulation",
      name: "Mercury Manipulation",
      cat: "material",
      terms: ["mercury manipulation", "mercury control", "control mercury", "manipulate mercury"],
      feats: []
    },
    {
      id: "atlas_mercury_generation",
      name: "Mercury Generation",
      cat: "creation",
      terms: ["mercury generation", "mercury creation", "generate mercury", "create mercury"],
      feats: []
    },
    {
      id: "atlas_gold_manipulation",
      name: "Gold Manipulation",
      cat: "material",
      terms: ["gold manipulation", "gold control", "control gold", "manipulate gold"],
      feats: []
    },
    {
      id: "atlas_gold_generation",
      name: "Gold Generation",
      cat: "creation",
      terms: ["gold generation", "gold creation", "generate gold", "create gold"],
      feats: []
    },
    {
      id: "atlas_silver_manipulation",
      name: "Silver Manipulation",
      cat: "material",
      terms: ["silver manipulation", "silver control", "control silver", "manipulate silver"],
      feats: []
    },
    {
      id: "atlas_silver_generation",
      name: "Silver Generation",
      cat: "creation",
      terms: ["silver generation", "silver creation", "generate silver", "create silver"],
      feats: []
    },
    {
      id: "atlas_clay_manipulation",
      name: "Clay Manipulation",
      cat: "material",
      terms: ["clay manipulation", "clay control", "control clay", "manipulate clay"],
      feats: []
    },
    {
      id: "atlas_clay_generation",
      name: "Clay Generation",
      cat: "creation",
      terms: ["clay generation", "clay creation", "generate clay", "create clay"],
      feats: []
    },
    {
      id: "atlas_concrete_manipulation",
      name: "Concrete Manipulation",
      cat: "material",
      terms: ["concrete manipulation", "concrete control", "control concrete", "manipulate concrete"],
      feats: []
    },
    {
      id: "atlas_concrete_generation",
      name: "Concrete Generation",
      cat: "creation",
      terms: ["concrete generation", "concrete creation", "generate concrete", "create concrete"],
      feats: []
    },
    {
      id: "atlas_rubber_manipulation",
      name: "Rubber Manipulation",
      cat: "material",
      terms: ["rubber manipulation", "rubber control", "control rubber", "manipulate rubber"],
      feats: []
    },
    {
      id: "atlas_rubber_generation",
      name: "Rubber Generation",
      cat: "creation",
      terms: ["rubber generation", "rubber creation", "generate rubber", "create rubber"],
      feats: []
    },
    {
      id: "atlas_plastic_manipulation",
      name: "Plastic Manipulation",
      cat: "material",
      terms: ["plastic manipulation", "plastic control", "control plastic", "manipulate plastic"],
      feats: []
    },
    {
      id: "atlas_plastic_generation",
      name: "Plastic Generation",
      cat: "creation",
      terms: ["plastic generation", "plastic creation", "generate plastic", "create plastic"],
      feats: []
    },
    {
      id: "atlas_fabric_manipulation",
      name: "Fabric Manipulation",
      cat: "material",
      terms: ["fabric manipulation", "fabric control", "control fabric", "manipulate fabric"],
      feats: []
    },
    {
      id: "atlas_fabric_generation",
      name: "Fabric Generation",
      cat: "creation",
      terms: ["fabric generation", "fabric creation", "generate fabric", "create fabric"],
      feats: []
    },
    {
      id: "atlas_thread_manipulation",
      name: "Thread Manipulation",
      cat: "material",
      terms: ["thread manipulation", "thread control", "control thread", "manipulate thread"],
      feats: []
    },
    {
      id: "atlas_thread_generation",
      name: "Thread Generation",
      cat: "creation",
      terms: ["thread generation", "thread creation", "generate thread", "create thread"],
      feats: []
    },
    {
      id: "atlas_enhanced_agility",
      name: "Enhanced Agility",
      cat: "physical",
      terms: ["enhanced agility"],
      feats: []
    },
    {
      id: "atlas_enhanced_reflexes",
      name: "Enhanced Reflexes",
      cat: "physical",
      terms: ["enhanced reflexes"],
      feats: []
    },
    {
      id: "atlas_enhanced_stamina",
      name: "Enhanced Stamina",
      cat: "physical",
      terms: ["enhanced stamina"],
      feats: []
    },
    {
      id: "atlas_enhanced_balance",
      name: "Enhanced Balance",
      cat: "physical",
      terms: ["enhanced balance"],
      feats: []
    },
    {
      id: "atlas_enhanced_dexterity",
      name: "Enhanced Dexterity",
      cat: "physical",
      terms: ["enhanced dexterity"],
      feats: []
    },
    {
      id: "atlas_enhanced_coordination",
      name: "Enhanced Coordination",
      cat: "physical",
      terms: ["enhanced coordination"],
      feats: []
    },
    {
      id: "atlas_enhanced_flexibility",
      name: "Enhanced Flexibility",
      cat: "physical",
      terms: ["enhanced flexibility"],
      feats: []
    },
    {
      id: "atlas_enhanced_lung_capacity",
      name: "Enhanced Lung Capacity",
      cat: "physical",
      terms: ["enhanced lung capacity"],
      feats: []
    },
    {
      id: "atlas_enhanced_metabolism",
      name: "Enhanced Metabolism",
      cat: "physical",
      terms: ["enhanced metabolism"],
      feats: []
    },
    {
      id: "atlas_peak_human_condition",
      name: "Peak Human Condition",
      cat: "physical",
      terms: ["peak human condition"],
      feats: []
    },
    {
      id: "atlas_body_hardening",
      name: "Body Hardening",
      cat: "physical",
      terms: ["body hardening"],
      feats: []
    },
    {
      id: "atlas_dermal_armor",
      name: "Dermal Armor",
      cat: "physical",
      terms: ["dermal armor"],
      feats: []
    },
    {
      id: "atlas_natural_weaponry",
      name: "Natural Weaponry",
      cat: "physical",
      terms: ["natural weaponry"],
      feats: []
    },
    {
      id: "atlas_claw_retraction",
      name: "Claw Retraction",
      cat: "physical",
      terms: ["claw retraction"],
      feats: []
    },
    {
      id: "atlas_fang_retraction",
      name: "Fang Retraction",
      cat: "physical",
      terms: ["fang retraction"],
      feats: []
    },
    {
      id: "atlas_quill_generation",
      name: "Quill Generation",
      cat: "physical",
      terms: ["quill generation", "generate quill", "create quill"],
      feats: []
    },
    {
      id: "atlas_horn_generation",
      name: "Horn Generation",
      cat: "physical",
      terms: ["horn generation", "generate horn", "create horn"],
      feats: []
    },
    {
      id: "atlas_wing_manifestation",
      name: "Wing Manifestation",
      cat: "physical",
      terms: ["wing manifestation"],
      feats: []
    },
    {
      id: "atlas_gill_manifestation",
      name: "Gill Manifestation",
      cat: "physical",
      terms: ["gill manifestation"],
      feats: []
    },
    {
      id: "atlas_wall_crawling",
      name: "Wall Crawling",
      cat: "physical",
      terms: ["wall crawling"],
      feats: []
    },
    {
      id: "atlas_danger_sense",
      name: "Danger Sense",
      cat: "perception",
      terms: ["danger sense"],
      feats: []
    },
    {
      id: "atlas_aura_perception",
      name: "Aura Perception",
      cat: "perception",
      terms: ["aura perception"],
      feats: []
    },
    {
      id: "atlas_energy_perception",
      name: "Energy Perception",
      cat: "perception",
      terms: ["energy perception"],
      feats: []
    },
    {
      id: "atlas_life_detection",
      name: "Life Detection",
      cat: "perception",
      terms: ["life detection", "detect life", "sense life"],
      feats: []
    },
    {
      id: "atlas_death_detection",
      name: "Death Detection",
      cat: "perception",
      terms: ["death detection", "detect death", "sense death"],
      feats: []
    },
    {
      id: "atlas_magic_detection",
      name: "Magic Detection",
      cat: "perception",
      terms: ["magic detection", "detect magic", "sense magic"],
      feats: []
    },
    {
      id: "atlas_power_detection",
      name: "Power Detection",
      cat: "perception",
      terms: ["power detection", "detect power", "sense power"],
      feats: []
    },
    {
      id: "atlas_lie_detection",
      name: "Lie Detection",
      cat: "perception",
      terms: ["lie detection", "detect lie", "sense lie"],
      feats: []
    },
    {
      id: "atlas_truth_detection",
      name: "Truth Detection",
      cat: "perception",
      terms: ["truth detection", "detect truth", "sense truth"],
      feats: []
    },
    {
      id: "atlas_emotion_detection",
      name: "Emotion Detection",
      cat: "perception",
      terms: ["emotion detection", "detect emotion", "sense emotion"],
      feats: []
    },
    {
      id: "atlas_intent_detection",
      name: "Intent Detection",
      cat: "perception",
      terms: ["intent detection", "detect intent", "sense intent"],
      feats: []
    },
    {
      id: "atlas_hostility_detection",
      name: "Hostility Detection",
      cat: "perception",
      terms: ["hostility detection", "detect hostility", "sense hostility"],
      feats: []
    },
    {
      id: "atlas_weakness_detection",
      name: "Weakness Detection",
      cat: "perception",
      terms: ["weakness detection", "detect weakness", "sense weakness"],
      feats: []
    },
    {
      id: "atlas_soul_perception",
      name: "Soul Perception",
      cat: "perception",
      terms: ["soul perception"],
      feats: []
    },
    {
      id: "atlas_spirit_perception",
      name: "Spirit Perception",
      cat: "perception",
      terms: ["spirit perception"],
      feats: []
    },
    {
      id: "atlas_dimensional_awareness",
      name: "Dimensional Awareness",
      cat: "perception",
      terms: ["dimensional awareness"],
      feats: []
    },
    {
      id: "atlas_temporal_awareness",
      name: "Temporal Awareness",
      cat: "perception",
      terms: ["temporal awareness"],
      feats: []
    },
    {
      id: "atlas_spatial_awareness",
      name: "Spatial Awareness",
      cat: "perception",
      terms: ["spatial awareness"],
      feats: []
    },
    {
      id: "atlas_microscopic_vision",
      name: "Microscopic Vision",
      cat: "perception",
      terms: ["microscopic vision"],
      feats: []
    },
    {
      id: "atlas_telescopic_vision",
      name: "Telescopic Vision",
      cat: "perception",
      terms: ["telescopic vision"],
      feats: []
    },
    {
      id: "atlas_memory_manipulation",
      name: "Memory Manipulation",
      cat: "psychic",
      terms: ["memory manipulation", "control memory", "manipulate memory"],
      feats: []
    },
    {
      id: "atlas_memory_erasure",
      name: "Memory Erasure",
      cat: "psychic",
      terms: ["memory erasure"],
      feats: []
    },
    {
      id: "atlas_memory_restoration",
      name: "Memory Restoration",
      cat: "psychic",
      terms: ["memory restoration"],
      feats: []
    },
    {
      id: "atlas_memory_sharing",
      name: "Memory Sharing",
      cat: "psychic",
      terms: ["memory sharing"],
      feats: []
    },
    {
      id: "atlas_memory_implantation",
      name: "Memory Implantation",
      cat: "psychic",
      terms: ["memory implantation"],
      feats: []
    },
    {
      id: "atlas_emotion_manipulation",
      name: "Emotion Manipulation",
      cat: "psychic",
      terms: ["emotion manipulation", "control emotion", "manipulate emotion"],
      feats: []
    },
    {
      id: "atlas_fear_inducement",
      name: "Fear Inducement",
      cat: "psychic",
      terms: ["fear inducement"],
      feats: []
    },
    {
      id: "atlas_calm_inducement",
      name: "Calm Inducement",
      cat: "psychic",
      terms: ["calm inducement"],
      feats: []
    },
    {
      id: "atlas_sleep_inducement",
      name: "Sleep Inducement",
      cat: "psychic",
      terms: ["sleep inducement"],
      feats: []
    },
    {
      id: "atlas_dream_walking",
      name: "Dream Walking",
      cat: "psychic",
      terms: ["dream walking"],
      feats: []
    },
    {
      id: "atlas_dream_manipulation",
      name: "Dream Manipulation",
      cat: "psychic",
      terms: ["dream manipulation", "control dream", "manipulate dream"],
      feats: []
    },
    {
      id: "atlas_nightmare_manipulation",
      name: "Nightmare Manipulation",
      cat: "psychic",
      terms: ["nightmare manipulation", "control nightmare", "manipulate nightmare"],
      feats: []
    },
    {
      id: "atlas_mental_projection",
      name: "Mental Projection",
      cat: "psychic",
      terms: ["mental projection"],
      feats: []
    },
    {
      id: "atlas_psychic_constructs",
      name: "Psychic Constructs",
      cat: "psychic",
      terms: ["psychic constructs"],
      feats: []
    },
    {
      id: "atlas_psychic_barriers",
      name: "Psychic Barriers",
      cat: "psychic",
      terms: ["psychic barriers"],
      feats: []
    },
    {
      id: "atlas_psionic_blast",
      name: "Psionic Blast",
      cat: "psychic",
      terms: ["psionic blast"],
      feats: []
    },
    {
      id: "atlas_mind_link",
      name: "Mind Link",
      cat: "psychic",
      terms: ["mind link"],
      feats: []
    },
    {
      id: "atlas_hive_mind",
      name: "Hive Mind",
      cat: "psychic",
      terms: ["hive mind"],
      feats: []
    },
    {
      id: "atlas_mind_transfer",
      name: "Mind Transfer",
      cat: "psychic",
      terms: ["mind transfer"],
      feats: []
    },
    {
      id: "atlas_consciousness_transfer",
      name: "Consciousness Transfer",
      cat: "psychic",
      terms: ["consciousness transfer"],
      feats: []
    },
    {
      id: "atlas_friction_manipulation",
      name: "Friction Manipulation",
      cat: "fundamental",
      terms: ["friction manipulation", "control friction", "manipulate friction"],
      feats: []
    },
    {
      id: "atlas_inertia_manipulation",
      name: "Inertia Manipulation",
      cat: "fundamental",
      terms: ["inertia manipulation", "control inertia", "manipulate inertia"],
      feats: []
    },
    {
      id: "atlas_momentum_manipulation",
      name: "Momentum Manipulation",
      cat: "fundamental",
      terms: ["momentum manipulation", "control momentum", "manipulate momentum"],
      feats: []
    },
    {
      id: "atlas_kinetic_energy_manipulation",
      name: "Kinetic Energy Manipulation",
      cat: "fundamental",
      terms: ["kinetic energy manipulation", "control kinetic energy", "manipulate kinetic energy"],
      feats: []
    },
    {
      id: "atlas_potential_energy_manipulation",
      name: "Potential Energy Manipulation",
      cat: "fundamental",
      terms: ["potential energy manipulation", "control potential energy", "manipulate potential energy"],
      feats: []
    },
    {
      id: "atlas_thermal_energy_manipulation",
      name: "Thermal Energy Manipulation",
      cat: "fundamental",
      terms: ["thermal energy manipulation", "control thermal energy", "manipulate thermal energy"],
      feats: []
    },
    {
      id: "atlas_pressure_manipulation",
      name: "Pressure Manipulation",
      cat: "fundamental",
      terms: ["pressure manipulation", "control pressure", "manipulate pressure"],
      feats: []
    },
    {
      id: "atlas_vector_manipulation",
      name: "Vector Manipulation",
      cat: "fundamental",
      terms: ["vector manipulation", "control vector", "manipulate vector"],
      feats: []
    },
    {
      id: "atlas_force_manipulation",
      name: "Force Manipulation",
      cat: "fundamental",
      terms: ["force manipulation", "control force", "manipulate force"],
      feats: []
    },
    {
      id: "atlas_vibration_manipulation",
      name: "Vibration Manipulation",
      cat: "fundamental",
      terms: ["vibration manipulation", "control vibration", "manipulate vibration"],
      feats: []
    },
    {
      id: "atlas_frequency_manipulation",
      name: "Frequency Manipulation",
      cat: "fundamental",
      terms: ["frequency manipulation", "control frequency", "manipulate frequency"],
      feats: []
    },
    {
      id: "atlas_wave_manipulation",
      name: "Wave Manipulation",
      cat: "fundamental",
      terms: ["wave manipulation", "control wave", "manipulate wave"],
      feats: []
    },
    {
      id: "atlas_electromagnetic_manipulation",
      name: "Electromagnetic Manipulation",
      cat: "fundamental",
      terms: ["electromagnetic manipulation", "control electromagnetic", "manipulate electromagnetic"],
      feats: []
    },
    {
      id: "atlas_particle_manipulation",
      name: "Particle Manipulation",
      cat: "fundamental",
      terms: ["particle manipulation", "control particle", "manipulate particle"],
      feats: []
    },
    {
      id: "atlas_atomic_manipulation",
      name: "Atomic Manipulation",
      cat: "fundamental",
      terms: ["atomic manipulation", "control atomic", "manipulate atomic"],
      feats: []
    },
    {
      id: "atlas_molecular_manipulation",
      name: "Molecular Manipulation",
      cat: "fundamental",
      terms: ["molecular manipulation", "control molecular", "manipulate molecular"],
      feats: []
    },
    {
      id: "atlas_subatomic_manipulation",
      name: "Subatomic Manipulation",
      cat: "fundamental",
      terms: ["subatomic manipulation", "control subatomic", "manipulate subatomic"],
      feats: []
    },
    {
      id: "atlas_quantum_manipulation",
      name: "Quantum Manipulation",
      cat: "fundamental",
      terms: ["quantum manipulation", "control quantum", "manipulate quantum"],
      feats: []
    },
    {
      id: "atlas_entropy_manipulation",
      name: "Entropy Manipulation",
      cat: "fundamental",
      terms: ["entropy manipulation", "control entropy", "manipulate entropy"],
      feats: []
    },
    {
      id: "atlas_order_manipulation",
      name: "Order Manipulation",
      cat: "fundamental",
      terms: ["order manipulation", "control order", "manipulate order"],
      feats: []
    },
    {
      id: "atlas_plasma_manipulation",
      name: "Plasma Manipulation",
      cat: "energy",
      terms: ["plasma manipulation", "control plasma", "manipulate plasma"],
      feats: []
    },
    {
      id: "atlas_plasma_generation",
      name: "Plasma Generation",
      cat: "energy",
      terms: ["plasma generation", "generate plasma", "create plasma"],
      feats: []
    },
    {
      id: "atlas_solar_energy_manipulation",
      name: "Solar Energy Manipulation",
      cat: "energy",
      terms: ["solar energy manipulation", "control solar energy", "manipulate solar energy"],
      feats: []
    },
    {
      id: "atlas_solar_energy_absorption",
      name: "Solar Energy Absorption",
      cat: "energy",
      terms: ["solar energy absorption", "absorb solar energy"],
      feats: []
    },
    {
      id: "atlas_lunar_energy_manipulation",
      name: "Lunar Energy Manipulation",
      cat: "energy",
      terms: ["lunar energy manipulation", "control lunar energy", "manipulate lunar energy"],
      feats: []
    },
    {
      id: "atlas_stellar_energy_manipulation",
      name: "Stellar Energy Manipulation",
      cat: "energy",
      terms: ["stellar energy manipulation", "control stellar energy", "manipulate stellar energy"],
      feats: []
    },
    {
      id: "atlas_cosmic_energy_manipulation",
      name: "Cosmic Energy Manipulation",
      cat: "energy",
      terms: ["cosmic energy manipulation", "control cosmic energy", "manipulate cosmic energy"],
      feats: []
    },
    {
      id: "atlas_cosmic_energy_absorption",
      name: "Cosmic Energy Absorption",
      cat: "energy",
      terms: ["cosmic energy absorption", "absorb cosmic energy"],
      feats: []
    },
    {
      id: "atlas_kinetic_energy_absorption",
      name: "Kinetic Energy Absorption",
      cat: "energy",
      terms: ["kinetic energy absorption", "absorb kinetic energy"],
      feats: []
    },
    {
      id: "atlas_thermal_absorption",
      name: "Thermal Absorption",
      cat: "energy",
      terms: ["thermal absorption", "absorb thermal"],
      feats: []
    },
    {
      id: "atlas_heat_absorption",
      name: "Heat Absorption",
      cat: "energy",
      terms: ["heat absorption", "absorb heat"],
      feats: []
    },
    {
      id: "atlas_light_absorption",
      name: "Light Absorption",
      cat: "energy",
      terms: ["light absorption", "absorb light"],
      feats: []
    },
    {
      id: "atlas_sound_absorption",
      name: "Sound Absorption",
      cat: "energy",
      terms: ["sound absorption", "absorb sound"],
      feats: []
    },
    {
      id: "atlas_vibration_absorption",
      name: "Vibration Absorption",
      cat: "energy",
      terms: ["vibration absorption", "absorb vibration"],
      feats: []
    },
    {
      id: "atlas_electricity_absorption",
      name: "Electricity Absorption",
      cat: "energy",
      terms: ["electricity absorption", "absorb electricity"],
      feats: []
    },
    {
      id: "atlas_radiation_absorption",
      name: "Radiation Absorption",
      cat: "energy",
      terms: ["radiation absorption", "absorb radiation"],
      feats: []
    },
    {
      id: "atlas_energy_conversion",
      name: "Energy Conversion",
      cat: "energy",
      terms: ["energy conversion"],
      feats: []
    },
    {
      id: "atlas_energy_redirection",
      name: "Energy Redirection",
      cat: "energy",
      terms: ["energy redirection"],
      feats: []
    },
    {
      id: "atlas_energy_reflection",
      name: "Energy Reflection",
      cat: "energy",
      terms: ["energy reflection"],
      feats: []
    },
    {
      id: "atlas_energy_storage",
      name: "Energy Storage",
      cat: "energy",
      terms: ["energy storage"],
      feats: []
    },
    {
      id: "atlas_rune_magic",
      name: "Rune Magic",
      cat: "mystic",
      terms: ["rune magic"],
      feats: []
    },
    {
      id: "atlas_sigil_magic",
      name: "Sigil Magic",
      cat: "mystic",
      terms: ["sigil magic"],
      feats: []
    },
    {
      id: "atlas_warding",
      name: "Warding",
      cat: "mystic",
      terms: ["warding"],
      feats: []
    },
    {
      id: "atlas_barrier_magic",
      name: "Barrier Magic",
      cat: "mystic",
      terms: ["barrier magic"],
      feats: []
    },
    {
      id: "atlas_enchantment",
      name: "Enchantment",
      cat: "mystic",
      terms: ["enchantment"],
      feats: []
    },
    {
      id: "atlas_disenchantment",
      name: "Disenchantment",
      cat: "mystic",
      terms: ["disenchantment"],
      feats: []
    },
    {
      id: "atlas_curse_manipulation",
      name: "Curse Manipulation",
      cat: "mystic",
      terms: ["curse manipulation", "control curse", "manipulate curse"],
      feats: []
    },
    {
      id: "atlas_curse_removal",
      name: "Curse Removal",
      cat: "mystic",
      terms: ["curse removal"],
      feats: []
    },
    {
      id: "atlas_blessing_bestowal",
      name: "Blessing Bestowal",
      cat: "mystic",
      terms: ["blessing bestowal"],
      feats: []
    },
    {
      id: "atlas_blessing_removal",
      name: "Blessing Removal",
      cat: "mystic",
      terms: ["blessing removal"],
      feats: []
    },
    {
      id: "atlas_alchemy",
      name: "Alchemy",
      cat: "mystic",
      terms: ["alchemy"],
      feats: []
    },
    {
      id: "atlas_potion_creation",
      name: "Potion Creation",
      cat: "mystic",
      terms: ["potion creation", "create potion"],
      feats: []
    },
    {
      id: "atlas_ritual_magic",
      name: "Ritual Magic",
      cat: "mystic",
      terms: ["ritual magic"],
      feats: []
    },
    {
      id: "atlas_blood_magic",
      name: "Blood Magic",
      cat: "mystic",
      terms: ["blood magic"],
      feats: []
    },
    {
      id: "atlas_bone_magic",
      name: "Bone Magic",
      cat: "mystic",
      terms: ["bone magic"],
      feats: []
    },
    {
      id: "atlas_dream_magic",
      name: "Dream Magic",
      cat: "mystic",
      terms: ["dream magic"],
      feats: []
    },
    {
      id: "atlas_shadow_magic",
      name: "Shadow Magic",
      cat: "mystic",
      terms: ["shadow magic"],
      feats: []
    },
    {
      id: "atlas_light_magic",
      name: "Light Magic",
      cat: "mystic",
      terms: ["light magic"],
      feats: []
    },
    {
      id: "atlas_storm_magic",
      name: "Storm Magic",
      cat: "mystic",
      terms: ["storm magic"],
      feats: []
    },
    {
      id: "atlas_nature_magic",
      name: "Nature Magic",
      cat: "mystic",
      terms: ["nature magic"],
      feats: []
    },
    {
      id: "atlas_power_analysis",
      name: "Power Analysis",
      cat: "meta",
      terms: ["power analysis"],
      feats: []
    },
    {
      id: "atlas_power_identification",
      name: "Power Identification",
      cat: "meta",
      terms: ["power identification"],
      feats: []
    },
    {
      id: "atlas_power_tracking",
      name: "Power Tracking",
      cat: "meta",
      terms: ["power tracking"],
      feats: []
    },
    {
      id: "atlas_power_bestowal",
      name: "Power Bestowal",
      cat: "meta",
      terms: ["power bestowal"],
      feats: []
    },
    {
      id: "atlas_power_removal",
      name: "Power Removal",
      cat: "meta",
      terms: ["power removal"],
      feats: []
    },
    {
      id: "atlas_power_sealing",
      name: "Power Sealing",
      cat: "meta",
      terms: ["power sealing"],
      feats: []
    },
    {
      id: "atlas_power_restoration",
      name: "Power Restoration",
      cat: "meta",
      terms: ["power restoration"],
      feats: []
    },
    {
      id: "atlas_power_evolution",
      name: "Power Evolution",
      cat: "meta",
      terms: ["power evolution"],
      feats: []
    },
    {
      id: "atlas_power_adaptation",
      name: "Power Adaptation",
      cat: "meta",
      terms: ["power adaptation"],
      feats: []
    },
    {
      id: "atlas_power_fusion",
      name: "Power Fusion",
      cat: "meta",
      terms: ["power fusion"],
      feats: []
    },
    {
      id: "atlas_power_separation",
      name: "Power Separation",
      cat: "meta",
      terms: ["power separation"],
      feats: []
    },
    {
      id: "atlas_power_duplication",
      name: "Power Duplication",
      cat: "meta",
      terms: ["power duplication"],
      feats: []
    },
    {
      id: "atlas_power_storage",
      name: "Power Storage",
      cat: "meta",
      terms: ["power storage"],
      feats: []
    },
    {
      id: "atlas_power_transfer",
      name: "Power Transfer",
      cat: "meta",
      terms: ["power transfer"],
      feats: []
    },
    {
      id: "atlas_power_exchange",
      name: "Power Exchange",
      cat: "meta",
      terms: ["power exchange"],
      feats: []
    },
    {
      id: "atlas_power_swapping",
      name: "Power Swapping",
      cat: "meta",
      terms: ["power swapping"],
      feats: []
    },
    {
      id: "atlas_power_randomization",
      name: "Power Randomization",
      cat: "meta",
      terms: ["power randomization"],
      feats: []
    },
    {
      id: "atlas_power_reflection",
      name: "Power Reflection",
      cat: "meta",
      terms: ["power reflection"],
      feats: []
    },
    {
      id: "atlas_power_redirection",
      name: "Power Redirection",
      cat: "meta",
      terms: ["power redirection"],
      feats: []
    },
    {
      id: "atlas_power_resistance",
      name: "Power Resistance",
      cat: "meta",
      terms: ["power resistance", "resistant to power"],
      feats: []
    },
    {
      id: "atlas_machine_manipulation",
      name: "Machine Manipulation",
      cat: "technology",
      terms: ["machine manipulation", "control machine", "manipulate machine"],
      feats: []
    },
    {
      id: "atlas_network_manipulation",
      name: "Network Manipulation",
      cat: "technology",
      terms: ["network manipulation", "control network", "manipulate network"],
      feats: []
    },
    {
      id: "atlas_data_absorption",
      name: "Data Absorption",
      cat: "technology",
      terms: ["data absorption", "absorb data"],
      feats: []
    },
    {
      id: "atlas_data_projection",
      name: "Data Projection",
      cat: "technology",
      terms: ["data projection"],
      feats: []
    },
    {
      id: "atlas_digitalization",
      name: "Digitalization",
      cat: "technology",
      terms: ["digitalization"],
      feats: []
    },
    {
      id: "atlas_digital_travel",
      name: "Digital Travel",
      cat: "technology",
      terms: ["digital travel"],
      feats: []
    },
    {
      id: "atlas_virtual_reality_manipulation",
      name: "Virtual Reality Manipulation",
      cat: "technology",
      terms: ["virtual reality manipulation", "control virtual reality", "manipulate virtual reality"],
      feats: []
    },
    {
      id: "atlas_hologram_generation",
      name: "Hologram Generation",
      cat: "technology",
      terms: ["hologram generation", "generate hologram", "create hologram"],
      feats: []
    },
    {
      id: "atlas_nanite_manipulation",
      name: "Nanite Manipulation",
      cat: "technology",
      terms: ["nanite manipulation", "control nanite", "manipulate nanite"],
      feats: []
    },
    {
      id: "atlas_nanite_generation",
      name: "Nanite Generation",
      cat: "technology",
      terms: ["nanite generation", "generate nanite", "create nanite"],
      feats: []
    },
    {
      id: "atlas_cybernetic_integration",
      name: "Cybernetic Integration",
      cat: "technology",
      terms: ["cybernetic integration"],
      feats: []
    },
    {
      id: "atlas_remote_hacking",
      name: "Remote Hacking",
      cat: "technology",
      terms: ["remote hacking"],
      feats: []
    },
    {
      id: "atlas_electronic_possession",
      name: "Electronic Possession",
      cat: "technology",
      terms: ["electronic possession"],
      feats: []
    },
    {
      id: "atlas_device_possession",
      name: "Device Possession",
      cat: "technology",
      terms: ["device possession"],
      feats: []
    },
    {
      id: "atlas_artificial_intelligence_communication",
      name: "Artificial Intelligence Communication",
      cat: "technology",
      terms: ["artificial intelligence communication"],
      feats: []
    },
    {
      id: "atlas_artificial_intelligence_control",
      name: "Artificial Intelligence Control",
      cat: "technology",
      terms: ["artificial intelligence control"],
      feats: []
    },
    {
      id: "atlas_technological_assimilation",
      name: "Technological Assimilation",
      cat: "technology",
      terms: ["technological assimilation"],
      feats: []
    },
    {
      id: "atlas_technological_replication",
      name: "Technological Replication",
      cat: "technology",
      terms: ["technological replication"],
      feats: []
    },
    {
      id: "atlas_mechanical_constructs",
      name: "Mechanical Constructs",
      cat: "technology",
      terms: ["mechanical constructs"],
      feats: []
    },
    {
      id: "atlas_drone_control",
      name: "Drone Control",
      cat: "technology",
      terms: ["drone control"],
      feats: []
    },
    {
      id: "atlas_flesh_regeneration",
      name: "Flesh Regeneration",
      cat: "biological",
      terms: ["flesh regeneration"],
      feats: []
    },
    {
      id: "atlas_organ_regeneration",
      name: "Organ Regeneration",
      cat: "biological",
      terms: ["organ regeneration"],
      feats: []
    },
    {
      id: "atlas_limb_regeneration",
      name: "Limb Regeneration",
      cat: "biological",
      terms: ["limb regeneration"],
      feats: []
    },
    {
      id: "atlas_cellular_manipulation",
      name: "Cellular Manipulation",
      cat: "biological",
      terms: ["cellular manipulation", "control cellular", "manipulate cellular"],
      feats: []
    },
    {
      id: "atlas_genetic_manipulation",
      name: "Genetic Manipulation",
      cat: "biological",
      terms: ["genetic manipulation", "control genetic", "manipulate genetic"],
      feats: []
    },
    {
      id: "atlas_mutation_inducement",
      name: "Mutation Inducement",
      cat: "biological",
      terms: ["mutation inducement"],
      feats: []
    },
    {
      id: "atlas_mutation_suppression",
      name: "Mutation Suppression",
      cat: "biological",
      terms: ["mutation suppression"],
      feats: []
    },
    {
      id: "atlas_disease_manipulation",
      name: "Disease Manipulation",
      cat: "biological",
      terms: ["disease manipulation", "control disease", "manipulate disease"],
      feats: []
    },
    {
      id: "atlas_disease_generation",
      name: "Disease Generation",
      cat: "biological",
      terms: ["disease generation", "generate disease", "create disease"],
      feats: []
    },
    {
      id: "atlas_virus_manipulation",
      name: "Virus Manipulation",
      cat: "biological",
      terms: ["virus manipulation", "control virus", "manipulate virus"],
      feats: []
    },
    {
      id: "atlas_bacteria_manipulation",
      name: "Bacteria Manipulation",
      cat: "biological",
      terms: ["bacteria manipulation", "control bacteria", "manipulate bacteria"],
      feats: []
    },
    {
      id: "atlas_fungus_manipulation",
      name: "Fungus Manipulation",
      cat: "biological",
      terms: ["fungus manipulation", "control fungus", "manipulate fungus"],
      feats: []
    },
    {
      id: "atlas_parasite_manipulation",
      name: "Parasite Manipulation",
      cat: "biological",
      terms: ["parasite manipulation", "control parasite", "manipulate parasite"],
      feats: []
    },
    {
      id: "atlas_pheromone_manipulation",
      name: "Pheromone Manipulation",
      cat: "biological",
      terms: ["pheromone manipulation", "control pheromone", "manipulate pheromone"],
      feats: []
    },
    {
      id: "atlas_pheromone_generation",
      name: "Pheromone Generation",
      cat: "biological",
      terms: ["pheromone generation", "generate pheromone", "create pheromone"],
      feats: []
    },
    {
      id: "atlas_acid_secretion",
      name: "Acid Secretion",
      cat: "biological",
      terms: ["acid secretion"],
      feats: []
    },
    {
      id: "atlas_venom_generation",
      name: "Venom Generation",
      cat: "biological",
      terms: ["venom generation", "generate venom", "create venom"],
      feats: []
    },
    {
      id: "atlas_toxin_immunity",
      name: "Toxin Immunity",
      cat: "biological",
      terms: ["toxin immunity", "immune to toxin"],
      feats: []
    },
    {
      id: "atlas_disease_resistance",
      name: "Disease Resistance",
      cat: "biological",
      terms: ["disease resistance", "resistant to disease"],
      feats: []
    },
    {
      id: "atlas_regeneration_suppression",
      name: "Regeneration Suppression",
      cat: "biological",
      terms: ["regeneration suppression"],
      feats: []
    },
    {
      id: "atlas_object_summoning",
      name: "Object Summoning",
      cat: "utility",
      terms: ["object summoning"],
      feats: []
    },
    {
      id: "atlas_object_teleportation",
      name: "Object Teleportation",
      cat: "utility",
      terms: ["object teleportation"],
      feats: []
    },
    {
      id: "atlas_teleporting_others",
      name: "Teleporting Others",
      cat: "utility",
      terms: ["teleporting others"],
      feats: []
    },
    {
      id: "atlas_position_swapping",
      name: "Position Swapping",
      cat: "utility",
      terms: ["position swapping"],
      feats: []
    },
    {
      id: "atlas_spatial_marking",
      name: "Spatial Marking",
      cat: "utility",
      terms: ["spatial marking"],
      feats: []
    },
    {
      id: "atlas_return_teleportation",
      name: "Return Teleportation",
      cat: "utility",
      terms: ["return teleportation"],
      feats: []
    },
    {
      id: "atlas_portal_creation",
      name: "Portal Creation",
      cat: "utility",
      terms: ["portal creation", "create portal"],
      feats: []
    },
    {
      id: "atlas_portal_manipulation",
      name: "Portal Manipulation",
      cat: "utility",
      terms: ["portal manipulation", "control portal", "manipulate portal"],
      feats: []
    },
    {
      id: "atlas_portal_sealing",
      name: "Portal Sealing",
      cat: "utility",
      terms: ["portal sealing"],
      feats: []
    },
    {
      id: "atlas_inventory_space",
      name: "Inventory Space",
      cat: "utility",
      terms: ["inventory space"],
      feats: []
    },
    {
      id: "atlas_dimensional_storage",
      name: "Dimensional Storage",
      cat: "utility",
      terms: ["dimensional storage"],
      feats: []
    },
    {
      id: "atlas_object_storage",
      name: "Object Storage",
      cat: "utility",
      terms: ["object storage"],
      feats: []
    },
    {
      id: "atlas_matter_storage",
      name: "Matter Storage",
      cat: "utility",
      terms: ["matter storage"],
      feats: []
    },
    {
      id: "atlas_weapon_creation",
      name: "Weapon Creation",
      cat: "utility",
      terms: ["weapon creation", "create weapon"],
      feats: []
    },
    {
      id: "atlas_armor_creation",
      name: "Armor Creation",
      cat: "utility",
      terms: ["armor creation", "create armor"],
      feats: []
    },
    {
      id: "atlas_tool_creation",
      name: "Tool Creation",
      cat: "utility",
      terms: ["tool creation", "create tool"],
      feats: []
    },
    {
      id: "atlas_food_creation",
      name: "Food Creation",
      cat: "utility",
      terms: ["food creation", "create food"],
      feats: []
    },
    {
      id: "atlas_clothing_creation",
      name: "Clothing Creation",
      cat: "utility",
      terms: ["clothing creation", "create clothing"],
      feats: []
    },
    {
      id: "atlas_shelter_creation",
      name: "Shelter Creation",
      cat: "utility",
      terms: ["shelter creation", "create shelter"],
      feats: []
    },
    {
      id: "atlas_vehicle_creation",
      name: "Vehicle Creation",
      cat: "utility",
      terms: ["vehicle creation", "create vehicle"],
      feats: []
    },
  ];

  var EXTENDED_ROOT_ALIAS_TABLE = [
    {
      root: "aqua",
      domain: "water"
    },
    {
      root: "hydro",
      domain: "water"
    },
    {
      root: "pyro",
      domain: "fire"
    },
    {
      root: "igni",
      domain: "fire"
    },
    {
      root: "cryo",
      domain: "ice/cold"
    },
    {
      root: "glacio",
      domain: "ice/cold"
    },
    {
      root: "aero",
      domain: "air/wind"
    },
    {
      root: "anemo",
      domain: "air/wind"
    },
    {
      root: "geo",
      domain: "earth/stone"
    },
    {
      root: "litho",
      domain: "stone"
    },
    {
      root: "electro",
      domain: "electricity"
    },
    {
      root: "fulgur",
      domain: "lightning"
    },
    {
      root: "thermo",
      domain: "heat/temperature"
    },
    {
      root: "calori",
      domain: "heat"
    },
    {
      root: "chrono",
      domain: "time"
    },
    {
      root: "tempora",
      domain: "time"
    },
    {
      root: "photo",
      domain: "light"
    },
    {
      root: "lumino",
      domain: "light"
    },
    {
      root: "umbra",
      domain: "shadow/darkness"
    },
    {
      root: "nycto",
      domain: "darkness/night"
    },
    {
      root: "hemo",
      domain: "blood"
    },
    {
      root: "haemo",
      domain: "blood"
    },
    {
      root: "bio",
      domain: "life/biology"
    },
    {
      root: "vita",
      domain: "life"
    },
    {
      root: "necro",
      domain: "death"
    },
    {
      root: "thanato",
      domain: "death"
    },
    {
      root: "oneiro",
      domain: "dream"
    },
    {
      root: "hypno",
      domain: "sleep"
    },
    {
      root: "techno",
      domain: "technology"
    },
    {
      root: "cyber",
      domain: "technology/digital"
    },
    {
      root: "magneto",
      domain: "magnetism"
    },
    {
      root: "ferro",
      domain: "metal/iron"
    },
    {
      root: "metallo",
      domain: "metal"
    },
    {
      root: "gravi",
      domain: "gravity"
    },
    {
      root: "astro",
      domain: "stars/cosmos"
    },
    {
      root: "cosmo",
      domain: "cosmos"
    },
    {
      root: "atmos",
      domain: "atmosphere/weather"
    },
    {
      root: "meteoro",
      domain: "weather"
    },
    {
      root: "sono",
      domain: "sound"
    },
    {
      root: "phono",
      domain: "sound"
    },
    {
      root: "vibro",
      domain: "vibration"
    },
    {
      root: "seismo",
      domain: "earthquake/vibration"
    },
    {
      root: "toxico",
      domain: "toxins"
    },
    {
      root: "veno",
      domain: "venom"
    },
    {
      root: "chemo",
      domain: "chemistry"
    },
    {
      root: "alchemo",
      domain: "alchemy"
    },
    {
      root: "psycho",
      domain: "mind/psyche"
    },
    {
      root: "mento",
      domain: "mind"
    },
    {
      root: "anima",
      domain: "soul/spirit"
    },
    {
      root: "spiri",
      domain: "spirit"
    },
    {
      root: "ecto",
      domain: "spirit/ghost"
    },
    {
      root: "tele",
      domain: "distance"
    },
    {
      root: "spatio",
      domain: "space"
    },
    {
      root: "topo",
      domain: "space/location"
    },
    {
      root: "quantum",
      domain: "quantum"
    },
    {
      root: "atomo",
      domain: "atomic matter"
    },
    {
      root: "moleculo",
      domain: "molecules"
    },
    {
      root: "particulo",
      domain: "particles"
    },
    {
      root: "plasma",
      domain: "plasma"
    },
    {
      root: "radio",
      domain: "radiation"
    },
    {
      root: "nucleo",
      domain: "nuclear energy"
    },
    {
      root: "kineto",
      domain: "motion/kinetic energy"
    },
    {
      root: "dynamo",
      domain: "force/energy"
    },
    {
      root: "vectro",
      domain: "vectors"
    },
    {
      root: "fricto",
      domain: "friction"
    },
    {
      root: "inertio",
      domain: "inertia"
    },
    {
      root: "momento",
      domain: "momentum"
    },
    {
      root: "baro",
      domain: "pressure"
    },
    {
      root: "oleo",
      domain: "oil"
    },
    {
      root: "petro",
      domain: "stone/mineral"
    },
    {
      root: "crystallo",
      domain: "crystal"
    },
    {
      root: "vitro",
      domain: "glass"
    },
    {
      root: "silico",
      domain: "silicon/glass"
    },
    {
      root: "carbo",
      domain: "carbon"
    },
    {
      root: "xylo",
      domain: "wood"
    },
    {
      root: "dendro",
      domain: "trees/wood"
    },
    {
      root: "phyto",
      domain: "plants"
    },
    {
      root: "chloro",
      domain: "plants"
    },
    {
      root: "myco",
      domain: "fungus"
    },
    {
      root: "bacterio",
      domain: "bacteria"
    },
    {
      root: "viro",
      domain: "viruses"
    },
    {
      root: "parasito",
      domain: "parasites"
    },
    {
      root: "zoo",
      domain: "animals"
    },
    {
      root: "therio",
      domain: "beasts/animals"
    },
    {
      root: "draco",
      domain: "dragons"
    },
    {
      root: "sanguino",
      domain: "blood"
    },
    {
      root: "osteo",
      domain: "bone"
    },
    {
      root: "myo",
      domain: "muscle"
    },
    {
      root: "neuro",
      domain: "nerves"
    },
    {
      root: "dermo",
      domain: "skin"
    },
    {
      root: "somato",
      domain: "body"
    },
    {
      root: "morpho",
      domain: "form"
    },
    {
      root: "mnemo",
      domain: "memory"
    },
    {
      root: "noo",
      domain: "mind/thought"
    },
    {
      root: "cogno",
      domain: "knowledge/cognition"
    },
    {
      root: "empatho",
      domain: "emotion"
    },
    {
      root: "phobo",
      domain: "fear"
    },
    {
      root: "algio",
      domain: "pain"
    },
    {
      root: "hedono",
      domain: "pleasure"
    },
    {
      root: "tycho",
      domain: "luck"
    },
    {
      root: "fortuna",
      domain: "luck"
    },
    {
      root: "probabil",
      domain: "probability"
    },
    {
      root: "causo",
      domain: "causality"
    },
    {
      root: "entropo",
      domain: "entropy"
    },
    {
      root: "ordino",
      domain: "order"
    },
    {
      root: "chaos",
      domain: "chaos"
    },
    {
      root: "logo",
      domain: "words/language"
    },
    {
      root: "glosso",
      domain: "language"
    },
    {
      root: "onoma",
      domain: "names"
    },
    {
      root: "sema",
      domain: "symbols/signs"
    },
    {
      root: "info",
      domain: "information"
    },
    {
      root: "dato",
      domain: "data"
    },
    {
      root: "narrato",
      domain: "story/narrative"
    },
    {
      root: "axiom",
      domain: "rules/laws"
    },
    {
      root: "nomos",
      domain: "law"
    },
    {
      root: "horio",
      domain: "boundaries"
    },
    {
      root: "limino",
      domain: "boundaries/thresholds"
    },
    {
      root: "void",
      domain: "void"
    },
    {
      root: "nihilo",
      domain: "nonexistence"
    },
    {
      root: "reali",
      domain: "reality"
    },
  ];

  var STRICT_MECHANIC_BOUNDARIES = [
    {
      left: "manipulation",
      right: "generation",
      note: "Controlling existing material does not prove the ability to create it from nothing."
    },
    {
      left: "generation",
      right: "manipulation",
      note: "Creating a substance does not prove precise control over existing amounts of it."
    },
    {
      left: "resistance",
      right: "immunity",
      note: "Reduced harm does not prove complete immunity."
    },
    {
      left: "immunity",
      right: "absorption",
      note: "Being unharmed does not prove the character can absorb or store the effect."
    },
    {
      left: "absorption",
      right: "ownership",
      note: "Absorbing an effect does not prove permanent ownership of its source ability."
    },
    {
      left: "copying",
      right: "ownership",
      note: "Copied powers may be temporary, conditional, incomplete, or access-limited."
    },
    {
      left: "teleportation",
      right: "portal creation",
      note: "Moving instantly does not prove the ability to create persistent gateways."
    },
    {
      left: "portal creation",
      right: "teleportation",
      note: "Opening a gateway does not prove unaided self-teleportation."
    },
    {
      left: "time manipulation",
      right: "time stop",
      note: "Altering temporal rate does not prove complete temporal stasis."
    },
    {
      left: "time stop",
      right: "time travel",
      note: "Stopping local time does not prove movement to another era."
    },
    {
      left: "time travel",
      right: "time reversal",
      note: "Traveling to the past does not prove rewinding the current timeline around everyone."
    },
    {
      left: "precognition",
      right: "omniscience",
      note: "Seeing possible future information does not prove perfect all-knowing awareness."
    },
    {
      left: "clairvoyance",
      right: "telepathy",
      note: "Remote vision does not prove access to thoughts."
    },
    {
      left: "telepathy",
      right: "mind control",
      note: "Reading or sending thoughts does not prove behavioral domination."
    },
    {
      left: "empathy",
      right: "emotion manipulation",
      note: "Sensing emotion does not prove the ability to alter it."
    },
    {
      left: "illusion",
      right: "reality alteration",
      note: "Perceptual deception does not prove physical reality has changed."
    },
    {
      left: "invisibility",
      right: "intangibility",
      note: "Not being visible does not make the body non-solid."
    },
    {
      left: "intangibility",
      right: "invisibility",
      note: "Phasing through matter does not automatically conceal the user from sight."
    },
    {
      left: "regeneration",
      right: "resurrection",
      note: "Healing living tissue does not prove return from true death."
    },
    {
      left: "healing",
      right: "regeneration",
      note: "Healing others does not automatically establish self-regeneration."
    },
    {
      left: "shapeshifting",
      right: "species physiology",
      note: "Taking a form does not necessarily grant every trait of the copied species."
    },
    {
      left: "mimicry",
      right: "transformation",
      note: "Imitating appearance or behavior does not always mean physical transformation."
    },
    {
      left: "summoning",
      right: "creation",
      note: "Calling an existing being does not prove creating that being from nothing."
    },
    {
      left: "creation",
      right: "summoning",
      note: "Creating a construct does not prove calling independent pre-existing entities."
    },
    {
      left: "energy projection",
      right: "energy manipulation",
      note: "Emitting energy does not prove broad external control over that energy type."
    },
    {
      left: "force fields",
      right: "invulnerability",
      note: "Creating a barrier does not make the unshielded body invulnerable."
    },
    {
      left: "super speed",
      right: "time manipulation",
      note: "Extreme speed does not by itself prove temporal control."
    },
    {
      left: "flight",
      right: "gravity manipulation",
      note: "Flying does not by itself prove control over gravity."
    },
    {
      left: "weather manipulation",
      right: "air manipulation",
      note: "Weather control does not automatically grant fine local control of all air."
    },
    {
      left: "weather manipulation",
      right: "water manipulation",
      note: "Weather control does not automatically grant direct control of arbitrary water."
    },
    {
      left: "magic",
      right: "specific spell",
      note: "General magical capability does not prove knowledge of every spell or magical discipline."
    },
    {
      left: "artifact use",
      right: "artifact ownership",
      note: "Using an item once does not prove ownership, permanent access, or dependency."
    },
    {
      left: "artifact amplification",
      right: "artifact dependency",
      note: "An item that boosts a power is not necessarily the source required to use it."
    },
    {
      left: "emotion correlation",
      right: "emotion mechanic",
      note: "Feeling an emotion during power use does not prove the emotion changes the power."
    },
    {
      left: "fear",
      right: "weakness",
      note: "Being afraid of something does not prove it is a mechanical vulnerability."
    },
    {
      left: "belief",
      right: "fact",
      note: "A character belief can be wrong and must remain separate from objective continuity."
    },
    {
      left: "claim",
      right: "fact",
      note: "A claim is evidence of what was said, not automatic proof of what is true."
    },
    {
      left: "attempt",
      right: "feat",
      note: "Trying a power is not the same as successfully demonstrating it."
    },
    {
      left: "failure",
      right: "absence",
      note: "One failed use does not prove the character lacks an otherwise established power."
    },
    {
      left: "observed scale",
      right: "hard maximum",
      note: "The largest observed feat is evidence, not automatically the absolute ceiling."
    },
    {
      left: "mastery intent",
      right: "mastery",
      note: "Planning or training to master a power is not proof that mastery has been achieved."
    },
    {
      left: "suppression",
      right: "loss",
      note: "Temporary nullification does not erase power ownership."
    },
    {
      left: "dormancy",
      right: "loss",
      note: "A dormant power still exists even while unavailable."
    },
    {
      left: "awakening",
      right: "new ownership",
      note: "Awakening may reveal existing potential rather than prove a newly acquired origin."
    },
    {
      left: "resistance bypass",
      right: "universal bypass",
      note: "Bypassing one defense does not prove the same method bypasses all defenses."
    },
    {
      left: "counter",
      right: "absolute counter",
      note: "One successful counter interaction does not prove universal superiority."
    },
    {
      left: "named technique",
      right: "new power",
      note: "A named move may be an application of an existing power rather than a distinct ability."
    },
    {
      left: "resource cost",
      right: "power source",
      note: "Consuming mana, stamina, blood, or charge does not necessarily identify the origin of the ability."
    },
    {
      left: "visual signature",
      right: "mechanic",
      note: "A glow, aura, color, or sound does not by itself imply a separate energy power."
    },
    {
      left: "collateral damage",
      right: "maximum output",
      note: "Accidental damage is evidence of control/output behavior, not automatically a maximum feat."
    },
  ];

  function installExtendedPowerAtlas() {
    if (installExtendedPowerAtlas.done) return;
    var byId = {}, byName = {}, i, j, d, target, k, term;
    for (i = 0; i < POWER_DEFS.length; i++) {
      d = POWER_DEFS[i];
      byId[lower(d.id)] = d;
      byName[lower(d.name)] = d;
    }
    for (i = 0; i < EXTENDED_POWER_ATLAS.length; i++) {
      d = EXTENDED_POWER_ATLAS[i];
      target = byId[lower(d.id)] || byName[lower(d.name)] || null;
      if (target) {
        // When an older curated definition already owns the canonical name,
        // merge only vocabulary. This expands natural-language recognition
        // without creating a duplicate power record or changing its identity.
        if (!target.terms) target.terms=[];
        if (!target.feats) target.feats=[];
        for (j=0;j<d.terms.length;j++) {
          term=d.terms[j];
          if (target.terms.indexOf(term)<0) target.terms.push(term);
        }
        for (j=0;j<d.feats.length;j++) {
          term=d.feats[j];
          if (target.feats.indexOf(term)<0) target.feats.push(term);
        }
        continue;
      }
      d.semantic = semanticFromName(d.name);
      POWER_DEFS.push(d);
      byId[lower(d.id)] = d;
      byName[lower(d.name)] = d;
    }
    for (i = 0; i < EXTENDED_ROOT_ALIAS_TABLE.length; i++) {
      k = EXTENDED_ROOT_ALIAS_TABLE[i];
      if (!ONTOLOGY_ROOT_ALIASES[k.root]) ONTOLOGY_ROOT_ALIASES[k.root] = k.domain;
    }
    installExtendedPowerAtlas.done = true;
  }

  // ================================================================
  // DEEP CAPABILITY CONTINUITY
  // ================================================================
  // These layers remember HOW an established power behaves, not just whether
  // it exists. Every record is bounded and action-provenanced for rollback.
  var TECHNIQUE_RE = /\b(?:technique|move|maneuver|manoeuvre|attack|spell|form|method|finisher|combo)\s+(?:called|named|known as)\s+["“‘']?([A-Za-z0-9][A-Za-z0-9 '\-–—:]{1,70})["”’']?/i;
  var TECHNIQUE_QUOTED_RE = /["“‘']([A-Z][A-Za-z0-9 '\-–—:]{1,60})["”’']\s*(?:technique|move|attack|spell|maneuver|manoeuvre|finisher|combo)/i;
  var RELIABLE_RE = /\b(?:reliably|consistently|every time|without fail|dependably|stable enough to|works? consistently|never fails? under normal conditions)\b/i;
  var UNRELIABLE_RE = /\b(?:unreliable|inconsistent|works? only sometimes|sometimes fails?|frequently fails?|randomly fails?|unstable|flickers?|cuts? out unpredictably|unpredictable activation)\b/i;
  var AUTOMATIC_RE = /\b(?:automatic|automatically|reflexive|instinctive|without conscious thought|triggers? on its own)\b/i;
  var PRECISE_RE = /\b(?:fine control|fine precision|precise control|precisely|surgically|pinpoint|delicate control|minute control|thread-the-needle)\b/i;
  var COARSE_RE = /\b(?:coarse control|poor precision|imprecise|wildly inaccurate|hard to aim|cannot aim precisely|can't aim precisely|broad uncontrolled effect)\b/i;
  var RESOURCE_RE = /\b(?:consumes?|spends?|uses? up|burns? through|requires?|needs?)\s+(?:his|her|their|your|the)?\s*([^,.!?;]{1,55}?(?:mana|stamina|energy|charge|charges|blood|life force|chi|ki|chakra|fuel|ammunition|ammo|focus|willpower|souls?|essence|battery|power cells?|material|resource))\b/i;
  var RECHARGE_RE = /\b(?:recharges?|recharge time|needs? to recharge|must recharge|builds? charge|regains? charge|recovers? after)\b/i;
  var SIGNATURE_RE = /\b(?:manifests?|appears?)\s+(?:visibly\s+)?(?:as|like)\s+([^.!?;]{2,90})|\b(?:signature|visual effect|sensory tell|aura)\s+(?:is|looks? like|appears? as)\s+([^.!?;]{2,90})/i;
  var TRAINING_RE = /\b(?:trains?|trained|training|practices?|practiced|practising|practicing|drills?|rehearses?|studies?|experiments? with|tests? the limits? of)\b/i;
  var BREAKTHROUGH_RE = /\b(?:breakthrough|finally manages?|finally succeeds?|new level of control|sudden improvement|unlocks? a new application|discovers? a new use|figures? out how to)\b/i;
  var COLLATERAL_RE = /\b(?:collateral damage|damages? the surroundings|destroys? the surroundings|cracks? the walls?|shatters? nearby|sets? nearby .* on fire|hits? bystanders?|nearly hits?|uncontrolled blast|out of control|loses? control and)\b/i;
  var SAFE_CONTROL_RE = /\b(?:without harming|without injuring|without damaging|avoids? collateral|contains? the blast|carefully controls?|safely redirects?|protects? bystanders?)\b/i;
  var DISCOVERY_RE = /\b(?:discovers?|realizes?|realises?|learns?|finds? out|reveals?|unlocks?|awakens?)\b[^.!?;]{0,80}\b(?:power|ability|application|technique|use|limit|weakness|condition)\b/i;
  var SYNERGY_RE = /\b(?:combines?|combined|combining|synergizes?|synergises?|works? together with|layers?|chains?|fuses?|pairs?)\b/i;

  function ensureDeepPowerState(p) {
    if (!p) return;
    if (!p.techniques) p.techniques = [];
    if (!p.resources) p.resources = [];
    if (!p.signatures) p.signatures = [];
    if (!p.training) p.training = [];
    if (!p.reliabilityHistory) p.reliabilityHistory = [];
    if (!p.precisionHistory) p.precisionHistory = [];
    if (!p.collateralHistory) p.collateralHistory = [];
    if (!p.discoveryHistory) p.discoveryHistory = [];
    if (!p.synergies) p.synergies = [];
    if (!p.reliability) p.reliability = "unknown";
    if (!p.precision) p.precision = "unknown";
    if (!p.controlRisk) p.controlRisk = "unknown";
  }

  function recordTechnique(st, entity, p, name, sentence, source) {
    if (!st.config.trackTechniques || !p || !name) return null;
    ensureDeepPowerState(p);
    name = shortText(trim(name).replace(/[.,;:!?]+$/, ""), 72);
    if (!name || name.length < 2) return null;
    var rec = actionRecord(st, {
      name: name,
      text: shortText(sentence || name, 190),
      source: source || "narrative"
    });
    if(pushBounded(p.techniques, rec, st.config.maxTechniquesPerPower, function(x){ return lower(x.name); })) { st.stats.techniquesRecorded += 1; st.stats.deepRecords += 1; }
    addEvent(st, entity.name + " technique for " + p.name + ": " + name, "technique");
    return rec;
  }

  function detectTechniques(st, entity, sentence, mentioned, source) {
    if (!st.config.trackTechniques || !entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), m, i;
    if (!powers.length) return;
    m = sentence.match(TECHNIQUE_RE) || sentence.match(TECHNIQUE_QUOTED_RE);
    if (!m) return;
    for (i = 0; i < powers.length; i++) recordTechnique(st, entity, powers[i], m[1], sentence, source);
  }

  function setReliability(st, p, value, sentence) {
    if (!p || !st.config.trackReliability) return;
    ensureDeepPowerState(p);
    p.reliability = value;
    pushBounded(p.reliabilityHistory, actionRecord(st, {value:value, text:shortText(sentence,170)}), 12, function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value+"|"+lower(x.text);});
  }

  function setPrecision(st, p, value, sentence) {
    if (!p || !st.config.trackPrecision) return;
    ensureDeepPowerState(p);
    p.precision = value;
    pushBounded(p.precisionHistory, actionRecord(st, {value:value, text:shortText(sentence,170)}), 12, function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value+"|"+lower(x.text);});
  }

  function detectReliabilityPrecision(st, entity, sentence, mentioned) {
    if (!entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i;
    if (!powers.length) return;
    for (i = 0; i < powers.length; i++) {
      if (st.config.trackReliability) {
        if (AUTOMATIC_RE.test(sentence)) setReliability(st,powers[i],"automatic/reflexive",sentence);
        else if (UNRELIABLE_RE.test(sentence)) setReliability(st,powers[i],"unreliable/unstable",sentence);
        else if (RELIABLE_RE.test(sentence)) setReliability(st,powers[i],"reliable",sentence);
      }
      if (st.config.trackPrecision) {
        if (COARSE_RE.test(sentence)) setPrecision(st,powers[i],"coarse/imprecise",sentence);
        else if (PRECISE_RE.test(sentence)) setPrecision(st,powers[i],"precise/fine",sentence);
      }
    }
  }

  function detectResources(st, entity, sentence, mentioned) {
    if (!st.config.trackResources || !entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), m = sentence.match(RESOURCE_RE), i, textValue;
    if (!powers.length || (!m && !RECHARGE_RE.test(sentence))) return;
    textValue = m ? shortText(m[0],120) : shortText(sentence,150);
    for (i = 0; i < powers.length; i++) {
      ensureDeepPowerState(powers[i]);
      if(pushBounded(powers[i].resources, actionRecord(st, {kind:RECHARGE_RE.test(sentence)?"recharge":"resource", text:textValue}), st.config.maxResourcesPerPower, function(x){return x.kind+"|"+lower(x.text);})) st.stats.deepRecords += 1;
    }
  }

  function detectSignatures(st, entity, sentence, mentioned) {
    if (!st.config.trackSignatures || !entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), m = sentence.match(SIGNATURE_RE), i, value;
    if (!powers.length || !m) return;
    value = shortText(trim(m[1] || m[2] || ""),110);
    if (!value || /^(?:stronger|weaker|better|worse|normal)$/i.test(value)) return;
    for (i = 0; i < powers.length; i++) {
      ensureDeepPowerState(powers[i]);
      if(pushBounded(powers[i].signatures, actionRecord(st, {text:value, evidence:shortText(sentence,170)}), st.config.maxSignaturesPerPower, function(x){return lower(x.text);})) st.stats.deepRecords += 1;
    }
  }

  function detectTraining(st, entity, sentence, mentioned) {
    if (!st.config.trackTraining || !entity || !TRAINING_RE.test(sentence)) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, kind = BREAKTHROUGH_RE.test(sentence)?"breakthrough":"training";
    for (i = 0; i < powers.length; i++) {
      ensureDeepPowerState(powers[i]);
      if(pushBounded(powers[i].training, actionRecord(st, {kind:kind,text:shortText(sentence,190)}), st.config.maxTrainingNotesPerPower, function(x){return x.kind+"|"+lower(x.text);})) st.stats.deepRecords += 1;
      if (kind === "breakthrough" && powers[i].mastery === "unknown") powers[i].mastery = "developing";
    }
  }

  function detectCollateral(st, entity, sentence, mentioned) {
    if (!st.config.trackCollateral || !entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, value = null;
    if (COLLATERAL_RE.test(sentence)) value = "collateral/uncontrolled";
    else if (SAFE_CONTROL_RE.test(sentence)) value = "controlled/safe";
    if (!value) return;
    for (i = 0; i < powers.length; i++) {
      ensureDeepPowerState(powers[i]);
      powers[i].controlRisk = value;
      pushBounded(powers[i].collateralHistory, actionRecord(st,{value:value,text:shortText(sentence,180)}),10,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value+"|"+lower(x.text);});
    }
  }

  function detectDiscoveries(st, entity, sentence, mentioned) {
    if (!st.config.trackDiscoveries || !entity || !DISCOVERY_RE.test(sentence)) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i;
    for (i = 0; i < powers.length; i++) {
      ensureDeepPowerState(powers[i]);
      pushBounded(powers[i].discoveryHistory, actionRecord(st,{text:shortText(sentence,190)}),8,function(x){return lower(x.text);});
    }
  }

  function detectSynergies(st, entity, sentence, mentioned) {
    if (!st.config.trackSynergies || !entity || !SYNERGY_RE.test(sentence) || !mentioned || mentioned.length < 2) return;
    var ids=[], names=[], i, j, p, other, rec;
    for (i=0;i<mentioned.length && i<5;i++) if(mentioned[i]) {ids.push(mentioned[i].id);names.push(mentioned[i].name);}
    if (ids.length < 2) return;
    rec=actionRecord(st,{powers:ids.slice(),names:names.slice(),text:shortText(sentence,190)});
    if (!st.synergies) st.synergies=[];
    pushBounded(st.synergies,rec,st.config.maxSynergies,function(x){return x.powers.slice().sort().join("|")+"|"+lower(x.text);});
    for(i=0;i<mentioned.length;i++){
      p=mentioned[i];if(!p)continue;ensureDeepPowerState(p);
      for(j=0;j<mentioned.length;j++){other=mentioned[j];if(!other||other.id===p.id)continue;pushBounded(p.synergies,actionRecord(st,{powerId:other.id,powerName:other.name,text:shortText(sentence,180)}),8,function(x){return x.powerId+"|"+lower(x.text);});}
    }
  }

  function processDeepPowerContinuity(st, entity, sentence, mentioned, source) {
    if (!entity || !mentioned || !mentioned.length) return;
    detectTechniques(st,entity,sentence,mentioned,source);
    detectReliabilityPrecision(st,entity,sentence,mentioned);
    detectResources(st,entity,sentence,mentioned);
    detectSignatures(st,entity,sentence,mentioned);
    detectTraining(st,entity,sentence,mentioned);
    detectCollateral(st,entity,sentence,mentioned);
    detectDiscoveries(st,entity,sentence,mentioned);
    detectSynergies(st,entity,sentence,mentioned);
  }

  function deepPowerSummary(st,p,detail) {
    if (!p) return "";
    ensureDeepPowerState(p);
    var bits=[], names=[], i;
    if (st.config.trackReliability && p.reliability!=="unknown") bits.push("reliability: "+p.reliability);
    if (st.config.trackPrecision && p.precision!=="unknown") bits.push("precision: "+p.precision);
    if (st.config.trackCollateral && p.controlRisk!=="unknown") bits.push("control: "+p.controlRisk);
    if (st.config.trackTechniques && p.techniques.length) {
      for(i=Math.max(0,p.techniques.length-(detail==="high"?3:2));i<p.techniques.length;i++) names.push(p.techniques[i].name);
      bits.push("techniques: "+names.join(" / "));
    }
    if (st.config.trackResources && p.resources.length) bits.push("resource: "+shortText(p.resources[p.resources.length-1].text,100));
    if (st.config.trackSignatures && detail==="high" && p.signatures.length) bits.push("signature: "+shortText(p.signatures[p.signatures.length-1].text,95));
    if (st.config.trackTraining && detail==="high" && p.training.length) bits.push("training: "+shortText(p.training[p.training.length-1].text,100));
    return bits.join("; ");
  }

  function strictBoundaryNotesForPower(p) {
    if (!p) return [];
    var out=[], low=lower(p.name), sem=p.semantic||semanticFromName(p.name), i, r, mechanics=(sem&&sem.mechanics)||[];
    for(i=0;i<STRICT_MECHANIC_BOUNDARIES.length && out.length<4;i++){
      r=STRICT_MECHANIC_BOUNDARIES[i];
      if(low.indexOf(r.left)>=0 || mechanics.indexOf(r.left)>=0) out.push(r.note);
    }
    return out;
  }

  function auditPowerRecord(st,p) {
    ensureDeepPowerState(p);
    var warnings=[], boundary=strictBoundaryNotesForPower(p), i;
    if (p.status==="confirmed" && p.score < st.config.probableScore) warnings.push("status/score mismatch");
    if (p.availability==="lost" && p.status!=="lost") warnings.push("lost availability should force lost status");
    if (p.forms.length && !p.formBindingHistory.length) warnings.push("form binding lacks provenance history");
    if (p.sources.length && !p.sourceHistory.length) warnings.push("source lacks provenance history");
    if (p.techniques.length > st.config.maxTechniquesPerPower) warnings.push("technique cap exceeded");
    if (p.resources.length > st.config.maxResourcesPerPower) warnings.push("resource cap exceeded");
    for(i=0;i<boundary.length;i++) warnings.push("boundary: "+boundary[i]);
    return warnings;
  }

  function auditEntityContinuity(st,e) {
    var out={entity:e?e.name:"",warnings:[],powers:{}},i,p,w;
    if(!e)return out;
    for(i=0;i<e.powerOrder.length;i++){
      p=e.powers[e.powerOrder[i]];if(!p)continue;w=auditPowerRecord(st,p);if(w.length)out.powers[p.name]=w;
    }
    if(e.activeForm && !e.forms[powerKey(e.activeForm)]) out.warnings.push("active form has no form record");
    return out;
  }

  function apiRecordTechnique(name,powerName,techniqueName,evidence) {
    var st=init(),e,d,p;if(!st)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);return recordTechnique(st,e,p,techniqueName,evidence||techniqueName,"api");
  }

  function apiSetReliability(name,powerName,value,evidence) {
    var st=init(),e,d,p,allowed={"unknown":1,"reliable":1,"unreliable/unstable":1,"automatic/reflexive":1};if(!st)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);value=allowed[value]?value:"unknown";setReliability(st,p,value,evidence||("API reliability: "+value));return p;
  }

  function apiSetPrecision(name,powerName,value,evidence) {
    var st=init(),e,d,p,allowed={"unknown":1,"precise/fine":1,"coarse/imprecise":1};if(!st)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);value=allowed[value]?value:"unknown";setPrecision(st,p,value,evidence||("API precision: "+value));return p;
  }

  function apiAddResourceRule(name,powerName,textValue,kind) {
    var st=init(),e,d,p;if(!st)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);ensureDeepPowerState(p);var rec=actionRecord(st,{kind:kind||"resource",text:shortText(textValue,170)});pushBounded(p.resources,rec,st.config.maxResourcesPerPower,function(x){return x.kind+"|"+lower(x.text);});return rec;
  }

  function apiAudit(name) {
    var st=init(),e;if(!st)return null;e=st.entities[entityKey(name)];return auditEntityContinuity(st,e);
  }

  function apiDiagnostics() {
    var st=init(),out={version:ENGINE_VERSION,entities:0,powers:0,psycheItems:0,interactions:0,synergies:0,stats:{},warnings:[]},i,e,j,p,k;
    if(!st)return out;out.entities=st.entityOrder.length;out.interactions=(st.interactions||[]).length;out.synergies=(st.synergies||[]).length;
    for(k in st.stats)if(hasOwn(st.stats,k))out.stats[k]=st.stats[k];
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(!e)continue;out.powers+=e.powerOrder.length;for(j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]];if(p&&auditPowerRecord(st,p).length)out.warnings.push(e.name+" / "+p.name+": "+auditPowerRecord(st,p)[0]);}if(e.psyche){for(k in e.psyche)if(Array.isArray(e.psyche[k]))out.psycheItems+=e.psyche[k].length;}}
    return out;
  }


  var LIMIT_RE = /\b(only|limited to|cannot|can't|unable to|doesn't work|does not work|fails against|requires|needs|must be|has to be|range|within (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few)|for (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few) (?:seconds?|minutes?|hours?)|cooldown|recharge|once per|twice per|while touching|line of sight|when injured|when angry|under moonlight|in sunlight|at night)\b/i;
  var COST_RE = /\b(costs?|drains?|exhausts?|tires?|fatigues?|hurts?|painful|pain|migraine|headache|bleed|bleeding|burns? him|burns? her|burns? them|shortens? (?:his|her|their) life|consumes?|uses up|strain|overload|overheats?)\b/i;
  var FAILURE_RE = /\b(fails?|failed|nothing happens|fizzles?|sputters?|can't|cannot|unable|doesn't work|does not work|no effect|loses? control|backfires?|interrupted|blocked|stopped)\b/i;
  var SUCCESS_RE = /\b(succeeds?|works?|erupts?|bursts?|appears?|vanishes?|reappears?|lifts?|moves?|freezes?|burns?|shatters?|breaks?|pass through|passes through|phase through|phases through|teleports?|heals?|regenerates?|blocks?|deflects?|absorbs?|controls?|summons?|transforms?|changes?|surges?|strikes?|hits?)\b/i;
  var PARTIAL_RE = /\b(barely|partially|briefly|weakly|power flickers?|ability flickers?|energy flickers?|unstable|struggles?|with effort|for a moment|momentarily|almost fails)\b/i;
  var LOSS_RE = /\b(loses? (?:his|her|their|the) powers?|lost (?:his|her|their) powers?|powers? (?:is|are) gone|powerless|stripped of (?:his|her|their) powers?|no longer (?:has|have|can use)|permanently nullified|lost (?:the )?ability to|loses? (?:the )?ability to|ability is gone|power is gone)\b/i;
  var SUPPRESS_RE = /\b(powers? (?:is|are) (?:suppressed|blocked|nullified|dampened|sealed|disabled)|can't use (?:his|her|their) powers? (?:right now|for now)|temporarily powerless|power dampener|nullification field)\b/i;
  var RESTORE_RE = /\b(regains? (?:his|her|their) powers?|powers? return|power returns|abilities return|gets? (?:his|her|their) powers? back|suppression ends|seal breaks)\b/i;
  var DORMANT_RE = /\b(?:power|powers|ability|abilities)\b[^.!?;]{0,45}\b(?:lies? dormant|is dormant|are dormant|has gone dormant|have gone dormant|falls? dormant|inactive|sleeping)\b|\b(?:dormant|inactive|sleeping)\s+(?:power|powers|ability|abilities)\b/i;
  var AWAKEN_RE = /\b(?:power|powers|ability|abilities)\b[^.!?;]{0,45}\b(?:awakens?|awakened|wakes? up|reactivates?|reactivated|stirs? back to life)\b|\b(?:awakens?|reactivates?)\s+(?:his|her|their|the)?\s*(?:power|powers|ability|abilities)\b/i;
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

  // INNER CURRENT — evidence-anchored psyche signals. These are deliberately
  // explicit-language detectors, not a generic personality generator. The script
  // remembers interior continuity the story actually states and keeps beliefs,
  // secrets and intentions separate from objective power facts.
  var PSYCHE_GOAL_RE = /\b(?:wants?|hopes?|dreams?|aims?|seeks?|longs?|is determined|is desperate)\s+(?:for\s+[^.!?;]{1,45}|to\s+[^.!?;]{2,150})/i;
  var PSYCHE_PLAN_RE = /\b(?:plans?|intends?|means?|decides?|prepares?|plots?|schemes?)\s+to\s+[^.!?;]{2,150}/i;
  var PSYCHE_FEAR_RE = /\b(?:fears?|is afraid of|am afraid of|are afraid of|is scared of|am scared of|are scared of|is terrified of|am terrified of|are terrified of|dreads?|worries? about|worries? that|panics? at the thought of)\b/i;
  var PSYCHE_BELIEF_RE = /\b(?:believes?|thinks?|suspects?|assumes?|is convinced|is certain|is sure|expects?)\s+(?:that\s+)?/i;
  var PSYCHE_SECRET_RE = /\b(?:secretly|keeps? .*? secret|hides? .*? from|conceals?|has never told|doesn't want .*? to know|does not want .*? to know|keeps? hidden)\b/i;
  var PSYCHE_RESTRAINT_RE = /\b(?:vows?|swears?|promises?|refuses?|will never|won't|will not|holds? back|restrains? (?:himself|herself|themselves|itself)|avoids? using|won't use|will not use)\b/i;
  var PSYCHE_SELF_RE = /\b(?:sees? (?:himself|herself|themselves|itself) as|thinks? of (?:himself|herself|themselves|itself) as|considers? (?:himself|herself|themselves|itself)|believes? (?:himself|herself|themselves|itself) to be)\b/i;
  var PSYCHE_CONFLICT_RE = /\b(?:torn between|conflicted about|part of (?:him|her|them) wants|tempted to .*? but|wants? .*? but (?:also|still)|struggles? between|at war with (?:himself|herself|themselves))\b/i;
  var PSYCHE_REVISION_RE = /\b(?:no longer|abandons?|gives? up|lets? go of|changes? (?:his|her|their) mind|stops? wanting|stops? believing|realizes? (?:he|she|they) was wrong|decides? against)\b/i;
  var PSYCHE_DISCLOSURE_RE = /\b(?:reveals?|revealed|confesses?|confessed|admits?|admitted|comes? clean|tells? .*? the truth|secret is out|no longer a secret)\b/i;
  var PSYCHE_RESTRAINT_BREAK_RE = /\b(?:breaks?|broke|violates?|violated|abandons?|renounces?|goes? back on)\s+(?:his|her|their|the)?\s*(?:vow|promise|oath|rule|restraint)|\b(?:uses?|used)\b[^.!?;]{0,80}\b(?:despite|breaking)\s+(?:his|her|their|the)?\s*(?:vow|promise|oath)\b/i;
  var PSYCHE_EMOTION_RESOLVE_RE = /\b(?:calms? down|relaxes?|composes? (?:himself|herself|themselves)|fear fades?|anger fades?|rage fades?|panic subsides?|anxiety eases?|no longer (?:angry|afraid|scared|terrified|anxious|furious|enraged|panicked|jealous|resentful|guilty|ashamed|doubtful|uncertain))\b/i;
  var PSYCHE_POWER_ATTITUDE_RE = /\b(?:hates?|loves?|enjoys?|fears?|(?:is|am|are) afraid of|(?:is|am|are) scared of|(?:is|am|are) terrified of|resents?|trusts?|relies on|depends on|is ashamed of|is proud of|is addicted to|is tempted to use|refuses? to use|avoids? using|holds? back)\b/i;
  var PSYCHE_EMOTION_CONTEXT_RE = /\b(?:feels?|felt|is|am|are|seems?|looks?|becomes?|turns?|grows?|filled with|overcome by|consumed by|with)\s+(?:very\s+|deeply\s+|increasingly\s+|slightly\s+)?(?:angry|furious|enraged|afraid|scared|terrified|fearful|anxious|nervous|panicked|guilty|ashamed|grieving|grief-stricken|sad|hopeful|joyful|happy|relieved|jealous|envious|determined|confident|doubtful|uncertain|calm|excited|disgusted|resentful|desperate)\b/i;
  var PSYCHE_EMOTION_NOUN_RE = /\b(anger|rage|fury|fear|terror|panic|anxiety|nervousness|guilt|shame|grief|sadness|hope|joy|relief|jealousy|envy|determination|confidence|doubt|uncertainty|calm|excitement|disgust|resentment|desperation|love|hatred|stress)\b/i;
  var PSYCHE_EMOTION_LINK_RE = /\b(?:fed by|fueled by|triggered by|reacts? to (?:emotion|anger|rage|fear|terror|panic|calm|confidence|doubt|grief|joy|love|hatred|stress)|responds? to (?:emotion|anger|rage|fear|terror|panic|calm|confidence|doubt|grief|joy|love|hatred|stress)|(?:becomes? |gets? |grows? )?(?:stronger|weaker|more powerful|less powerful|more stable|less stable|unstable) when|surges? when|flickers? when|fails? when|unlocks? when|activates? when|stabilizes? when|destabilizes? when|is amplified by|is boosted by|is weakened by|is suppressed by|is disrupted by)\b/i;

  var GENERIC_ABILITY_HINT_RE = /\b(teleport|phase|transform|morph|summon|conjure|manifest|project|generate|emit|produce|manipulate|control|bend|warp|rewrite|reshape|transmute|disintegrate|possess|resurrect|revive|freeze time|stop time|read minds?|hear thoughts?|become invisible|turn invisible|heal instantly|regenerate|duplicate|clone|absorb powers?|copy powers?|nullify powers?|alter reality|walk through walls?|breathe underwater|grow giant|shrink|stretch|fly|levitate|empower|bestow|grant powers?|seal|bind|banish|reflect|convert|fuse|separate|evolve|adapt|sense powers?|detect powers?|channel|invoke|cast)\b/i;
  var NATURAL_VERB_GATE_RE = /\b(?:controls?|controlled|controlling|manipulates?|manipulated|manipulating|generates?|generated|generating|creates?|created|creating|produces?|produced|producing|emits?|emitted|emitting|summons?|summoned|summoning|absorbs?|absorbed|absorbing|nullif(?:y|ies|ied|ying)|negates?|negated|negating|seals?|sealed|sealing|heals?|healed|healing|copies?|copied|copying|mimics?|mimicked|mimicking|redirects?|redirected|redirecting|alters?|altered|altering|bends?|bent|bending|reshapes?|reshaped|reshaping|freezes?|froze|frozen|freezing|opens?|opened|opening|reads?|reading|senses?|sensed|sensing|detects?|detected|detecting|grants?|granted|granting|bestows?|bestowed|bestowing)\b/i;

  // Truth/attribution guards. These keep speculation, denials and reported
  // dialogue from silently becoming objective power canon.
  var HYPOTHETICAL_RE = /(?:^|[.!?]\s*)(?:what if|suppose|supposing|imagine|imagining|hypothetically|if only)\b|\bif\s+[^.!?]{0,70}\b(?:could|would|might|were able to|had the power to)\b|\b(?:maybe|perhaps|possibly|conceivably)\b[^.!?]{0,70}\b(?:can|could|might|has|have)\b/i;
  var BARE_DENIAL_RE = /\b(?:cannot|can't|isn't able to|is not able to|unable to|doesn't have|does not have|lacks?|never had|has no|have no)\b/i;
  var CONDITION_CUE_RE = /\b(?:while|when|unless|except when|except while|without|until|as long as|provided that|only if)\b/i;
  var REPORTED_VERB_RE = /\b(?:says?|said|claims?|claimed|believes?|believed|thinks?|thought|suspects?|suspected|assumes?|assumed|expects?|expected|hears?|heard|learns?|learned|discovers?|discovered|was told|is told)\b/i;
  var DIRECT_USE_RE = /\b(?:uses?|used|activates?|activated|unleashes?|unleashed|channels?|channeled|channels|invokes?|invoked|casts?|cast|fires?|fired|deploys?|deployed|triggers?|triggered)\b/i;
  var ACCESS_TEMP_RE = /\b(?:temporarily|for now|borrowed|borrow(?:s|ed|ing)?|on loan|until .*?(?:ends|wears off|expires))\b/i;
  var ACCESS_COPY_RE = /\b(?:copies?|copied|copying|mimics?|mimicked|mimicking|replicates?|replicated)\b[^.!?;]{0,55}\b(?:power|ability|powers|abilities|teleportation|telepathy|flight|[A-Za-z][A-Za-z'’.-]{2,45}(?:kinesis|mancy|pathy|portation|morphism))\b/i;
  var ACCESS_ARTIFACT_RE = /\b(?:power|powers|ability|abilities|gift|gifts)\b[^.!?;]{0,55}\b(?:is|are|comes? from|depend(?:s|ed)? on|require(?:s|d)?|bound to|tied to|granted by|powered by|only works? (?:with|through|via))\b[^.!?;]{0,55}\b(?:artifact|relic|ring|amulet|staff|weapon|suit|armor|armour|device|implant|crystal|talisman|grimoire)\b|\b(?:bound to|tied to|requires?|depends? on|only usable with|only works? with)\b[^.!?;]{0,40}\b(?:artifact|relic|ring|amulet|staff|weapon|suit|armor|armour|device|implant|crystal|talisman|grimoire)\b/i;
  var ACCESS_INNATE_RE = /\b(?:born with|innate|natural ability|inborn|from birth|bloodline|inherited)\b/i;
  var ACCESS_LEARNED_RE = /\b(?:learned|trained|studied|mastered through training|taught)\b/i;
  var ACCESS_GRANTED_RE = /\b(?:granted|bestowed|blessed|gifted|empowered)\b/i;
  var ACCESS_STOLEN_RE = /\b(?:stole|stolen|drained from|ripped from|took .*?powers?)\b/i;

  var NAME_STOP = makeSet([
    "The","A","An","You","I","He","She","They","It","We","This","That","These","Those","His","Her","Their","Your","My","Our",
    "Suddenly","Then","Now","Later","Meanwhile","However","But","And","As","After","Before","When","While","If","Because","Despite","Inside","Outside",
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July","August","September","October","November","December",
    "Earth","Moon","Sun","North","South","East","West","Chapter","Scene","Story","Recent","World","Lore","Author","Note","Powers","Power","Ability","Abilities"
  ]);

  var LOCATION_WORDS = makeSet(["city","town","village","street","road","avenue","lane","country","kingdom","empire","planet","moon","station","school","academy","hospital","tower","building","forest","desert","mountain","river","lake","ocean","sea","island","base","headquarters","castle","palace","district","state","county"]);

  var TERM_INDEX = null;
  var FEAT_INDEX = null;
  var NATURAL_INDEX = null;
  // Temporary provenance tag used while authored Story Cards are being read.
  // It lets card edits remove ONLY facts that came from that card.
  var ACTIVE_SOURCE_REF = "";

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

  function getState(create) {
    if (typeof state === "undefined") return null;
    if (!state[NS] && create !== false) {
      state[NS] = {
        engine: ENGINE_VERSION,
        turn: 0,
        hookCount: 0,
        entities: {},
        entityOrder: [],
        focusEntity: "You",
        lastPowerByEntity: {},
        pendingAttempts: [],
        recentEvents: [],
        interactions: [],
        synergies: [],
        config: copyDefaults(),
        configSignature: "",
        storyCardSeeds: {},
        psycheCardSeeds: {},
        cardSignatures: {},
        psycheCardSignatures: {},
        seenSignals: {},
        seenSignalOrder: [],
        runtimeActionCount: null,
        runtimeMaxChars: null,
        runtimeMemoryLength: null,
        runtimeCharacterNames: [],
        lastObservedActionCount: null,
        rollbackTarget: null,
        lastCardSync: -999,
        lastPsycheCardSync: -999,
        bootstrapDone: false,
        stats: {sentences:0, powersCreated:0, ontologyCreated:0, feats:0, contradictions:0, psycheRecords:0, duplicatesSkipped:0, attributionSplits:0, speculativeSkipped:0, rollbackCleanups:0, techniquesRecorded:0, deepRecords:0}
      };
    }
    return state[NS] || null;
  }

  function repairPowerState(p) {
    if (!p) return;
    var arrays=["sources","evidence","feats","limits","costs","counters","conditions","scaleNotes","forms","contradictions","applications","traits","links","emotionLinks","availabilityHistory","accessHistory","activationHistory","traitHistory","sourceHistory","progressionHistory","formBindingHistory","techniques","resources","signatures","training","reliabilityHistory","precisionHistory","collateralHistory","discoveryHistory","synergies"],i;
    for(i=0;i<arrays.length;i++) if(!p[arrays[i]]) p[arrays[i]]=[];
    if(!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if(!p.scale.duration) p.scale.duration=[]; if(!p.scale.range) p.scale.range=[]; if(!p.scale.scope) p.scale.scope=[]; if(!p.scale.targets) p.scale.targets=[]; if(!p.scale.magnitude) p.scale.magnitude=[];
    if(p.score==null) p.score=0; if(!p.status) p.status="rumored"; if(!p.availability) p.availability="unknown";
    if(p.successfulUses==null) p.successfulUses=0; if(p.partialUses==null) p.partialUses=0; if(p.failedUses==null) p.failedUses=0;
    if(p.control==null) p.control=0; if(!p.mastery) p.mastery="unknown"; if(!p.activation) p.activation="unknown"; if(!p.accessMode) p.accessMode="unknown";
    if(!p.reliability) p.reliability="unknown"; if(!p.precision) p.precision="unknown"; if(!p.controlRisk) p.controlRisk="unknown";
    if(!p.availabilityHistory.length) p.availabilityHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.availability||"unknown",legacy:true});
    if(!p.activationHistory.length) p.activationHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.activation||"unknown",legacy:true});
    if(!p.accessHistory.length) p.accessHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.accessMode||"unknown",legacy:true});
    if(!p.progressionHistory.length) p.progressionHistory.push({actionCount:null,turn:p.firstSeen||0,control:p.control||0,mastery:p.mastery||"unknown",legacy:true});
    if(!p.traitHistory.length && p.traits.length) for(i=0;i<p.traits.length;i++) p.traitHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.traits[i],legacy:true});
    if(!p.sourceHistory.length && p.sources.length) for(i=0;i<p.sources.length;i++) p.sourceHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.sources[i],legacy:true});
    if(!p.formBindingHistory.length && p.forms.length) for(i=0;i<p.forms.length;i++) p.formBindingHistory.push({actionCount:null,turn:p.firstSeen||0,value:p.forms[i],legacy:true});
    ensurePowerSemantics(p);
    ensureDeepPowerState(p);
  }

  function repairEntityState(st,e) {
    if(!e) return;
    var arrays=["aliases","powerOrder","defenses","vulnerabilities","sources","contradictions","stateHistory","formHistory"],i,k,p;
    for(i=0;i<arrays.length;i++) if(!e[arrays[i]]) e[arrays[i]]=[];
    if(!e.powers) e.powers={}; if(!e.forms) e.forms={}; if(e.activeForm==null) e.activeForm="";
    if(!e.globalState) e.globalState="normal"; if(e.globalStateNote==null) e.globalStateNote="";
    if(!e.stateHistory.length) e.stateHistory.push({actionCount:null,turn:e.lastSeen||0,value:e.globalState||"normal",note:e.globalStateNote||"",legacy:true});
    if(!e.formHistory.length) e.formHistory.push({actionCount:null,turn:e.lastSeen||0,value:e.activeForm||"",legacy:true});
    if(e.lastSeen==null) e.lastSeen=st.turn||0; if(e.mentions==null) e.mentions=0; if(e.narrativeSeen==null) e.narrativeSeen=false;
    ensurePsyche(e);
    for(k in e.powers) if(hasOwn(e.powers,k)){p=e.powers[k];repairPowerState(p);if(e.powerOrder.indexOf(k)<0)e.powerOrder.push(k);}
  }

  function mergeDefaults(st) {
    var k,i,e;
    if (!st.config) st.config = copyDefaults();
    for (k in DEFAULTS) if (hasOwn(DEFAULTS, k) && st.config[k] == null) st.config[k] = DEFAULTS[k];
    if (!st.entities) st.entities = {};
    if (!st.entityOrder) st.entityOrder = [];
    if (!st.lastPowerByEntity) st.lastPowerByEntity = {};
    if (!st.pendingAttempts) st.pendingAttempts = [];
    if (!st.recentEvents) st.recentEvents = [];
    if (!st.interactions) st.interactions = [];
    if (!st.synergies) st.synergies = [];
    if (!st.stats) st.stats = {sentences:0, powersCreated:0, ontologyCreated:0, feats:0, contradictions:0, psycheRecords:0, duplicatesSkipped:0, attributionSplits:0, speculativeSkipped:0, rollbackCleanups:0, techniquesRecorded:0, deepRecords:0};
    if (st.stats.ontologyCreated == null) st.stats.ontologyCreated = 0;
    if (st.stats.psycheRecords == null) st.stats.psycheRecords = 0;
    if (st.stats.duplicatesSkipped == null) st.stats.duplicatesSkipped = 0;
    if (st.stats.attributionSplits == null) st.stats.attributionSplits = 0;
    if (st.stats.speculativeSkipped == null) st.stats.speculativeSkipped = 0;
    if (st.stats.rollbackCleanups == null) st.stats.rollbackCleanups = 0;
    if (st.stats.techniquesRecorded == null) st.stats.techniquesRecorded = 0;
    if (st.stats.deepRecords == null) st.stats.deepRecords = 0;
    if (!st.storyCardSeeds) st.storyCardSeeds = {};
    if (!st.psycheCardSeeds) st.psycheCardSeeds = {};
    if (!st.cardSignatures) st.cardSignatures = {};
    if (!st.psycheCardSignatures) st.psycheCardSignatures = {};
    if (!st.seenSignals) st.seenSignals = {};
    if (!st.seenSignalOrder) st.seenSignalOrder = [];
    if (st.runtimeActionCount === undefined) st.runtimeActionCount = null;
    if (st.runtimeMaxChars === undefined) st.runtimeMaxChars = null;
    if (st.runtimeMemoryLength === undefined) st.runtimeMemoryLength = null;
    if (!st.runtimeCharacterNames) st.runtimeCharacterNames = [];
    if (st.lastObservedActionCount === undefined) st.lastObservedActionCount = null;
    if (st.rollbackTarget === undefined) st.rollbackTarget = null;
    if (st.lastPsycheCardSync == null) st.lastPsycheCardSync = -999;
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];repairEntityState(st,e);}
    for(k in st.entities) if(hasOwn(st.entities,k) && st.entityOrder.indexOf(k)<0){st.entityOrder.push(k);repairEntityState(st,st.entities[k]);}
    st.engine = ENGINE_VERSION;
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
    if (!card) return;
    var raw = String(card.entry || "");
    if (raw === st.configSignature) return;
    var cfg = copyDefaults();
    var lines = raw.replace(/;/g, "\n").split(/\n/);
    var i, m, key, val, b, n, range, enumSet;
    for (i = 0; i < lines.length; i++) {
      m = lines[i].match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*[:=]\s*(.*?)\s*$/);
      if (!m) continue;
      key = m[1]; val = m[2];
      if (!hasOwn(DEFAULTS, key)) continue;
      if (BOOL_KEYS[key]) {
        b = parseBoolean(val); if (b != null) cfg[key] = b;
      } else if (NUM_KEYS[key]) {
        n = parseFloat(val); range = NUM_KEYS[key];
        if (!isNaN(n)) cfg[key] = clamp(n, range[0], range[1]);
      } else if (CONFIG_ENUMS[key]) {
        enumSet = CONFIG_ENUMS[key]; val = lower(val);
        if (enumSet[val]) cfg[key] = val;
      }
    }
    st.config = cfg;
    st.configSignature = raw;
    logDebug("POWERS config loaded", JSON.stringify(cfg));
  }

  function setRuntimeInfo(st, runtimeInfo) {
    if(!st) return;
    runtimeInfo=runtimeInfo||{};
    var ac=Number(runtimeInfo.actionCount), mc=Number(runtimeInfo.maxChars), ml=Number(runtimeInfo.memoryLength), names=runtimeInfo.characterNames||[],i, validAc=!isNaN(ac);
    if(validAc && st.config && st.config.timelineGuard && st.lastObservedActionCount!=null && ac < st.lastObservedActionCount) st.rollbackTarget=ac;
    st.runtimeActionCount=validAc?ac:null;
    st.runtimeMaxChars=isNaN(mc)?null:mc;
    st.runtimeMemoryLength=isNaN(ml)?null:ml;
    st.runtimeCharacterNames=[]; for(i=0;i<names.length&&i<12;i++) if(trim(names[i])) st.runtimeCharacterNames.push(String(names[i]));
    if(validAc && (st.lastObservedActionCount==null || ac>st.lastObservedActionCount)) st.lastObservedActionCount=ac;
  }

  function signalFingerprint(st,source,entityId,powerId,kind,textValue) {
    var action=(st.runtimeActionCount!=null?"a"+st.runtimeActionCount:"t"+st.turn);
    return [action,source||"",entityId||"",powerId||"",kind||"",normalizePsycheText(textValue||"")].join("|");
  }

  function markSignalOnce(st,key) {
    if(!key) return true;
    if(st.seenSignals[key]) { st.stats.duplicatesSkipped += 1; return false; }
    st.seenSignals[key]=1; st.seenSignalOrder.push(key);
    while(st.seenSignalOrder.length>st.config.dedupeWindow){var old=st.seenSignalOrder.shift();delete st.seenSignals[old];}
    return true;
  }

  function actionRecord(st, obj) {
    obj=obj||{}; obj.turn=st.turn; obj.actionCount=st.runtimeActionCount;
    if(ACTIVE_SOURCE_REF && obj.sourceRef==null) obj.sourceRef=ACTIVE_SOURCE_REF;
    return obj;
  }

  function setPowerAvailability(st,p,value,reason) {
    if(!p) return;
    value=(value==="available"||value==="suppressed"||value==="restricted"||value==="lost"||value==="dormant"||value==="unknown")?value:"unknown";
    p.availability=value;
    pushBounded(p.availabilityHistory,actionRecord(st,{value:value,reason:shortText(reason||"",150)}),14,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value+"|"+(x.reason||"");});
    updateStatus(st,p);
  }

  function setEntityGlobalState(st,e,value,note) {
    if(!e) return; e.globalState=value||"normal"; e.globalStateNote=shortText(note||"",180);
    pushBounded(e.stateHistory,actionRecord(st,{value:e.globalState,note:e.globalStateNote}),12,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value+"|"+(x.note||"");});
  }

  function setEntityForm(st,e,value,note) {
    if(!e) return; e.activeForm=value||"";
    pushBounded(e.formHistory,actionRecord(st,{value:e.activeForm,note:shortText(note||"",160)}),12,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value;});
  }

  function setPowerActivation(st,p,value,evidence) {
    if(!p||!value) return; p.activation=value;
    pushBounded(p.activationHistory,actionRecord(st,{value:value,text:shortText(evidence||"",150)}),10,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value;});
  }

  function setPowerAccessMode(st,p,value,evidence) {
    if(!p||!value) return; p.accessMode=value;
    pushBounded(p.accessHistory,actionRecord(st,{value:value,text:shortText(evidence||"",150)}),10,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.value;});
  }

  function recordPowerTrait(st,p,value) {
    if(!p||!value) return;
    pushBounded(p.traits,value,st.config.maxTraitsPerPower,function(x){return lower(x);});
    pushBounded(p.traitHistory,actionRecord(st,{value:value}),st.config.maxTraitsPerPower*2,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+lower(x.value);});
  }

  function recordPowerSource(st,p,value) {
    if(!p||!value) return;
    pushBounded(p.sources,value,5,function(x){return lower(x);});
    pushBounded(p.sourceHistory,actionRecord(st,{value:value}),10,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+lower(x.value);});
  }

  function recordPowerFormBinding(st,p,value) {
    if(!p||!value) return;
    pushBounded(p.forms,value,5,function(x){return lower(x);});
    pushBounded(p.formBindingHistory,actionRecord(st,{value:value}),10,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+lower(x.value);});
  }

  function recordProgressionState(st,p) {
    if(!p) return;
    pushBounded(p.progressionHistory,actionRecord(st,{control:p.control||0,mastery:p.mastery||"unknown"}),14,function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.control+"|"+x.mastery;});
  }

  function filterAfterAction(arr,target,onRemove) {
    if(!arr||!arr.length) return 0; var i,r,n=0;
    for(i=arr.length-1;i>=0;i--){r=arr[i];if(r&&r.actionCount!=null&&r.actionCount>target){if(onRemove)onRemove(r);arr.splice(i,1);n++;}}
    return n;
  }

  function restoreLatestHistory(arr,fieldObj,field,defaultValue) {
    if(!arr||!arr.length){fieldObj[field]=defaultValue;return;}
    fieldObj[field]=arr[arr.length-1].value!=null?arr[arr.length-1].value:defaultValue;
  }

  function reconcileTimeline(st) {
    if(!st.config.timelineGuard || st.rollbackTarget==null) return;
    var target=st.rollbackTarget, i,j,e,p,id,removed=0,rec,arr,kinds,k,latest;
    st.rollbackTarget=null;
    for(i=st.entityOrder.length-1;i>=0;i--){
      e=st.entities[st.entityOrder[i]]; if(!e) continue;
      for(j=e.powerOrder.length-1;j>=0;j--){
        id=e.powerOrder[j]; p=e.powers[id]; if(!p) continue;
        removed+=filterAfterAction(p.evidence,target,function(r){p.score=round2(clamp(p.score-(Number(r.delta)||0),-4,12));});
        removed+=filterAfterAction(p.feats,target,function(r){if(r.outcome==="success")p.successfulUses=Math.max(0,p.successfulUses-1);else if(r.outcome==="partial")p.partialUses=Math.max(0,p.partialUses-1);else if(r.outcome==="failure")p.failedUses=Math.max(0,p.failedUses-1);});
        [p.limits,p.costs,p.counters,p.conditions,p.scaleNotes,p.contradictions,p.applications,p.links,p.emotionLinks,p.techniques,p.resources,p.signatures,p.training,p.discoveryHistory,p.synergies].forEach(function(a){removed+=filterAfterAction(a,target);});
        if(p.scale) for(k in p.scale) if(hasOwn(p.scale,k)) removed+=filterAfterAction(p.scale[k],target);
        removed+=filterAfterAction(p.availabilityHistory,target); restoreLatestHistory(p.availabilityHistory,p,"availability","unknown");
        removed+=filterAfterAction(p.activationHistory,target); restoreLatestHistory(p.activationHistory,p,"activation","unknown");
        removed+=filterAfterAction(p.accessHistory,target); restoreLatestHistory(p.accessHistory,p,"accessMode","unknown");
        removed+=filterAfterAction(p.traitHistory,target); p.traits=[]; for(k=0;k<p.traitHistory.length;k++) if(p.traitHistory[k].value) pushBounded(p.traits,p.traitHistory[k].value,st.config.maxTraitsPerPower,function(x){return lower(x);});
        removed+=filterAfterAction(p.sourceHistory,target); p.sources=[]; for(k=0;k<p.sourceHistory.length;k++) if(p.sourceHistory[k].value) pushBounded(p.sources,p.sourceHistory[k].value,5,function(x){return lower(x);});
        removed+=filterAfterAction(p.formBindingHistory,target); p.forms=[]; for(k=0;k<p.formBindingHistory.length;k++) if(p.formBindingHistory[k].value) pushBounded(p.forms,p.formBindingHistory[k].value,5,function(x){return lower(x);});
        removed+=filterAfterAction(p.progressionHistory,target); latest=p.progressionHistory.length?p.progressionHistory[p.progressionHistory.length-1]:null; if(latest){p.control=latest.control||0;p.mastery=latest.mastery||"unknown";}else{p.control=0;p.mastery="unknown";}
        removed+=filterAfterAction(p.reliabilityHistory,target); restoreLatestHistory(p.reliabilityHistory,p,"reliability","unknown");
        removed+=filterAfterAction(p.precisionHistory,target); restoreLatestHistory(p.precisionHistory,p,"precision","unknown");
        removed+=filterAfterAction(p.collateralHistory,target); restoreLatestHistory(p.collateralHistory,p,"controlRisk","unknown");
        updateStatus(st,p);
        if(p.firstSeenAction!=null && p.firstSeenAction>target && !p.evidence.length && !p.feats.length){delete e.powers[id];e.powerOrder.splice(j,1);removed++;}
      }
      removed+=filterAfterAction(e.defenses,target); removed+=filterAfterAction(e.vulnerabilities,target); removed+=filterAfterAction(e.contradictions,target);
      removed+=filterAfterAction(e.stateHistory,target); latest=e.stateHistory.length?e.stateHistory[e.stateHistory.length-1]:null; if(latest){e.globalState=latest.value||"normal";e.globalStateNote=latest.note||"";}else{e.globalState="normal";e.globalStateNote="";}
      removed+=filterAfterAction(e.formHistory,target); latest=e.formHistory.length?e.formHistory[e.formHistory.length-1]:null; e.activeForm=latest?(latest.value||""):"";
      if(e.psyche){kinds=["goals","plans","fears","beliefs","secrets","restraints","selfImage","conflicts","emotions","powerAttitudes","emotionLinks","revisions"];for(k=0;k<kinds.length;k++){arr=e.psyche[kinds[k]]||[];for(j=arr.length-1;j>=0;j--){rec=arr[j];if(rec&&rec.resolvedActionCount!=null&&rec.resolvedActionCount>target){rec.resolved=false;delete rec.resolvedActionCount;}if(rec&&rec.actionCount!=null&&rec.actionCount>target){arr.splice(j,1);removed++;}}}}
      if(e.firstSeenAction!=null && e.firstSeenAction>target && !e.powerOrder.length && !psycheHasMeaning(e) && e.name!=="You"){delete st.entities[e.id];st.entityOrder.splice(i,1);removed++;}
    }
    removed+=filterAfterAction(st.recentEvents,target); removed+=filterAfterAction(st.interactions,target); removed+=filterAfterAction(st.synergies,target); removed+=filterAfterAction(st.pendingAttempts,target);
    // Rebuild transient lookup pointers after powers/entities were removed.
    st.lastPowerByEntity={};
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(e&&e.powerOrder.length)st.lastPowerByEntity[e.id]=e.powerOrder[e.powerOrder.length-1];}
    if(st.focusEntity!=="You"&&!st.entities[entityKey(st.focusEntity)])st.focusEntity="You";
    // Dedupe fingerprints are action-scoped; old future fingerprints must not suppress the rewritten branch.
    st.seenSignals={}; st.seenSignalOrder=[]; st.lastObservedActionCount=target; st.cardSignatures={};st.psycheCardSignatures={};st.lastCardSync=-999;st.lastPsycheCardSync=-999;
    removed+=cleanupOrphanGeneratedCards(st); st.stats.rollbackCleanups+=removed;
    // Input runs before the next model-context build, so immediately repairing
    // generated cards here prevents discarded-branch memory leaking back in.
    try{syncStoryCards(st);syncPsycheCards(st);}catch(syncErr){logDebug("POWERS rollback card resync failed",syncErr&&syncErr.message);}
    addEvent(st,"Timeline reconciled after undo/edit (removed "+removed+" future records)","timeline");
  }

  function init(runtimeInfo) {
    var st = getState(true);
    if (!st) return null;
    mergeDefaults(st);
    loadConfig(st);
    // Runtime provenance must be established before Story Card or history
    // seeding so every new record belongs to the correct action/timeline.
    if (runtimeInfo) {
      setRuntimeInfo(st,runtimeInfo);
      reconcileTimeline(st);
    }
    seedEntitiesFromStoryCards(st);
    seedPowersFromStoryCards(st);
    seedPsycheCanonCards(st);
    return st;
  }

  function splitSentences(textValue) {
    var token="\uE000", t = String(textValue || "").replace(/\r/g, "\n");
    // Preserve decimal measurements and common honorific abbreviations so
    // "3.5 seconds" and "Dr. Vale" remain a single evidence sentence.
    t=t.replace(/(\d)\.(\d)/g,"$1"+token+"$2");
    t=t.replace(/\b(Dr|Mr|Mrs|Ms|Prof|Capt|Cmdr|Gen|Lt|Sgt|Sr|Jr|St)\./g,"$1"+token);
    var rough = t.match(/[^.!?\n]+[.!?]?/g) || [];
    var out = [], i, s;
    for (i = 0; i < rough.length; i++) {
      s = trim(rough[i]).replace(new RegExp(token,"g"),".");
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
    // Fallback capitalized-name scans may capture the possessive suffix in
    // "Mara's flight". Strip only a terminal possessive, never apostrophes
    // inside real names such as O'Brien.
    name = name.replace(/[’']s$/i, "");
    name = name.replace(/^(?:and|but|then|while|when|as|if|suppose|imagine|maybe|perhaps)\s+/i, "");
    if (!name || name.length > 60) return "";
    if (NAME_STOP[lower(name)]) return "";
    if (isLikelyLocationName(name)) return "";
    return name;
  }

  function emptyPsyche() {
    return {
      goals:[], plans:[], fears:[], beliefs:[], secrets:[], restraints:[], selfImage:[],
      conflicts:[], emotions:[], powerAttitudes:[], emotionLinks:[], revisions:[], lastUpdated:-1
    };
  }

  function ensurePsyche(entity) {
    if (!entity.psyche) entity.psyche = emptyPsyche();
    var base=emptyPsyche(), k;
    for(k in base) if(hasOwn(base,k) && entity.psyche[k]==null) entity.psyche[k]=base[k];
    return entity.psyche;
  }

  function getOrCreateEntity(st, name, kind) {
    name = normalizeName(name);
    if (!name) return null;
    if (lower(name) === "i" || lower(name) === "me" || lower(name) === "my" || lower(name) === "myself" || lower(name) === "you" || lower(name) === "your" || lower(name) === "yourself") name = "You";
    var key = entityKey(name), e = st.entities[key];
    if (!e) {
      e = st.entities[key] = {
        id: key, name: name, kind: kind || (name === "You" ? "player" : "character"), aliases: [],
        powers: {}, powerOrder: [], defenses: [], vulnerabilities: [], forms: {}, activeForm: "",
        globalState: "normal", globalStateNote: "", sources: [], lastSeen: st.turn, firstSeenAction: st.runtimeActionCount, createdSourceRef:ACTIVE_SOURCE_REF||"",
        mentions: 0, narrativeSeen: false, contradictions: [],
        stateHistory:[actionRecord(st,{value:"normal",note:""})], formHistory:[actionRecord(st,{value:""})], psyche: emptyPsyche()
      };
      st.entityOrder.push(key);
    } else if (name.length > e.name.length && lower(name).indexOf(lower(e.name)) >= 0) {
      e.aliases.push(e.name); e.name = name;
    }
    ensurePsyche(e);
    if(e.narrativeSeen==null) e.narrativeSeen=false;
    e.lastSeen = st.turn; e.mentions += 1;
    return e;
  }

  function filterSourceRef(arr,ref,onRemove) {
    if(!arr||!arr.length||!ref)return 0;var i,r,n=0;
    for(i=arr.length-1;i>=0;i--){r=arr[i];if(r&&r.sourceRef===ref){if(onRemove)onRemove(r);arr.splice(i,1);n++;}}
    return n;
  }

  function purgeAuthoredSource(st,ref) {
    if(!st||!ref)return 0;var removed=0,i,j,e,p,id,k,latest,kinds,arr,rec;
    for(i=st.entityOrder.length-1;i>=0;i--){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      for(j=e.powerOrder.length-1;j>=0;j--){
        id=e.powerOrder[j];p=e.powers[id];if(!p)continue;
        removed+=filterSourceRef(p.evidence,ref,function(r){p.score=round2(clamp(p.score-(Number(r.delta)||0),-4,12));});
        removed+=filterSourceRef(p.feats,ref,function(r){if(r.outcome==="success")p.successfulUses=Math.max(0,p.successfulUses-1);else if(r.outcome==="partial")p.partialUses=Math.max(0,p.partialUses-1);else if(r.outcome==="failure")p.failedUses=Math.max(0,p.failedUses-1);});
        [p.limits,p.costs,p.counters,p.conditions,p.scaleNotes,p.contradictions,p.applications,p.links,p.emotionLinks,p.techniques,p.resources,p.signatures,p.training,p.discoveryHistory,p.synergies].forEach(function(a){removed+=filterSourceRef(a,ref);});
        if(p.scale)for(k in p.scale)if(hasOwn(p.scale,k))removed+=filterSourceRef(p.scale[k],ref);
        removed+=filterSourceRef(p.availabilityHistory,ref);restoreLatestHistory(p.availabilityHistory,p,"availability","unknown");
        removed+=filterSourceRef(p.activationHistory,ref);restoreLatestHistory(p.activationHistory,p,"activation","unknown");
        removed+=filterSourceRef(p.accessHistory,ref);restoreLatestHistory(p.accessHistory,p,"accessMode","unknown");
        removed+=filterSourceRef(p.traitHistory,ref);p.traits=[];for(k=0;k<p.traitHistory.length;k++)if(p.traitHistory[k].value)pushBounded(p.traits,p.traitHistory[k].value,st.config.maxTraitsPerPower,function(x){return lower(x);});
        removed+=filterSourceRef(p.sourceHistory,ref);p.sources=[];for(k=0;k<p.sourceHistory.length;k++)if(p.sourceHistory[k].value)pushBounded(p.sources,p.sourceHistory[k].value,5,function(x){return lower(x);});
        removed+=filterSourceRef(p.formBindingHistory,ref);p.forms=[];for(k=0;k<p.formBindingHistory.length;k++)if(p.formBindingHistory[k].value)pushBounded(p.forms,p.formBindingHistory[k].value,5,function(x){return lower(x);});
        removed+=filterSourceRef(p.progressionHistory,ref);latest=p.progressionHistory.length?p.progressionHistory[p.progressionHistory.length-1]:null;if(latest){p.control=latest.control||0;p.mastery=latest.mastery||"unknown";}else{p.control=0;p.mastery="unknown";}
        removed+=filterSourceRef(p.reliabilityHistory,ref);restoreLatestHistory(p.reliabilityHistory,p,"reliability","unknown");
        removed+=filterSourceRef(p.precisionHistory,ref);restoreLatestHistory(p.precisionHistory,p,"precision","unknown");
        removed+=filterSourceRef(p.collateralHistory,ref);restoreLatestHistory(p.collateralHistory,p,"controlRisk","unknown");
        updateStatus(st,p);
        if(p.createdSourceRef===ref && !p.evidence.length && !p.feats.length && !p.limits.length && !p.costs.length && !p.counters.length && !p.conditions.length){delete e.powers[id];e.powerOrder.splice(j,1);removed++;}
        else if(p.createdSourceRef===ref)p.createdSourceRef="";
      }
      removed+=filterSourceRef(e.defenses,ref);removed+=filterSourceRef(e.vulnerabilities,ref);removed+=filterSourceRef(e.contradictions,ref);
      removed+=filterSourceRef(e.stateHistory,ref);latest=e.stateHistory.length?e.stateHistory[e.stateHistory.length-1]:null;if(latest){e.globalState=latest.value||"normal";e.globalStateNote=latest.note||"";}else{e.globalState="normal";e.globalStateNote="";}
      removed+=filterSourceRef(e.formHistory,ref);latest=e.formHistory.length?e.formHistory[e.formHistory.length-1]:null;e.activeForm=latest?(latest.value||""):"";
      if(e.psyche){kinds=["goals","plans","fears","beliefs","secrets","restraints","selfImage","conflicts","emotions","powerAttitudes","emotionLinks","revisions"];for(k=0;k<kinds.length;k++){arr=e.psyche[kinds[k]]||[];for(j=arr.length-1;j>=0;j--){rec=arr[j];if(rec&&rec.sourceRef===ref){arr.splice(j,1);removed++;}}}}
      for(k in e.forms)if(hasOwn(e.forms,k)){var formObj=e.forms[k];if(formObj&&formObj.notes){filterSourceRef(formObj.notes,ref);if(!formObj.notes.length&&e.activeForm!==formObj.name)delete e.forms[k];}}
      if(e.createdSourceRef===ref&&!e.powerOrder.length&&!psycheHasMeaning(e)&&e.name!=="You"){delete st.entities[e.id];st.entityOrder.splice(i,1);removed++;}
      else if(e.createdSourceRef===ref)e.createdSourceRef="";
    }
    removed+=filterSourceRef(st.synergies,ref);
    st.cardSignatures={};st.psycheCardSignatures={};st.lastPowerByEntity={};
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(e&&e.powerOrder.length)st.lastPowerByEntity[e.id]=e.powerOrder[e.powerOrder.length-1];}
    cleanupOrphanGeneratedCards(st);return removed;
  }

  function seedEntitiesFromStoryCards(st) {
    if (typeof storyCards === "undefined" || !storyCards) return;
    if (st.hookCount % 4 !== 0 && st.bootstrapDone) return;
    var i, c, type, keys, first, e;
    for (i = 0; i < storyCards.length && i < 250; i++) {
      c = storyCards[i] || {}; type = lower(c.type); keys = String(c.keys || "");
      if (type.indexOf("character") < 0 && type.indexOf("person") < 0 && type.indexOf("npc") < 0 && type.indexOf("creature") < 0 && type.indexOf("companion") < 0) continue;
      var keyParts = keys.split(/[,;|]/), ai, alias;
      first = cleanCandidateName(keyParts[0]);
      if (first) {
        e = getOrCreateEntity(st, first, type.indexOf("creature") >= 0 ? "creature" : "character");
        if (e) {
          e.seededFromCard = true;
          e.firstSeenAction = null;
          if(e.stateHistory&&e.stateHistory.length)e.stateHistory[0].actionCount=null;
          if(e.formHistory&&e.formHistory.length)e.formHistory[0].actionCount=null;
          for (ai=1; ai<keyParts.length && ai<8; ai++) {
            alias=cleanCandidateName(keyParts[ai]);
            if(alias && lower(alias)!==lower(e.name)) pushBounded(e.aliases,alias,8,function(x){return lower(x);});
          }
        }
      }
    }
  }

  function storyCardPowerListCue(sentence) {
    return /^\s*(?:powers?|abilities|superpowers?|gifts?|techniques?|skills?)\s*[:=-]/i.test(String(sentence||""));
  }

  function storyCardCustomListDefs(sentence) {
    var body=String(sentence||"").replace(/^\s*(?:powers?|abilities|superpowers?|gifts?|techniques?|skills?)\s*[:=-]\s*/i,""),parts=body.split(/\s*,\s*|\s*;\s*|\s+and\s+/i),out=[],seen={},i,raw,known,def;
    for(i=0;i<parts.length&&out.length<10;i++){
      raw=trim(parts[i]).replace(/^(?:and|or|the|a|an)\s+/i,"").replace(/[.!?]+$/g,"");
      if(!raw||raw.length<3||raw.length>70||/\b(?:only|because|when|while|unless|before|after|cannot|can't|costs?|requires?|causes?)\b/i.test(raw))continue;
      known=uniqueDefsFromTerms(raw);if(known.length)continue;
      if(ONTOLOGY_POWER_ENDING_RE.test(raw)||ONTOLOGY_SUFFIX_WORD_RE.test(raw))def=ontologyPowerDefFromName(raw);
      else def={id:"custom_"+powerKey(raw),name:titleCasePhrase(raw),cat:"custom",terms:[],feats:[],semantic:semanticFromName(raw)};
      if(!seen[def.id]){seen[def.id]=1;out.push(def);}
    }
    return out;
  }

  function seedPowersFromStoryCards(st) {
    if (typeof storyCards === "undefined" || !storyCards) return;
    var i, c, type, keys, entry, first, e, sig, sentences, k, sentence, sentDefs, j, p, mentioned, custom, isList, amount, refKey, oldSig, eligible={};
    for (i = 0; i < storyCards.length && i < 250; i++) {
      c = storyCards[i] || {}; type = lower(c.type); keys = String(c.keys || ""); entry = String(c.entry || "");
      if (!entry) continue;
      // Never re-ingest this engine's own generated cards or its config card.
      if (type === "powers" || type === "powers psyche" || type === "powers config" || lower(keys).indexOf("powers config") >= 0) continue;
      if (type.indexOf("character") < 0 && type.indexOf("person") < 0 && type.indexOf("npc") < 0 && type.indexOf("creature") < 0 && type !== "powers canon") continue;
      refKey=String(c.id != null ? c.id : i);eligible[refKey]=1;
      sig = refKey + "|" + keys + "|" + entry; oldSig=st.storyCardSeeds[refKey];
      if (oldSig === sig) continue;
      if(oldSig && oldSig!==sig) purgeAuthoredSource(st,"card:"+refKey);
      st.storyCardSeeds[refKey] = sig;

      first = cleanCandidateName(keys.split(/[,;|]/)[0].replace(/^powers canon::/i, ""));
      if (!first) continue;
      var savedActionCount=st.runtimeActionCount, savedSourceRef=ACTIVE_SOURCE_REF;
      st.runtimeActionCount=null; ACTIVE_SOURCE_REF="card:"+refKey; // author-level canon is not part of the undoable story branch
      e = getOrCreateEntity(st, first, type.indexOf("creature") >= 0 ? "creature" : "character");
      if (!e) { st.runtimeActionCount=savedActionCount; ACTIVE_SOURCE_REF=savedSourceRef; continue; }
      e.seededFromCard=true; e.firstSeenAction=null;

      // Authored lore is authoritative about what it ASSERTS, but it is not a
      // license to turn negations, hypotheticals or in-world claims into facts.
      // Each sentence therefore uses the same evidence grammar as live text.
      sentences = splitSentences(entry);
      for (k = 0; k < sentences.length; k++) {
        sentence = sentences[k];
        if (!sentence) continue;
        isList = storyCardPowerListCue(sentence);
        if (isHypotheticalPowerStatement(sentence) || isBarePowerDenial(sentence)) {
          st.stats.speculativeSkipped += 1;
          // Psyche/defense text can still be meaningful even when it does not
          // establish an ability.
          detectDefense(st,e,sentence);
          detectPsyche(st,e,sentence,"storycard",[]);
          continue;
        }

        // A compact "Powers: flight, telepathy" line is deliberate authored
        // canon. Give each recognized item explicit evidence without forcing
        // arbitrary nouns in ordinary prose to become abilities.
        if (isList) {
          sentDefs = uniqueDefsFromTerms(sentence);
          if (st.config.ontologyDetection) sentDefs=mergeDefs(sentDefs,uniqueDefsFromOntology(sentence));
          if (st.config.allowCustomPowers) sentDefs=mergeDefs(sentDefs,storyCardCustomListDefs(sentence));
          mentioned=[];
          for (j=0;j<sentDefs.length;j++) {
            p=getOrCreatePower(st,e,sentDefs[j]); mentioned.push(p);
            amount=st.config.explicitScore*0.95;
            addEvidence(st,e,p,amount,"story card canon",sentence,"storycard");
            if(p.availability==="unknown") setPowerAvailability(st,p,"available","Story Card canon");
          }
          if(!sentDefs.length && st.config.allowCustomPowers) {
            custom=extractCustomAbility(sentence,st.config.detection);
            if(custom) {
              p=getOrCreatePower(st,e,custom);mentioned.push(p);
              addEvidence(st,e,p,st.config.explicitScore*0.95,"story card canon",sentence,"storycard");
              if(p.availability==="unknown") setPowerAvailability(st,p,"available","Story Card canon");
            }
          }
        } else {
          mentioned=processMentionedPowers(st,sentence,"storycard",e) || [];
        }

        detectLimitsCosts(st,e,sentence,mentioned);
        detectScale(st,e,sentence,mentioned);
        detectFormBinding(st,e,sentence,mentioned);
        detectRecentStrain(st,e,sentence,mentioned);
        detectAvailability(st,e,sentence,mentioned);
        detectProgression(st,e,sentence,mentioned);
        detectDefense(st,e,sentence);
        detectApplications(st,e,sentence,mentioned,"storycard");
        detectTraitsActivation(st,e,sentence,mentioned);
        detectPowerLinks(st,e,sentence,mentioned);
        detectAccessModes(st,e,sentence,mentioned);
        processDeepPowerContinuity(st,e,sentence,mentioned,"storycard");
        detectPsyche(st,e,sentence,"storycard",mentioned);
        detectInteractionLedger(st,sentence);
      }
      st.runtimeActionCount=savedActionCount; ACTIVE_SOURCE_REF=savedSourceRef;
    }
    // Cards deleted or retyped since the last hook must retract their authored facts.
    for(refKey in st.storyCardSeeds)if(hasOwn(st.storyCardSeeds,refKey)&&!eligible[refKey]){purgeAuthoredSource(st,"card:"+refKey);delete st.storyCardSeeds[refKey];}
  }

  function seedPsycheCanonCards(st) {
    if (!st.config.innerCurrent || typeof storyCards === "undefined" || !storyCards) return;
    var i,c,type,keys,entry,sig,name,e,lines,j,line,refKey,oldSig,eligible={};
    for(i=0;i<storyCards.length && i<250;i++) {
      c=storyCards[i]||{}; type=lower(c.type); keys=String(c.keys||""); entry=String(c.entry||"");
      if(type!=="powers psyche canon" && lower(keys).indexOf("psyche canon::")<0) continue;
      refKey=String(c.id!=null?c.id:i);eligible[refKey]=1;sig=refKey+"|"+keys+"|"+entry;oldSig=st.psycheCardSeeds[refKey];
      if(oldSig===sig) continue;
      if(oldSig&&oldSig!==sig) purgeAuthoredSource(st,"psyche-card:"+refKey);
      st.psycheCardSeeds[refKey]=sig;
      name=cleanCandidateName(keys.split(/[,;|]/)[0].replace(/^psyche canon::/i,""));
      if(!name) continue;
      var savedPsycheAction=st.runtimeActionCount, savedPsycheRef=ACTIVE_SOURCE_REF; st.runtimeActionCount=null; ACTIVE_SOURCE_REF="psyche-card:"+refKey;
      e=getOrCreateEntity(st,name,"character");
      if(!e){st.runtimeActionCount=savedPsycheAction;ACTIVE_SOURCE_REF=savedPsycheRef;continue;}
      e.seededFromCard=true; e.firstSeenAction=null;
      lines=splitSentences(entry.replace(/\n+/g,". "));
      for(j=0;j<lines.length;j++){line=lines[j];detectPsyche(st,e,line,"storycard",[]);}
      st.runtimeActionCount=savedPsycheAction; ACTIVE_SOURCE_REF=savedPsycheRef;
    }
    for(refKey in st.psycheCardSeeds)if(hasOwn(st.psycheCardSeeds,refKey)&&!eligible[refKey]){purgeAuthoredSource(st,"psyche-card:"+refKey);delete st.psycheCardSeeds[refKey];}
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

  function extractSubjectEntity(st, sentence, source) {
    var m, token, e;
    var verbCue = "(?:(?:secretly|quietly|privately|desperately|reluctantly|silently|firmly|still|now|currently|deeply|really)\\s+){0,2}(?:try\\b|tries\\b|attempt\\b|attempts\\b|can\\b|could\\b|is able to\\b|has\\b|have\\b|possesses\\b|uses\\b|used\\b|wields?\\b|activates?\\b|unleashes?\\b|channels?\\b|invokes?\\b|casts?\\b|fires?\\b|flies\\b|teleports?\\b|transforms?\\b|phases?\\b|regenerates?\\b|controls?\\b|summons?\\b|projects?\\b|creates?\\b|generates?\\b|absorbs?\\b|copies\\b|nullifies\\b|manipulates?\\b|bends?\\b|freezes?\\b|stops?\\b|reads?\\b|heals?\\b|wants?\\b|hopes?\\b|plans?\\b|intends?\\b|fears?\\b|believes?\\b|thinks?\\b|feels?\\b|promises?\\b|vows?\\b|swears?\\b|refuses?\\b|hates?\\b|loves?\\b|resents?\\b|is afraid\\b|is scared\\b|is terrified\\b|is torn\\b|is conflicted\\b|am afraid\\b|am scared\\b|am terrified\\b|am torn\\b|am conflicted\\b|is (?:immune|resistant|vulnerable|weak|susceptible)\\b|has (?:an? )?(?:immunity|resistance|vulnerability|weakness)\\b|is (?:angry|furious|enraged|afraid|scared|terrified|fearful|anxious|nervous|panicked|guilty|ashamed|grieving|sad|hopeful|joyful|happy|relieved|jealous|envious|determined|confident|doubtful|uncertain|calm|excited|disgusted|resentful|desperate)\\b|seems? (?:angry|afraid|anxious|calm|confident|uncertain|sad|happy)\\b|looks? (?:angry|afraid|anxious|calm|sad|happy)\\b)";

    // Pronouns are handled separately so case-insensitive matching never makes
    // a lowercase verb look like part of a Proper Name.
    m = sentence.match(/^\s*>?\s*(I|You|He|She|They)\s+/i);
    if (m && new RegExp("^\\s*>?\\s*" + escRe(m[1]) + "\\s+" + verbCue, "i").test(sentence)) {
      e = resolvePronoun(st, m[1], source); if (e) return e;
    }

    // Proper-name subject. This portion is deliberately case-sensitive.
    m = sentence.match(/^\s*>?\s*([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\s+/);
    if (m && new RegExp("^\\s*>?\\s*" + escRe(m[1]) + "\\s+" + verbCue, "i").test(sentence)) {
      token = cleanCandidateName(m[1]); if (token) return getOrCreateEntity(st, token, "character");
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
    if (!GENERIC_ABILITY_HINT_RE.test(sentence) && !(st.config.ontologyDetection && (ONTOLOGY_POWER_ENDING_RE.test(sentence) || ONTOLOGY_SUFFIX_WORD_RE.test(sentence))) && !/\b(power|ability|gift|superhuman|supernatural)\b/i.test(sentence)) return out;
    m = sentence.match(/\b([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,3})\b/);
    if (m) {
      name = cleanCandidateName(m[1]);
      if (name) out.push(getOrCreateEntity(st, name, "character"));
    }
    return out;
  }

  function entityFromSubjectToken(st,token,source) {
    var e=resolvePronoun(st,token,source),name;
    if(e) return e;
    name=cleanCandidateName(token); return name?getOrCreateEntity(st,name,"character"):null;
  }

  function splitMultiSubjectClauses(sentence) {
    // Do NOT make the proper-name branch case-insensitive. With an /i flag,
    // ordinary continuations such as "and with fine control" can be parsed as
    // a fake Proper Name ("with fine") followed by the verb "control".
    var re=/\s+(?:while|whereas|but|and|meanwhile)\s+(?=(?:[Ii]|[Yy]ou|[Hh]e|[Ss]he|[Tt]hey|[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,2})\s+(?:can\b|cannot\b|can't\b|could\b|is able to\b|is not able to\b|isn't able to\b|has\b|have\b|possesses?\b|uses?\b|used\b|wields?\b|activates?\b|unleashes?\b|channels?\b|flies\b|teleports?\b|phases?\b|transforms?\b|regenerates?\b|controls?\b|summons?\b|creates?\b|generates?\b|manipulates?\b|wants?\b|plans?\b|fears?\b|believes?\b|thinks?\b|feels?\b|is\s+(?:immune|resistant|vulnerable|weak|afraid|angry|calm)\b))/g;
    var parts=String(sentence||"").split(re),out=[],i,p;
    if(parts.length<2) return [sentence];
    for(i=0;i<parts.length;i++){p=trim(parts[i]);if(p)out.push(p);}
    return out.length>1?out:[sentence];
  }

  function isHypotheticalPowerStatement(sentence) {
    return HYPOTHETICAL_RE.test(sentence) && (GENERIC_ABILITY_HINT_RE.test(sentence)||uniqueDefsFromTerms(sentence).length||(ONTOLOGY_POWER_ENDING_RE.test(sentence)||ONTOLOGY_SUFFIX_WORD_RE.test(sentence)));
  }

  function isBarePowerDenial(sentence) {
    if(!BARE_DENIAL_RE.test(sentence)) return false;
    if(LOSS_RE.test(sentence)||SUPPRESS_RE.test(sentence)||TEMP_RESTRICT_RE.test(sentence)) return false;
    if(CONDITION_CUE_RE.test(sentence)) return false;
    return true;
  }

  function reportedVerbIsBelief(v) {
    return /believ|think|thought|suspect|assum|expect|learn|discover|hear|was told|is told/i.test(v||"");
  }

  function processReportedStatement(st,sentence,source) {
    if(!st.config.attributionEngine || source==="storycard" || source==="reported") return false;
    var namePat="(?:I|[Yy]ou|[Hh]e|[Ss]he|[Tt]hey|[A-Z][A-Za-z0-9'’.-]*(?:\\s+[A-Z][A-Za-z0-9'’.-]*){0,2})",m,reporter,subject,verb,inner;
    // Reporter says/believes that Subject can ...
    var re1=new RegExp("^\\s*>?\\s*("+namePat+")\\s+((?:says?|said|claims?|claimed|believes?|believed|thinks?|thought|suspects?|suspected|assumes?|assumed|expects?|expected|hears?|heard|learns?|learned|discovers?|discovered|was told|is told))\\s+(?:that\\s+)?("+namePat+")\\s+(.+)$","");
    m=String(sentence).match(re1);
    if(m){
      reporter=entityFromSubjectToken(st,m[1],source); verb=m[2];
      subject=(reporter&&/^(?:he|she|they)$/i.test(m[3]))?reporter:entityFromSubjectToken(st,m[3],source); inner=m[3]+" "+m[4];
      if(reporter&&reportedVerbIsBelief(verb)) detectPsyche(st,reporter,sentence,source,[]);
      if(reporter&&subject&&reporter.id===subject.id && /\b(?:want|hope|plan|intend|fear|afraid|believe|think|feel|vow|swear|refuse|hate|love|resent|ashamed|proud|conflicted|torn)\b/i.test(inner)) detectPsyche(st,reporter,inner,"reported-self",[]);
      if(subject){st.stats.attributionSplits+=1;processSentence(st,subject.name+" "+m[4],"reported");return true;}
    }
    // Reporter says: "Subject can ..."
    var re2=new RegExp("^\\s*>?\\s*("+namePat+")\\s+((?:says?|said|claims?|claimed|believes?|believed|thinks?|thought|suspects?|suspected))\\s*[:,]\\s*[\"“‘'](.+?)(?:[\"”’']\\s*)?$","");
    m=String(sentence).match(re2);
    if(m){reporter=entityFromSubjectToken(st,m[1],source);verb=m[2];inner=m[3];if(reporter&&reportedVerbIsBelief(verb))detectPsyche(st,reporter,sentence,source,[]);if(reporter&&/^\s*(?:I|I'm|I am|I've|I have)\b/i.test(inner))detectPsyche(st,reporter,inner,"reported-self",[]);st.stats.attributionSplits+=1;processText(st,inner,"reported");return true;}
    // "Subject can ...," Reporter says.
    var re3=new RegExp("^\\s*[\"“‘'](.+?)[\"”’']\\s*,?\\s*("+namePat+")\\s+((?:says?|said|claims?|claimed|believes?|believed|thinks?|thought))\\b","");
    m=String(sentence).match(re3);
    if(m){inner=m[1];reporter=entityFromSubjectToken(st,m[2],source);verb=m[3];if(reporter&&reportedVerbIsBelief(verb))detectPsyche(st,reporter,sentence,source,[]);if(reporter&&/^\s*(?:I|I'm|I am|I've|I have)\b/i.test(inner))detectPsyche(st,reporter,inner,"reported-self",[]);st.stats.attributionSplits+=1;processText(st,inner,"reported");return true;}
    return false;
  }

  function naturalVerbPattern(term) {
    var m=String(term||"").match(/^(control|manipulate|generate|create|produce|emit|summon|absorb|nullify|negate|seal|heal|copy|mimic|redirect|alter|bend|reshape|shape|freeze|open|read|sense|detect|grant|bestow)\s+(.+)$/i),v,rest,forms;
    if(!m)return null;v=lower(m[1]);rest=trim(m[2]);
    if(!rest||rest.length>42||/\b(?:with|through|using|from|into|toward|towards|around)\b/i.test(rest))return null;
    forms={
      control:"control(?:s|led|ling)?", manipulate:"manipulat(?:e|es|ed|ing)", generate:"generat(?:e|es|ed|ing)", create:"creat(?:e|es|ed|ing)",
      produce:"produc(?:e|es|ed|ing)", emit:"emit(?:s|ted|ting)?", summon:"summon(?:s|ed|ing)?", absorb:"absorb(?:s|ed|ing)?", nullify:"nullif(?:y|ies|ied|ying)",
      negate:"negat(?:e|es|ed|ing)", seal:"seal(?:s|ed|ing)?", heal:"heal(?:s|ed|ing)?", copy:"cop(?:y|ies|ied|ying)", mimic:"mimic(?:s|ked|king)?",
      redirect:"redirect(?:s|ed|ing)?", alter:"alter(?:s|ed|ing)?", bend:"bend(?:s|ing)?|bent", reshape:"reshap(?:e|es|ed|ing)", shape:"shap(?:e|es|ed|ing)",
      freeze:"freez(?:e|es|ing)|froze|frozen", open:"open(?:s|ed|ing)?", read:"read(?:s|ing)?", sense:"sens(?:e|es|ed|ing)", detect:"detect(?:s|ed|ing)?",
      grant:"grant(?:s|ed|ing)?", bestow:"bestow(?:s|ed|ing)?"
    };
    rest=escRe(lower(rest)).replace(/\\ /g,"\\s+");
    return new RegExp("(?:^|[^a-z0-9])(?:"+forms[v]+")\\s+(?:(?:the|an?|existing|nearby|surrounding|ambient|available|raw|pure|his|her|their|your|my)\\s+){0,2}"+rest+"(?:$|[^a-z0-9])","i");
  }

  function buildIndexes() {
    installExtendedPowerAtlas();
    if (TERM_INDEX) return;
    TERM_INDEX = []; FEAT_INDEX = []; NATURAL_INDEX=[];
    var i, j, d, nr;
    for (i = 0; i < POWER_DEFS.length; i++) {
      d = POWER_DEFS[i];
      for (j = 0; j < d.terms.length; j++) {TERM_INDEX.push({term:lower(d.terms[j]), def:d});nr=naturalVerbPattern(d.terms[j]);if(nr)NATURAL_INDEX.push({re:nr,def:d});}
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
    // Natural inflection layer: catalogue terms can stay readable ("generate
    // fire") while narration may say "generates/generated/generating fire".
    if(NATURAL_VERB_GATE_RE.test(sentence)) for(i=0;i<NATURAL_INDEX.length;i++){x=NATURAL_INDEX[i];if(!found[x.def.id]&&x.re.test(sentence)){found[x.def.id]=1;out.push(x.def);}}
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

  function titleCasePhrase(s) {
    s = trim(s).replace(/[,.!?;:].*$/, "").replace(/\s+/g, " ");
    if (s.length > 64) s = s.slice(0, 64);
    var words = s.split(" "), i;
    for (i = 0; i < words.length; i++) if (words[i]) words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    return words.join(" ");
  }

  function extractCustomAbility(sentence, detectionMode) {
    var m, p, explicit = false;
    // Explicit ability language may define a completely novel power.
    m = sentence.match(/\b(?:power|ability|gift)\s*:\s*(?:can\s+)?([^.!?;]{3,90})/i);
    if (m) explicit = true;
    if (!m) m = sentence.match(/\b(?:power|ability|gift)\s+(?:is|allows? (?:him|her|them|you) to|lets? (?:him|her|them|you))\s+([^.!?;]{3,90})/i);
    if (m) explicit = true;
    if (!m) { m = sentence.match(/\b(?:has|possesses)\s+(?:the\s+)?(?:power|ability|gift)\s+to\s+([^.!?;]{3,90})/i); if (m) explicit = true; }
    if (!m && detectionMode !== "conservative") m = sentence.match(/\b(?:can|is able to)\s+([^.!?;]{3,80})/i);
    if (!m) return null;
    p = trim(m[1]).replace(/\b(?:but|although|though|however)\b.*$/i, "");
    if (!explicit && !GENERIC_ABILITY_HINT_RE.test(p)) return null;
    if (/^(?:only\s+)?(?:remain|stay|keep|continue|see|hear|say|speak|walk|run|eat|drink|sleep|think|know|remember)\b/i.test(p) && !GENERIC_ABILITY_HINT_RE.test(p)) return null;
    p = p.replace(/^(?:use|create|generate|control|manipulate)\s+(?:his|her|their|your)?\s*/i, function(x){return trim(x);});
    if (p.length < 3) return null;
    return {id:"custom_" + powerKey(p), name:titleCasePhrase(p), cat:"custom", terms:[], feats:[]};
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
    var suffixMatch=domain.match(/(kinesis|mancy|pathy|portation|morphism)$/i), root;
    if(suffixMatch){
      if(suffixMatch[1].toLowerCase()==="kinesis" && mechanics.indexOf("manipulation")<0){mechanics.push("manipulation");if(cat==="custom")cat="manipulation";}
      else if(suffixMatch[1].toLowerCase()==="morphism" && mechanics.indexOf("transformation")<0){mechanics.push("transformation");if(cat==="custom")cat="transformation";}
      else if(suffixMatch[1].toLowerCase()==="portation" && mechanics.indexOf("transportation")<0){mechanics.push("transportation");if(cat==="custom")cat="mobility";}
      else if(suffixMatch[1].toLowerCase()==="pathy" && mechanics.indexOf("communication")<0){mechanics.push("communication");if(cat==="custom")cat="psychic";}
      else if(suffixMatch[1].toLowerCase()==="mancy" && mechanics.indexOf("magic")<0){mechanics.push("magic");if(cat==="custom")cat="mystic";}
      domain=domain.replace(/(?:kinesis|mancy|pathy|portation|morphism)$/i,"");
    }
    domain=trim(domain); root=lower(domain);
    if(ONTOLOGY_ROOT_ALIASES[root]) domain=ONTOLOGY_ROOT_ALIASES[root];
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
    var parts=raw.split(/\s+/), i, cut=-1;
    var cues={"has":1,"have":1,"had":1,"can":1,"could":1,"uses":1,"use":1,"used":1,"with":1,"wields":1,"wield":1,"unleashes":1,"unleash":1,"activates":1,"activate":1,"channels":1,"channel":1,"possesses":1,"possess":1,"is":1,"are":1,"called":1,"named":1,"power":1,"ability":1,"powers":1,"abilities":1};
    for(i=0;i<parts.length-1;i++) if(cues[lower(parts[i])]) cut=i;
    if(cut>=0) parts=parts.slice(cut+1);
    while(parts.length && /^(?:and|or|plus|the|a|an|his|her|their|your|my|its|this|that|of|from|about|around|over|under|through|with|without|to|for|by)$/i.test(parts[0])) parts.shift();
    if(parts.length>7) parts=parts.slice(parts.length-7);
    raw=trim(parts.join(" "));
    if(!raw || /^(?:power|ability|powers|abilities)$/i.test(raw)) return "";
    if(/^(?:control|manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|transmutation|restoration|healing|inducement|infusion|transformation|transportation|mastery|magic|science|combat|interaction|storage|fusion|separation)$/i.test(raw)) return "";
    return raw;
  }

  function uniqueDefsFromOntology(sentence) {
    var out=[], seen={}, re, m, raw, def, low=lower(sentence), i;
    if(!ONTOLOGY_POWER_ENDING_RE.test(sentence) && !ONTOLOGY_SUFFIX_WORD_RE.test(sentence) && !/\b(omnipotence|omniscience|omnipresence|psionics|magic|superpowers?)\b/i.test(sentence)) return out;
    re=/\b((?:(?:absolute|almighty|omni(?:potent|potence)?|transcendent|boundless|ultimate|infinite|primordial|supreme|peak|enhanced|superhuman|supernatural|superior|divine|cosmic|magical|psychic|psionic|quantum|dimensional)\s+){0,2}(?:[A-Za-z0-9][A-Za-z0-9'’.-]*\s+){0,6}(?:manipulation|generation|creation|mimicry|embodiment|physiology|empowerment|absorption|immunity|resistance|negation|nullification|sealing|summoning|bestowal|replication|detection|perception|communication|projection|constructs?|transmutation|restoration|regeneration|healing|inducement|infusion|augmentation|enhancement|evolution|adaptation|transformation|shapeshifting|transportation|teleportation|control|mastery|magic|science|combat|boundary|interaction|intangibility|invisibility|storage|exchange|conversion|fusion|separation|connection|awareness|vision|sense))\b/gi;
    while((m=re.exec(sentence))!==null && out.length<6) {
      raw=cleanOntologyCandidate(m[1]);
      if(!raw || raw.split(/\s+/).length>7) continue;
      // Reject ordinary narrative phrases that merely end in words such as
      // "control" or "mastery". This prevents psyche sentences like
      // "Mara fears losing control" from becoming fake powers.
      if(/\b(?:fears?|feared|afraid|scared|terrified|wants?|wanted|plans?|planned|hopes?|hoped|believes?|believed|thinks?|thought|tries?|tried|attempts?|attempted|struggles?|struggled)\b/i.test(raw)) continue;
      if(/^(?:losing|lose|lost|maintaining|maintain|keeping|keep|better|perfect|complete|greater|less|more)\s+(?:control|mastery|awareness|resistance)$/i.test(raw)) continue;
      if(/^(?:normal|human|ordinary|social|story|recent|current)\s+(?:power|ability)/i.test(raw)) continue;
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

  function isGenericMechanicDef(def) {
    if(!def)return false;
    return /^(?:Transmutation|Sealing|Banishment|Fusion|Separation|Teleportation|Regeneration|Healing|Intangibility|Invisibility|Summoning|Duplication)$/i.test(def.name||"");
  }

  function specificOntologySupersedes(generic,specific) {
    if(!generic||!specific||!specific.ontology||!isGenericMechanicDef(generic))return false;
    var sem=specific.semantic||semanticFromName(specific.name),g=lower(generic.name),i,mech=(sem&&sem.mechanics)||[];
    if(g==="transmutation"&&mech.indexOf("transmutation")>=0)return true;
    if(g==="sealing"&&mech.indexOf("sealing")>=0)return true;
    if(g==="fusion"&&mech.indexOf("fusion")>=0)return true;
    if(g==="separation"&&mech.indexOf("separation")>=0)return true;
    if(g==="teleportation"&&mech.indexOf("transportation")>=0&&lower(specific.name)!=="teleportation")return true;
    if(g==="regeneration"&&mech.indexOf("regeneration")>=0&&lower(specific.name)!=="regeneration")return true;
    if(g==="healing"&&mech.indexOf("healing")>=0&&lower(specific.name)!=="healing")return true;
    if(g==="intangibility"&&mech.indexOf("intangibility")>=0&&lower(specific.name)!=="intangibility")return true;
    if(g==="invisibility"&&mech.indexOf("invisibility")>=0&&lower(specific.name)!=="invisibility")return true;
    if(g==="summoning"&&mech.indexOf("summoning")>=0&&lower(specific.name)!=="summoning")return true;
    return false;
  }

  function mergeDefs(primary, extra) {
    var out=[], seen={}, i,j,d,drop;
    for(i=0;i<primary.length;i++){
      d=primary[i];drop=false;
      for(j=0;j<extra.length;j++)if(specificOntologySupersedes(d,extra[j])){drop=true;break;}
      if(!drop&&!seen[d.id]){seen[d.id]=1;out.push(d);}
    }
    for(i=0;i<extra.length;i++){d=extra[i];if(!seen[d.id]){seen[d.id]=1;out.push(d);}}
    return out;
  }

  function ensurePowerSemantics(p, def) {
    if(!p.semantic) p.semantic=(def&&def.semantic)?def.semantic:semanticFromName(p.name);
    if(!p.applications) p.applications=[];
    if(!p.traits) p.traits=[];
    if(!p.links) p.links=[];
    if(!p.emotionLinks) p.emotionLinks=[];
    if(!p.activation) p.activation="unknown";
  }

  function getOrCreatePower(st, entity, def) {
    var id = def.id || powerKey(def.name), p = entity.powers[id];
    if (!p) {
      p = entity.powers[id] = {
        id:id, name:def.name, category:def.cat || "custom", score:0,
        status:"rumored", availability:"unknown", firstSeen:st.turn, lastSeen:st.turn,
        sources:[], evidence:[], feats:[], limits:[], costs:[], counters:[], conditions:[],
        successfulUses:0, partialUses:0, failedUses:0, control:0, mastery:"unknown",
        scaleNotes:[], scale:{duration:[],range:[],scope:[],targets:[],magnitude:[]}, forms:[], contradictions:[],
        semantic:(def.semantic||semanticFromName(def.name)), applications:[], traits:[], links:[], emotionLinks:[], activation:"unknown", accessMode:"unknown", firstSeenAction:st.runtimeActionCount, createdSourceRef:ACTIVE_SOURCE_REF||"",
        availabilityHistory:[actionRecord(st,{value:"unknown",reason:"power first observed"})],
        accessHistory:[actionRecord(st,{value:"unknown",text:"power first observed"})],
        activationHistory:[actionRecord(st,{value:"unknown",text:"power first observed"})],
        traitHistory:[], sourceHistory:[], progressionHistory:[actionRecord(st,{control:0,mastery:"unknown"})], formBindingHistory:[],
        techniques:[], resources:[], signatures:[], training:[], reliability:"unknown", precision:"unknown", controlRisk:"unknown",
        reliabilityHistory:[], precisionHistory:[], collateralHistory:[], discoveryHistory:[], synergies:[]
      };
      entity.powerOrder.push(id); st.stats.powersCreated += 1; if(def.ontology) st.stats.ontologyCreated += 1;
    }
    if (!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if (!p.forms) p.forms=[];
    ensurePowerSemantics(p,def);
    ensureDeepPowerState(p);
    p.lastSeen = st.turn;
    st.lastPowerByEntity[entity.id] = id;
    return p;
  }

  function pushBounded(arr, value, cap, keyFn) {
    if (!arr) return false;
    if(ACTIVE_SOURCE_REF && value && typeof value==="object" && value.sourceRef==null) value.sourceRef=ACTIVE_SOURCE_REF;
    var i, key = keyFn ? keyFn(value) : String(value), existing, k;
    for (i = 0; i < arr.length; i++) {
      if ((keyFn ? keyFn(arr[i]) : String(arr[i])) === key) {
        existing=arr[i];
        if (value && typeof value === "object" && existing && typeof existing === "object") {
          for(k in value) if(hasOwn(value,k)) existing[k]=value[k];
        }
        return false;
      }
    }
    arr.push(value);
    while (arr.length > cap) arr.shift();
    return true;
  }

  function updateStatus(st, p) {
    var cfg = st.config;
    if (p.availability === "lost") { p.status = "lost"; return; }
    if (p.score >= cfg.confirmScore) p.status = "confirmed";
    else if (p.score >= cfg.probableScore) p.status = "probable";
    else p.status = "rumored";
  }

  function addEvidence(st, entity, p, amount, kind, sentence, source) {
    var fp=signalFingerprint(st,source,entity&&entity.id,p&&p.id,"evidence:"+kind,sentence);
    p.lastSeen = st.turn;
    if(!markSignalOnce(st,fp)) return false;
    p.score = round2(clamp(p.score + amount, -4, 12));
    pushBounded(p.evidence, {turn:st.turn, actionCount:st.runtimeActionCount, kind:kind, source:source, delta:amount, text:shortText(sentence, 180)}, st.config.maxEvidencePerPower, function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.kind+"|"+x.text;});
    updateStatus(st, p);
    addEvent(st, entity.name + ": " + p.name + " " + kind, kind);
    return true;
  }

  function shortText(s, max) {
    s = trim(s).replace(/\s+/g, " ");
    if (s.length > max) return s.slice(0, max - 1) + "…";
    return s;
  }

  function addEvent(st, textValue, kind) {
    pushBounded(st.recentEvents, {turn:st.turn, actionCount:st.runtimeActionCount, kind:kind || "event", text:shortText(textValue, 200)}, st.config.maxRecentEvents, function(x){return x.kind+"|"+x.text;});
  }

  var SOURCE_CUE_RE = /\b(?:powered by|draws? (?:his|her|their|your)?\s*power from|power source|powers? (?:come|comes) from|source of (?:his|her|their|the) powers?|origin of (?:his|her|their|the) powers?|granted by|derived from|empowered by|channels? power from|gets? (?:his|her|their) powers? from|because of (?:a|an|the)?\s*(?:mutation|curse|blessing|artifact|relic|implant|serum|infection)|(?:mutant|magical|divine|infernal|alien|cosmic|psychic|psionic|cybernetic|technological|biological|supernatural|elemental|quantum|dimensional|temporal)\s+(?:power|powers|ability|abilities|gift)|(?:using|through|via|by channeling)\s+(?:magic|chi|ki|chakra|psionic energy|cosmic energy|divine power|technology|nanites?|an artifact|a relic))\b/i;

  function detectSourceTags(sentence) {
    var out = [], i, m, freeSource;
    // A source keyword merely appearing near a power is not enough. "Throws a
    // weapon with telekinesis" must not turn the weapon into telekinesis's origin.
    if(!SOURCE_CUE_RE.test(sentence)) return out;
    // Inner Current separation: a character's belief/claim about an origin is
    // private belief evidence, not objective proof of the power source.
    if (pureClaimCue(sentence) && /\b(powered by|comes? from|source|origin|granted by|derived from|draws? power from|empowered by)\b/i.test(sentence)) return out;
    // Resistance/counter sentences often mention a power-source word that is
    // NOT the subject's origin ("resistant to magic"). Avoid that false link
    // unless the sentence also contains an explicit origin/mechanism cue.
    if (/\b(immune|resistant|vulnerable|weak|against|counter|nullif)\b/i.test(sentence) && !/\b(powered by|comes? from|source|origin|granted by|derived from|draws? power from|uses? .* to power)\b/i.test(sentence)) return out;
    for (i = 0; i < SOURCE_PATTERNS.length; i++) if (SOURCE_PATTERNS[i][1].test(sentence)) out.push(SOURCE_PATTERNS[i][0]);
    m=sentence.match(/\b(?:powered by|draws? (?:his|her|their|your)?\s*power from|power source(?: is|:) ?|powers? (?:come|comes) from|granted by|derived from|empowered by|channels? power from)\s+([^.!?;]{2,80})/i);
    if(m){ freeSource=shortText(trim(m[1]).replace(/\b(?:but|although|however|while)\b.*$/i,""),70); if(freeSource) out.push("via "+freeSource); }
    return out;
  }

  function attachSources(st, entity, powers, sentence) {
    if (!st.config.trackPowerSources) return;
    var srcs = detectSourceTags(sentence), i, j, p;
    if (!srcs.length) return;
    for (i = 0; i < srcs.length; i++) pushBounded(entity.sources, srcs[i], 6);
    for (j = 0; j < powers.length; j++) {
      p = powers[j];
      for (i = 0; i < srcs.length; i++) recordPowerSource(st,p,srcs[i]);
    }
  }

  function detectAccessModes(st,entity,sentence,mentioned) {
    if(!st.config.trackAccessModes || !entity) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned),mode="",i;
    if(!powers.length) return;
    if(ACCESS_STOLEN_RE.test(sentence)) mode="stolen/drained";
    else if(ACCESS_TEMP_RE.test(sentence)) mode="temporary/borrowed";
    else if(ACCESS_COPY_RE.test(sentence)) mode="copied/mimicked";
    else if(ACCESS_ARTIFACT_RE.test(sentence)) mode="artifact/device-bound";
    else if(ACCESS_INNATE_RE.test(sentence)) mode="innate/inherited";
    else if(ACCESS_LEARNED_RE.test(sentence)) mode="learned/trained";
    else if(ACCESS_GRANTED_RE.test(sentence)) mode="granted/bestowed";
    if(!mode) return;
    for(i=0;i<powers.length;i++) setPowerAccessMode(st,powers[i],mode,sentence);
  }

  function limitKind(sentence) {
    if(/\b(?:range|within|line of sight|distance|feet|meters?|metres?|yards?|miles?|kilometers?|kilometres?)\b/i.test(sentence)) return "range";
    if(/\b(?:for .*?(?:seconds?|minutes?|hours?)|duration|lasts? only|maintain .*? for)\b/i.test(sentence)) return "duration";
    if(/\b(?:cooldown|recharge|once per|twice per|uses remaining|charges?)\b/i.test(sentence)) return "cooldown/resource";
    if(/\b(?:requires?|needs?|must|only if|while touching|line of sight|when |under |in sunlight|at night|moonlight)\b/i.test(sentence)) return "requirement/condition";
    if(/\b(?:cannot|can't|doesn't work|does not work|fails against|only affects?|limited to)\b/i.test(sentence)) return "restriction";
    return "limit";
  }

  function costKind(sentence) {
    if(/\b(?:exhaust|fatigue|drain|winded|tire)\b/i.test(sentence)) return "stamina";
    if(/\b(?:pain|migraine|headache|hurts?|bleed|bleeding|burns?)\b/i.test(sentence)) return "pain/injury";
    if(/\b(?:overheat|overload)\b/i.test(sentence)) return "overload";
    if(/\b(?:shortens? .*?life|lifespan|years? of .*?life)\b/i.test(sentence)) return "lifespan";
    if(/\b(?:consumes?|uses up|fuel|mana|energy reserve|resource)\b/i.test(sentence)) return "resource";
    return "cost";
  }

  function isAttemptSentence(sentence, source) {
    if (source !== "input") return false;
    return /^\s*>/.test(sentence) || /\b(?:try|tries|attempt|attempts|attempting|I want to|I use|You try|You attempt)\b/i.test(sentence);
  }

  function explicitPowerCue(sentence) {
    return /\b(?:has|have|possesses?|gained?|developed?|born with|gifted with)\s+(?:the\s+)?(?:power|powers|ability|abilities|gift|superpower|superpowers)\b/i.test(sentence) ||
           /\b(?:power|ability|gift)\s+(?:is|allows?|lets?)\b/i.test(sentence) ||
           /\b(?:can|is able to)\s+(?:fly|teleport|phase|regenerate|read minds?|control|manipulate|generate|summon|transform|turn invisible|stop time|freeze time|alter reality|bend space|create portals?)\b/i.test(sentence) ||
           (/\bcan\s+(?:use|access|activate|call upon|draw on)\b/i.test(sentence) && (uniqueDefsFromTerms(sentence).length > 0 || uniqueDefsFromOntology(sentence).length > 0)) ||
           (/\b(?:has|have|possesses?|wields?|uses?|activates?|unleashes?|channels?)\b/i.test(sentence) && (ONTOLOGY_POWER_ENDING_RE.test(sentence) || ONTOLOGY_SUFFIX_WORD_RE.test(sentence))) ||
           (/\b(?:has|have|possesses?|wields?)\b[^.!?;]{0,32}\b(?:telekinesis|telepathy|teleportation|flight|invisibility|intangibility|regeneration|super speed|super strength|[A-Za-z][A-Za-z'’.-]{2,45}(?:kinesis|mancy|pathy|portation|morphism))\b/i.test(sentence) && !/\b(?:book|story|theory|rumor|rumour|idea|knowledge|information)\b/i.test(sentence));
  }

  function pureClaimCue(sentence) {
    return /\b(?:claims?|says?|said|rumor(?:ed)?|supposedly|allegedly|believes?|thinks?|might|may have|could have)\b/i.test(sentence);
  }

  function nonFeatDiscussion(sentence) {
    // Talking about fear, control, plans, training or beliefs is not itself a
    // successful power use. Actual action verbs can override this guard.
    var mental=/\b(?:fears?|afraid|scared|terrified|worries?|plans?|intends?|hopes?|wants?|believes?|thinks?|discusses?|talks? about|losing control|better control|mastery|training|practice|practices|ashamed|proud)\b/i.test(sentence);
    var action=/\b(?:uses?|used|activates?|activated|unleashes?|unleashed|fires?|fired|casts?|cast|projects?|projected|summons?|summoned|creates?|created|generates?|generated|teleports?|teleported|flies|flew|phases?|phased|heals?|healed|regenerates?|regenerated|absorbs?|absorbed|blocks?|blocked|deflects?|deflected|strikes?|struck|hits?|hit|lifts?|lifted|throws?|threw|moves?|moved|freezes?|froze|stops? time|stopped time)\b/i.test(sentence);
    return mental && !action;
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

  function processMentionedPowers(st, sentence, source, entity) {
    var defs = uniqueDefsFromTerms(sentence), created = [], i, p, custom, attempt, amount, kind, existing, bareDenial=isBarePowerDenial(sentence), speculative=st.config.hypotheticalGuard&&isHypotheticalPowerStatement(sentence);
    if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));
    if (!entity) return created;
    attempt = isAttemptSentence(sentence, source);

    if (!defs.length && st.config.allowCustomPowers && !speculative && !bareDenial) {
      custom = extractCustomAbility(sentence, st.config.detection);
      if (custom) defs.push(custom);
    }

    for (i = 0; i < defs.length; i++) {
      existing=entity.powers[defs[i].id||powerKey(defs[i].name)];
      if((speculative||bareDenial) && !existing){st.stats.speculativeSkipped+=1;continue;}
      p = existing || getOrCreatePower(st, entity, defs[i]); created.push(p);
      if(speculative || bareDenial) continue;
      if (attempt) {
        addPendingAttempt(st, entity, p, sentence);
        addEvidence(st, entity, p, 0.12, "attempted", sentence, source);
      } else if (source==="reported" || pureClaimCue(sentence)) {
        addEvidence(st, entity, p, st.config.claimScore * detectionFactor(st,"claim") * (source==="reported"?0.9:1), "reported/claimed", sentence, source);
      } else if (source === "output" && DIRECT_USE_RE.test(sentence) && !FAILURE_RE.test(sentence) && !nonFeatDiscussion(sentence)) {
        addFeat(st, entity, p, sentence, PARTIAL_RE.test(sentence) ? "partial" : "success", source);
      } else if (explicitPowerCue(sentence)) {
        amount = st.config.explicitScore * detectionFactor(st,"explicit");
        if (source === "input" && /^\s*>/.test(sentence)) amount = 0.2;
        kind = "explicit";
        addEvidence(st, entity, p, amount, kind, sentence, source);
        if (p.availability === "unknown") setPowerAvailability(st,p,"available",sentence);
      } else if (source === "output" && SUCCESS_RE.test(sentence) && !FAILURE_RE.test(sentence) && !nonFeatDiscussion(sentence)) {
        addFeat(st, entity, p, sentence, PARTIAL_RE.test(sentence) ? "partial" : "success", source);
      } else {
        addEvidence(st, entity, p, 0.05, "mentioned", sentence, source);
      }
    }
    attachSources(st, entity, created, sentence);
    return created;
  }

  function addPendingAttempt(st, entity, p, sentence) {
    pushBounded(st.pendingAttempts, {turn:st.turn, actionCount:st.runtimeActionCount, entityId:entity.id, powerId:p.id, text:shortText(sentence,160)}, 8, function(x){return x.entityId+"|"+x.powerId+"|"+x.text;});
  }

  function addFeat(st, entity, p, sentence, outcome, source) {
    var existingText = shortText(sentence, 190), signalSource=(source==="output-result"?"output":source), fp=signalFingerprint(st,signalSource,entity.id,p.id,"feat:"+outcome,existingText), changed;
    if(!markSignalOnce(st,fp)) return false;
    if (outcome === "success") {
      changed=addEvidence(st, entity, p, st.config.featScore * detectionFactor(st,"feat"), "successful feat", sentence, source);
      p.successfulUses += 1;
      if (p.availability === "suppressed" || p.availability === "restricted" || p.availability === "unknown") setPowerAvailability(st,p,"available",sentence);
      if (st.config.trackProgression) p.control = clamp(p.control + 2, 0, 100);
    } else if (outcome === "partial") {
      changed=addEvidence(st, entity, p, st.config.featScore * 0.5 * detectionFactor(st,"feat"), "partial feat", sentence, source);
      p.partialUses += 1;
      if (st.config.trackProgression) p.control = clamp(p.control + 1, 0, 100);
    } else if (outcome === "failure") {
      changed=addEvidence(st, entity, p, st.config.failedAttemptPenalty, "failed use", sentence, source);
      p.failedUses += 1;
      if (st.config.trackProgression) p.control = clamp(p.control - 1, 0, 100);
    }
    if(st.config.trackProgression) recordProgressionState(st,p);
    pushBounded(p.feats, {turn:st.turn, actionCount:st.runtimeActionCount, outcome:outcome, text:existingText}, st.config.maxFeatsPerPower, function(x){return (x.actionCount!=null?x.actionCount:x.turn)+"|"+x.outcome+"|"+x.text;});
    st.stats.feats += 1;
    return changed!==false;
  }

  function inferFeats(st, sentence, source, entity) {
    if (!st.config.inferFromFeats || source !== "output" || !entity || nonFeatDiscussion(sentence)) return;
    var defs = uniqueDefsFromFeats(sentence), i, p, outcome;
    if (!defs.length) return;
    outcome = FAILURE_RE.test(sentence) ? "failure" : (PARTIAL_RE.test(sentence) ? "partial" : "success");
    for (i = 0; i < defs.length; i++) {
      p = getOrCreatePower(st, entity, defs[i]);
      addFeat(st, entity, p, sentence, outcome, source);
    }
  }

  function resolvePendingFromOutput(st, sentence, currentEntity) {
    if (!st.pendingAttempts.length) return;
    var i, a, e, p, age, outcome = null, sameEntity, powerMatch, genericAnaphora, candidates=0;
    if (FAILURE_RE.test(sentence)) outcome = "failure";
    else if (SUCCESS_RE.test(sentence) || DIRECT_USE_RE.test(sentence)) outcome = PARTIAL_RE.test(sentence) ? "partial" : "success";
    if (!outcome) return;
    for(i=0;i<st.pendingAttempts.length;i++) if(st.turn-st.pendingAttempts[i].turn<=2) candidates++;
    for (i = st.pendingAttempts.length - 1; i >= 0; i--) {
      a = st.pendingAttempts[i]; age = st.turn - a.turn;
      if (age > 2) { st.pendingAttempts.splice(i,1); continue; }
      e = st.entities[a.entityId]; p = e && e.powers[a.powerId];
      if (!e || !p) { st.pendingAttempts.splice(i,1); continue; }
      sameEntity=!!(currentEntity && currentEntity.id===a.entityId);
      powerMatch=sentenceMentionsPower(sentence,p);
      genericAnaphora=!currentEntity && candidates===1 && age<=1 && /\b(?:it|the power|this power|the ability|this ability|the attempt|works?|fails?|succeeds?|nothing happens)\b/i.test(sentence);
      if ((sameEntity && (powerMatch || candidates===1 || /\b(?:you|he|she|they|his|her|their)\b/i.test(sentence))) || (powerMatch && (!currentEntity || sameEntity)) || genericAnaphora) {
        addFeat(st, e, p, sentence, outcome, "output-result");
        st.pendingAttempts.splice(i,1);
        break;
      }
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

  function targetPowersForNote(st, entity, sentence, mentioned, mode) {
    if (mentioned && mentioned.length) return mentioned;
    var out = [], id = st.lastPowerByEntity[entity.id], p, low=lower(sentence||""), i,ev;
    if (!id || !entity.powers[id]) return out;
    p=entity.powers[id];
    // Explicit anaphora is safe: "it", "this power", "the ability", etc.
    if(/\b(?:it|this power|that power|the power|this ability|that ability|the ability|my power|his power|her power|their power|its power)\b/i.test(sentence||"")){out.push(p);return out;}
    // Immediate aftermath may appear in a separate sentence in the same output.
    if(mode==="aftermath"){
      for(i=st.recentEvents.length-1;i>=0;i--){ev=st.recentEvents[i];if((ev.turn||0)!==st.turn)break;if((ev.kind==="successful feat"||ev.kind==="partial feat"||ev.kind==="failed use") && lower(ev.text).indexOf(lower(entity.name))>=0){out.push(p);return out;}}
    }
    // Generic power wording may safely refer back when the entity has exactly one tracked power.
    if(entity.powerOrder.length===1 && /\b(?:power|powers|ability|abilities|gift|technique)\b/i.test(low)){out.push(p);return out;}
    return out;
  }

  function recordApplication(st,p,tag,sentence) {
    if(!st.config.trackApplications || !p || !tag) return;
    pushBounded(p.applications,{turn:st.turn,actionCount:st.runtimeActionCount,tag:tag,text:shortText(sentence,150)},st.config.maxApplicationsPerPower,function(x){return x.tag;});
  }

  function detectApplications(st, entity, sentence, mentioned, source) {
    if(!entity || !st.config.trackApplications) return;
    if(source!=="output" && !explicitPowerCue(sentence)) return;
    if(source==="output" && (FAILURE_RE.test(sentence) || !SUCCESS_RE.test(sentence) || nonFeatDiscussion(sentence)) && !/\bdemonstrates?|uses?|used|application\b/i.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i,j;
    if(!powers.length) return;
    for(i=0;i<APPLICATION_PATTERNS.length;i++) if(APPLICATION_PATTERNS[i][1].test(sentence)) for(j=0;j<powers.length;j++) recordApplication(st,powers[j],APPLICATION_PATTERNS[i][0],sentence);
  }

  function detectTraitsActivation(st,entity,sentence,mentioned) {
    if(!entity || (!st.config.trackTraits && !st.config.trackActivation)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), i,p, traits=[];
    if(!powers.length) return;
    if(st.config.trackActivation){
      for(i=0;i<powers.length;i++){p=powers[i]; if(PASSIVE_RE.test(sentence)) setPowerActivation(st,p,"passive/automatic",sentence); else if(ACTIVE_RE.test(sentence)) setPowerActivation(st,p,"activated/at-will",sentence); else if(CHARGE_RE.test(sentence)) setPowerActivation(st,p,"charged/prepared",sentence);}
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
    for(i=0;i<powers.length;i++) for(var j=0;j<traits.length;j++) recordPowerTrait(st,powers[i],traits[j]);
  }

  function powerLinkKind(sentence) {
    if(/\b(?:evolves? from|upgrades? from)\b/i.test(sentence))return "evolves-from";
    if(/\b(?:derived from|derives from|comes from)\b/i.test(sentence))return "derived-from";
    if(/\b(?:requires?|depends? on)\b/i.test(sentence))return "requires";
    if(/\b(?:combines? with|fusion of)\b/i.test(sentence))return "fusion/combination";
    if(/\b(?:copies?|replicates?)\b/i.test(sentence))return "copy/replication";
    if(/\binherits?\b/i.test(sentence))return "inheritance";
    if(/\b(?:grants?|bestows?)\b/i.test(sentence))return "grant/bestowal";
    return "related";
  }

  function detectPowerLinks(st,entity,sentence,mentioned) {
    if(!entity || !st.config.trackPowerLinks || !LINK_RE.test(sentence) || pureClaimCue(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned),i,j,others=[],kind=powerLinkKind(sentence),p;
    if(!powers.length)return;
    for(i=0;i<powers.length;i++){
      p=powers[i];others=[];for(j=0;j<powers.length;j++)if(i!==j&&powers[j])others.push(powers[j].id);
      pushBounded(p.links,{turn:st.turn,actionCount:st.runtimeActionCount,kind:kind,otherPowerIds:others.slice(0,4),text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return (x.kind||"related")+"|"+lower(x.text);});
    }
  }

  function detectInteractionLedger(st,sentence) {
    if(!st.config.trackInteractions || !/\b(counter|counters|negates?|nullif(?:y|ies|ied)|blocks?|bypasses?|pierces?|overcomes?|resists?|immune|suppresses?|amplifies?|boosts?|weakens?|absorbs?|reflects?)\b/i.test(sentence)) return;
    var defs=uniqueDefsFromTerms(sentence); if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));
    var names=[],seen={},i;
    for(i=0;i<defs.length;i++) if(!seen[defs[i].id]){seen[defs[i].id]=1;names.push(defs[i].name);}
    if(names.length<1) return;
    pushBounded(st.interactions,{turn:st.turn,actionCount:st.runtimeActionCount,powers:names.slice(0,4),text:shortText(sentence,200)},st.config.maxInteractions,function(x){return lower(x.text);});
  }

  function detectLimitsCosts(st, entity, sentence, mentioned) {
    if (!entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (!powers.length) return;
    for (i = 0; i < powers.length; i++) {
      p = powers[i];
      if (LIMIT_RE.test(sentence)) pushBounded(p.limits, {turn:st.turn,actionCount:st.runtimeActionCount,kind:st.config.trackLimitTypes?limitKind(sentence):"limit",text:shortText(sentence,190)}, st.config.maxNotesPerPower, function(x){return (x.kind||"limit")+"|"+x.text;});
      if (COST_RE.test(sentence)) pushBounded(p.costs, {turn:st.turn,actionCount:st.runtimeActionCount,kind:st.config.trackLimitTypes?costKind(sentence):"cost",text:shortText(sentence,190)}, st.config.maxNotesPerPower, function(x){return (x.kind||"cost")+"|"+x.text;});
    }
  }

  function pushScale(p, kind, textValue, st) {
    if (!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if (!p.scale[kind]) p.scale[kind]=[];
    pushBounded(p.scale[kind],{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(textValue,90)},4,function(x){return lower(x.text);});
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
    return SUCCESS_RE.test(sentence) && !FAILURE_RE.test(sentence);
  }

  function detectFormBinding(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackForms) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned), m=sentence.match(FORM_BIND_RE), form="", i;
    if (!powers.length) return;
    if (m) form=trim(m[1]);
    else if (/\b(?:in this form|while transformed|while in this form)\b/i.test(sentence) && entity.activeForm) form=entity.activeForm;
    if (!form) return;
    for(i=0;i<powers.length;i++) {
      recordPowerFormBinding(st,powers[i],form);
      if (/\bonly\b/i.test(sentence)) pushBounded(powers[i].limits,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,190)},st.config.maxNotesPerPower,function(x){return x.text;});
    }
  }

  function detectRecentStrain(st, entity, sentence, mentioned) {
    if (!entity || !STRAIN_RE.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned,"aftermath"), i;
    for(i=0;i<powers.length;i++) pushBounded(powers[i].conditions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;});
  }

  function detectAvailability(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackTemporaryEffects) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (DORMANT_RE.test(sentence)) {
      if (powers.length) for(i=0;i<powers.length;i++) setPowerAvailability(st,powers[i],"dormant",sentence);
      else setEntityGlobalState(st,entity,"dormant",sentence);
      addEvent(st,entity.name+" power state dormant","dormant");
    }
    if (AWAKEN_RE.test(sentence)) {
      if (powers.length) for(i=0;i<powers.length;i++) setPowerAvailability(st,powers[i],"available",sentence);
      if(entity.globalState==="dormant") setEntityGlobalState(st,entity,"normal",sentence);
      addEvent(st,entity.name+" power state awakened","awakened");
    }
    if (powers.length && TEMP_RESTRICT_RE.test(sentence) && /\b(can't|cannot|unable|blocked|nullified|dampened|sealed|disabled|doesn't work|does not work)\b/i.test(sentence)) {
      for(i=0;i<powers.length;i++){ p=powers[i]; setPowerAvailability(st,p,"restricted",sentence); pushBounded(p.conditions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      addEvent(st,entity.name+" temporary power restriction","restriction");
    }
    if (RESTORE_RE.test(sentence)) {
      setEntityGlobalState(st,entity,"normal",sentence);
      for (i = 0; i < entity.powerOrder.length; i++) if (entity.powers[entity.powerOrder[i]]) { setPowerAvailability(st,entity.powers[entity.powerOrder[i]],"available",sentence); }
      addEvent(st, entity.name + " powers restored", "restored"); return;
    }
    if (LOSS_RE.test(sentence)) {
      if (powers.length) {
        for (i = 0; i < powers.length; i++) { p = powers[i]; setPowerAvailability(st,p,"lost",sentence); pushBounded(p.conditions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      } else {
        setEntityGlobalState(st,entity,"lost",sentence);
      }
      addEvent(st, entity.name + " power loss", "loss"); return;
    }
    if (SUPPRESS_RE.test(sentence)) {
      if (powers.length) {
        for (i = 0; i < powers.length; i++) { p = powers[i]; setPowerAvailability(st,p,"suppressed",sentence); pushBounded(p.conditions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      } else {
        setEntityGlobalState(st,entity,"suppressed",sentence);
      }
      addEvent(st, entity.name + " powers suppressed", "suppression");
    }
  }

  function detectProgression(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackProgression) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (!powers.length) return;
    for (i = 0; i < powers.length; i++) {
      p = powers[i];
      if (MASTERY_RE.test(sentence) && !/\b(?:plans?|intends?|wants?|hopes?|tries?|attempts?|learning)\s+to\s+master\b/i.test(sentence)) { p.mastery = "mastered"; p.control = Math.max(p.control, 92); recordProgressionState(st,p); addEvidence(st,entity,p,0.5,"mastery evidence",sentence,"narrative"); }
      else if (IMPROVE_RE.test(sentence)) { if (p.mastery === "unknown") p.mastery = "developing"; p.control = clamp(p.control + 6,0,100); recordProgressionState(st,p); pushBounded(p.scaleNotes,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      else if (REGRESS_RE.test(sentence)) { p.control = clamp(p.control - 6,0,100); recordProgressionState(st,p); pushBounded(p.scaleNotes,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
    }
  }

  function detectDefense(st, entity, sentence) {
    if (!entity || !st.config.trackDefenses || !DEFENSE_RE.test(sentence)) return;
    var clauses=String(sentence).split(/\b(?:but|and|yet|while)\b/i),ci,m,kind,note,rec,target;
    for(ci=0;ci<clauses.length;ci++){
      m=clauses[ci].match(/\b(?:(?:is|are|seems?|appears?)\s+)?(immune|resistant|vulnerable|weak|susceptible)\s+(?:to|against)\s+([^,.!?;]{2,100})/i);
      if(!m) m=clauses[ci].match(/\b(?:has|have)\s+(?:an?\s+)?(immunity|resistance|vulnerability|weakness)\s+(?:to|against)\s+([^,.!?;]{2,100})/i);
      if(!m) continue;
      kind=lower(m[1]); note=shortText(m[2],120);
      if(kind.indexOf("immun")>=0) kind="immunity";
      else if(kind.indexOf("resist")>=0) kind="resistance";
      else if(kind.indexOf("vulner")>=0 || kind.indexOf("suscept")>=0) kind="vulnerability";
      else kind="weakness";
      rec={turn:st.turn,actionCount:st.runtimeActionCount,kind:kind,text:note}; target=(kind==="vulnerability"||kind==="weakness")?entity.vulnerabilities:entity.defenses;
      pushBounded(target,rec,8,function(x){return lower((x.kind||"defense")+"|"+x.text);});
    }
  }

  function defenseSummary(arr,maxItems) {
    if(!arr||!arr.length)return "";
    var out=[],i,r,label;
    for(i=Math.max(0,arr.length-maxItems);i<arr.length;i++){r=arr[i]||{};label=r.kind||"defense";out.push(label+": "+shortText(r.text||r,100));}
    return out.join(" / ");
  }

  function detectTransform(st, entity, sentence) {
    if (!entity || !st.config.trackForms) return;
    if (REVERT_RE.test(sentence)) { setEntityForm(st,entity,"",sentence); addEvent(st, entity.name + " reverted to base form", "form"); return; }
    var m = sentence.match(TRANSFORM_RE), form, key;
    if (!m) return;
    form = shortText((m[2] || m[1]).replace(/\b(?:and|but)\b.*$/i, ""), 80); key = powerKey(form);
    if (!entity.forms[key]) entity.forms[key] = {name:form, firstSeen:st.turn, lastSeen:st.turn, notes:[]};
    entity.forms[key].lastSeen = st.turn; setEntityForm(st,entity,form,sentence);
    pushBounded(entity.forms[key].notes,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},5,function(x){return x.text;});
    addEvent(st, entity.name + " form: " + form, "form");
  }

  function detectCounterInteraction(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackInteractions) return;
    if (!/\b(counter|counters|blocks|negates|nullifies|immune|resistant|doesn't work on|does not work on|pierces|bypasses|overcomes)\b/i.test(sentence)) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i;
    for (i = 0; i < powers.length; i++) pushBounded(powers[i].counters,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,190)},st.config.maxNotesPerPower,function(x){return x.text;});
  }

  function psycheSourceWeight(st, source) {
    if (source === "storycard") return 1.0;
    if (source === "input") return 1.0;
    if (source === "output") return st.config.psycheDetection === "conservative" ? 0.85 : 0.95;
    return st.config.psycheDetection === "conservative" ? 0.7 : 0.85;
  }

  function normalizePsycheText(textValue) {
    return lower(shortText(textValue,220)).replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").replace(/^\s+|\s+$/g,"");
  }

  function psycheTokenSet(textValue) {
    var stop=makeSet(["the","a","an","to","of","and","or","but","that","this","his","her","their","your","my","is","are","was","were","be","being","been","will","would","can","could","should","with","for","from","into","about","because","not","no","longer"]), out={}, parts=normalizePsycheText(textValue).split(/\s+/),i,w;
    for(i=0;i<parts.length;i++){w=parts[i];if(w.length>2&&!stop[w])out[w]=1;}
    return out;
  }

  function psycheOverlap(a,b) {
    var aa=psycheTokenSet(a),bb=psycheTokenSet(b),k,common=0,total=0;
    for(k in aa) if(hasOwn(aa,k)){total++;if(bb[k])common++;}
    return total?common/total:0;
  }

  function psycheArray(psyche,kind) {
    if(kind==="selfImage") return psyche.selfImage;
    if(kind==="powerAttitude") return psyche.powerAttitudes;
    if(kind==="emotionLink") return psyche.emotionLinks;
    return psyche[kind] || null;
  }

  function recordPsyche(st,entity,kind,textValue,source,meta) {
    if(!st.config.innerCurrent || !entity || !textValue) return null;
    var psyche=ensurePsyche(entity), arr=psycheArray(psyche,kind), cap=st.config.maxPsycheItems, rec, key, i, existing;
    if(!arr) return null; meta=meta||{};
    rec={turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(textValue,220),source:source||"narrative",confidence:round2((meta.confidence==null?1:meta.confidence)*psycheSourceWeight(st,source||"narrative"))};
    if(ACTIVE_SOURCE_REF) rec.sourceRef=ACTIVE_SOURCE_REF;
    if(meta.tag) rec.tag=String(meta.tag); if(meta.intensity) rec.intensity=String(meta.intensity); if(meta.powerIds) rec.powerIds=meta.powerIds.slice(0,4); if(meta.resolved) rec.resolved=true;
    key=normalizePsycheText(rec.text);
    for(i=0;i<arr.length;i++){
      existing=arr[i];
      if((kind==="emotions" && rec.tag && existing.tag===rec.tag) || normalizePsycheText(existing.text)===key){
        arr[i]=rec; psyche.lastUpdated=st.turn; return rec;
      }
    }
    arr.push(rec); while(arr.length>cap) arr.shift(); psyche.lastUpdated=st.turn; st.stats.psycheRecords+=1;
    return rec;
  }

  function detectEmotionTag(sentence) {
    var low=lower(sentence), pairs=[
      ["rage",/\b(furious|enraged|rage|fury)\b/],["anger",/\b(angry|anger)\b/],["fear",/\b(afraid|scared|fearful|fear)\b/],["terror",/\b(terrified|terror|panicked|panic)\b/],
      ["anxiety",/\b(anxious|nervous|anxiety|nervousness)\b/],["guilt",/\b(guilty|guilt)\b/],["shame",/\b(ashamed|shame)\b/],["grief",/\b(grieving|grief-stricken|grief|sad|sadness)\b/],
      ["hope",/\b(hopeful|hope)\b/],["joy",/\b(joyful|happy|joy)\b/],["relief",/\b(relieved|relief)\b/],["jealousy",/\b(jealous|jealousy)\b/],["envy",/\b(envious|envy)\b/],
      ["determination",/\b(determined|determination)\b/],["confidence",/\b(confident|confidence)\b/],["doubt",/\b(doubtful|doubt|uncertain|uncertainty)\b/],["calm",/\b(calm|calmness)\b/],
      ["excitement",/\b(excited|excitement)\b/],["disgust",/\b(disgusted|disgust)\b/],["resentment",/\b(resentful|resentment)\b/],["desperation",/\b(desperate|desperation)\b/]
    ],i;
    for(i=0;i<pairs.length;i++) if(pairs[i][1].test(low)) return pairs[i][0];
    return "emotion";
  }

  function emotionIntensity(sentence,tag) {
    if(/\b(slightly|a little|mildly|faintly)\b/i.test(sentence)) return "low";
    if(/\b(utterly|overwhelming|overwhelmed|consumed|deeply|intensely|furious|enraged|terrified|panicked|desperate)\b/i.test(sentence) || tag==="rage" || tag==="terror") return "high";
    return "medium";
  }

  function isPlayerEntity(st,entity) {
    if(!entity) return false;
    if(entity.name==="You" || entity.kind==="player") return true;
    var i,nm=lower(entity.name),aliases=entity.aliases||[],j;
    for(i=0;i<(st.runtimeCharacterNames||[]).length;i++){
      if(lower(st.runtimeCharacterNames[i])===nm) return true;
      for(j=0;j<aliases.length;j++) if(lower(st.runtimeCharacterNames[i])===lower(aliases[j])) return true;
    }
    return false;
  }

  function playerPsycheExplicit(sentence) {
    return /\b(?:I|You)\s+(?:want|hope|plan|intend|mean|fear|am afraid|am scared|am terrified|believe|think|suspect|feel|am feeling|promise|vow|swear|refuse|hate|love|resent|am ashamed|am proud|am torn|am conflicted)\b/i.test(sentence);
  }

  function cueIndex(re,sentence) {
    var m=sentence.match(re); return m?m.index:-1;
  }

  function nestedThirdPartyPsyche(sentence,cueRe,entity) {
    var idx=cueIndex(cueRe,sentence), prefix, m, subj;
    if(idx<0) return false;
    prefix=sentence.slice(0,idx);
    // "Mara thinks Kade plans..." should store Mara's belief, not a plan for Mara.
    m=prefix.match(/\b(?:believes?|thinks?|suspects?|assumes?|knows?|says?|hears?|learns?|discovers?|realizes?|expects?)\s+(?:that\s+)?([A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*){0,2}|he|she|they)\b[^.!?;]*$/i);
    if(!m) return false;
    subj=lower(m[1]);
    if(subj==="he"||subj==="she"||subj==="they") return true;
    return entity && lower(entity.name)!==subj && lower(entity.name).indexOf(subj)<0 && subj.indexOf(lower(entity.name))<0;
  }

  function resolveBestPsyche(st,entity,kinds,sentence,minScore) {
    var psyche=ensurePsyche(entity),i,j,arr,best=null,bestScore=0,score;
    for(i=0;i<kinds.length;i++){
      arr=psyche[kinds[i]]||[];
      for(j=arr.length-1;j>=0;j--){if(arr[j].resolved)continue;score=psycheOverlap(arr[j].text,sentence);if(score>bestScore){bestScore=score;best=arr[j];}}
    }
    if(best && bestScore>=(minScore==null?0.2:minScore)){best.resolved=true;best.resolvedActionCount=st.runtimeActionCount;return best;}
    return null;
  }

  function resolveEmotionState(st,entity,sentence) {
    var p=ensurePsyche(entity),tag=detectEmotionTag(sentence),i,r;
    for(i=p.emotions.length-1;i>=0;i--){r=p.emotions[i];if(r.resolved)continue;if(tag==="emotion" || r.tag===tag){r.resolved=true;r.resolvedActionCount=st.runtimeActionCount;return r;}}
    return null;
  }

  function markPsycheRevision(st,entity,sentence) {
    var changed=false;
    if(PSYCHE_REVISION_RE.test(sentence)) changed=!!resolveBestPsyche(st,entity,["plans","goals","beliefs","fears","restraints"],sentence,0.22) || changed;
    if(PSYCHE_DISCLOSURE_RE.test(sentence)) changed=!!resolveBestPsyche(st,entity,["secrets"],sentence,0.12) || changed;
    if(PSYCHE_RESTRAINT_BREAK_RE.test(sentence)) changed=!!resolveBestPsyche(st,entity,["restraints"],sentence,0.08) || changed;
    if(PSYCHE_EMOTION_RESOLVE_RE.test(sentence)) changed=!!resolveEmotionState(st,entity,sentence) || changed;
    if(changed || PSYCHE_REVISION_RE.test(sentence) || PSYCHE_DISCLOSURE_RE.test(sentence) || PSYCHE_RESTRAINT_BREAK_RE.test(sentence) || PSYCHE_EMOTION_RESOLVE_RE.test(sentence)) recordPsyche(st,entity,"revisions",sentence,"narrative",{confidence:0.95});
  }

  function detectPsyche(st,entity,sentence,source,mentioned) {
    if(!st.config.innerCurrent || !entity || !sentence) return;
    // A reported clause describes what a speaker/believer says about someone
    // else. It may seed mechanical rumor, but must never become that person's
    // private mental canon. Self-reports use the separate reported-self source.
    if(source==="reported") return;
    // Player protection: model output is not allowed to manufacture persistent player interiority.
    // Player-authored input and authored story-card canon remain eligible.
    if(isPlayerEntity(st,entity) && st.config.protectPlayerAgency) {
      if(source!=="input" && source!=="storycard") return;
      if(source==="input" && entity.name==="You" && !playerPsycheExplicit(sentence)) return;
    }
    var powerIds=[],i,p,tag,lastId;
    for(i=0;i<(mentioned||[]).length;i++){p=mentioned[i];if(p)powerIds.push(p.id);}
    if(!powerIds.length && /\b(?:it|this power|the power|my power|his power|her power|their power|master it|control it|master the ability|control the ability)\b/i.test(sentence)) {
      lastId=st.lastPowerByEntity[entity.id]; if(lastId && entity.powers[lastId]) powerIds.push(lastId);
    }
    var isRevision=PSYCHE_REVISION_RE.test(sentence), revisionPlan=isRevision&&/\b(?:plan|plans|intention|scheme)\b/i.test(sentence), revisionBelief=isRevision&&/\b(?:believe|belief|believing|thought|think)\b/i.test(sentence), revisionFear=isRevision&&/\b(?:fear|afraid|scared|terrified|worry|dread)\b/i.test(sentence), revisionGoal=isRevision&&/\b(?:want|goal|hope|aim|dream)\b/i.test(sentence);
    if(st.config.trackGoals && PSYCHE_GOAL_RE.test(sentence) && !revisionGoal && !nestedThirdPartyPsyche(sentence,PSYCHE_GOAL_RE,entity)) recordPsyche(st,entity,"goals",sentence,source,{powerIds:powerIds});
    if(st.config.trackPlans && PSYCHE_PLAN_RE.test(sentence) && !revisionPlan && !nestedThirdPartyPsyche(sentence,PSYCHE_PLAN_RE,entity)) recordPsyche(st,entity,"plans",sentence,source,{powerIds:powerIds});
    if(st.config.trackFears && PSYCHE_FEAR_RE.test(sentence) && !revisionFear && !nestedThirdPartyPsyche(sentence,PSYCHE_FEAR_RE,entity)) recordPsyche(st,entity,"fears",sentence,source,{powerIds:powerIds});
    if(st.config.trackBeliefs && PSYCHE_BELIEF_RE.test(sentence) && !revisionBelief) recordPsyche(st,entity,"beliefs",sentence,source,{powerIds:powerIds});
    if(st.config.trackSecrets && PSYCHE_SECRET_RE.test(sentence) && !nestedThirdPartyPsyche(sentence,PSYCHE_SECRET_RE,entity)) recordPsyche(st,entity,"secrets",sentence,source,{powerIds:powerIds});
    if(st.config.trackRestraints && PSYCHE_RESTRAINT_RE.test(sentence) && !nestedThirdPartyPsyche(sentence,PSYCHE_RESTRAINT_RE,entity)) recordPsyche(st,entity,"restraints",sentence,source,{powerIds:powerIds});
    if(st.config.trackSelfImage && PSYCHE_SELF_RE.test(sentence)) recordPsyche(st,entity,"selfImage",sentence,source,{powerIds:powerIds});
    if(st.config.trackInnerConflicts && PSYCHE_CONFLICT_RE.test(sentence)) recordPsyche(st,entity,"conflicts",sentence,source,{powerIds:powerIds});
    if(st.config.trackEmotions && PSYCHE_EMOTION_CONTEXT_RE.test(sentence) && !nestedThirdPartyPsyche(sentence,PSYCHE_EMOTION_CONTEXT_RE,entity)) {
      tag=detectEmotionTag(sentence); recordPsyche(st,entity,"emotions",sentence,source,{tag:tag,intensity:emotionIntensity(sentence,tag),powerIds:powerIds});
    }
    if(st.config.trackPowerIdentity && powerIds.length && PSYCHE_POWER_ATTITUDE_RE.test(sentence)) recordPsyche(st,entity,"powerAttitude",sentence,source,{powerIds:powerIds});
    if(st.config.trackEmotionLinks && powerIds.length && (PSYCHE_EMOTION_NOUN_RE.test(sentence) || PSYCHE_EMOTION_CONTEXT_RE.test(sentence)) && PSYCHE_EMOTION_LINK_RE.test(sentence)) {
      tag=detectEmotionTag(sentence); recordPsyche(st,entity,"emotionLink",sentence,source,{tag:tag,powerIds:powerIds});
      for(i=0;i<(mentioned||[]).length;i++){p=mentioned[i];if(p){ensurePowerSemantics(p);pushBounded(p.emotionLinks,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,190),emotion:tag},st.config.maxNotesPerPower,function(x){return lower(x.text);});}}
    }
    markPsycheRevision(st,entity,sentence);
  }

  function psycheHasMeaning(entity) {
    var p=entity&&entity.psyche,k,i,r;if(!p)return false;
    var kinds=["goals","plans","fears","beliefs","secrets","restraints","selfImage","conflicts","emotions","powerAttitudes","emotionLinks"];
    for(k=0;k<kinds.length;k++){
      for(i=0;i<(p[kinds[k]]||[]).length;i++){r=p[kinds[k]][i];if(!r || !r.resolved)return true;}
    }
    return false;
  }

  function currentEmotionRecords(st,psyche,maxItems) {
    var out=[],i,r;
    for(i=(psyche.emotions||[]).length-1;i>=0 && out.length<maxItems;i--){r=psyche.emotions[i];if(!r.resolved && st.turn-(r.turn||0)<=st.config.emotionDecayTurns)out.unshift(r);}
    return out;
  }

  function psychePressure(st,entity) {
    var psyche=ensurePsyche(entity),score=0,em=currentEmotionRecords(st,psyche,3),i,r,p;
    for(i=0;i<em.length;i++){r=em[i];if(r.intensity==="high")score+=2;else if(r.intensity==="medium")score+=1;}
    for(i=0;i<psyche.conflicts.length;i++){if(!psyche.conflicts[i].resolved){score+=2;break;}}
    for(i=0;i<psyche.fears.length;i++){if(!psyche.fears[i].resolved){score+=1;break;}}
    if(entity.globalState!=="normal")score+=2;
    for(i=0;i<entity.powerOrder.length;i++){p=entity.powers[entity.powerOrder[i]];if(p&&p.conditions&&p.conditions.length&&st.turn-(p.conditions[p.conditions.length-1].turn||0)<=3)score+=1;}
    return score>=6?"high":score>=3?"elevated":"steady";
  }

  function psycheSummary(st,entity,detail) {
    if(!st.config.innerCurrent || !psycheHasMeaning(entity)) return "";
    var p=ensurePsyche(entity),lines=[],items,i,r,cap=detail==="high"?3:detail==="medium"?2:1;
    function add(label,arr,belief){items=[];for(i=arr.length-1;i>=0&&items.length<cap;i--){r=arr[i];if(r.resolved)continue;items.unshift(shortText(r.text,120));}if(items.length)lines.push("  "+label+": "+items.join(" / ")+(belief?" [belief, not objective fact]":""));}
    add("goal",p.goals,false); add("plan",p.plans,false); add("fear",p.fears,false); add("belief",p.beliefs,true); add("private/secret",p.secrets,false); add("restraint/vow",p.restraints,false);
    if(detail!=="low"){add("self-image",p.selfImage,true);add("inner conflict",p.conflicts,false);add("power relationship",p.powerAttitudes,false);add("emotion↔power rule",p.emotionLinks,false);}
    items=currentEmotionRecords(st,p,cap);if(items.length){var em=[];for(i=0;i<items.length;i++)em.push((items[i].tag||"emotion")+"/"+(items[i].intensity||"medium")+": "+shortText(items[i].text,95));lines.push("  current emotion: "+em.join(" / "));}
    if(lines.length) lines.unshift("- Inner Current [private character continuity; pressure "+psychePressure(st,entity)+"]:");
    return lines.join("\n");
  }

  function cardHasExactKey(keys,needle) {
    var parts=String(keys||"").split(/[,;|]/),i,n=lower(trim(needle));
    for(i=0;i<parts.length;i++) if(lower(trim(parts[i]))===n) return true;
    return false;
  }

  function findPsycheCard(entityName) {
    if(typeof storyCards==="undefined"||!storyCards)return null;
    var marker="psyche::"+lower(entityName),i,c;
    for(i=0;i<storyCards.length;i++){c=storyCards[i]||{};if(lower(c.type)==="powers psyche"&&cardHasExactKey(c.keys,marker))return {card:c,index:i};}
    return null;
  }

  function psycheCardEntryFor(st,e) {
    var lines=["[INNER CURRENT — private continuity: "+e.name+"]"], block=psycheSummary(st,e,"high");
    if(block) lines.push(block.replace(/^- Inner Current[^\n]*:\n?/i,""));
    lines.push("Rules: beliefs can be wrong; secrets are not public knowledge; use these notes for motive, subtext and continuity rather than forced exposition. Emotions alter power mechanics only when an explicit emotion↔power rule is recorded. Never invent player thoughts.");
    return shortText(lines.join("\n"),1800);
  }

  function syncPsycheCards(st) {
    if(!st.config.innerCurrent||!st.config.autoPsycheCards||typeof addStoryCard!=="function")return;
    var i,e,found,entry,keys,eligible,changed=false,needsMaintenance=false;
    // Do not consume the sync interval when there is nothing to create/update/clean.
    // This lets a newly discovered psyche item create its first card immediately.
    for(i=0;i<st.entityOrder.length&&!needsMaintenance;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      eligible=psycheHasMeaning(e)&&(e.powerOrder.length||e.seededFromCard)&&(!e.seededFromCard||e.narrativeSeen);
      if(eligible || findPsycheCard(e.name)) needsMaintenance=true;
    }
    if(!needsMaintenance || st.turn-st.lastPsycheCardSync<st.config.psycheCardInterval)return;
    st.lastPsycheCardSync=st.turn;
    for(i=0;i<st.entityOrder.length;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      found=findPsycheCard(e.name);
      eligible=psycheHasMeaning(e)&&(e.powerOrder.length||e.seededFromCard)&&(!e.seededFromCard||e.narrativeSeen);
      // Generated psyche cards are disposable caches, not authored canon. Remove
      // them once every active private item has been resolved so stale motives do
      // not linger forever. Authored Powers Psyche Canon cards use another type
      // and are therefore never touched here.
      if(!eligible){
        if(found&&typeof removeStoryCard==="function")try{removeStoryCard(found.index);delete st.psycheCardSignatures[e.id];changed=true;}catch(remErr){logDebug("POWERS psyche card cleanup failed",e.name,remErr&&remErr.message);}
        continue;
      }
      entry=psycheCardEntryFor(st,e);keys="psyche::"+e.name+", "+e.name+", "+e.name+" inner current";
      var psycheSig=keys+"|"+entry, actualPsycheSig=found?(String(found.card.keys||"")+"|"+String(found.card.entry||"")):"";
      if(st.config.syncOnlyOnChange && (st.psycheCardSignatures[e.id]===psycheSig || actualPsycheSig===psycheSig)){st.psycheCardSignatures[e.id]=psycheSig;continue;}
      try{if(found&&typeof updateStoryCard==="function")updateStoryCard(found.index,keys,entry,"Powers Psyche");else addStoryCard(keys,entry,"Powers Psyche");st.psycheCardSignatures[e.id]=psycheSig;changed=true;}catch(err){logDebug("POWERS psyche card sync failed",e.name,err&&err.message);}
    }
    return changed;
  }

  function contradictionCheck(st, entity, sentence, mentioned) {
    if (!entity || !mentioned || !mentioned.length) return;
    if (LOSS_RE.test(sentence) || SUPPRESS_RE.test(sentence) || TEMP_RESTRICT_RE.test(sentence) || RESTORE_RE.test(sentence)) return;
    if (!/\b(?:doesn't have|does not have|never had|cannot possibly|impossible for|isn't able to|is not able to)\b/i.test(sentence)) return;
    var i, p;
    for (i = 0; i < mentioned.length; i++) {
      p = mentioned[i];
      if (p.status === "confirmed" || p.successfulUses > 0) {
        pushBounded(p.contradictions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},6,function(x){return x.text;});
        pushBounded(entity.contradictions,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(sentence,180)},8,function(x){return x.text;});
        st.stats.contradictions += 1;
        addEvent(st, entity.name + ": possible contradiction about " + p.name, "contradiction");
      } else {
        p.score = round2(clamp(p.score - 1.2,-4,12)); updateStatus(st,p);
      }
    }
  }

  function processSentence(st, sentence, source) {
    st.stats.sentences += 1;
    var entities = candidateNamesFromPowerSentence(st, sentence, source), entity = entities.length ? entities[0] : extractSubjectEntity(st, sentence, source);
    if (entity) {
      entity.lastSeen = st.turn;
      if(source!=="storycard") entity.narrativeSeen = true;
      if (entity.name !== "You") st.focusEntity = entity.name;
      if (isPlayerEntity(st,entity) && !st.config.trackPlayer) return;
      if (!isPlayerEntity(st,entity) && !st.config.trackNPCs) return;
    }
    var mentioned = processMentionedPowers(st, sentence, source, entity);
    inferFeats(st, sentence, source, entity);
    detectLimitsCosts(st, entity, sentence, mentioned);
    detectScale(st, entity, sentence, mentioned);
    detectFormBinding(st, entity, sentence, mentioned);
    detectRecentStrain(st, entity, sentence, mentioned);
    detectAvailability(st, entity, sentence, mentioned);
    detectProgression(st, entity, sentence, mentioned);
    detectDefense(st, entity, sentence);
    detectTransform(st, entity, sentence);
    detectCounterInteraction(st, entity, sentence, mentioned);
    detectApplications(st, entity, sentence, mentioned, source);
    detectTraitsActivation(st, entity, sentence, mentioned);
    detectPowerLinks(st, entity, sentence, mentioned);
    detectAccessModes(st, entity, sentence, mentioned);
    processDeepPowerContinuity(st, entity, sentence, mentioned, source);
    detectInteractionLedger(st, sentence);
    detectPsyche(st, entity, sentence, source, mentioned);
    contradictionCheck(st, entity, sentence, mentioned);
    if (source === "output") resolvePendingFromOutput(st, sentence, entity);
  }

  function hasPsycheCue(sentence) {
    return PSYCHE_GOAL_RE.test(sentence)||PSYCHE_PLAN_RE.test(sentence)||PSYCHE_FEAR_RE.test(sentence)||PSYCHE_BELIEF_RE.test(sentence)||PSYCHE_SECRET_RE.test(sentence)||PSYCHE_RESTRAINT_RE.test(sentence)||PSYCHE_SELF_RE.test(sentence)||PSYCHE_CONFLICT_RE.test(sentence)||PSYCHE_EMOTION_CONTEXT_RE.test(sentence)||PSYCHE_REVISION_RE.test(sentence);
  }

  function processText(st, textValue, source) {
    if (!st || !st.config.enabled || !textValue) return;
    var sentences = splitSentences(textValue), i,j,parts,sentence;
    for (i = 0; i < sentences.length; i++) {
      sentence=sentences[i];
      if(processReportedStatement(st,sentence,source)) continue;
      parts=st.config.attributionEngine?splitMultiSubjectClauses(sentence):[sentence];
      if(parts.length>1) st.stats.attributionSplits+=parts.length-1;
      for(j=0;j<parts.length;j++){
        // Pure speculation must not seed new mechanical canon. Existing psyche
        // still gets a chance to record fears/plans through normal non-hypothetical clauses.
        if(st.config.hypotheticalGuard && isHypotheticalPowerStatement(parts[j])) {
          st.stats.speculativeSkipped+=1;
          // Speculation cannot establish mechanics, but a genuine fear/belief/
          // plan inside that sentence may still be legitimate Inner Current.
          if(st.config.innerCurrent && hasPsycheCue(parts[j])) {
            var psycheEntity=extractSubjectEntity(st,parts[j],source);
            if(psycheEntity) detectPsyche(st,psycheEntity,parts[j],source,[]);
          }
          continue;
        }
        processSentence(st, parts[j], source);
      }
    }
    pruneState(st);
  }

  function pruneState(st) {
    var maxEntities = 60, i, j, e, p, keys;
    // Remove stale entities with no meaningful power data only.
    if (st.entityOrder.length > maxEntities) {
      for (i = st.entityOrder.length - 1; i >= 0 && st.entityOrder.length > maxEntities; i--) {
        e = st.entities[st.entityOrder[i]];
        if (e && e.powerOrder.length === 0 && !psycheHasMeaning(e) && st.turn - e.lastSeen > 30 && e.name !== "You") {
          delete st.entities[e.id]; st.entityOrder.splice(i,1);
        }
      }
    }
    // Bounded power count per entity. Prefer keeping confirmed/recent powers.
    for (i = 0; i < st.entityOrder.length; i++) {
      e = st.entities[st.entityOrder[i]]; if (!e || e.powerOrder.length <= 24) continue;
      keys = e.powerOrder.slice().sort(function(a,b){
        var pa=e.powers[a], pb=e.powers[b];
        return ((pb.status==="confirmed")?100:0)+pb.score+pb.lastSeen*0.01 - (((pa.status==="confirmed")?100:0)+pa.score+pa.lastSeen*0.01);
      });
      for (j = 24; j < keys.length; j++) delete e.powers[keys[j]];
      e.powerOrder = keys.slice(0,24);
    }
    // Bound and age transient psyche state. Long-term goals/beliefs stay bounded by recordPsyche.
    for(i=0;i<st.entityOrder.length;i++) {
      e=st.entities[st.entityOrder[i]]; if(!e||!e.psyche) continue;
      for(j=e.psyche.emotions.length-1;j>=0;j--) if(st.turn-(e.psyche.emotions[j].turn||0)>st.config.emotionDecayTurns*3) e.psyche.emotions.splice(j,1);
      for(j=e.psyche.revisions.length-1;j>=0;j--) if(st.turn-(e.psyche.revisions[j].turn||0)>30) e.psyche.revisions.splice(j,1);
    }
    // Expire very old unresolved attempts.
    for (i = st.pendingAttempts.length - 1; i >= 0; i--) if (st.turn - st.pendingAttempts[i].turn > 2) st.pendingAttempts.splice(i,1);
  }

  function bootstrapFromHistory(st) {
    if (st.bootstrapDone) return;
    st.bootstrapDone = true;
    if (typeof history === "undefined" || !history || !history.length) return;
    var start = Math.max(0, history.length - 8), i, h, src;
    for (i = start; i < history.length; i++) {
      h = history[i] || {}; src = (h.type === "continue" || h.type === "start") ? "output" : "history";
      processText(st, h.text || h.rawText || "", src);
    }
  }

  function entityHasContinuity(e) {
    return !!(e && ((e.powerOrder&&e.powerOrder.length) || psycheHasMeaning(e) || (e.defenses&&e.defenses.length) || (e.vulnerabilities&&e.vulnerabilities.length) || (e.activeForm) || (e.globalState&&e.globalState!=="normal")));
  }

  function relevanceScore(st, e, currentText) {
    var score = Math.max(0, 20 - (st.turn - e.lastSeen));
    var low = lower(currentText), nm = lower(e.name), i;
    if (isPlayerEntity(st,e)) score += 10;
    if (nm && low.indexOf(nm) >= 0) score += 30;
    for (i = 0; i < (e.aliases || []).length; i++) if (low.indexOf(lower(e.aliases[i])) >= 0) score += 15;
    score += Math.min(10, e.powerOrder.length * 2);
    if (psycheHasMeaning(e)) score += 5 + Math.max(0,6-(st.turn-(e.psyche.lastUpdated||0)));
    if (e.globalState !== "normal") score += 8;
    return score;
  }

  function availabilityLabel(p) {
    if (p.availability === "lost") return "LOST";
    if (p.availability === "suppressed") return "suppressed";
    if (p.availability === "restricted") return "restricted";
    if (p.availability === "dormant") return "dormant";
    if (p.availability === "unknown") return "access unknown";
    return "";
  }

  function conciseNote(arr, maxItems) {
    if (!arr || !arr.length) return "";
    var out=[], i;
    for (i = Math.max(0, arr.length-maxItems); i < arr.length; i++) out.push(shortText(arr[i].text || arr[i], 110));
    return out.join(" / ");
  }

  function conciseTypedNote(arr,maxItems) {
    if(!arr||!arr.length)return "";
    var out=[],i,r,label;
    for(i=Math.max(0,arr.length-maxItems);i<arr.length;i++){
      r=arr[i]||{};label=r.kind&&r.kind!=="limit"&&r.kind!=="cost"?(r.kind+": "):"";
      out.push(label+shortText(r.text||r,105));
    }
    return out.join(" / ");
  }

  function powerSummary(st, p, detail) {
    var bits = [p.name + " [" + p.status + (availabilityLabel(p) ? ", " + availabilityLabel(p) : "") + "]"];
    if (p.sources.length) bits.push("source: " + p.sources.join("/"));
    if (p.accessMode && p.accessMode!=="unknown") bits.push("access: "+p.accessMode);
    if (detail !== "low" && p.semantic) {
      var semBits=[];
      if(p.semantic.domain && p.semantic.domain!=="unspecified") semBits.push("domain "+p.semantic.domain);
      if(p.semantic.mechanics && p.semantic.mechanics.length) semBits.push("mechanic "+p.semantic.mechanics.slice(0,3).join("/"));
      if(p.semantic.tier && p.semantic.tier!=="unspecified") semBits.push("tier-label "+p.semantic.tier);
      if(semBits.length) bits.push(semBits.join(", "));
    }
    if (detail !== "low") {
      if (p.limits.length) bits.push("limits: " + conciseTypedNote(p.limits, detail === "high" ? 2 : 1));
      if (p.costs.length) bits.push("costs: " + conciseTypedNote(p.costs, detail === "high" ? 2 : 1));
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
      if (detail === "high" && p.links && p.links.length) bits.push("power links: "+conciseTypedNote(p.links,1));
      if (p.emotionLinks && p.emotionLinks.length) bits.push("emotion rule: "+conciseNote(p.emotionLinks,detail==="high"?2:1));
      var deepBits=deepPowerSummary(st,p,detail); if(deepBits) bits.push(deepBits);
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
    if (!scored.length && !psycheHasMeaning(e) && !e.defenses.length && !e.vulnerabilities.length && !e.activeForm && e.globalState==="normal") return "";
    lines = lines.concat(scored);
    if (st.config.trackDefenses && e.defenses.length) lines.push("- defenses: " + defenseSummary(e.defenses, detail === "high" ? 3 : 2));
    if (st.config.trackDefenses && e.vulnerabilities.length) lines.push("- vulnerabilities: " + defenseSummary(e.vulnerabilities, detail === "high" ? 3 : 2));
    if (e.globalStateNote && e.globalState !== "normal") lines.push("- state evidence: " + shortText(e.globalStateNote,130));
    var mind=psycheSummary(st,e,detail); if(mind) lines.push(mind);
    return lines.join("\n");
  }

  function buildLedger(st, currentContext) {
    var scored=[], i, e, s, detail=st.config.contextDetail, lines=[], block, max=st.config.contextChars;
    for (i=0;i<st.entityOrder.length;i++) {
      e=st.entities[st.entityOrder[i]]; if (!entityHasContinuity(e)) continue;
      scored.push({e:e, score:relevanceScore(st,e,currentContext)});
    }
    scored.sort(function(a,b){return b.score-a.score;});
    if (!scored.length) return "";

    lines.push("[POWERS — continuity ledger. Treat this as factual bookkeeping, not prose to repeat.]");
    lines.push("Rules: confirmed abilities/limits are continuity. Probable/rumored abilities are not proof. Attempts are not feats. Do not invent upgrades, origins, immunities, counters, extra powers, or larger scale without story evidence. Observed scale is demonstrated capability, not an automatic hard maximum; exceeding it should be earned or established. A failed use can mean circumstance, resistance, exhaustion or suppression; it does not erase an established power.");
    if(st.config.strictMechanics) lines.push("Power grammar matters: manipulation does not automatically grant generation, mimicry, embodiment or immunity; generation does not automatically grant fine control; resistance is not immunity; absorption is not ownership; copying may be temporary; teleportation is not portal creation; time travel is not time stop. Only merge mechanics when the story establishes the link.");
    if(st.config.highTierGuard) lines.push("High-tier names such as Absolute, Omni, Almighty or Transcendent are labels, not blank-cheque proof of infinite range, perfect control, every sub-power or immunity. Use authored statements and demonstrated feats to define what they actually mean in this story.");
    lines.push("Creative use rule: new tactics are welcome when they stay inside an established power's domain + mechanic + known conditions. Treat a successful new tactic as an application of that power, not as permission to silently add a different mechanic.");
    if(st.config.trackTechniques||st.config.trackReliability||st.config.trackResources) lines.push("Technique rule: named moves are applications unless separately established as powers. Preserve recorded reliability, precision, resource/recharge rules, signatures and control/collateral behavior; do not infer them from style alone.");
    if(st.config.innerCurrent) {
      lines.push("INNER CURRENT: private psyche notes are character-specific continuity, not omniscient public facts. Beliefs may be mistaken; secrets are not automatically known by other characters. Use goals, plans, fears, restraint, self-image and conflict to shape choices and subtext without forcing exposition.");
      lines.push("Player agency rule: never invent or dictate the player's private thoughts from Inner Current. Only player-authored/author-canon interior states may persist. Emotional state alone never changes a power's mechanics; only an explicit recorded emotion↔power rule can do that.");
    }
    if (st.config.mode === "simulation") lines.push("Simulation mode: enforce recorded limits, costs, counters and current suppression strictly; let clever use matter more than unexplained escalation.");
    else if (st.config.mode === "balanced") lines.push("Balanced mode: preserve continuity while allowing creative applications that logically fit an established ability and its known limits.");
    else lines.push("Narrative mode: preserve established continuity while favoring natural prose over visible mechanics or stat language.");

    var psycheUsed=0, mindPart, mindIndex;
    for (i=0;i<scored.length && i<st.config.maxContextEntities;i++) {
      block=entitySummary(st,scored[i].e,detail); if (!block) continue;
      mindIndex=block.indexOf("\n- Inner Current");
      if(mindIndex>=0){mindPart=block.slice(mindIndex+1);if(psycheUsed+mindPart.length>st.config.psycheContextChars)block=block.slice(0,mindIndex);else psycheUsed+=mindPart.length;}
      if ((lines.join("\n").length + block.length + 2) > max) break;
      lines.push(block);
    }
    if (detail !== "low" && st.interactions && st.interactions.length) {
      var inter=[], ii, rec;
      for(ii=st.interactions.length-1;ii>=0 && inter.length<2;ii--){rec=st.interactions[ii]; if(st.turn-(rec.turn||0)<=8) inter.unshift("- "+rec.text);}
      if(inter.length && (lines.join("\n").length+inter.join("\n").length+30)<max){lines.push("Recent power interactions:"); lines=lines.concat(inter);}
    }
    if (lines.length <= 3) return "";
    return lines.join("\n");
  }

  function findPowersCard(entityName) {
    if (typeof storyCards === "undefined" || !storyCards) return null;
    var marker = "powers::" + lower(entityName), i, c;
    for (i=0;i<storyCards.length;i++) {
      c=storyCards[i]||{};
      if (lower(c.type)==="powers" && cardHasExactKey(c.keys,marker)) return {card:c,index:i};
    }
    return null;
  }

  function cardEntryFor(st,e) {
    var lines=["[Powers continuity: "+e.name+"]"], i,p, usable=[];
    for (i=0;i<e.powerOrder.length;i++) {
      p=e.powers[e.powerOrder[i]]; if (!p) continue;
      if (p.status==="confirmed" || p.status==="probable" || p.availability==="lost" || p.availability==="suppressed" || p.availability==="restricted" || p.availability==="dormant") usable.push(p);
    }
    usable.sort(function(a,b){return (b.status==="confirmed"?20:0)+b.score-(a.status==="confirmed"?20:0)-a.score;});
    for (i=0;i<usable.length && i<10;i++) lines.push("- "+powerSummary(st,usable[i],"medium"));
    if (e.activeForm) lines.push("Current form: "+e.activeForm+".");
    if (e.defenses.length) lines.push("Defenses: "+defenseSummary(e.defenses,3));
    if (e.vulnerabilities.length) lines.push("Vulnerabilities: "+defenseSummary(e.vulnerabilities,3));
    lines.push("Continuity rule: claims and attempts are not proof; preserve established limits and costs; do not invent upgrades or counters without story evidence.");
    return shortText(lines.join("\n"), 1800);
  }

  function syncStoryCards(st) {
    if (!st.config.autoStoryCards || typeof addStoryCard !== "function") return;
    var i,e,entry,keys,found,meaningful,j,p,needsMaintenance=false;
    // As with psyche cards, an empty maintenance pass must not delay the first
    // generated card for a power discovered on the next turn.
    for(i=0;i<st.entityOrder.length&&!needsMaintenance;i++){
      e=st.entities[st.entityOrder[i]];if(!e)continue;
      meaningful=false;
      for(j=0;j<(e.powerOrder||[]).length;j++){p=e.powers[e.powerOrder[j]];if(p&&(p.status==="confirmed"||p.status==="probable"||p.status==="lost"||p.availability==="suppressed"||p.availability==="restricted"||p.availability==="dormant")){meaningful=true;break;}}
      if((meaningful&&(!e.seededFromCard||e.narrativeSeen)) || findPowersCard(e.name)) needsMaintenance=true;
    }
    if(!needsMaintenance || st.turn-st.lastCardSync<st.config.storyCardInterval)return;
    st.lastCardSync = st.turn;
    for (i=0;i<st.entityOrder.length;i++) {
      e=st.entities[st.entityOrder[i]]; if (!e || !e.powerOrder.length) continue;
      // Authored Character cards already carry their own lore. Delay generated
      // companion cards until that seeded character actually enters narration.
      if(e.seededFromCard && !e.narrativeSeen) continue;
      meaningful=false;
      for (j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]]; if(p && (p.status==="confirmed" || p.status==="probable" || p.status==="lost" || p.availability==="suppressed" || p.availability==="restricted" || p.availability==="dormant")){meaningful=true;break;}}
      if (!meaningful) {
        found=findPowersCard(e.name);
        if(found&&typeof removeStoryCard==="function")try{removeStoryCard(found.index);delete st.cardSignatures[e.id];}catch(remErr){logDebug("POWERS card cleanup failed",e.name,remErr&&remErr.message);}
        continue;
      }
      entry=cardEntryFor(st,e); keys="powers::"+e.name+", "+e.name+", "+e.name+" powers, "+e.name+" abilities"; found=findPowersCard(e.name);
      var cardSig=keys+"|"+entry, actualSig=found?(String(found.card.keys||"")+"|"+String(found.card.entry||"")):"";
      if(st.config.syncOnlyOnChange && (st.cardSignatures[e.id]===cardSig || actualSig===cardSig)){st.cardSignatures[e.id]=cardSig;continue;}
      try {
        if (found && typeof updateStoryCard === "function") updateStoryCard(found.index,keys,entry,"Powers");
        else addStoryCard(keys,entry,"Powers");
        st.cardSignatures[e.id]=cardSig;
      } catch(err) { logDebug("POWERS card sync failed", e.name, err && err.message); }
    }
  }

  function hasDurablePowerContinuity(e) {
    if(!e)return false;var i,p;
    for(i=0;i<(e.powerOrder||[]).length;i++){p=e.powers[e.powerOrder[i]];if(p&&(p.status==="confirmed"||p.status==="probable"||p.status==="lost"||p.availability==="suppressed"||p.availability==="restricted"||p.availability==="dormant"))return true;}
    return !!((e.defenses&&e.defenses.length)||(e.vulnerabilities&&e.vulnerabilities.length)||e.activeForm||(e.globalState&&e.globalState!=="normal"));
  }

  function cleanupOrphanGeneratedCards(st) {
    if(typeof storyCards==="undefined"||!storyCards||typeof removeStoryCard!=="function") return 0;
    var i,c,type,parts,marker,name,e,removed=0;
    for(i=storyCards.length-1;i>=0;i--){
      c=storyCards[i]||{};type=lower(c.type);if(type!=="powers"&&type!=="powers psyche")continue;
      parts=String(c.keys||"").split(/[,;|]/);marker=trim(parts[0]||"");
      if(type==="powers"&&lower(marker).indexOf("powers::")===0)name=marker.slice(8);
      else if(type==="powers psyche"&&lower(marker).indexOf("psyche::")===0)name=marker.slice(8);
      else continue;
      e=st.entities[entityKey(name)];
      if(!e || (type==="powers"&&!hasDurablePowerContinuity(e)) || (type==="powers psyche"&&!psycheHasMeaning(e))){
        try{removeStoryCard(i);removed++;}catch(err){logDebug("POWERS orphan card cleanup failed",name,err&&err.message);}
      }
    }
    return removed;
  }

  function maybeMessage(st) {
    if (!st.config.showMessages || typeof state === "undefined") return;
    var confirmed=0,probable=0,i,j,e,p;
    for(i=0;i<st.entityOrder.length;i++){e=st.entities[st.entityOrder[i]];if(!e)continue;for(j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]];if(!p)continue;if(p.status==="confirmed")confirmed++;else if(p.status==="probable")probable++;}}
    state.message="Powers: "+confirmed+" confirmed, "+probable+" probable abilities tracked.";
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

  function apiGetEntity(name) {
    var st=init(); if(!st) return null;
    return st.entities[entityKey(name)] || null;
  }

  function apiHasPower(name, powerName, minimumStatus) {
    var st=init(), e, d, p, rank={rumored:1,probable:2,confirmed:3,lost:3};
    if(!st) return false; e=st.entities[entityKey(name)]; if(!e) return false;
    d=findDefForApi(powerName); p=e.powers[d.id]; if(!p) return false;
    minimumStatus=minimumStatus||"probable";
    return (rank[p.status]||0) >= (rank[minimumStatus]||2);
  }

  function apiRecordPower(name, powerName, options) {
    var st=init(), e, d, p, amount;
    if(!st) return null; options=options||{};
    e=getOrCreateEntity(st,name,options.kind||"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    amount=options.score!=null?Number(options.score):st.config.explicitScore;
    if(isNaN(amount)) amount=st.config.explicitScore;
    addEvidence(st,e,p,amount,options.kindLabel||"external canon",options.evidence||("External script established "+p.name),options.source||"api");
    if(options.sourceTag) recordPowerSource(st,p,String(options.sourceTag));
    if(options.availability){var av=String(options.availability);if(av==="available"||av==="suppressed"||av==="restricted"||av==="lost"||av==="dormant"||av==="unknown")setPowerAvailability(st,p,av,options.evidence||"API availability");}
    updateStatus(st,p); return p;
  }

  function apiRecordFeat(name, powerName, textValue, outcome) {
    var st=init(), e, d, p;
    if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    outcome=outcome||"success"; if(outcome!=="success"&&outcome!=="partial"&&outcome!=="failure") outcome="success";
    addFeat(st,e,p,textValue||("External feat for "+p.name),outcome,"api"); return p;
  }

  function apiAddConstraint(name, powerName, kind, textValue) {
    var st=init(), e, d, p, target;
    if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    target = kind==="cost"?p.costs:(kind==="counter"?p.counters:(kind==="condition"?p.conditions:p.limits));
    pushBounded(target,{turn:st.turn,actionCount:st.runtimeActionCount,kind:kind||"limit",text:shortText(textValue,190)},st.config.maxNotesPerPower,function(x){return (x.kind||"")+"|"+x.text;}); return p;
  }

  function apiSetAvailability(name, powerName, availability, reason) {
    var st=init(), e, d, p;
    if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    if(availability!=="available"&&availability!=="suppressed"&&availability!=="restricted"&&availability!=="lost"&&availability!=="dormant"&&availability!=="unknown") availability="unknown";
    setPowerAvailability(st,p,availability,reason||"API availability"); if(reason) pushBounded(p.conditions,{turn:st.turn,actionCount:st.runtimeActionCount,kind:"availability",text:shortText(reason,190)},st.config.maxNotesPerPower,function(x){return x.text;}); updateStatus(st,p); return p;
  }

  function apiAssessPower(name,powerName) {
    var st=init(),e,d,p,usable=true,reasons=[],active,forms,i,match=false;
    if(!st)return {known:false,usable:"unknown",reason:"POWERS state unavailable"};
    e=st.entities[entityKey(name)];if(!e)return {known:false,usable:"unknown",reason:"entity not tracked"};
    d=findDefForApi(powerName);p=e.powers[d.id];if(!p)return {known:false,usable:"unknown",reason:"power not tracked"};
    if(p.status==="rumored") {usable="uncertain";reasons.push("power is only rumored/claimed");}
    if(p.availability==="lost"||p.availability==="suppressed"||p.availability==="restricted"||p.availability==="dormant") {usable=false;reasons.push("availability is "+p.availability);}
    if(p.availability==="unknown"&&usable===true){usable="uncertain";reasons.push("current availability is unknown");}
    forms=p.forms||[];active=lower(e.activeForm||"");
    if(forms.length){for(i=0;i<forms.length;i++)if(active&&lower(forms[i]).indexOf(active)>=0||active&&active.indexOf(lower(forms[i]))>=0){match=true;break;}
      if(!match){usable=false;reasons.push("power is form-bound and required form is not active");}}
    return {known:true,name:p.name,status:p.status,score:p.score,availability:p.availability,usable:usable,reason:reasons.join("; ")||"no tracked blocker",accessMode:p.accessMode||"unknown",activeForm:e.activeForm||"",forms:(p.forms||[]).slice(),activation:p.activation||"unknown",limits:(p.limits||[]).slice(-3),costs:(p.costs||[]).slice(-3),conditions:(p.conditions||[]).slice(-3),semantic:p.semantic||null};
  }

  function apiGetSemantics(name,powerName) {
    var st=init(),e,d,p; if(!st) return null; e=st.entities[entityKey(name)]; if(!e) return null; d=findDefForApi(powerName); p=e.powers[d.id]; if(!p) return null; ensurePowerSemantics(p,d); return p.semantic;
  }

  function apiRecordApplication(name,powerName,tag,evidence) {
    var st=init(),e,d,p; if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); recordApplication(st,p,String(tag||"utility"),evidence||("External application of "+p.name)); return p;
  }

  function apiRecordTrait(name,powerName,trait) {
    var st=init(),e,d,p; if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); recordPowerTrait(st,p,String(trait)); return p;
  }

  function apiSetAccessMode(name,powerName,mode,evidence) {
    var st=init(),e,d,p,allowed={"unknown":1,"innate/inherited":1,"learned/trained":1,"artifact/device-bound":1,"temporary/borrowed":1,"copied/mimicked":1,"granted/bestowed":1,"stolen/drained":1};
    if(!st)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);
    mode=String(mode||"unknown");if(!allowed[mode])mode="unknown";setPowerAccessMode(st,p,mode,evidence||"API access mode");return p;
  }

  function apiRecordInteraction(textValue,powerNames) {
    var st=init(); if(!st) return null; pushBounded(st.interactions,{turn:st.turn,actionCount:st.runtimeActionCount,powers:(powerNames||[]).slice(0,4),text:shortText(textValue,200)},st.config.maxInteractions,function(x){return lower(x.text);}); return st.interactions[st.interactions.length-1];
  }

  function apiGetPsyche(name) {
    var st=init(),e;if(!st)return null;e=st.entities[entityKey(name)];if(!e)return null;return ensurePsyche(e);
  }

  function apiRecordPsyche(name,kind,textValue,options) {
    var st=init(),e;if(!st)return null;options=options||{};e=getOrCreateEntity(st,name,options.entityKind||"character");
    if(kind==="goal")kind="goals";else if(kind==="plan")kind="plans";else if(kind==="fear")kind="fears";else if(kind==="belief")kind="beliefs";else if(kind==="secret")kind="secrets";else if(kind==="restraint")kind="restraints";else if(kind==="conflict")kind="conflicts";else if(kind==="emotion")kind="emotions";else if(kind==="powerIdentity"||kind==="powerAttitude")kind="powerAttitude";else if(kind==="emotionRule"||kind==="emotionLink")kind="emotionLink";
    return recordPsyche(st,e,kind,textValue,options.source||"api",options);
  }

  function apiSetEmotion(name,emotion,textValue,intensity) {
    var st=init(),e;if(!st)return null;e=getOrCreateEntity(st,name,"character");
    intensity=lower(intensity||"medium");if(intensity!=="low"&&intensity!=="medium"&&intensity!=="high")intensity="medium";
    return recordPsyche(st,e,"emotions",textValue||((name||"Character")+" feels "+emotion),"api",{tag:emotion||"emotion",intensity:intensity});
  }

  function apiRecordEmotionLink(name,powerName,textValue,emotion) {
    var st=init(),e,d,p,rec,note;if(!st||!st.config.innerCurrent)return null;e=getOrCreateEntity(st,name,"character");d=findDefForApi(powerName);p=getOrCreatePower(st,e,d);
    note=textValue||((emotion||"emotion")+" affects "+p.name);rec=recordPsyche(st,e,"emotionLink",note,"api",{tag:emotion||"emotion",powerIds:[p.id]});
    if(rec)pushBounded(p.emotionLinks,{turn:st.turn,actionCount:st.runtimeActionCount,text:shortText(note,190),emotion:emotion||"emotion"},st.config.maxNotesPerPower,function(x){return lower(x.text);});return rec;
  }

  function apiResolvePsyche(name,kind,evidence) {
    var st=init(),e,kinds,rec;if(!st)return null;e=st.entities[entityKey(name)];if(!e)return null;
    if(kind==="goal")kind="goals";else if(kind==="plan")kind="plans";else if(kind==="fear")kind="fears";else if(kind==="belief")kind="beliefs";else if(kind==="secret")kind="secrets";else if(kind==="restraint")kind="restraints";else if(kind==="conflict")kind="conflicts";else if(kind==="emotion")kind="emotions";else if(kind==="powerIdentity"||kind==="powerAttitude")kind="powerAttitudes";else if(kind==="emotionRule"||kind==="emotionLink")kind="emotionLinks";
    kinds=kind?[kind]:["plans","goals","beliefs","fears","secrets","restraints","conflicts","emotions"];
    rec=resolveBestPsyche(st,e,kinds,evidence||"",evidence?0.08:0);
    if(!rec && !evidence){var arr=psycheArray(ensurePsyche(e),kind);if(arr&&arr.length){for(var i=arr.length-1;i>=0;i--)if(!arr[i].resolved){arr[i].resolved=true;arr[i].resolvedActionCount=st.runtimeActionCount;rec=arr[i];break;}}}
    if(rec) recordPsyche(st,e,"revisions",evidence||("Resolved "+(kind||"psyche item")),"api",{confidence:1});
    return rec;
  }

  function apiSnapshot(name) {
    var st=init(),e;if(!st)return null;e=st.entities[entityKey(name)];if(!e)return null;
    try{return JSON.parse(JSON.stringify(e));}catch(err){return null;}
  }

  function apiSummary(name) {
    var st=init(), e; if(!st) return ""; e=st.entities[entityKey(name)]; if(!e) return "";
    return entitySummary(st,e,st.config.contextDetail);
  }

  function onInput(textValue, runtimeInfo) {
    var st=init(runtimeInfo); if(!st || !st.config.enabled) return textValue;
    st.hookCount += 1; bootstrapFromHistory(st);
    processText(st,textValue,"input");
    maybeMessage(st);
    return textValue;
  }

  function stripExistingLedger(textValue) {
    var marker="\n\n[POWERS — continuity ledger." , idx=String(textValue||"").lastIndexOf(marker);
    return idx>=0?String(textValue||"").slice(0,idx):String(textValue||"");
  }

  function fitContextWithLedger(st,base,ledger) {
    var max=st.runtimeMaxChars, memoryLen, prefix,dynamic,budget,sep="\n\n", ledgerBudget, joiner="";
    if(!st.config.adaptiveContext || max==null || max<800) return base+sep+ledger;
    if(base.length+sep.length+ledger.length<=max-st.config.contextReserveChars) return base+sep+ledger;
    memoryLen=clamp(st.runtimeMemoryLength||0,0,base.length); prefix=base.slice(0,memoryLen); dynamic=base.slice(memoryLen);
    ledgerBudget=Math.max(0,max-st.config.contextReserveChars-prefix.length-sep.length);
    // If the required prefix leaves almost no useful room, avoid injecting a
    // mangled ledger and let AI Dungeon's normal truncation policy handle base text.
    if(ledgerBudget<420) return base;
    if(ledger.length>ledgerBudget) ledger=ledger.slice(0,Math.max(0,ledgerBudget-1))+"…";
    joiner=(prefix&&dynamic)?"\n":"";
    budget=Math.max(0,max-st.config.contextReserveChars-prefix.length-joiner.length-sep.length-ledger.length);
    if(budget<=0) dynamic=""; else if(dynamic.length>budget) dynamic=dynamic.slice(-budget);
    return prefix+joiner+dynamic+sep+ledger;
  }

  function onContext(textValue, runtimeInfo) {
    var st=init(runtimeInfo); if(!st || !st.config.enabled) return textValue;
    st.hookCount += 1; bootstrapFromHistory(st);
    var base=stripExistingLedger(textValue), ledger=buildLedger(st,String(base||"").slice(-7000));
    if (!ledger) return base;
    return fitContextWithLedger(st,String(base||""),ledger);
  }

  function onOutput(textValue, runtimeInfo) {
    var st=init(runtimeInfo); if(!st || !st.config.enabled) return textValue;
    st.hookCount += 1; st.turn += 1; bootstrapFromHistory(st);
    processText(st,textValue,"output");
    syncStoryCards(st); syncPsycheCards(st); maybeMessage(st);
    return textValue;
  }

  return {
    version: ENGINE_VERSION,
    onInput: onInput,
    onContext: onContext,
    onOutput: onOutput,
    api: {
      getEntity: apiGetEntity,
      hasPower: apiHasPower,
      recordPower: apiRecordPower,
      recordFeat: apiRecordFeat,
      addConstraint: apiAddConstraint,
      setAvailability: apiSetAvailability,
      assessPower: apiAssessPower,
      getSemantics: apiGetSemantics,
      recordApplication: apiRecordApplication,
      recordTrait: apiRecordTrait,
      setAccessMode: apiSetAccessMode,
      recordTechnique: apiRecordTechnique,
      setReliability: apiSetReliability,
      setPrecision: apiSetPrecision,
      addResourceRule: apiAddResourceRule,
      audit: apiAudit,
      diagnostics: apiDiagnostics,
      recordInteraction: apiRecordInteraction,
      getPsyche: apiGetPsyche,
      recordPsyche: apiRecordPsyche,
      setEmotion: apiSetEmotion,
      recordEmotionLink: apiRecordEmotionLink,
      resolvePsyche: apiResolvePsyche,
      snapshot: apiSnapshot,
      summary: apiSummary
    }
  };
})();
