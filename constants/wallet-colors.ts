// Unified wallet color palette with gradient configurations
export type WalletColorOption = {
  id: string;
  base: string;
  gradient: [string, string, string];
};

// Beautiful gradient color palette for wallets
export const WALLET_COLOR_PALETTE: WalletColorOption[] = [
  {
    id: 'cyan',
    base: '#26F5FE',
    gradient: ['#4DFFFF', '#26F5FE', '#00BCD4'], // Bright cyan to teal
  },
  {
    id: 'teal',
    base: '#00BCD4',
    gradient: ['#26F5FE', '#00BCD4', '#0097A7'], // Cyan to dark teal
  },
  {
    id: 'turquoise',
    base: '#40E0D0',
    gradient: ['#80D8FF', '#40E0D0', '#26A69A'], // Light turquoise to dark
  },
  {
    id: 'emerald',
    base: '#00E676',
    gradient: ['#4DFF88', '#00E676', '#00C853'], // Bright emerald gradient
  },
  {
    id: 'amber',
    base: '#FFB74D',
    gradient: ['#FFD54F', '#FFB74D', '#FF8F00'], // Warm amber gradient
  },
  {
    id: 'coral',
    base: '#FF8A65',
    gradient: ['#FFAB91', '#FF8A65', '#FF7043'], // Coral gradient (matches light theme)
  },
  {
    id: 'pink',
    base: '#FF4081',
    gradient: ['#FF80AB', '#FF4081', '#E91E63'], // Bright pink gradient
  },
  {
    id: 'blue',
    base: '#2196F3',
    gradient: ['#64B5F6', '#2196F3', '#1976D2'], // Classic blue gradient
  },
  {
    id: 'purple',
    base: '#9C27B0',
    gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'], // Purple gradient
  },
  {
    id: 'indigo',
    base: '#3F51B5',
    gradient: ['#7986CB', '#3F51B5', '#303F9F'], // Indigo gradient
  },
];

// Helper function to get gradient colors from base color
export function getWalletGradient(baseColor: string): [string, string, string] {
  const colorOption = WALLET_COLOR_PALETTE.find(c => c.base === baseColor);
  if (colorOption) {
    return colorOption.gradient;
  }
  
  // Fallback gradient generation if color not in palette
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a lighter version
  const lighterR = Math.min(255, r + 40);
  const lighterG = Math.min(255, g + 40);
  const lighterB = Math.min(255, b + 40);
  
  // Create a darker version
  const darkerR = Math.max(0, r - 40);
  const darkerG = Math.max(0, g - 40);
  const darkerB = Math.max(0, b - 40);
  
  return [
    `rgb(${lighterR}, ${lighterG}, ${lighterB})`,
    baseColor,
    `rgb(${darkerR}, ${darkerG}, ${darkerB})`,
  ];
}

// Get just the base colors for simple color pickers
export const WALLET_COLORS = WALLET_COLOR_PALETTE.map(c => c.base);

// Default wallet color - now cyan to match new dark theme
export const DEFAULT_WALLET_COLOR = WALLET_COLOR_PALETTE[0].base; // '#26F5FE'