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
  education1School: ['education 1 school', 'school or university', 'school', 'university', 'institution', 'education 1 school or university'],
  education1OverallResult: ['education 1 overall result', 'overall result', 'gpa', 'education 1 gpa', 'education 1 overall result gpa'],
  education2School: ['education 2 school', 'school or university', 'school', 'university', 'institution', 'education 2 school or university'],
  education2OverallResult: ['education 2 overall result', 'overall result', 'gpa', 'education 2 gpa', 'education 2 overall result gpa'],
  website1Url: ['website 1 url', 'website 1', 'url 1', 'url'],
  website2Url: ['website 2 url', 'website 2', 'url 2', 'url'],
  skills: ['skills', 'technical skills', 'core skills'],
  experience: ['experience', 'work experience', 'professional experience'],
  workExperience1JobTitle: ['work experience 1 job title', 'job title 1', 'position 1'],
  workExperience1Company: ['work experience 1 company', 'company 1', 'employer 1'],
  workExperience1Location: ['work experience 1 location', 'location 1'],
  workExperience1From: ['work experience 1 from', 'from 1'],
  workExperience1To: ['work experience 1 to', 'to 1'],
  workExperience1RoleDescription: ['work experience 1 role description', 'role description 1', 'responsibilities 1', 'description 1'],
  workExperience2JobTitle: ['work experience 2 job title', 'job title 2', 'position 2'],
  workExperience2Company: ['work experience 2 company', 'company 2', 'employer 2'],
  workExperience2Location: ['work experience 2 location', 'location 2'],
  workExperience2From: ['work experience 2 from', 'from 2'],
  workExperience2To: ['work experience 2 to', 'to 2'],
  workExperience2RoleDescription: ['work experience 2 role description', 'role description 2', 'responsibilities 2', 'description 2'],
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
  const controls: ScannedControl[] = [];
  const visitedRoots = new Set<ShadowRoot | Document>();
  const experienceCounters = createExperienceCounters();

  walkForControls(document, controls, visitedRoots, experienceCounters);

  return controls;
}

function walkForControls(
  root: ParentNode | null,
  controls: ScannedControl[],
  visitedRoots: Set<ShadowRoot | Document>,
  experienceCounters: Record<string, number>,
): void {
  if (!root) {
    return;
  }

  if (root instanceof Document || root instanceof ShadowRoot) {
    if (visitedRoots.has(root)) {
      return;
    }

    visitedRoots.add(root);
  }

  const elements = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]), textarea, select',
  );

  elements.forEach((control) => {
    const labelText = getFieldLabelText(control);
    const candidates = [
      labelText,
      control.getAttribute('placeholder') ?? '',
      control.getAttribute('aria-label') ?? '',
      control.getAttribute('name') ?? '',
      control.id,
    ];

    controls.push({
      element: control,
      info: {
        tagName: control.tagName.toLowerCase(),
        type: 'type' in control ? control.type : control.tagName.toLowerCase(),
        name: control.getAttribute('name') ?? '',
        id: control.id,
        placeholder: control.getAttribute('placeholder') ?? '',
        ariaLabel: control.getAttribute('aria-label') ?? '',
        labelText,
        matchedProfileKey: matchProfileField(candidates, getControlContext(control), experienceCounters),
      },
    });
  });

  if (root instanceof Document || root instanceof Element) {
    const allElements = root.querySelectorAll('*');
    allElements.forEach((element) => {
      const shadowRoot = element.shadowRoot;
      if (shadowRoot) {
        walkForControls(shadowRoot, controls, visitedRoots, experienceCounters);
      }
    });
  }
}

function createExperienceCounters() {
  return {
    jobTitle: 0,
    company: 0,
    location: 0,
    from: 0,
    to: 0,
    roleDescription: 0,
  };
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
          city: '',
          postalCode: '',
          country: '',
          linkedIn: '',
          github: '',
          university: '',
          degree: '',
          education1School: '',
          education1OverallResult: '',
          education2School: '',
          education2OverallResult: '',
          website1Url: '',
          website2Url: '',
          skills: '',
          experience: '',
          workExperience1JobTitle: '',
          workExperience1Company: '',
          workExperience1Location: '',
          workExperience1From: '',
          workExperience1To: '',
          workExperience1RoleDescription: '',
          workExperience2JobTitle: '',
          workExperience2Company: '',
          workExperience2Location: '',
          workExperience2From: '',
          workExperience2To: '',
          workExperience2RoleDescription: '',
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
        city: '',
        postalCode: '',
        country: '',
        linkedIn: '',
        github: '',
        university: '',
        degree: '',
        education1School: '',
        education1OverallResult: '',
        education2School: '',
        education2OverallResult: '',
        website1Url: '',
        website2Url: '',
        skills: '',
        experience: '',
        workExperience1JobTitle: '',
        workExperience1Company: '',
        workExperience1Location: '',
        workExperience1From: '',
        workExperience1To: '',
        workExperience1RoleDescription: '',
        workExperience2JobTitle: '',
        workExperience2Company: '',
        workExperience2Location: '',
        workExperience2From: '',
        workExperience2To: '',
        workExperience2RoleDescription: '',
      });
    });
  });
}

function matchProfileField(
  candidates: string[],
  context?: string,
  experienceCounters?: Record<string, number>,
): keyof Profile | null {
  const normalizedCandidates = candidates.map(normalizeText).filter(Boolean);
  const normalizedContext = context ? normalizeText(context) : '';
  const experienceIndex = getExperienceIndexFromContext(normalizedContext);
  const educationIndex = getEducationIndexFromContext(normalizedContext);
  const websiteIndex = getWebsiteIndexFromContext(normalizedContext);

  for (const candidate of normalizedCandidates) {
    const contextualMatch = experienceIndex ? matchExperienceField(candidate, experienceIndex) : null;
    if (contextualMatch) {
      return contextualMatch;
    }

    const educationMatch = educationIndex ? matchEducationField(candidate, educationIndex) : null;
    if (educationMatch) {
      return educationMatch;
    }

    const websiteMatch = websiteIndex ? matchWebsiteField(candidate, websiteIndex) : null;
    if (websiteMatch) {
      return websiteMatch;
    }

    const genericExperienceMatch = matchGenericExperienceField(candidate, experienceCounters);
    if (genericExperienceMatch) {
      return genericExperienceMatch;
    }

    for (const [profileKey, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some((synonym) => matchesText(candidate, normalizeText(synonym)))) {
        return profileKey as keyof Profile;
      }
    }
  }

  return null;
}

function matchGenericExperienceField(candidate: string, experienceCounters?: Record<string, number>): keyof Profile | null {
  if (!experienceCounters) {
    return null;
  }

  const fieldType = getGenericExperienceFieldType(candidate);
  if (!fieldType) {
    return null;
  }

  experienceCounters[fieldType] += 1;
  const experienceIndex = experienceCounters[fieldType] % 2 === 0 ? 2 : 1;

  switch (fieldType) {
    case 'jobTitle':
      return `workExperience${experienceIndex}JobTitle` as keyof Profile;
    case 'company':
      return `workExperience${experienceIndex}Company` as keyof Profile;
    case 'location':
      return `workExperience${experienceIndex}Location` as keyof Profile;
    case 'from':
      return `workExperience${experienceIndex}From` as keyof Profile;
    case 'to':
      return `workExperience${experienceIndex}To` as keyof Profile;
    case 'roleDescription':
      return `workExperience${experienceIndex}RoleDescription` as keyof Profile;
    default:
      return null;
  }
}

function getGenericExperienceFieldType(candidate: string): string | null {
  if (matchesText(candidate, normalizeText('job title')) || matchesText(candidate, normalizeText('position'))) {
    return 'jobTitle';
  }

  if (matchesText(candidate, normalizeText('company')) || matchesText(candidate, normalizeText('employer'))) {
    return 'company';
  }

  if (matchesText(candidate, normalizeText('location'))) {
    return 'location';
  }

  if (matchesText(candidate, normalizeText('from')) || matchesText(candidate, normalizeText('start date'))) {
    return 'from';
  }

  if (matchesText(candidate, normalizeText('to')) || matchesText(candidate, normalizeText('end date'))) {
    return 'to';
  }

  if (matchesText(candidate, normalizeText('role description')) || matchesText(candidate, normalizeText('responsibilities'))) {
    return 'roleDescription';
  }

  return null;
}

function matchExperienceField(candidate: string, experienceIndex: 1 | 2): keyof Profile | null {
  const fieldType = getGenericExperienceFieldType(candidate);
  if (!fieldType) {
    return null;
  }

  switch (fieldType) {
    case 'jobTitle':
      return `workExperience${experienceIndex}JobTitle` as keyof Profile;
    case 'company':
      return `workExperience${experienceIndex}Company` as keyof Profile;
    case 'location':
      return `workExperience${experienceIndex}Location` as keyof Profile;
    case 'from':
      return `workExperience${experienceIndex}From` as keyof Profile;
    case 'to':
      return `workExperience${experienceIndex}To` as keyof Profile;
    case 'roleDescription':
      return `workExperience${experienceIndex}RoleDescription` as keyof Profile;
    default:
      return null;
  }
}

function matchEducationField(candidate: string, educationIndex: 1 | 2): keyof Profile | null {
  const fieldType = getGenericEducationFieldType(candidate);
  if (!fieldType) {
    return null;
  }

  switch (fieldType) {
    case 'school':
      return `education${educationIndex}School` as keyof Profile;
    case 'overallResult':
      return `education${educationIndex}OverallResult` as keyof Profile;
    default:
      return null;
  }
}

function matchWebsiteField(candidate: string, websiteIndex: 1 | 2): keyof Profile | null {
  if (matchesText(candidate, normalizeText('url')) || matchesText(candidate, normalizeText('website url'))) {
    return `website${websiteIndex}Url` as keyof Profile;
  }

  return null;
}

function getGenericEducationFieldType(candidate: string): string | null {
  if (matchesText(candidate, normalizeText('school')) || matchesText(candidate, normalizeText('university')) || matchesText(candidate, normalizeText('institution'))) {
    return 'school';
  }

  if (matchesText(candidate, normalizeText('overall result')) || matchesText(candidate, normalizeText('gpa')) || matchesText(candidate, normalizeText('grade point average'))) {
    return 'overallResult';
  }

  return null;
}

function getExperienceIndexFromContext(context: string): 1 | 2 | null {
  if (/(^| )experience 2($| )|(^| )work experience 2($| )|(^| )second experience($| )/.test(context)) {
    return 2;
  }

  if (/(^| )experience 1($| )|(^| )work experience 1($| )|(^| )first experience($| )/.test(context)) {
    return 1;
  }

  return null;
}

function getEducationIndexFromContext(context: string): 1 | 2 | null {
  if (/(^| )education 2($| )|(^| )second education($| )/.test(context)) {
    return 2;
  }

  if (/(^| )education 1($| )|(^| )first education($| )/.test(context)) {
    return 1;
  }

  return null;
}

function getWebsiteIndexFromContext(context: string): 1 | 2 | null {
  if (/(^| )website 2($| )|(^| )websites 2($| )|(^| )second website($| )/.test(context)) {
    return 2;
  }

  if (/(^| )website 1($| )|(^| )websites 1($| )|(^| )first website($| )/.test(context)) {
    return 1;
  }

  return null;
}

function getControlContext(control: Element): string {
  let current: Element | null = control.parentElement;

  while (current) {
    const text = (current.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) {
      if (/(work )?experience\s*(1|2)|first experience|second experience|education\s*(1|2)|first education|second education|website\s*(1|2)|websites\s*(1|2)|first website|second website/i.test(text)) {
        return text;
      }
    }

    current = current.parentElement;
  }

  return '';
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

    const normalizedValue = normalizeInputValue(control, value);
    if (normalizedValue === null) {
      return false;
    }

    setNativeFieldValue(control, normalizedValue);
    return true;
  }

  setNativeFieldValue(control, value);
  return true;
}

function normalizeInputValue(control: HTMLInputElement, value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (control.type === 'date') {
    return normalizeDateValue(trimmedValue);
  }

  if (control.type === 'month') {
    const monthValue = normalizeMonthValue(trimmedValue);
    return monthValue ?? trimmedValue;
  }

  if (looksLikeDateInput(control, trimmedValue)) {
    const normalizedDate = normalizeDateValue(trimmedValue);
    if (normalizedDate) {
      return normalizedDate;
    }
  }

  return trimmedValue;
}

function looksLikeDateInput(control: HTMLInputElement, value: string): boolean {
  const label = `${control.getAttribute('placeholder') ?? ''} ${control.getAttribute('aria-label') ?? ''} ${control.getAttribute('name') ?? ''} ${control.id}`.toLowerCase();
  const monthYearPattern = /month|year|date|day|mm\s*\/\s*yyyy|yyyy\s*\/\s*mm|dd\s*\/\s*mm/i;

  if (control.type === 'text' && /\d{1,2}[\/-]\d{4}/.test(value)) {
    return true;
  }

  return monthYearPattern.test(label);
}

function normalizeDateValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const monthValue = normalizeMonthValue(value);
  if (monthValue) {
    return `${monthValue}-01`;
  }

  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return value;
}

function normalizeMonthValue(value: string): string | null {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const monthYearMatch = value.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (!monthYearMatch) {
    return null;
  }

  const month = Number.parseInt(monthYearMatch[1], 10);
  const year = Number.parseInt(monthYearMatch[2], 10);

  if (month < 1 || month > 12 || !Number.isInteger(year)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

function setNativeFieldValue(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  const wasReadOnly = control.readOnly;
  const wasDisabled = control.disabled;

  control.readOnly = false;
  control.disabled = false;

  if (control.type === 'date') {
    const parsedDate = parseDateValue(value);
    if (parsedDate) {
      control.valueAsDate = parsedDate;
    }
  }

  if (valueSetter) {
    valueSetter.call(control, value);
  } else {
    control.value = value;
  }

  control.setAttribute('value', value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
  control.dispatchEvent(new Event('focus', { bubbles: true }));
  control.dispatchEvent(new Event('blur', { bubbles: true }));

  control.readOnly = wasReadOnly;
  control.disabled = wasDisabled;
}

function parseDateValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeDateValue(trimmed);
  const maybeDate = new Date(normalized);
  if (Number.isNaN(maybeDate.getTime())) {
    return null;
  }

  return maybeDate;
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
