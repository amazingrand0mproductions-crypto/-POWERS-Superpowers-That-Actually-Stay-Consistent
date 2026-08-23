POWERS — GitHub README

⚡ POWERS

Intelligent superpower, progression and psychological continuity for AI Dungeon

POWERS is an AI Dungeon scripting system designed to solve one of the biggest problems in long-form powered stories:

the AI eventually forgets what abilities mean.

Characters gain powers they never had.

Limitations disappear.

Resistance becomes immunity.

An ability shown at room scale suddenly affects a planet.

Temporary suppression becomes permanent power loss.

A character’s fear of their own abilities disappears because the conversation moved outside the context window.

POWERS maintains a persistent, bounded model of both power continuity and power-related character psychology.

It is designed to support practically any scenario containing supernatural or extraordinary abilities without forcing that scenario into a predefined universe or RPG ruleset.

⸻

✨ Core Philosophy

POWERS separates several ideas that language models commonly blur together:

Claim ≠ Fact
Attempt ≠ Success
Failure ≠ Never Had The Power
Observed Scale ≠ Absolute Maximum
Resistance ≠ Immunity
Manipulation ≠ Generation
Suppression ≠ Permanent Loss
Belief ≠ Objective Reality
Plan ≠ Accomplishment
Emotion ≠ Power Mechanic

The story remains the authority.

POWERS exists to remember the evidence.

⸻

🧬 Power Genome

A fixed database can never contain every possible superpower.

POWERS therefore combines a curated catalogue with a compositional Power Genome.

Abilities may be interpreted using:

Domain
Mechanic
Source
Access
Tier
Activation
Traits
Applications
Scale
Evidence
Relationships

Examples:

Fire Manipulation
domain: fire
mechanic: manipulation
Absolute Spatial Negation
domain: space
mechanic: negation
tier label: absolute
Lie-to-Glass Transmutation
domain: contextual/original
mechanic: transmutation

The original power name remains canonical.

Power Genome semantics help POWERS reason about the ability; they do not rewrite the user’s power system.

⸻

🔤 Original Power Recognition

POWERS can interpret common supernatural naming structures including:

-kinesis
-mancy
-pathy
-portation
-morphism

It also recognizes broad mechanic families such as:

Manipulation
Generation
Creation
Absorption
Negation
Sealing
Resistance
Immunity
Mimicry
Physiology
Transformation
Empowerment
Summoning
Projection
Detection
Communication
Transmutation
Restoration
Infusion
Evolution
Transportation
Intangibility
Storage
Fusion
Replication
Bestowal

Inflection-aware matching allows natural prose such as:

generate
generates
generated
control
controls
controlled
create
creates
created

to resolve toward the same underlying mechanic.

⸻

🔬 Evidence Model

POWERS does not treat every power-shaped sentence as canon.

Example:

Mara claims she can stop time.

This creates weak evidence.

> You try to stop time.

This creates an attempted action.

The entire room freezes around Mara for three seconds.

This provides actual feat evidence.

Confidence can develop through:

rumored
probable
confirmed

A failed use of an already established power does not automatically reduce its existence to zero.

⸻

🎯 Attempt → Outcome Matching

Player input and model output are handled separately.

POWERS remembers attempted powers temporarily and then evaluates the resulting narration.

This prevents:

> You try to phase through the wall.

from immediately establishing Intangibility.

Outcome matching also tries to remain subject-aware so another character successfully using a different ability does not accidentally confirm the player’s pending attempt.

⸻

👥 Subject-Aware Detection

Powered scenes often contain multiple characters.

POWERS attempts to route abilities to the entity actually associated with each clause.

For example:

Mara can fly while Kade can teleport.

should produce:

Mara → Flight
Kade → Teleportation

rather than attaching both abilities to Mara.

Possessive forms such as:

Mara's flight
Mara’s telepathy

are normalized back to the correct entity.

⸻

📏 Feats & Observed Scale

POWERS can retain demonstrated:

* range
* duration
* area
* target count
* magnitude

Example:

Mara freezes time throughout the room for three seconds.

may establish:

Time ability
duration: 3 seconds
scope: room

Observed feats are not automatically treated as hard maximums.

They represent the strongest or clearest demonstrated evidence available so far.

This allows progression without unexplained power inflation.

⸻

⚠️ Costs & Limitations

POWERS can track limitations such as:

touch requirement
line of sight
range
duration
cooldown
concentration
specific form
environment
activation condition
resource requirement

and costs such as:

fatigue
pain
injury
migraine
bleeding
overheating
stamina
lifespan
resource expenditure

Recent aftermath can also remain relevant to immediate scenes.

⸻

🧩 Strict Mechanics

With strict mechanics enabled, related abilities remain separate unless the story links them.

Examples:

Fire Manipulation ≠ Fire Generation
Resistance ≠ Immunity
Teleportation ≠ Portal Creation
Time Manipulation ≠ Time Stop
Time Stop ≠ Time Travel
Animal Control ≠ Animal Communication
Absorption ≠ permanent ownership
Mimicry ≠ Physiology

This dramatically reduces silent capability creep.

⸻

👑 High-Tier Guard

Names containing labels such as:

Absolute
Omni
Almighty
Infinite
Supreme
Transcendent
Primordial

do not automatically mean:

* infinite range;
* perfect control;
* every possible sub-power;
* total immunity;
* omnipotence.

The story still has to establish what the title means.

⸻

🌀 Access Model

Power existence and current usability are separate.

POWERS can distinguish access such as:

innate
learned
granted
inherited
copied
stolen
borrowed
artifact-dependent

and availability such as:

available
dormant
awakened
restricted
suppressed
lost
unknown

Examples:

A nullification collar may suppress Teleportation without deleting Teleportation from canon.

A transformation may grant temporary abilities.

A broken artifact may remove only powers actually dependent on that artifact.

⸻

🔄 Progression

POWERS can retain evidence for:

* training;
* improved mastery;
* loss of control;
* regression;
* awakening;
* evolution;
* derived abilities;
* fused abilities;
* inherited powers;
* copied powers;
* restored abilities.

Progression remains narrative rather than numerical unless another script chooses to build statistics on top of the API.

⸻

🎯 Applications

Powers may develop demonstrated applications such as:

offense
defense
mobility
control
sensing
healing
constructs
stealth
utility
support
summoning
transformation
creation
destruction
sealing
environmental use

Applications are useful for remembering creative techniques without incorrectly creating a completely separate superpower for every maneuver.

⸻

🛡️ Defenses

POWERS keeps defensive relationships distinct.

It can represent:

Resistance
Immunity
Vulnerability
Weakness
Counter
Suppression
Bypass
Negation

A character manipulating fire therefore does not automatically become immune to fire.

⸻

⚗️ Sources & Origins

Power sources may include:

mutation
magic
technology
artifact
divine
infernal
alien
cosmic
psychic
biological
martial
chemical
elemental
dimensional
temporal
quantum
emotional
dream
soul
bloodline
infection

Original sources are also supported.

Source information is stored separately from the ability itself.

Using an artifact to enhance a power therefore does not automatically mean the artifact originally granted that power.

⸻

🧠 Inner Current

Inner Current is POWERS’ psychological-continuity subsystem.

It is not a full independent NPC simulator.

Instead it records story-supported internal continuity relevant to characters and their powers.

Possible information includes:

goals
plans
fears
beliefs
secrets
emotions
vows
restraint
self-image
internal conflict
power attitude
temptation
confidence
dependence
shame
pride
fear of losing control

⸻

🔐 Subjective Truth vs Objective Truth

Inner Current deliberately separates character belief from world fact.

Example:

Mara believes the relic created her powers.

may produce:

Mara belief:
"The relic created my powers."

It does not automatically rewrite:

Power origin = relic

Likewise:

Mara fears she will become a monster.

does not establish:

Mara is becoming a monster.

⸻

❤️‍🔥 Emotion → Power Rules

Ordinary emotional coincidence is not treated as a mechanic.

Mara is angry while using Telekinesis.

does not prove:

Anger empowers Telekinesis.

But:

Mara's Telekinesis becomes stronger whenever she gets angry.

can establish an actual emotion-power relationship.

This distinction prevents normal character writing from becoming accidental power mechanics.

⸻

🔄 Psychological Revision

Inner Current is designed for changing characters.

It can resolve or replace:

abandoned plans
changed beliefs
overcome fears
revealed secrets
broken vows
ended emotional states
resolved conflicts
changing power attitudes

The goal is character development rather than permanent accumulation of every thought ever detected.

⸻

🛡️ Player Agency Protection

POWERS avoids automatically persisting model-generated private psychology for human-controlled characters.

This protects the player’s:

beliefs
goals
plans
secrets
desires
private intentions

from quietly becoming permanent script canon because the model narrated them once.

Where available, multiplayer human character names may receive the same protection.

⸻

🗂️ Story Card Integration

POWERS can read authored character information from suitable Story Cards.

Compact power declarations are supported:

Powers: Flight, Telepathy, Super Strength

Authored cards may also establish limitations, costs and other power lore.

Generated long-term cards can maintain compact continuity under dedicated keys such as:

powers::CharacterName

Private psychological continuity can use separate psyche cards.

Generated cards are treated differently from authored canon to avoid feedback loops.

⸻

✏️ Author Canon Provenance

POWERS tracks where authored Story Card evidence came from.

This allows scenario creators to edit character canon later.

Example:

Original card:

Powers: Flight

Edited card:

Powers: Telepathy

The old card-derived Flight evidence can be retracted.

However, if Flight was independently demonstrated in narration, that separate evidence can survive.

This prevents Story Card edits from either leaving permanent stale canon or destroying unrelated story continuity.

⸻

⏪ Timeline Awareness

Long AI Dungeon adventures commonly use Retry, Edit and Undo.

POWERS uses action-aware processing and provenance information to reduce duplicate evidence and avoid carrying discarded-branch continuity forward where possible.

Timeline-sensitive information can include:

feats
power discoveries
availability changes
forms
psychological developments
limits
costs
generated memory

⸻

🧠 Context Budgeting

POWERS does not inject the entire state database into every generation.

It relevance-ranks entities and powers according to the current scene and produces a compact continuity ledger.

Example:

[POWERS — continuity ledger]
Mara
- Time Manipulation [confirmed]
  demonstrated: room, 3 seconds
  cost: severe migraine
Kade
- Teleportation [confirmed]
  availability: suppressed
  reason: nullification collar
INNER CURRENT
Mara
- fears losing control of Time Manipulation
- intends to avoid using it around civilians

When available, POWERS can account for AI Dungeon context-budget information rather than blindly appending beyond the available limit.

⸻

💾 Persistent State

POWERS keeps its persistent data under:

state.powers

It avoids claiming unrelated memory namespaces.

Older POWERS state can be migrated forward when new fields are introduced.

⸻

🔌 Public API

Other AI Dungeon scripts can interact with the same continuity engine through:

POWERS.api

Check whether a power exists

POWERS.api.hasPower(
  "Kade",
  "Teleportation",
  "confirmed"
);

Record a power

POWERS.api.recordPower(
  "Kade",
  "Teleportation",
  {
    evidence: "Established during character creation.",
    source: "character-system"
  }
);

Record a feat

POWERS.api.recordFeat(
  "Kade",
  "Teleportation",
  "Kade teleports across the chamber.",
  "success"
);

Change availability

POWERS.api.setAvailability(
  "Kade",
  "Teleportation",
  "suppressed",
  "Nullification collar active."
);

Read semantics

POWERS.api.getSemantics(
  "Mara",
  "Absolute Spatial Negation"
);

Record an application

POWERS.api.recordApplication(
  "Mara",
  "Barrier Manipulation",
  "defense",
  "Mara curves the barrier around the team."
);

Resolve private continuity

POWERS.api.resolvePsyche(
  "Mara",
  "fear",
  "Mara no longer fears losing control."
);

Obtain a safe snapshot

var mara = POWERS.api.snapshot("Mara");

The snapshot is isolated so another script cannot accidentally mutate internal POWERS state simply by editing the returned object.

⸻

🎭 Modes

Narrative

Recommended default.

Power continuity remains strong while mechanical instructions stay subtle.

Balanced

Power interactions, applications, costs and limitations receive stronger emphasis.

Simulation

Strictest interpretation of established ability rules.

POWERS itself does not add dice rolls, levels or combat statistics.

⸻

🌍 Scenario Compatibility

POWERS can support:

* superhero fiction;
* fantasy;
* urban fantasy;
* sci-fi;
* cyberpunk;
* supernatural horror;
* cultivation;
* anime-inspired worlds;
* magical girls;
* mythology;
* cosmic fiction;
* mutations;
* psychic powers;
* divine/infernal abilities;
* artifacts;
* magical schools;
* military experiments;
* original settings;
* crossover scenarios.

There is no required setting ontology.

⸻

🛠️ Installation

AI Dungeon custom scripts use four main script areas.

Copy:

1-Library.js → Library
2-Input.js   → Input
3-Context.js → Context
4-Output.js  → Output

Save the scripts.

POWERS can work using its defaults immediately.

⸻

⚙️ Configuration

For custom behavior, create a Story Card using the supplied configuration entry.

Recommended setup:

Keys / Triggers:
Powers Config
Type:
Powers Config
Entry:
Paste POWERS_CONFIG_CARD.txt

The compact config is designed to remain beneath AI Dungeon’s Story Card entry-size constraint.

Full explanations belong in:

POWERS_CONFIG_NOTES.txt

rather than bloating the active configuration card.

⸻

🤝 Combining POWERS With Other Scripts

POWERS is intentionally designed to function as a shared supernatural continuity layer.

Other systems can build on top of it:

relationship engines
NPC systems
combat frameworks
inventory systems
transformation systems
faction scripts
twist engines
RPG systems
character development systems

Instead of every script independently deciding whether Mara can teleport, they can query POWERS.

That reduces contradictory state across large script suites.

⸻

⚡ Why POWERS Exists

A good powered story needs more continuity than:

Character X has Ability Y.

It needs to remember:

How certain are we that they have it?

What have they actually demonstrated?

What hasn’t been demonstrated yet?

What does using it cost?

What stops it?

What form does it require?

Where did it come from?

Is it currently usable?

How has it evolved?

What does the character believe about it?

What are they afraid of doing with it?

What have they promised themselves they won’t do?

And which of those things are objective facts versus somebody’s private interpretation?

That is the problem POWERS is built to solve.

⸻

⚡ Final Principle

Your setting decides what is possible.

Your story decides what is true.

Your characters decide what it means to them.

POWERS remembers the difference.
