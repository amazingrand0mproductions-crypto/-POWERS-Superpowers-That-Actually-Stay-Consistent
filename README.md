⚡ POWERS

Intelligent superpower continuity, progression, technique memory and power-aware character psychology for AI Dungeon.

POWERS is built for one problem: long AI Dungeon stories gradually forget what powers actually mean.

A character begins with Fire Manipulation, and fifty actions later the model casually gives them Fire Generation, immunity to fire and the ability to become living flame. A room-scale time stop becomes planetary. A nullification field gets mistaken for permanent depowering. A player attempts a new ability and the attempt itself becomes canon. A character’s fear of losing control disappears as soon as the scene leaves the context window.

POWERS gives the story a persistent, evidence-based continuity layer for those details without forcing the adventure into an RPG stat sheet.

────────

✨ What makes POWERS different?

POWERS does not treat powers as a flat list of names.

It separates:

• ownership — does the character actually possess the ability?
• evidence — was it claimed, attempted, demonstrated or explicitly established?
• mechanic — manipulation, generation, transformation, absorption, resistance, etc.
• availability — is it usable right now, dormant, suppressed, restricted or lost?
• access — innate, trained, copied, borrowed, granted, stolen or artifact-dependent?
• scale — what range, duration, area, target count or magnitude has actually been shown?
• limits and costs — what stops it, drains it or makes it dangerous?
• applications — what has the character learned to do with it?
• techniques — which named moves have become part of the character’s repertoire?
• reliability and precision — is it stable, inconsistent, coarse or finely controlled?
• resources — does it consume mana, stamina, blood, charge, fuel or something stranger?
• forms — which abilities belong to which transformation?
• interactions — what has countered, resisted, bypassed or combined with it?
• psychology — what does the character believe, fear, plan or feel about their powers?

Those layers are deliberately kept separate so one type of information cannot silently become another.

────────

🧬 Power Genome

There are too many possible powers to maintain as one literal database.

POWERS therefore combines a large curated Extended Power Atlas with a compositional Power Genome.

A power can be interpreted through:

```text
Domain
+ Mechanic
+ Source
+ Access
+ Tier
+ Activation
+ Traits
+ Applications
+ Scale
+ Evidence
+ Relationships
```

That means familiar powers work immediately, but so do obscure or original abilities.

Examples:

```text
Fire Manipulation
Absolute Spatial Negation
Dream Embodiment
Dragon Physiology
Chronokinesis
Lie-to-Glass Transmutation
Blood-Fueled Shadow Transportation
```

The exact power name remains canon. POWERS uses the semantic structure only to reason about continuity.

Extended Power Atlas

The Library now includes hundreds of additional canonical families spanning:

• physical enhancement and adaptation
• material manipulation and generation
• psychic and perception powers
• fundamental physics and conceptual powers
• energy systems
• mystic disciplines
• meta-power abilities
• technological abilities
• biological powers
• utility, portal and storage abilities

The atlas is deliberately paired with ontology detection rather than trying to hard-code every possible superpower title ever invented.

Power-name grammar

POWERS also understands common structures such as:

```text
X Manipulation
X Generation
X Creation
X Physiology
X Embodiment
X Absorption
X Resistance
X Immunity
X Negation
X Sealing
X Summoning
X Detection
X Transformation
```

and many genre-style endings including:

```text
-kinesis
-mancy
-pathy
-portation
-morphism
```

A large root-alias table gives unfamiliar names more useful semantics. A new -kinesis ability does not need to be manually added to the source before the engine can reason about it.

────────

🔬 Evidence before assumption

POWERS treats the story as evidence rather than assuming every power-shaped sentence is true.

```text
"Mara claims she can stop time."
```

That is a claim.

```text
> You try to phase through the wall.
```

That is an attempt.

```text
Your body turns translucent and passes through the steel.
```

That is a demonstrated outcome.

Confidence can progress through:

```text
rumored → probable → confirmed
```

A failed use also does not erase an established power. It may indicate exhaustion, resistance, suppression, poor control or circumstance instead.

────────

👥 Subject-aware attribution

Powered scenes often contain several characters in one paragraph.

POWERS contains an attribution layer designed to avoid attaching every detected ability to the first proper name it sees.

```text
Mara can fly while Kade can teleport.
```

becomes:

```text
Mara → Flight
Kade → Teleportation
```

It also understands reported information:

```text
Kade says Mara can teleport.
```

This can seed a claim about Mara without giving Teleportation to Kade.

Mixed positive/negative clauses are separated too:

```text
Rhea can manipulate glass, but she cannot generate it.
```

can establish Glass Manipulation without manufacturing Glass Generation.

────────

🧩 Strict mechanics

With strictMechanics=true, POWERS actively reminds the model that related mechanics are not interchangeable.

Examples:

```text
Manipulation ≠ Generation
Resistance ≠ Immunity
Immunity ≠ Absorption
Absorption ≠ Permanent Ownership
Teleportation ≠ Portal Creation
Time Manipulation ≠ Time Stop
Time Stop ≠ Time Travel
Telepathy ≠ Mind Control
Empathy ≠ Emotion Manipulation
Illusion ≠ Reality Alteration
Regeneration ≠ Resurrection
Flight ≠ Gravity Manipulation
Named Technique ≠ New Power
```

The Library also contains a broader strict-boundary table for common inference mistakes.

These are not universe rules. Explicit scenario canon can establish any connection it wants. POWERS simply refuses to invent that connection by accident.

────────

👑 High-tier guard

Names containing words such as:

```text
Absolute
Omni
Almighty
Infinite
Supreme
Primordial
Transcendent
```

are treated as labels until the story establishes what they actually mean.

An impressive title does not automatically grant infinite range, perfect control, every related sub-power and universal immunity.

────────

📏 Feats and observed scale

POWERS can retain demonstrated:

• duration
• range
• area/scope
• target count
• magnitude

Example:

```text
Mara freezes time throughout one room for three seconds.
```

can leave continuity roughly equivalent to:

```text
Time Stop [confirmed]
observed duration: 3 seconds
observed scope: room
```

Observed scale is not automatically a hard maximum.

It means “this is what has actually been shown so far.”

Characters can grow. The story just has to establish the growth instead of silently jumping from room-scale to planet-scale because older context disappeared.

────────

⚠️ Limits, costs and conditions

POWERS can retain restrictions such as:

• touch requirement
• line of sight
• range
• duration
• cooldown
• recharge
• concentration
• environmental requirement
• transformation requirement
• resource requirement

and costs such as:

• exhaustion
• pain
• injury
• migraines
• bleeding
• overheating
• stamina drain
• lifespan cost
• mana/energy expenditure

Typed constraints make those notes more useful than one undifferentiated bag of strings.

────────

🌀 Access and availability

Having a power and being able to use it right now are different questions.

POWERS can distinguish access such as:

```text
innate / inherited
learned / trained
artifact / device-bound
temporary / borrowed
copied / mimicked
granted / bestowed
stolen / drained
```

and availability such as:

```text
available
dormant
restricted
suppressed
lost
unknown
```

Examples:

• a nullification collar can suppress Teleportation without deleting Teleportation from canon;
• a dormant ability can awaken later without being treated as a brand-new origin;
• a ring that amplifies Flight is not automatically considered the source of Flight;
• copied abilities can remain temporary unless the story establishes permanent ownership.

────────

🎯 Applications and named techniques

POWERS remembers how abilities are actually used.

Applications can include:

• offense
• defense
• mobility
• control
• sensing
• healing
• constructs
• stealth
• utility
• support
• summoning
• transformation
• creation
• destruction
• sealing
• environmental use

The expanded engine also tracks explicitly named techniques.

```text
Rhea uses Glass Manipulation in a technique called "Mirror Lance."
```

Mirror Lance can become part of Rhea’s established repertoire without becoming an unrelated new superpower.

────────

🎛️ Reliability, precision and control

Two characters can possess the same power while using it very differently.

POWERS can now remember explicit evidence that an ability is:

```text
reliable
unreliable / unstable
automatic / reflexive
precise / fine
coarse / imprecise
```

It can also retain explicit control/collateral evidence.

```text
The blast repeatedly damages the surroundings.
```

is different continuity from:

```text
She contains the blast without harming anyone nearby.
```

This gives the AI more useful character-specific power behavior without introducing numerical accuracy stats.

────────

🔋 Resources and recharge

Abilities can depend on resources independently of their origin.

POWERS can track explicit use of:

• mana
• stamina
• energy
• charge
• blood
• life force
• chi / ki / chakra
• fuel
• ammunition
• batteries / power cells
• custom resources

A cost is not automatically an origin.

A character consuming mana to activate a device does not prove the ability itself is magical unless the story establishes that relationship.

────────

✨ Power signatures

Explicit sensory tells can be remembered separately from mechanics.

Examples might include:

• a geometric glow
• a distinctive aura
• a sound
• a smell
• a visible distortion

A blue glow is continuity about presentation. It does not automatically become Light Manipulation or Energy Projection.

────────

🥋 Training, discovery and progression

Training intent and actual progression are deliberately separate.

POWERS can retain:

• training sessions
• practice
• breakthroughs
• improved control
• regression
• mastery evidence
• newly discovered applications
• discovered limits
• discovered weaknesses

```text
Mara plans to master Telekinesis.
```

is not mastery.

```text
After weeks of practice, Mara can now hold dozens of moving objects with fine control.
```

is actual progression evidence.

────────

🔗 Power synergies

Explicit combinations between abilities can be remembered.

```text
Mara combines Telekinesis with Force Fields to trap the drone.
```

can become an established synergy/application.

That does not automatically mean the powers permanently fused into a third ability.

────────

🛡️ Defenses, weaknesses and counters

POWERS keeps these ideas distinct:

• immunity
• resistance
• vulnerability
• weakness
• counter
• suppression
• bypass
• negation

A character controlling fire does not automatically become immune to fire.

One counter succeeding once also does not automatically establish absolute superiority in every future context.

────────

🧬 Forms and transformations

POWERS can track:

• current transformation
• reversion
• form-only powers
• temporary transformed abilities
• form-specific limits

This is useful for magical forms, monsters, powered armor, transformation sequences, shapeshifters and multi-form characters.

────────

🧠 Inner Current

POWERS includes Inner Current, a private character-continuity system designed specifically to work beside power mechanics.

It can retain story-supported:

• goals
• plans
• fears
• beliefs
• secrets
• emotions
• vows and restraints
• self-image
• internal conflict
• confidence
• temptation
• pride
• shame
• resentment
• dependence on powers
• fear of losing control

Inner Current is deliberately not a separate autonomous NPC agent.

It records supported psychological continuity and keeps it epistemically separate from objective mechanics.

────────

🔐 Belief is not fact

```text
Mara believes the relic created her powers.
```

can establish:

```text
Mara believes the relic is her power source.
```

It does not automatically establish:

```text
The relic objectively created Mara's powers.
```

Likewise:

```text
Mara fears she is becoming a monster.
```

is not proof that she literally is becoming one.

Plans are not accomplishments. Fears are not mechanical weaknesses. Secrets are not automatically public knowledge.

────────

❤️‍🔥 Emotion-to-power mechanics

Emotional coincidence is not enough.

```text
Mara is angry while using Telekinesis.
```

is only mood + power use.

```text
Mara's Telekinesis becomes stronger whenever she gets angry.
```

can establish a genuine emotion-to-power rule.

This prevents ordinary character writing from accidentally rewriting power mechanics.

────────

🔄 Characters can change

Inner Current supports revision.

Characters can:

• abandon plans
• change beliefs
• overcome fears
• reveal secrets
• break or replace vows
• resolve conflicts
• change how they feel about their abilities

Old psychology does not have to remain eternally true just because it was once recorded.

────────

🛡️ Player agency protection

With protectPlayerAgency=true, model-generated narration is not allowed to quietly persist private goals, plans, beliefs, secrets or intentions for human-controlled characters.

Player-authored material and deliberate author canon remain eligible.

When AI Dungeon supplies multiplayer character names through script runtime information, those human-controlled named characters receive the same protection.

────────

⏪ Undo, Edit and retry resilience

POWERS uses action-aware provenance when AI Dungeon exposes an action count.

This allows the engine to clean up discarded timeline branches after Undo/Edit rather than leaving behind ghost continuity.

Rollback-aware data includes:

• power evidence
• feats
• availability
• forms
• constraints
• psyche records
• techniques
• resources
• signatures
• training
• reliability/precision
• collateral evidence
• synergies
• generated memory

Author-level Story Card canon is kept separate so Undo does not erase scenario setup.

Repeated processing of the same action is also fingerprinted to avoid duplicate evidence inflation.

────────

🗂️ Story Card integration

Authored Character/NPC/Creature/Powers Canon cards can seed power information.

A compact declaration works well:

```text
Powers: Flight, Telepathy, Super Strength.
```

POWERS can also maintain generated long-term cards under dedicated keys such as:

```text
powers::Mara
```

Inner Current uses separate generated Powers Psyche cards so subjective information is not mixed into hard mechanical canon.

Author-canon reconciliation

Authored Story Card evidence has provenance.

If a card changes from:

```text
Powers: Flight
```

to:

```text
Powers: Telepathy
```

POWERS can retract the old card-derived Flight evidence.

If Flight was independently demonstrated in narration, that separate evidence can survive.

Deleting or retyping a card can likewise retract only the facts that came from that authored source.

Generated cards are disposable caches and are not recursively re-seeded as new canon.

────────

🧠 Bounded live context

POWERS does not dump the entire database into every model call.

It relevance-ranks characters and powers for the current scene and builds a compact ledger.

A ledger may look roughly like:

```text
[POWERS — continuity ledger]

Mara:
- Time Stop [confirmed]
  observed: room / 3 seconds
  costs: severe migraine
  reliability: unstable
  technique: Frozen Heartbeat

Kade:
- Teleportation [confirmed, suppressed]
  reason: nullification collar

INNER CURRENT — Mara:
- fears losing control around civilians
- believes the power is becoming harder to contain
```

When AI Dungeon supplies info.maxChars and info.memoryLength, adaptive context handling uses those values to avoid blindly appending a ledger past the available model-context character ceiling.

────────

⚙️ Configuration

Create a Story Card:

```text
Name: Powers Config
Type: Powers Config
Triggers / Keys: Powers Config
```

Paste:

```text
POWERS_CONFIG_CARD.txt
```

into the Entry field.

Paste:

```text
POWERS_CONFIG_NOTES.txt
```

into the Notes field.

The supplied Entry is intentionally under 2,000 characters. The Notes file explains every option, range and interaction in detail.

See POWERS_CONFIG_CARD_SETUP.md for the exact layout.

────────

🎭 Modes

Narrative

Recommended default.

Strong continuity, minimal visible mechanics, natural storytelling first.

Balanced

Costs, counters, limits, applications and current availability receive more emphasis.

Simulation

Strictest treatment of established rules and restrictions.

POWERS still does not add dice or numerical combat stats by itself.

────────

🌍 Scenario compatibility

POWERS can be used in:

• superhero fiction
• fantasy
• urban fantasy
• sci-fi
• cyberpunk
• supernatural horror
• cultivation
• anime-inspired settings
• magical-girl stories
• mythology
• cosmic fiction
• psychic stories
• mutation stories
• divine/infernal settings
• artifact-heavy worlds
• superpowered schools
• military experiments
• crossover settings
• completely original power systems

The scenario defines what is possible.

POWERS remembers what has actually become true.

────────

🛠️ Installation

AI Dungeon scenarios expose four script areas.

Copy:

```text
1-Library.js → Library
2-Input.js   → Input
3-Context.js → Context
4-Output.js  → Output
```

Save the scripts.

POWERS works with defaults immediately; the Config Story Card is optional.

The three hook files are deliberately small and fail-safe. If POWERS encounters an unexpected exception, they return the original text rather than intentionally breaking the adventure.

────────

💾 Persistent state

POWERS stores its persistent state under:

```js
state.powers
```

It does not take ownership of unrelated memory namespaces.

Older POWERS state shapes are repaired/migrated forward when possible.

────────

🔌 Public API

Other AI Dungeon scripts can use POWERS as a shared source of supernatural continuity.

Check a power

```js
POWERS.api.hasPower("Kade", "Teleportation", "confirmed");
```

Record a power

```js
POWERS.api.recordPower("Kade", "Teleportation", {
  evidence: "Established by character creation.",
  source: "character-system"
});
```

Record a feat

```js
POWERS.api.recordFeat(
  "Kade",
  "Teleportation",
  "Kade teleports across the chamber.",
  "success"
);
```

Add a constraint

```js
POWERS.api.addConstraint(
  "Kade",
  "Teleportation",
  "limit",
  "Cannot teleport through lead shielding."
);
```

Change availability

```js
POWERS.api.setAvailability(
  "Kade",
  "Teleportation",
  "suppressed",
  "Nullification field active."
);
```

Assess current usability

```js
var result = POWERS.api.assessPower("Kade", "Teleportation");
```

This separates “known power” from “usable right now.”

Read Power Genome semantics

```js
POWERS.api.getSemantics("Mara", "Absolute Spatial Negation");
```

Record an application

```js
POWERS.api.recordApplication(
  "Mara",
  "Barrier Manipulation",
  "defense",
  "Mara curves the barrier around the team."
);
```

Record a named technique

```js
POWERS.api.recordTechnique(
  "Mara",
  "Barrier Manipulation",
  "Glass Cathedral",
  "A layered dome technique."
);
```

Set reliability

```js
POWERS.api.setReliability(
  "Mara",
  "Barrier Manipulation",
  "reliable",
  "Repeatedly demonstrated under pressure."
);
```

Set precision

```js
POWERS.api.setPrecision(
  "Mara",
  "Barrier Manipulation",
  "precise/fine",
  "Can form millimeter-thin partitions."
);
```

Add a resource rule

```js
POWERS.api.addResourceRule(
  "Mara",
  "Barrier Manipulation",
  "Consumes stored crystal charge.",
  "resource"
);
```

Set access mode

```js
POWERS.api.setAccessMode(
  "Mara",
  "Barrier Manipulation",
  "learned/trained",
  "Developed through formal training."
);
```

Record an interaction

```js
POWERS.api.recordInteraction(
  "Mara's barrier cancels Kade's shockwave.",
  ["Barrier Manipulation", "Shockwave Generation"]
);
```

Record psyche continuity

```js
POWERS.api.recordPsyche(
  "Mara",
  "fear",
  "Mara fears losing control around civilians."
);
```

Resolve psyche continuity

```js
POWERS.api.resolvePsyche(
  "Mara",
  "fear",
  "Mara no longer fears losing control."
);
```

Safe snapshot

```js
var mara = POWERS.api.snapshot("Mara");
```

The snapshot is deep-copied so another script cannot accidentally mutate POWERS state through the returned object.

Continuity audit

```js
POWERS.api.audit("Mara");
```

Global diagnostics

```js
POWERS.api.diagnostics();
```

This returns high-level counts, stats and potential continuity warnings for development/debugging.

────────

🤝 Combining POWERS with other scripts

POWERS is intentionally useful as a shared continuity authority for:

• relationship engines
• NPC systems
• combat frameworks
• inventories
• transformation systems
• faction systems
• twist engines
• RPG frameworks
• character progression systems

Instead of five scripts separately guessing whether Mara can teleport, they can query the same source of truth.

────────

✅ Validation

The package contains regression suites covering:

• claims vs facts
• attempts vs outcomes
• failed uses
• custom powers
• Power Genome parsing
• unusual suffix powers
• strict mechanic separation
• subject attribution
• reported claims
• hypotheticals and denials
• retry de-duplication
• scale tracking
• typed limits/costs
• forms
• access modes
• dormancy/awakening
• suppression/restoration
• defenses/vulnerabilities
• Story Card seeding
• Story Card edit/delete reconciliation
• psyche canon reconciliation
• Undo/timeline rollback
• multiplayer player-agency protection
• generated-card key collision protection
• adaptive context fitting
• state migration
• techniques
• reliability
• precision
• resources/recharge
• training
• sensory signatures
• control/collateral evidence
• synergies
• diagnostics API

See TEST_REPORT.txt for the current validation summary.

────────

⚡ Why POWERS exists

A good powered story needs more continuity than:

```text
Character X has Ability Y.
```

It needs to know:

How certain are we they have it?

What have they actually demonstrated?

What have they only claimed?

What does using it cost?

How reliable and precise is it?

Which techniques have they developed?

What resource does it consume?

Which form does it require?

Is it currently available?

What counters it?

How has it grown?

How does the character feel about possessing it?

Which of those feelings are beliefs rather than objective facts?

That is the job of POWERS.

> **Your setting decides what is possible.**  
> **Your story decides what is true.**  
> **Your characters decide what it means to them.**  
> **POWERS remembers the difference.**
