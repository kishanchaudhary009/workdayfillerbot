import type { ScannedField } from '../types/field';
import type { Profile } from '../types/profile';

interface ScanPageResponse {
  fields: ScannedField[];
}

interface FillPageResponse {
  fields: ScannedField[];
  filled: string[];
  skipped: string[];
}

interface ScannedControl {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  info: ScannedField;
}

const PROFILE_STORAGE_KEY = 'workdayProfile';

const FIELD_SYNONYMS: Record<keyof Profile, string[]> = {
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'WORKDAY_SCAN_PAGE') {
    if (message?.type !== 'WORKDAY_FILL_CURRENT_PAGE') {
      return false;
    }

    void handleFillCurrentPage().then((response) => sendResponse(response));
    return true;
  }

  const fields = scanPageFields();
  logFieldReport(fields);

  const response: ScanPageResponse = { fields };
  sendResponse(response);
  return false;
});

function scanPageFields(): ScannedField[] {
  return scanPageControls().map(({ info }) => info);
}

async function handleFillCurrentPage(): Promise<FillPageResponse> {
  const profile = await loadProfileFromStorage();
  const controls = scanPageControls();
  const filledFields: string[] = [];
  const skippedFields: string[] = [];

  for (const control of controls) {
    const profileKey = control.info.matchedProfileKey;
    const label = control.info.labelText || control.info.name || control.info.id || control.info.tagName;

    if (!profileKey) {
      skippedFields.push(label);
      continue;
    }

    const value = profile[profileKey];
    if (!value) {
      skippedFields.push(label);
      continue;
    }

    if (!fillControl(control.element, value)) {
      skippedFields.push(label);
      continue;
    }

    filledFields.push(label);
  }

  logFillReport(filledFields, skippedFields);

  return {
    fields: controls.map(({ info }) => info),
    filled: filledFields,
    skipped: skippedFields,
  };
}

function scanPageControls(): ScannedControl[] {
  const controls = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]), textarea, select',
  );

  return Array.from(controls).map((control) => {
    const labelText = getFieldLabelText(control);
    const candidates = [
      labelText,
      control.getAttribute('placeholder') ?? '',
      control.getAttribute('aria-label') ?? '',
      control.getAttribute('name') ?? '',
      control.id,
    ];

    return {
      element: control,
      info: {
        tagName: control.tagName.toLowerCase(),
        type: 'type' in control ? control.type : control.tagName.toLowerCase(),
        name: control.getAttribute('name') ?? '',
        id: control.id,
        placeholder: control.getAttribute('placeholder') ?? '',
        ariaLabel: control.getAttribute('aria-label') ?? '',
        labelText,
        matchedProfileKey: matchProfileField(candidates),
      },
    };
  });
}

function loadProfileFromStorage(): Promise<Profile> {
  return new Promise((resolve) => {
    chrome.storage.local.get(PROFILE_STORAGE_KEY, (items) => {
      const storedProfile = items[PROFILE_STORAGE_KEY];

      if (storedProfile && typeof storedProfile === 'object') {
        resolve({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          linkedIn: '',
          github: '',
          university: '',
          degree: '',
          skills: '',
          experience: '',
          ...(storedProfile as Partial<Profile>),
        });
        return;
      }

      resolve({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        linkedIn: '',
        github: '',
        university: '',
        degree: '',
        skills: '',
        experience: '',
      });
    });
  });
}

function matchProfileField(candidates: string[]): keyof Profile | null {
  const normalizedCandidates = candidates.map(normalizeText).filter(Boolean);

  for (const candidate of normalizedCandidates) {
    for (const [profileKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some((synonym) => matchesText(candidate, normalizeText(synonym)))) {
        return profileKey as keyof Profile;
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

function fillControl(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): boolean {
  if (control instanceof HTMLSelectElement) {
    if (!Array.from(control.options).some((option) => option.value === value || option.text.trim() === value.trim())) {
      return false;
    }

    control.value = value;
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  if (control instanceof HTMLInputElement) {
    const blockedTypes = ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'hidden'];
    if (blockedTypes.includes(control.type)) {
      return false;
    }
  }

  setNativeFieldValue(control, value);
  return true;
}

function setNativeFieldValue(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (valueSetter) {
    valueSetter.call(control, value);
  } else {
    control.value = value;
  }

  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function getFieldLabelText(control: Element): string {
  const labelFromElement = control.getAttribute('aria-label') ?? '';
  if (labelFromElement) {
    return labelFromElement.trim();
  }

  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
    if (control.labels && control.labels.length > 0) {
      const label = control.labels[0]?.textContent?.trim();
      if (label) {
        return label;
      }
    }

    const placeholder = control.getAttribute('placeholder') ?? '';
    if (placeholder) {
      return placeholder.trim();
    }

    const name = control.getAttribute('name') ?? '';
    if (name) {
      return name.trim();
    }

    if (control.id) {
      const matchingLabel = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
      const text = matchingLabel?.textContent?.trim();
      if (text) {
        return text;
      }
    }
  }

  return '';
}

function logFieldReport(fields: ScannedField[]) {
  console.group('Workday Form Filler: scanned fields');
  const matchedFields = fields.filter((field) => field.matchedProfileKey);
  const unmatchedFields = fields.filter((field) => !field.matchedProfileKey);

  console.log('Matched fields:');
  matchedFields.forEach((field) => {
    console.log(`✓ ${field.labelText || field.name || field.id || field.tagName} -> ${field.matchedProfileKey}`);
  });

  console.log('Skipped fields:');
  unmatchedFields.forEach((field) => {
    console.log(`• ${field.labelText || field.name || field.id || field.tagName}`);
  });
  console.groupEnd();
}

function logFillReport(filledFields: string[], skippedFields: string[]) {
  console.group('Workday Form Filler: fill report');
  console.log('Filled:');
  filledFields.forEach((field) => console.log(`✓ ${field}`));
  console.log('Skipped:');
  skippedFields.forEach((field) => console.log(`• ${field}`));
  console.groupEnd();
}
