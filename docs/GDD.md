# Game Design Document: Pick Me Up

Pick Me Up is a 3D browser game from the manhua Pick Me Up: Infinite Gacha. Two modes. HUB (Niflheimr): the player is the Master. Floating stone plaza in a black void with a Summoning Altar, Training Grounds, Synthesis Room, Blacksmith, Dormitory, Tower Gate, and the fairy Iselle. The Master summons heroes (gacha), trains them, forges, selects a party of up to 5, and enters the Tower. TOWER: the player controls Han in third person and gives squad commands to 4 AI heroes. Permadeath: a hero whose HP reaches 0 is deleted from the save. Win: clear 100 floors. First version: 1 hub, 1 forest floor set with a Hobgoblin boss on floor 5.

## Rules & Formulas (src/data/rules.js)
- **Star Caps**: Max Star = 7 (Natural Max = 6). Level cap per star = `Star * 10`.
- **Party Size**: Up to 5 heroes per raid squad.
- **Hero Stats**: `str` (Physical Damage), `agi` (Speed & Critical), `vit` (Health & Armor), `int` (Spell Potency), `wil` (Status & Panic Resist).
- **Experience Curves**:
  - Hero Level XP needed = `Math.round(20 * level^1.5)`.
  - Skill Level XP needed = `100 * skillLevel`.
- **Facility Rates**:
  - Training Grounds: Gives 8 skill XP every 5s per hero at facility level 1.
  - Synthesis XP: Material hero yields `15 * star * level`. Skill inherit chance = `min(60%, 10% * materialStar)`.
  - Promotion: Costs `50 * star^2` gems (1★->2★ = 50, 2★->3★ = 200, 3★->4★ = 450, 4★->5★ = 800...).
- **Rarity Palette**:
  - 1★: Gray (`#9a9a9a`)
  - 2★: Bronze (`#cd7f32`)
  - 3★: Blue (`#3a7bff`)
  - 4★: Purple (`#a84bff`)
  - 5★: Gold (`#ffc83a`)
  - 6★: Crimson (`#dc143c`)
  - 7★: Rainbow (Chromatic pulsing white)
