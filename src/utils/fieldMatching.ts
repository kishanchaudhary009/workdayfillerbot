import type { ProfileFieldKey } from '../types/field';

const FIELD_SYNONYMS: Record<ProfileFieldKey, string[]> = {
  firstName: ['first name', 'given name', 'given names'],
  lastName: ['last name', 'surname', 'family name'],
  email: ['email', 'email address', 'primary email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'],
  address: ['address', 'street address'],
  linkedIn: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'],
  github: ['github', 'github url', 'github profile'],
  university: ['university', 'school', 'college', 'institution'],
  degree: ['degree', 'major', 'qualification'],
  skills: ['skills', 'technical skills', 'core skills'],
  experience: ['experience', 'work experience', 'professional experience'],
};

export function matchProfileField(candidates: string[]): ProfileFieldKey | null {
  const normalizedCandidates = candidates.map(normalizeText).filter(Boolean);

  for (const candidate of normalizedCandidates) {
    for (const [profileKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some((synonym) => matchesText(candidate, normalizeText(synonym)))) {
        return profileKey as ProfileFieldKey;
      }
    }
  }

  return null;
}

function matchesText(candidate: string, synonym: string): boolean {
  return candidate === synonym || candidate.includes(synonym) || synonym.includes(candidate);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
