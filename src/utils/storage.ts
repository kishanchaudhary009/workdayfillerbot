import { emptyProfile, type Profile } from '../types/profile';

const PROFILE_STORAGE_KEY = 'workdayProfile';

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export async function saveProfile(profile: Profile): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: profile }, () => resolve());
  });
}

export async function loadProfile(): Promise<Profile> {
  if (!hasChromeStorage()) {
    return emptyProfile;
  }

  return await new Promise<Profile>((resolve) => {
    chrome.storage.local.get(PROFILE_STORAGE_KEY, (items) => {
      const storedProfile = items[PROFILE_STORAGE_KEY];

      if (storedProfile && typeof storedProfile === 'object') {
        resolve({
          ...emptyProfile,
          ...(storedProfile as Partial<Profile>),
        });
        return;
      }

      resolve(emptyProfile);
    });
  });
}
