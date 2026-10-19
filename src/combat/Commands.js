export const COMMANDS = {
  FOLLOW: {
    id: 'FOLLOW',
    label: 'Follow',
    icon: '🏃',
    shout: 'Form up!',
    description: 'Keep squad formation and follow Han.',
    key: '1',
  },
  HOLD: {
    id: 'HOLD',
    label: 'Hold Position',
    icon: '🛡️',
    shout: 'Hold the line!',
    description: 'Hold current spot and engage enemies within 6m.',
    key: '2',
  },
  ATTACK_TARGET: {
    id: 'ATTACK_TARGET',
    label: 'Attack Target',
    icon: '🎯',
    shout: 'Focus that one!',
    description: 'Allies focus on the chosen target.',
    key: '3',
  },
  FALL_BACK: {
    id: 'FALL_BACK',
    label: 'Fall Back',
    icon: '🔙',
    shout: 'Fall back!',
    description: 'Retreat behind Han. Ranged continue shooting.',
    key: '4',
  },
  FOCUS_BOSS: {
    id: 'FOCUS_BOSS',
    label: 'Focus Boss',
    icon: '👑',
    shout: 'Take down the leader!',
    description: 'Prioritize the strongest enemy or boss.',
    key: '5',
  },
  LOOSE_ARROWS: {
    id: 'LOOSE_ARROWS',
    label: 'Loose Arrows',
    icon: '🏹',
    shout: 'Loose arrows!',
    description: 'Ranged fire at will; frontliners hold.',
    key: '6',
  },
};

export const COMMAND_LIST = [
  COMMANDS.FOLLOW,
  COMMANDS.HOLD,
  COMMANDS.ATTACK_TARGET,
  COMMANDS.FALL_BACK,
  COMMANDS.FOCUS_BOSS,
  COMMANDS.LOOSE_ARROWS,
];

export function getCommandByKey(key) {
  const map = {
    Digit1: COMMANDS.FOLLOW,
    Digit2: COMMANDS.HOLD,
    Digit3: COMMANDS.ATTACK_TARGET,
    Digit4: COMMANDS.FALL_BACK,
    Digit5: COMMANDS.FOCUS_BOSS,
    Digit6: COMMANDS.LOOSE_ARROWS,
    Numpad1: COMMANDS.FOLLOW,
    Numpad2: COMMANDS.HOLD,
    Numpad3: COMMANDS.ATTACK_TARGET,
    Numpad4: COMMANDS.FALL_BACK,
    Numpad5: COMMANDS.FOCUS_BOSS,
    Numpad6: COMMANDS.LOOSE_ARROWS,
  };
  return map[key] || null;
}
