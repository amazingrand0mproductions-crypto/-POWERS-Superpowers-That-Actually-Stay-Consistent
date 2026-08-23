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

  var ENGINE_VERSION = "4.0";
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
    autoStoryCards: 1, autoPsycheCards: 1, syncOnlyOnChange: 1, adaptiveContext: 1, debug: 1, showMessages: 1
  };

  var NUM_KEYS = {
    storyCardInterval: [1, 50], psycheCardInterval: [1, 50], contextChars: [800, 8000], psycheContextChars: [300, 3500], contextReserveChars: [100, 2500],
    maxContextEntities: [1, 12], maxPowersPerEntity: [1, 16],
    maxEvidencePerPower: [2, 16], maxFeatsPerPower: [2, 15],
    maxNotesPerPower: [2, 12], maxRecentEvents: [4, 30],
    maxApplicationsPerPower: [2, 16], maxTraitsPerPower: [2, 16], maxInteractions: [4, 40],
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
    {id:"pyrokinesis", name:"Fire Manipulation", cat:"elemental", terms:["pyrokinesis","fire manipulation","control fire","controls fire","create fire","generate fire","flame manipulation","fire powers"], feats:["flames erupt from","fire blooms from","flames coil around","summons fire"]},
    {id:"cryokinesis", name:"Ice Manipulation", cat:"elemental", terms:["cryokinesis","ice manipulation","control ice","controls ice","create ice","freeze things","ice powers","frost powers"], feats:["ice spreads from","freezes the","frost races across","encases in ice"]},
    {id:"electrokinesis", name:"Electricity Manipulation", cat:"elemental", terms:["electrokinesis","electricity manipulation","lightning powers","electric powers","control electricity","generate electricity","lightning manipulation"], feats:["lightning arcs from","electricity crackles from","bolt of lightning"]},
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
    {id:"spirit", name:"Spirit Manipulation", cat:"mystic", terms:["spirit manipulation","soul manipulation","control spirits","soul powers","astral projection","spirit form"], feats:["spirit leaves the body","soul is pulled","ghostly form steps out"]},
    {id:"shadow", name:"Shadow Manipulation", cat:"mystic", terms:["shadow manipulation","control shadows","shadow powers","darkness manipulation","umbra powers"], feats:["shadows coil","darkness gathers","shadow rises"]},
    {id:"light", name:"Light Manipulation", cat:"energy", terms:["light manipulation","control light","photokinesis","light powers"], feats:["light bends around","burst of light","hard light"]},
    {id:"sound", name:"Sound Manipulation", cat:"energy", terms:["sound manipulation","sonic powers","sonokinesis","control sound","sonic scream"], feats:["sonic boom erupts","voice shatters","sound wave blasts"]},
    {id:"heat_vision", name:"Heat Vision", cat:"energy", terms:["heat vision","laser eyes","eye beams","optic blast","optic beams"], feats:["beams shoot from his eyes","beams shoot from her eyes","eyes fire beams","red beams from his eyes","red beams from her eyes"]},
    {id:"radiation", name:"Radiation Manipulation", cat:"energy", terms:["radiation manipulation","radiation powers","radioactive energy","emit radiation"], feats:["geiger counter screams","radiation pours from"]},
    {id:"poison", name:"Toxin / Poison Generation", cat:"biological", terms:["poison generation","toxin generation","venom powers","toxic secretion","poison powers"], feats:["venom drips","toxin spreads","poison seeps"]},
    {id:"biokinesis", name:"Biokinesis", cat:"biological", terms:["biokinesis","biological manipulation","flesh manipulation","control biology","body manipulation"], feats:["flesh reshapes","biology changes","cells rewrite"]},
    {id:"technopathy", name:"Technopathy", cat:"technology", terms:["technopathy","technokinesis","control technology","communicate with machines","machine control"], feats:["machine obeys without touching","computer responds to his thoughts","computer responds to her thoughts"]},
    {id:"cyberpathy", name:"Cyberpathy", cat:"technology", terms:["cyberpathy","interface with computers mentally","mind-machine interface","mentally access computers"], feats:["enters the network with his mind","enters the network with her mind"]},
    {id:"time", name:"Time Manipulation", cat:"fundamental", terms:["time manipulation","control time","stop time","freeze time","freezes time","freezing time","stop time","stops time","stopping time","slow time","speed up time","temporal manipulation","rewind time"], feats:["time freezes","freezes time","stops time","time stops around","world freezes around","rewinds the last"]},
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
    {id:"astral_projection", name:"Astral Projection", cat:"mystic", terms:["astral projection","astral form","project the spirit","leave the body as a spirit"], feats:["astral body rises","spirit steps out of the body"]},
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
    {id:"smoke", name:"Smoke Manipulation", cat:"elemental", terms:["smoke manipulation","control smoke","smoke powers","become smoke","smoke form"], feats:["body dissolves into smoke","smoke coils at"]},
    {id:"acid", name:"Acid Manipulation", cat:"elemental", terms:["acid manipulation","acid powers","generate acid","corrosive secretion","acid generation"], feats:["acid sprays from","surface hisses and dissolves"]},
    {id:"crystal", name:"Crystal Manipulation", cat:"elemental", terms:["crystal manipulation","crystal powers","create crystals","control crystals"], feats:["crystals erupt","crystal grows across"]},
    {id:"glass", name:"Glass Manipulation", cat:"elemental", terms:["glass manipulation","control glass","glass powers"], feats:["glass bends like liquid","shards hover around"]},
    {id:"blood", name:"Blood Manipulation", cat:"biological", terms:["blood manipulation","blood control","hemokinesis","blood powers"], feats:["blood rises against gravity","controls the blood"]},
    {id:"bone", name:"Bone Manipulation", cat:"biological", terms:["bone manipulation","bone powers","control bone","grow bone weapons"], feats:["bone blade grows","bones reshape"]},
    {id:"camouflage", name:"Adaptive Camouflage", cat:"stealth", terms:["adaptive camouflage","camouflage power","blend into surroundings","chameleon skin"], feats:["skin matches the wall","blends perfectly into"]},
    {id:"animal_control", name:"Animal Control", cat:"psychic", terms:["animal control","control animals","command animals","animal telepathy","speak to animals","communicate with animals"], feats:["animals obey the silent command","speaks with the animal"]},
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

  var LIMIT_RE = /\b(only|limited to|cannot|can't|unable to|doesn't work|does not work|fails against|requires|needs|must be|has to be|range|within (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few)|for (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|a few) (?:seconds?|minutes?|hours?)|cooldown|recharge|once per|twice per|while touching|line of sight|when injured|when angry|under moonlight|in sunlight|at night)\b/i;
  var COST_RE = /\b(costs?|drains?|exhausts?|tires?|fatigues?|hurts?|painful|pain|migraine|headache|bleed|bleeding|burns? him|burns? her|burns? them|shortens? (?:his|her|their) life|consumes?|uses up|strain|overload|overheats?)\b/i;
  var FAILURE_RE = /\b(fails?|failed|nothing happens|fizzles?|sputters?|can't|cannot|unable|doesn't work|does not work|no effect|loses? control|backfires?|interrupted|blocked|stopped)\b/i;
  var SUCCESS_RE = /\b(succeeds?|works?|erupts?|bursts?|appears?|vanishes?|reappears?|lifts?|moves?|freezes?|burns?|shatters?|breaks?|pass through|passes through|phase through|phases through|teleports?|heals?|regenerates?|blocks?|deflects?|absorbs?|controls?|summons?|transforms?|changes?|surges?|strikes?|hits?)\b/i;
  var PARTIAL_RE = /\b(barely|partially|briefly|weakly|power flickers?|ability flickers?|energy flickers?|unstable|struggles?|with effort|for a moment|momentarily|almost fails)\b/i;
  var LOSS_RE = /\b(loses? (?:his|her|their|the) powers?|lost (?:his|her|their) powers?|powers? (?:is|are) gone|powerless|stripped of (?:his|her|their) powers?|no longer (?:has|have|can use)|permanently nullified|lost (?:the )?ability to|loses? (?:the )?ability to|ability is gone|power is gone)\b/i;
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

  var NAME_STOP = makeSet([
    "The","A","An","You","I","He","She","They","It","We","This","That","These","Those","His","Her","Their","Your","My","Our",
    "Suddenly","Then","Now","Later","Meanwhile","However","But","And","As","After","Before","When","While","If","Because","Despite","Inside","Outside",
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July","August","September","October","November","December",
    "Earth","Moon","Sun","North","South","East","West","Chapter","Scene","Story","Recent","World","Lore","Author","Note","Powers","Power","Ability","Abilities"
  ]);

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
        lastCardSync: -999,
        lastPsycheCardSync: -999,
        bootstrapDone: false,
        stats: {sentences:0, powersCreated:0, ontologyCreated:0, feats:0, contradictions:0, psycheRecords:0, duplicatesSkipped:0}
      };
    }
    return state[NS] || null;
  }

  function repairPowerState(p) {
    if (!p) return;
    var arrays=["sources","evidence","feats","limits","costs","counters","conditions","scaleNotes","forms","contradictions","applications","traits","links","emotionLinks"],i;
    for(i=0;i<arrays.length;i++) if(!p[arrays[i]]) p[arrays[i]]=[];
    if(!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if(!p.scale.duration) p.scale.duration=[]; if(!p.scale.range) p.scale.range=[]; if(!p.scale.scope) p.scale.scope=[]; if(!p.scale.targets) p.scale.targets=[]; if(!p.scale.magnitude) p.scale.magnitude=[];
    if(p.score==null) p.score=0; if(!p.status) p.status="rumored"; if(!p.availability) p.availability="unknown";
    if(p.successfulUses==null) p.successfulUses=0; if(p.partialUses==null) p.partialUses=0; if(p.failedUses==null) p.failedUses=0;
    if(p.control==null) p.control=0; if(!p.mastery) p.mastery="unknown"; if(!p.activation) p.activation="unknown";
    ensurePowerSemantics(p);
  }

  function repairEntityState(st,e) {
    if(!e) return;
    var arrays=["aliases","powerOrder","defenses","vulnerabilities","sources","contradictions"],i,k,p;
    for(i=0;i<arrays.length;i++) if(!e[arrays[i]]) e[arrays[i]]=[];
    if(!e.powers) e.powers={}; if(!e.forms) e.forms={}; if(e.activeForm==null) e.activeForm="";
    if(!e.globalState) e.globalState="normal"; if(e.globalStateNote==null) e.globalStateNote="";
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
    if (!st.stats) st.stats = {sentences:0, powersCreated:0, ontologyCreated:0, feats:0, contradictions:0, psycheRecords:0, duplicatesSkipped:0};
    if (st.stats.ontologyCreated == null) st.stats.ontologyCreated = 0;
    if (st.stats.psycheRecords == null) st.stats.psycheRecords = 0;
    if (st.stats.duplicatesSkipped == null) st.stats.duplicatesSkipped = 0;
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
    var ac=Number(runtimeInfo.actionCount), mc=Number(runtimeInfo.maxChars), ml=Number(runtimeInfo.memoryLength), names=runtimeInfo.characterNames||[],i;
    st.runtimeActionCount=isNaN(ac)?null:ac;
    st.runtimeMaxChars=isNaN(mc)?null:mc;
    st.runtimeMemoryLength=isNaN(ml)?null:ml;
    st.runtimeCharacterNames=[]; for(i=0;i<names.length&&i<12;i++) if(trim(names[i])) st.runtimeCharacterNames.push(String(names[i]));
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

  function init() {
    var st = getState(true);
    if (!st) return null;
    mergeDefaults(st);
    loadConfig(st);
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
    name = name.replace(/^(?:and|but|then|while|when|as)\s+/i, "");
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
        globalState: "normal", globalStateNote: "", sources: [], lastSeen: st.turn,
        mentions: 0, narrativeSeen: false, contradictions: [], psyche: emptyPsyche()
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
          for (ai=1; ai<keyParts.length && ai<8; ai++) {
            alias=cleanCandidateName(keyParts[ai]);
            if(alias && lower(alias)!==lower(e.name)) pushBounded(e.aliases,alias,8,function(x){return lower(x);});
          }
        }
      }
    }
  }

  function seedPowersFromStoryCards(st) {
    if (typeof storyCards === "undefined" || !storyCards || !storyCards.length) return;
    var i, c, type, keys, entry, first, e, sig, defs, j, p, sentences, k, sentence, sentDefs, custom, mentioned;
    for (i = 0; i < storyCards.length && i < 250; i++) {
      c = storyCards[i] || {}; type = lower(c.type); keys = String(c.keys || ""); entry = String(c.entry || "");
      if (!entry) continue;
      // Never re-ingest this engine's own generated cards or its config card.
      if (type === "powers" || type === "powers config" || lower(keys).indexOf("powers config") >= 0) continue;
      if (type.indexOf("character") < 0 && type.indexOf("person") < 0 && type.indexOf("npc") < 0 && type.indexOf("creature") < 0 && type !== "powers canon") continue;
      sig = String(c.id != null ? c.id : i) + "|" + keys + "|" + entry;
      if (st.storyCardSeeds[String(c.id != null ? c.id : i)] === sig) continue;
      st.storyCardSeeds[String(c.id != null ? c.id : i)] = sig;

      first = cleanCandidateName(keys.split(/[,;|]/)[0].replace(/^powers canon::/i, ""));
      if (!first) continue;
      e = getOrCreateEntity(st, first, type.indexOf("creature") >= 0 ? "creature" : "character");
      if (!e) continue;

      // A Character/Powers Canon card is authored lore. Direct power names in
      // the card are therefore stronger evidence than conversational claims.
      defs = uniqueDefsFromTerms(entry);
      if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(entry));
      for (j = 0; j < defs.length; j++) {
        p = getOrCreatePower(st, e, defs[j]);
        addEvidence(st, e, p, st.config.explicitScore * 0.95, "story card lore", entry, "storycard");
        if (p.availability === "unknown") p.availability = "available";
      }

      sentences = splitSentences(entry);
      for (k = 0; k < sentences.length; k++) {
        sentence = sentences[k];
        sentDefs = uniqueDefsFromTerms(sentence); if(st.config.ontologyDetection) sentDefs=mergeDefs(sentDefs,uniqueDefsFromOntology(sentence)); mentioned = [];
        for (j = 0; j < sentDefs.length; j++) mentioned.push(getOrCreatePower(st,e,sentDefs[j]));
        if (!sentDefs.length && st.config.allowCustomPowers) {
          custom = extractCustomAbility(sentence, st.config.detection);
          if (custom) {
            p = getOrCreatePower(st,e,custom); mentioned.push(p);
            addEvidence(st,e,p,st.config.explicitScore * 0.95,"story card lore",sentence,"storycard");
            if (p.availability === "unknown") p.availability = "available";
          }
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
        detectInteractionLedger(st,sentence);
        detectPsyche(st,e,sentence,"storycard",mentioned);
      }
    }
  }

  function seedPsycheCanonCards(st) {
    if (!st.config.innerCurrent || typeof storyCards === "undefined" || !storyCards) return;
    var i,c,type,keys,entry,sig,name,e,lines,j,line;
    for(i=0;i<storyCards.length && i<250;i++) {
      c=storyCards[i]||{}; type=lower(c.type); keys=String(c.keys||""); entry=String(c.entry||"");
      if(type!=="powers psyche canon" && lower(keys).indexOf("psyche canon::")<0) continue;
      sig=String(c.id!=null?c.id:i)+"|"+keys+"|"+entry;
      if(st.psycheCardSeeds[String(c.id!=null?c.id:i)]===sig) continue;
      st.psycheCardSeeds[String(c.id!=null?c.id:i)]=sig;
      name=cleanCandidateName(keys.split(/[,;|]/)[0].replace(/^psyche canon::/i,""));
      if(!name) continue; e=getOrCreateEntity(st,name,"character"); if(!e) continue;
      lines=splitSentences(entry.replace(/\n+/g,". "));
      for(j=0;j<lines.length;j++){line=lines[j];detectPsyche(st,e,line,"storycard",[]);}
    }
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

  function buildIndexes() {
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
    var cues={"has":1,"have":1,"had":1,"uses":1,"use":1,"used":1,"with":1,"wields":1,"wield":1,"unleashes":1,"unleash":1,"activates":1,"activate":1,"channels":1,"channel":1,"possesses":1,"possess":1,"is":1,"are":1,"called":1,"named":1,"power":1,"ability":1,"powers":1,"abilities":1};
    for(i=0;i<parts.length-1;i++) if(cues[lower(parts[i])]) cut=i;
    if(cut>=0) parts=parts.slice(cut+1);
    while(parts.length && /^(?:the|a|an|his|her|their|your|my|its|this|that|of|from|about|around|over|under|through|with|without|to|for|by)$/i.test(parts[0])) parts.shift();
    if(parts.length>7) parts=parts.slice(parts.length-7);
    raw=trim(parts.join(" "));
    if(!raw || /^(?:power|ability|powers|abilities)$/i.test(raw)) return "";
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

  function mergeDefs(primary, extra) {
    var out=[], seen={}, i,d;
    for(i=0;i<primary.length;i++){d=primary[i];seen[d.id]=1;out.push(d);}
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
        semantic:(def.semantic||semanticFromName(def.name)), applications:[], traits:[], links:[], emotionLinks:[], activation:"unknown"
      };
      entity.powerOrder.push(id); st.stats.powersCreated += 1; if(def.ontology) st.stats.ontologyCreated += 1;
    }
    if (!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if (!p.forms) p.forms=[];
    ensurePowerSemantics(p,def);
    p.lastSeen = st.turn;
    st.lastPowerByEntity[entity.id] = id;
    return p;
  }

  function pushBounded(arr, value, cap, keyFn) {
    if (!arr) return false;
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
    pushBounded(st.recentEvents, {turn:st.turn, kind:kind || "event", text:shortText(textValue, 200)}, st.config.maxRecentEvents, function(x){return x.kind+"|"+x.text;});
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
      for (i = 0; i < srcs.length; i++) pushBounded(p.sources, srcs[i], 5);
    }
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
           (/\b(?:has|have|possesses?|wields?|uses?|activates?|unleashes?|channels?)\b/i.test(sentence) && (ONTOLOGY_POWER_ENDING_RE.test(sentence) || ONTOLOGY_SUFFIX_WORD_RE.test(sentence)));
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
    var defs = uniqueDefsFromTerms(sentence), created = [], i, p, custom, attempt, amount, kind;
    if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));
    if (!entity) return created;
    attempt = isAttemptSentence(sentence, source);

    if (!defs.length && st.config.allowCustomPowers) {
      custom = extractCustomAbility(sentence, st.config.detection);
      if (custom) defs.push(custom);
    }

    for (i = 0; i < defs.length; i++) {
      p = getOrCreatePower(st, entity, defs[i]); created.push(p);
      if (attempt) {
        addPendingAttempt(st, entity, p, sentence);
        // Attempt itself is not proof.
        addEvidence(st, entity, p, 0.12, "attempted", sentence, source);
      } else if (pureClaimCue(sentence)) {
        addEvidence(st, entity, p, st.config.claimScore * detectionFactor(st,"claim"), "claimed", sentence, source);
      } else if (explicitPowerCue(sentence)) {
        amount = st.config.explicitScore * detectionFactor(st,"explicit");
        if (source === "input" && /^\s*>/.test(sentence)) amount = 0.2;
        kind = "explicit";
        addEvidence(st, entity, p, amount, kind, sentence, source);
        if (p.availability === "unknown") p.availability = "available";
      } else if (source === "output" && SUCCESS_RE.test(sentence) && !FAILURE_RE.test(sentence) && !nonFeatDiscussion(sentence)) {
        addFeat(st, entity, p, sentence, PARTIAL_RE.test(sentence) ? "partial" : "success", source);
      } else {
        // Mere mention keeps recency but is deliberately near-zero evidence.
        addEvidence(st, entity, p, 0.05, "mentioned", sentence, source);
      }
    }
    attachSources(st, entity, created, sentence);
    return created;
  }

  function addPendingAttempt(st, entity, p, sentence) {
    pushBounded(st.pendingAttempts, {turn:st.turn, entityId:entity.id, powerId:p.id, text:shortText(sentence,160)}, 8, function(x){return x.entityId+"|"+x.powerId+"|"+x.text;});
  }

  function addFeat(st, entity, p, sentence, outcome, source) {
    var existingText = shortText(sentence, 190), signalSource=(source==="output-result"?"output":source), fp=signalFingerprint(st,signalSource,entity.id,p.id,"feat:"+outcome,existingText), changed;
    if(!markSignalOnce(st,fp)) return false;
    if (outcome === "success") {
      changed=addEvidence(st, entity, p, st.config.featScore * detectionFactor(st,"feat"), "successful feat", sentence, source);
      p.successfulUses += 1;
      if (p.availability === "suppressed" || p.availability === "restricted" || p.availability === "unknown") p.availability = "available";
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

  function resolvePendingFromOutput(st, sentence) {
    if (!st.pendingAttempts.length) return;
    var i, a, e, p, age, outcome = null;
    if (FAILURE_RE.test(sentence)) outcome = "failure";
    else if (SUCCESS_RE.test(sentence)) outcome = PARTIAL_RE.test(sentence) ? "partial" : "success";
    if (!outcome) return;
    for (i = st.pendingAttempts.length - 1; i >= 0; i--) {
      a = st.pendingAttempts[i]; age = st.turn - a.turn;
      if (age > 2) { st.pendingAttempts.splice(i,1); continue; }
      e = st.entities[a.entityId]; p = e && e.powers[a.powerId];
      if (!e || !p) { st.pendingAttempts.splice(i,1); continue; }
      // Match by power mention, entity mention, or simply the most recent attempt on the same turn.
      if (sentenceMentionsPower(sentence, p) || lower(sentence).indexOf(lower(e.name)) >= 0 || age <= 1) {
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
    pushBounded(p.applications,{turn:st.turn,tag:tag,text:shortText(sentence,150)},st.config.maxApplicationsPerPower,function(x){return x.tag;});
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
      for(i=0;i<powers.length;i++){p=powers[i]; if(PASSIVE_RE.test(sentence)) p.activation="passive/automatic"; else if(ACTIVE_RE.test(sentence)) p.activation="activated/at-will"; else if(CHARGE_RE.test(sentence)) p.activation="charged/prepared";}
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
    if(!entity || !st.config.trackPowerLinks || !LINK_RE.test(sentence) || pureClaimCue(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned),i;
    for(i=0;i<powers.length;i++) pushBounded(powers[i].links,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return lower(x.text);});
  }

  function detectInteractionLedger(st,sentence) {
    if(!st.config.trackInteractions || !/\b(counter|counters|negates?|nullif(?:y|ies|ied)|blocks?|bypasses?|pierces?|overcomes?|resists?|immune|suppresses?|amplifies?|boosts?|weakens?|absorbs?|reflects?)\b/i.test(sentence)) return;
    var defs=uniqueDefsFromTerms(sentence); if(st.config.ontologyDetection) defs=mergeDefs(defs,uniqueDefsFromOntology(sentence));
    var names=[],seen={},i;
    for(i=0;i<defs.length;i++) if(!seen[defs[i].id]){seen[defs[i].id]=1;names.push(defs[i].name);}
    if(names.length<1) return;
    pushBounded(st.interactions,{turn:st.turn,powers:names.slice(0,4),text:shortText(sentence,200)},st.config.maxInteractions,function(x){return lower(x.text);});
  }

  function detectLimitsCosts(st, entity, sentence, mentioned) {
    if (!entity) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (!powers.length) return;
    for (i = 0; i < powers.length; i++) {
      p = powers[i];
      if (LIMIT_RE.test(sentence)) pushBounded(p.limits, {turn:st.turn, text:shortText(sentence,190)}, st.config.maxNotesPerPower, function(x){return x.text;});
      if (COST_RE.test(sentence)) pushBounded(p.costs, {turn:st.turn, text:shortText(sentence,190)}, st.config.maxNotesPerPower, function(x){return x.text;});
    }
  }

  function pushScale(p, kind, textValue, st) {
    if (!p.scale) p.scale={duration:[],range:[],scope:[],targets:[],magnitude:[]};
    if (!p.scale[kind]) p.scale[kind]=[];
    pushBounded(p.scale[kind],{turn:st.turn,text:shortText(textValue,90)},4,function(x){return lower(x.text);});
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
      pushBounded(powers[i].forms,form,5,function(x){return lower(x);});
      if (/\bonly\b/i.test(sentence)) pushBounded(powers[i].limits,{turn:st.turn,text:shortText(sentence,190)},st.config.maxNotesPerPower,function(x){return x.text;});
    }
  }

  function detectRecentStrain(st, entity, sentence, mentioned) {
    if (!entity || !STRAIN_RE.test(sentence)) return;
    var powers=targetPowersForNote(st,entity,sentence,mentioned,"aftermath"), i;
    for(i=0;i<powers.length;i++) pushBounded(powers[i].conditions,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;});
  }

  function detectAvailability(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackTemporaryEffects) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i, p;
    if (powers.length && TEMP_RESTRICT_RE.test(sentence) && /\b(can't|cannot|unable|blocked|nullified|dampened|sealed|disabled|doesn't work|does not work)\b/i.test(sentence)) {
      for(i=0;i<powers.length;i++){ p=powers[i]; p.availability="restricted"; pushBounded(p.conditions,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      addEvent(st,entity.name+" temporary power restriction","restriction");
    }
    if (RESTORE_RE.test(sentence)) {
      entity.globalState = "normal"; entity.globalStateNote = shortText(sentence,180);
      for (i = 0; i < entity.powerOrder.length; i++) if (entity.powers[entity.powerOrder[i]]) { entity.powers[entity.powerOrder[i]].availability = "available"; updateStatus(st,entity.powers[entity.powerOrder[i]]); }
      addEvent(st, entity.name + " powers restored", "restored"); return;
    }
    if (LOSS_RE.test(sentence)) {
      if (powers.length) {
        for (i = 0; i < powers.length; i++) { p = powers[i]; p.availability = "lost"; p.status = "lost"; pushBounded(p.conditions,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      } else {
        entity.globalState = "lost"; entity.globalStateNote = shortText(sentence,180);
      }
      addEvent(st, entity.name + " power loss", "loss"); return;
    }
    if (SUPPRESS_RE.test(sentence)) {
      if (powers.length) {
        for (i = 0; i < powers.length; i++) { p = powers[i]; p.availability = "suppressed"; pushBounded(p.conditions,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      } else {
        entity.globalState = "suppressed"; entity.globalStateNote = shortText(sentence,180);
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
      if (MASTERY_RE.test(sentence) && !/\b(?:plans?|intends?|wants?|hopes?|tries?|attempts?|learning)\s+to\s+master\b/i.test(sentence)) { p.mastery = "mastered"; p.control = Math.max(p.control, 92); addEvidence(st,entity,p,0.5,"mastery evidence",sentence,"narrative"); }
      else if (IMPROVE_RE.test(sentence)) { if (p.mastery === "unknown") p.mastery = "developing"; p.control = clamp(p.control + 6,0,100); pushBounded(p.scaleNotes,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
      else if (REGRESS_RE.test(sentence)) { p.control = clamp(p.control - 6,0,100); pushBounded(p.scaleNotes,{turn:st.turn,text:shortText(sentence,180)},st.config.maxNotesPerPower,function(x){return x.text;}); }
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
      rec={turn:st.turn,kind:kind,text:note}; target=(kind==="vulnerability"||kind==="weakness")?entity.vulnerabilities:entity.defenses;
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
    if (REVERT_RE.test(sentence)) { entity.activeForm = ""; addEvent(st, entity.name + " reverted to base form", "form"); return; }
    var m = sentence.match(TRANSFORM_RE), form, key;
    if (!m) return;
    form = shortText((m[2] || m[1]).replace(/\b(?:and|but)\b.*$/i, ""), 80); key = powerKey(form);
    if (!entity.forms[key]) entity.forms[key] = {name:form, firstSeen:st.turn, lastSeen:st.turn, notes:[]};
    entity.forms[key].lastSeen = st.turn; entity.activeForm = form;
    pushBounded(entity.forms[key].notes,{turn:st.turn,text:shortText(sentence,180)},5,function(x){return x.text;});
    addEvent(st, entity.name + " form: " + form, "form");
  }

  function detectCounterInteraction(st, entity, sentence, mentioned) {
    if (!entity || !st.config.trackInteractions) return;
    if (!/\b(counter|counters|blocks|negates|nullifies|immune|resistant|doesn't work on|does not work on|pierces|bypasses|overcomes)\b/i.test(sentence)) return;
    var powers = targetPowersForNote(st, entity, sentence, mentioned), i;
    for (i = 0; i < powers.length; i++) pushBounded(powers[i].counters,{turn:st.turn,text:shortText(sentence,190)},st.config.maxNotesPerPower,function(x){return x.text;});
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
    rec={turn:st.turn,text:shortText(textValue,220),source:source||"narrative",confidence:round2((meta.confidence==null?1:meta.confidence)*psycheSourceWeight(st,source||"narrative"))};
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

  function resolveBestPsyche(entity,kinds,sentence,minScore) {
    var psyche=ensurePsyche(entity),i,j,arr,best=null,bestScore=0,score;
    for(i=0;i<kinds.length;i++){
      arr=psyche[kinds[i]]||[];
      for(j=arr.length-1;j>=0;j--){if(arr[j].resolved)continue;score=psycheOverlap(arr[j].text,sentence);if(score>bestScore){bestScore=score;best=arr[j];}}
    }
    if(best && bestScore>=(minScore==null?0.2:minScore)){best.resolved=true;return best;}
    return null;
  }

  function resolveEmotionState(entity,sentence) {
    var p=ensurePsyche(entity),tag=detectEmotionTag(sentence),i,r;
    for(i=p.emotions.length-1;i>=0;i--){r=p.emotions[i];if(r.resolved)continue;if(tag==="emotion" || r.tag===tag){r.resolved=true;return r;}}
    return null;
  }

  function markPsycheRevision(st,entity,sentence) {
    var changed=false;
    if(PSYCHE_REVISION_RE.test(sentence)) changed=!!resolveBestPsyche(entity,["plans","goals","beliefs","fears","restraints"],sentence,0.22) || changed;
    if(PSYCHE_DISCLOSURE_RE.test(sentence)) changed=!!resolveBestPsyche(entity,["secrets"],sentence,0.12) || changed;
    if(PSYCHE_RESTRAINT_BREAK_RE.test(sentence)) changed=!!resolveBestPsyche(entity,["restraints"],sentence,0.08) || changed;
    if(PSYCHE_EMOTION_RESOLVE_RE.test(sentence)) changed=!!resolveEmotionState(entity,sentence) || changed;
    if(changed || PSYCHE_REVISION_RE.test(sentence) || PSYCHE_DISCLOSURE_RE.test(sentence) || PSYCHE_RESTRAINT_BREAK_RE.test(sentence) || PSYCHE_EMOTION_RESOLVE_RE.test(sentence)) recordPsyche(st,entity,"revisions",sentence,"narrative",{confidence:0.95});
  }

  function detectPsyche(st,entity,sentence,source,mentioned) {
    if(!st.config.innerCurrent || !entity || !sentence) return;
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
      for(i=0;i<(mentioned||[]).length;i++){p=mentioned[i];if(p){ensurePowerSemantics(p);pushBounded(p.emotionLinks,{turn:st.turn,text:shortText(sentence,190),emotion:tag},st.config.maxNotesPerPower,function(x){return lower(x.text);});}}
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

  function findPsycheCard(entityName) {
    if(typeof storyCards==="undefined"||!storyCards)return null;
    var marker="psyche::"+lower(entityName),i,c;
    for(i=0;i<storyCards.length;i++){c=storyCards[i]||{};if(lower(c.type)==="powers psyche"&&lower(c.keys).indexOf(marker)>=0)return {card:c,index:i};}
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
        pushBounded(p.contradictions,{turn:st.turn,text:shortText(sentence,180)},6,function(x){return x.text;});
        pushBounded(entity.contradictions,{turn:st.turn,text:shortText(sentence,180)},8,function(x){return x.text;});
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
    detectInteractionLedger(st, sentence);
    detectPsyche(st, entity, sentence, source, mentioned);
    contradictionCheck(st, entity, sentence, mentioned);
    if (source === "output") resolvePendingFromOutput(st, sentence);
  }

  function processText(st, textValue, source) {
    if (!st || !st.config.enabled || !textValue) return;
    var sentences = splitSentences(textValue), i;
    for (i = 0; i < sentences.length; i++) processSentence(st, sentences[i], source);
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
      if (p.emotionLinks && p.emotionLinks.length) bits.push("emotion rule: "+conciseNote(p.emotionLinks,detail==="high"?2:1));
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
      if (lower(c.type)==="powers" && lower(c.keys).indexOf(marker)>=0) return {card:c,index:i};
    }
    return null;
  }

  function cardEntryFor(st,e) {
    var lines=["[Powers continuity: "+e.name+"]"], i,p, usable=[];
    for (i=0;i<e.powerOrder.length;i++) {
      p=e.powers[e.powerOrder[i]]; if (!p) continue;
      if (p.status==="confirmed" || p.status==="probable" || p.availability==="lost" || p.availability==="suppressed") usable.push(p);
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
      for(j=0;j<(e.powerOrder||[]).length;j++){p=e.powers[e.powerOrder[j]];if(p&&(p.status==="confirmed"||p.status==="probable"||p.status==="lost"||p.availability==="suppressed"||p.availability==="restricted")){meaningful=true;break;}}
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
      for (j=0;j<e.powerOrder.length;j++){p=e.powers[e.powerOrder[j]]; if(p && (p.status==="confirmed" || p.status==="probable" || p.status==="lost" || p.availability==="suppressed" || p.availability==="restricted")){meaningful=true;break;}}
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
    if(options.sourceTag) pushBounded(p.sources,String(options.sourceTag),5);
    if(options.availability){var av=String(options.availability);if(av==="available"||av==="suppressed"||av==="restricted"||av==="lost"||av==="unknown")p.availability=av;}
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
    pushBounded(target,{turn:st.turn,text:shortText(textValue,190)},st.config.maxNotesPerPower,function(x){return x.text;}); return p;
  }

  function apiSetAvailability(name, powerName, availability, reason) {
    var st=init(), e, d, p;
    if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d);
    if(availability!=="available"&&availability!=="suppressed"&&availability!=="restricted"&&availability!=="lost"&&availability!=="unknown") availability="unknown";
    p.availability=availability; if(reason) pushBounded(p.conditions,{turn:st.turn,text:shortText(reason,190)},st.config.maxNotesPerPower,function(x){return x.text;}); updateStatus(st,p); return p;
  }

  function apiGetSemantics(name,powerName) {
    var st=init(),e,d,p; if(!st) return null; e=st.entities[entityKey(name)]; if(!e) return null; d=findDefForApi(powerName); p=e.powers[d.id]; if(!p) return null; ensurePowerSemantics(p,d); return p.semantic;
  }

  function apiRecordApplication(name,powerName,tag,evidence) {
    var st=init(),e,d,p; if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); recordApplication(st,p,String(tag||"utility"),evidence||("External application of "+p.name)); return p;
  }

  function apiRecordTrait(name,powerName,trait) {
    var st=init(),e,d,p; if(!st) return null; e=getOrCreateEntity(st,name,"character"); d=findDefForApi(powerName); p=getOrCreatePower(st,e,d); pushBounded(p.traits,String(trait),st.config.maxTraitsPerPower,function(x){return lower(x);}); return p;
  }

  function apiRecordInteraction(textValue,powerNames) {
    var st=init(); if(!st) return null; pushBounded(st.interactions,{turn:st.turn,powers:(powerNames||[]).slice(0,4),text:shortText(textValue,200)},st.config.maxInteractions,function(x){return lower(x.text);}); return st.interactions[st.interactions.length-1];
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
    if(rec)pushBounded(p.emotionLinks,{turn:st.turn,text:shortText(note,190),emotion:emotion||"emotion"},st.config.maxNotesPerPower,function(x){return lower(x.text);});return rec;
  }

  function apiResolvePsyche(name,kind,evidence) {
    var st=init(),e,kinds,rec;if(!st)return null;e=st.entities[entityKey(name)];if(!e)return null;
    if(kind==="goal")kind="goals";else if(kind==="plan")kind="plans";else if(kind==="fear")kind="fears";else if(kind==="belief")kind="beliefs";else if(kind==="secret")kind="secrets";else if(kind==="restraint")kind="restraints";else if(kind==="conflict")kind="conflicts";else if(kind==="emotion")kind="emotions";else if(kind==="powerIdentity"||kind==="powerAttitude")kind="powerAttitudes";else if(kind==="emotionRule"||kind==="emotionLink")kind="emotionLinks";
    kinds=kind?[kind]:["plans","goals","beliefs","fears","secrets","restraints","conflicts","emotions"];
    rec=resolveBestPsyche(e,kinds,evidence||"",evidence?0.08:0);
    if(!rec && !evidence){var arr=psycheArray(ensurePsyche(e),kind);if(arr&&arr.length){for(var i=arr.length-1;i>=0;i--)if(!arr[i].resolved){arr[i].resolved=true;rec=arr[i];break;}}}
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
    var st=init(); if(!st || !st.config.enabled) return textValue;
    setRuntimeInfo(st,runtimeInfo); st.hookCount += 1; bootstrapFromHistory(st);
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
    var st=init(); if(!st || !st.config.enabled) return textValue;
    setRuntimeInfo(st,runtimeInfo); st.hookCount += 1; bootstrapFromHistory(st);
    var base=stripExistingLedger(textValue), ledger=buildLedger(st,String(base||"").slice(-7000));
    if (!ledger) return base;
    return fitContextWithLedger(st,String(base||""),ledger);
  }

  function onOutput(textValue, runtimeInfo) {
    var st=init(); if(!st || !st.config.enabled) return textValue;
    setRuntimeInfo(st,runtimeInfo); st.hookCount += 1; st.turn += 1; bootstrapFromHistory(st);
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
      getSemantics: apiGetSemantics,
      recordApplication: apiRecordApplication,
      recordTrait: apiRecordTrait,
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
