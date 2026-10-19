export const ISELLE_LINES = {
  greetings: [
    'Welcome back, Master! Did you bring more gems or just more disappointments?',
    'Oh, you are finally awake! Town 1377 was almost peaceful without you.',
    'Ah, the Master returns. Try not to get everyone slaughtered today, okay?',
    'Niflheimr is still standing, no thanks to your tactical genius!',
    'Look who decided to show up! The heroes were taking bets on your survival.',
    'Back already? Well, the altar is waiting and the void is as empty as ever.',
  ],
  summonGood: [
    'Whoa! A real fighter dropped in! Do not ruin this one, Master!',
    'A gold-plated miracle! Quick, check if they actually have a brain!',
    'Finally, someone who might survive past the second room!',
    'A high-tier summon?! Did the Mobius server glitch or something?',
    'Oho! Look at that shine! Even I have to admit, you got lucky!',
    'An elite hero answered! Treat them gently before they perish like the rest!',
  ],
  summonBad: [
    'Ooh, another 1-star! Let us see how long this one lasts before becoming synthesis fodder.',
    'Ugh, bottom-of-the-barrel material again? My eyes hurt looking at this card.',
    'Congratulations on pulling emergency rations! At least they can hold a rusty stick.',
    'Another disposable recruit! Try to remember their name before they die.',
    'A 1-star? Seriously? Even the dungeon slimes are laughing at us.',
    'Well, someone has to trigger the arrow traps, right?',
  ],
  synthesisStart: [
    'Into the grinder they go! Hope nobody got too attached to their face.',
    'Time to squish someone into pure combat experience! Delicious efficiency.',
    'One hero becomes food, another gets slightly tougher. Classic Mobius economy!',
    'Do not look away, Master! Watching your heroes melt together builds character!',
    'Synthesizing flesh and bone into stat points! My favorite time of day.',
    'Say your goodbyes! In three seconds, you are just a number on a stat sheet.',
  ],
  promotionDone: [
    'Look at those extra stars! Now they can die on an even higher floor!',
    'Promoted! Their stat ceiling just went up, so stop slacking on training!',
    'A shining new rank! They almost look like a proper warrior now.',
    'Star rank elevated! Try not to waste all that investment on a stupid mistake.',
    'Rank up successful! See? Grinding up their companions was totally worth it!',
    'A higher star! Their death toll expectation has officially decreased by 2%!',
  ],
  floorClear: [
    'Floor cleared without a total squad wipe? Color me genuinely amazed!',
    'You actually survived! Collect the loot before the monsters regenerate!',
    'Not bad, Master! You only made about four terrible decisions that run!',
    'Stage complete! Don’t get cocky though, the next floor has way sharper claws.',
    'You made it through! Is it too early to celebrate with a gem sacrifice?',
    'A victory! Pack up the spoils before the dungeon collapses on your head.',
  ],
  heroDied: [
    'Oops! Another one bites the dust. Remember: permadeath means gone forever!',
    'Aaaand flatlined! Should I clear their bunk in the dormitory right now?',
    'They did not survive the hit. At least their sacrifice bought you five seconds!',
    'Dead as a doorknob! I warned you about their terrible defense stats!',
    'Down goes another hero! Do not cry, Master, that is what the gacha altar is for!',
    'Erased from the roster! Their data has been recycled into the Mobius ether.',
  ],
  mandatoryQuest: [
    'Attention Master! The Mobius system dropped a mandatory quest. Fail and we get purged!',
    'Red alert! A forced mission appeared on the board. Move your legs, Master!',
    'System decree incoming! No dodging this one unless you want Town 1377 deleted.',
    'New mandatory assignment! If we don’t clear it in time, we all turn to dust.',
    'Look alive! The administrators are watching and they demanded immediate results.',
    'A mandatory mission has arrived! Pick your best squad and pray to the RNG gods.',
  ],
  idleTeasing: [
    'Still standing there doing nothing? The tower will not climb itself, Master!',
    'If you stare into the void long enough, it just looks like your win rate.',
    'Need me to explain how walking works, or are you just admiring my wings?',
    'Bored, bored, bored! Go summon someone or send someone to die in the tower!',
    'If I had legs, I would have cleared Floor 10 by now.',
    'Master, are you planning a master strategy or did your brain just freeze?',
  ],
  punish: [
    'Rules are rules, dear hero.',
    'Disobedience to the Master is forbidden by divine law.',
    'Refusing orders? In Mobius, defiance carries only one penalty.',
    'Return to the goddess. Perhaps in your next summoning you will learn to obey.',
    'A soldier who will not fight has no place in Town 1377.',
    'Erased for insubordination. The Master’s word is absolute.',
  ],
};

export function pickLine(category) {
  const lines = ISELLE_LINES[category] || ISELLE_LINES.idleTeasing;
  return lines[Math.floor(Math.random() * lines.length)];
}
