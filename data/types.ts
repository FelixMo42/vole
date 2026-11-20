/** Shared shape of the generated JSON databases. Missing source fields are null. */
export interface Office {
  kind: 'capitol' | 'district';
  address: string | null;
  room: string | null;
  phone: string | null;
}

export interface SeatRecord {
  district: number;
  seatId: string;
  profileUrl: string;
  contactUrl: string | null;
  counties: string[] | null;
  offices: Office[];
  sourceUrls: string[];
  verifiedAt: string;
  /** Next regular election for this seat; does not establish candidacy. */
  nextElectionYear: number;
}

export interface Legislator extends SeatRecord {
  id: string;
  name: string;
  sourceName: string;
  party: 'Democratic' | 'Republican' | 'Independent';
  portraitUrl: string | null;
}

export interface Vacancy extends SeatRecord {
  status: 'vacant';
}

export interface LegislatorDataset {
  schemaVersion: 2;
  jurisdiction: 'US-CA';
  chamber: 'senate' | 'assembly';
  title: string;
  seatCount: number;
  memberCount: number;
  vacancyCount: number;
  retrievedAt: string;
  source: { url: string; sha256: string };
  electionSchedule: {
    asOf: string;
    kind: 'next-regular-seat-election';
    sourceUrls: string[];
  };
  members: Legislator[];
  vacancies: Vacancy[];
}
