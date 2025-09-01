// Unified wallet color palette with gradient configurations
export type WalletColorOption = {
  id: string;
  base: string;
  gradient: [string, string, string];
};

// Beautiful gradient color palette for wallets
export const WALLET_COLOR_PALETTE: WalletColorOption[] = [
  {
    id: 'purple',
    base: '#8B5CF6',
    gradient: ['#A78BFA', '#8B5CF6', '#7C3AED'], // Light purple to deep violet
  },
  {
    id: 'pink',
    base: '#EC4899',
    gradient: ['#F9A8D4', '#EC4899', '#DB2777'], // Light pink to deep pink
  },
  {
    id: 'blue',
    base: '#3B82F6',
    gradient: ['#60A5FA', '#3B82F6', '#2563EB'], // Light blue to deep blue
  },
  {
    id: 'emerald',
    base: '#10B981',
    gradient: ['#34D399', '#10B981', '#059669'], // Light emerald to deep green
  },
  {
    id: 'amber',
    base: '#F59E0B',
    gradient: ['#FCD34D', '#F59E0B', '#D97706'], // Light amber to deep orange
  },
  {
    id: 'red',
    base: '#EF4444',
    gradient: ['#FCA5A5', '#EF4444', '#DC2626'], // Light red to deep red
  },
  {
    id: 'indigo',
    base: '#6366F1',
    gradient: ['#818CF8', '#6366F1', '#4F46E5'], // Light indigo to deep indigo
  },
  {
    id: 'teal',
    base: '#14B8A6',
    gradient: ['#5EEAD4', '#14B8A6', '#0D9488'], // Light teal to deep teal
  },
  {
    id: 'orange',
    base: '#F97316',
    gradient: ['#FB923C', '#F97316', '#EA580C'], // Light orange to deep orange
  },
  {
    id: 'cyan',
    base: '#06B6D4',
    gradient: ['#67E8F9', '#06B6D4', '#0891B2'], // Light cyan to deep cyan
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

// Default wallet color
export const DEFAULT_WALLET_COLOR = WALLET_COLOR_PALETTE[0].base;