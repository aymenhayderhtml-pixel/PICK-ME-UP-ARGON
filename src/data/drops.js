export const DROP_TYPES = {
  HEALTH: {
    id: 'health',
    color: 0x22ee44,
    name: 'Health Potion (+20 HP)',
    effect: (player) => {
      player.hp = Math.min(player.maxHp, player.hp + 20);
    },
  },
  STAMINA: {
    id: 'stamina',
    color: 0x3388ff,
    name: 'Stamina Elixir (+50 Stamina)',
    effect: (player) => {
      player.stamina = Math.min(player.maxStamina, player.stamina + 50);
    },
  },
  GOLD: {
    id: 'gold',
    color: 0xffcc00,
    name: 'Gold (+10 Gold)',
    effect: (player) => {
      player.gold = (player.gold || 0) + 10;
    },
  },
  TICKET: {
    id: 'ticket',
    color: 0xaa33ff,
    name: 'Pick Me Up Ticket (+1 Ticket)',
    effect: (player) => {
      player.tickets = (player.tickets || 0) + 1;
    },
  },
};
