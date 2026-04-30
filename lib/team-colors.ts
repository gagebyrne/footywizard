/**
 * Premier League primary team colours, keyed by FPL `short_name`.
 * Used to tint player portraits so each chip carries its team's identity.
 */
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ARS: { primary: '#EF0107', secondary: '#FFFFFF' },
  AVL: { primary: '#670E36', secondary: '#95BFE5' },
  BOU: { primary: '#DA291C', secondary: '#000000' },
  BRE: { primary: '#E30613', secondary: '#FBB800' },
  BHA: { primary: '#0057B8', secondary: '#FFCD00' },
  BUR: { primary: '#6C1D45', secondary: '#99D6EA' },
  CHE: { primary: '#034694', secondary: '#FFFFFF' },
  CRY: { primary: '#1B458F', secondary: '#C4122E' },
  EVE: { primary: '#003399', secondary: '#FFFFFF' },
  FUL: { primary: '#000000', secondary: '#CC0000' },
  IPS: { primary: '#3764A4', secondary: '#FFFFFF' },
  LEE: { primary: '#FFCD00', secondary: '#1D428A' },
  LEI: { primary: '#003090', secondary: '#FDBE11' },
  LIV: { primary: '#C8102E', secondary: '#00B2A9' },
  LUT: { primary: '#F78F1E', secondary: '#1C2C5B' },
  MCI: { primary: '#6CABDD', secondary: '#1C2C5B' },
  MUN: { primary: '#DA291C', secondary: '#FBE122' },
  NEW: { primary: '#241F20', secondary: '#FFFFFF' },
  NFO: { primary: '#DD0000', secondary: '#FFFFFF' },
  SHU: { primary: '#EE2737', secondary: '#000000' },
  SOU: { primary: '#D71920', secondary: '#130C0E' },
  SUN: { primary: '#EB172B', secondary: '#211E1F' },
  TOT: { primary: '#132257', secondary: '#FFFFFF' },
  WHU: { primary: '#7A263A', secondary: '#1BB1E7' },
  WOL: { primary: '#FDB913', secondary: '#231F20' },
};

export function teamColor(shortName: string | null | undefined): { primary: string; secondary: string } | null {
  if (!shortName) return null;
  return TEAM_COLORS[shortName] ?? null;
}
