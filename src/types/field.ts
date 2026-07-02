import type { Profile } from './profile';

export type ProfileFieldKey = keyof Profile;

export interface ScannedField {
  tagName: string;
  type: string;
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  labelText: string;
  matchedProfileKey: ProfileFieldKey | null;
}
