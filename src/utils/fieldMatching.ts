import type { ProfileFieldKey } from '../types/field';

const FIELD_SYNONYMS: Record<ProfileFieldKey, string[]> = {
  firstName: ['first name', 'given name', 'given names'],
  lastName: ['last name', 'surname', 'family name'],
  emailAddress: ['email address', 'secondary email', 'alternate email'],
  email: ['email', 'primary email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'],
  address: ['address', 'street address'],
  city: ['city', 'town', 'municipality'],
  postalCode: ['postal code', 'zip code', 'postcode', 'zip'],
  Password: ['password', 'new password', 'current password'],
  VerifyNewPassword: ['verify new password', 'verify password', 'confirm password', 'confirm new password', 'retype password', 're-enter password', 'reenter password'],
  country: ['country', 'nation'],
  linkedIn: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'],
  github: ['github', 'github url', 'github profile'],
  university: ['university', 'school', 'college', 'institution'],
  degree: ['degree', 'major', 'qualification'],
  education1School: ['education 1 school', 'school or university', 'school', 'university', 'institution'],
  education1OverallResult: ['education 1 overall result', 'overall result', 'gpa', 'education 1 gpa'],
  education2School: ['education 2 school', 'school or university', 'school', 'university', 'institution'],
  education2OverallResult: ['education 2 overall result', 'overall result', 'gpa', 'education 2 gpa'],
  website1Url: ['website 1 url', 'website 1', 'url 1', 'url'],
  website2Url: ['website 2 url', 'website 2', 'url 2', 'url'],
  skills: ['skills', 'technical skills', 'core skills'],
  experience: ['experience', 'work experience', 'professional experience'],
  workExperience1JobTitle: ['work experience 1 job title', 'job title 1', 'position 1'],
  workExperience1Company: ['work experience 1 company', 'company 1', 'employer 1'],
  workExperience1Location: ['work experience 1 location', 'location 1'],
  workExperience1From: ['work experience 1 from', 'from 1'],
  workExperience1To: ['work experience 1 to', 'to 1'],
  workExperience2JobTitle: ['work experience 2 job title', 'job title 2', 'position 2'],
  workExperience2Company: ['work experience 2 company', 'company 2', 'employer 2'],
  workExperience2Location: ['work experience 2 location', 'location 2'],
  workExperience2From: ['work experience 2 from', 'from 2'],
  workExperience2To: ['work experience 2 to', 'to 2'],
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
