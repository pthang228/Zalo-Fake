// Bo cam xuc dung duoc (ten zca-js + emoji hien thi)
export const REACTION_OPTIONS: { name: string; emoji: string }[] = [
  { name: 'HEART', emoji: '❤️' },
  { name: 'LIKE', emoji: '👍' },
  { name: 'HAHA', emoji: '😆' },
  { name: 'WOW', emoji: '😮' },
  { name: 'CRY', emoji: '😢' },
  { name: 'ANGRY', emoji: '😡' },
];

// Map gia tri zca-js (rIcon) -> emoji, de hien reaction da luu/nhan duoc
const VALUE_EMOJI: Record<string, string> = {
  '/-heart': '❤️', '/-strong': '👍', ':>': '😆', ':o': '😮', ':-((': '😢', ':-h': '😡',
  ':-*': '😘', ';xx': '😍', ":')": '😂', '/-rose': '🌹', '/-ok': '👌',
};

export function reactionEmoji(value: string): string {
  return VALUE_EMOJI[value] || '👍';
}
