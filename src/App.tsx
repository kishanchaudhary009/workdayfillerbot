import { useEffect, useState } from 'react';
import { loadProfile, saveProfile } from './utils/storage';
import { emptyProfile, type Profile } from './types/profile';

export function App() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [status, setStatus] = useState('');

  useEffect(() => {
    void handleLoadProfile();
  }, []);

  function updateField(field: keyof Profile, value: string) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
  }

  async function handleSaveProfile() {
    await saveProfile(profile);
    setStatus('Profile saved locally.');
  }

  async function handleLoadProfile() {
    const savedProfile = await loadProfile();
    setProfile(savedProfile);

    if (savedProfile === emptyProfile) {
      setStatus('No saved profile found yet.');
      return;
    }

    setStatus('Profile loaded from local storage.');
  }

  async function handleFillCurrentPage() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setStatus('This action only works inside the Chrome extension popup.');
      return;
    }

    chrome.runtime.sendMessage({ type: 'WORKDAY_FILL_CURRENT_PAGE' }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('No matching Workday tab is available right now.');
        return;
      }

      if (response?.error) {
        setStatus(String(response.error));
        return;
      }

      const filledCount = Array.isArray(response?.filled) ? response.filled.length : 0;
      const skippedCount = Array.isArray(response?.skipped) ? response.skipped.length : 0;
      setStatus(`Filled ${filledCount} fields and skipped ${skippedCount}.`);
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl shadow-black/30">
        <div className="mb-5 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workday Form Filler</p>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="text-sm text-slate-400">Edit the values you want to reuse on Workday forms.</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={profile.firstName} onChange={(value) => updateField('firstName', value)} />
            <Field label="Last Name" value={profile.lastName} onChange={(value) => updateField('lastName', value)} />
          </div>

          <Field label="Email" value={profile.email} onChange={(value) => updateField('email', value)} />
          <Field label="Phone" value={profile.phone} onChange={(value) => updateField('phone', value)} />
          <Field label="Address" value={profile.address} onChange={(value) => updateField('address', value)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={profile.city} onChange={(value) => updateField('city', value)} />
            <Field label="Postal Code" value={profile.postalCode} onChange={(value) => updateField('postalCode', value)} />
          </div>
          <Field label="Email Address" value={profile.emailAddress} onChange={(value) => updateField('emailAddress', value)} />
          <Field label="Password" value={profile.Password} onChange={(value) => updateField('Password', value)} />
          <Field label="Verify New Password" value={profile.VerifyNewPassword} onChange={(value) => updateField('VerifyNewPassword', value)} />

          <Field label="Country" value={profile.country} onChange={(value) => updateField('country', value)} />
          <Field label="LinkedIn" value={profile.linkedIn} onChange={(value) => updateField('linkedIn', value)} />
          <Field label="GitHub" value={profile.github} onChange={(value) => updateField('github', value)} />
          <Field label="University" value={profile.university} onChange={(value) => updateField('university', value)} />
          <Field label="Degree" value={profile.degree} onChange={(value) => updateField('degree', value)} />

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Education 1</p>
            <Field label="School or University" value={profile.education1School} onChange={(value) => updateField('education1School', value)} />
            <Field label="Overall Result (GPA)" value={profile.education1OverallResult} onChange={(value) => updateField('education1OverallResult', value)} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Education 2</p>
            <Field label="School or University" value={profile.education2School} onChange={(value) => updateField('education2School', value)} />
            <Field label="Overall Result (GPA)" value={profile.education2OverallResult} onChange={(value) => updateField('education2OverallResult', value)} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Websites</p>
            <Field label="Website 1 URL" value={profile.website1Url} onChange={(value) => updateField('website1Url', value)} />
            <Field label="Website 2 URL" value={profile.website2Url} onChange={(value) => updateField('website2Url', value)} />
          </div>

          <Field label="Skills" value={profile.skills} onChange={(value) => updateField('skills', value)} textarea />
          <Field label="Experience" value={profile.experience} onChange={(value) => updateField('experience', value)} textarea />

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Work Experience 1</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Job Title" value={profile.workExperience1JobTitle} onChange={(value) => updateField('workExperience1JobTitle', value)} />
              <Field label="Company" value={profile.workExperience1Company} onChange={(value) => updateField('workExperience1Company', value)} />
            </div>
            <Field label="Location" value={profile.workExperience1Location} onChange={(value) => updateField('workExperience1Location', value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" value={profile.workExperience1From} onChange={(value) => updateField('workExperience1From', value)} />
              <Field label="To" value={profile.workExperience1To} onChange={(value) => updateField('workExperience1To', value)} />
            </div>
            <Field label="Role Description" value={profile.workExperience1RoleDescription} onChange={(value) => updateField('workExperience1RoleDescription', value)} textarea />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Work Experience 2</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Job Title" value={profile.workExperience2JobTitle} onChange={(value) => updateField('workExperience2JobTitle', value)} />
              <Field label="Company" value={profile.workExperience2Company} onChange={(value) => updateField('workExperience2Company', value)} />
            </div>
            <Field label="Location" value={profile.workExperience2Location} onChange={(value) => updateField('workExperience2Location', value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" value={profile.workExperience2From} onChange={(value) => updateField('workExperience2From', value)} />
              <Field label="To" value={profile.workExperience2To} onChange={(value) => updateField('workExperience2To', value)} />
            </div>
            <Field label="Role Description" value={profile.workExperience2RoleDescription} onChange={(value) => updateField('workExperience2RoleDescription', value)} textarea />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
            onClick={() => {
              void handleSaveProfile();
            }}
          >
            Save Profile
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            onClick={() => {
              void handleLoadProfile();
            }}
          >
            Load Profile
          </button>
        </div>

        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          onClick={handleFillCurrentPage}
        >
          Fill Current Page
        </button>

        <p className="mt-4 rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-slate-400">{status}</p>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}

function Field({ label, value, onChange, textarea = false }: FieldProps) {
  const baseClassName =
    'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500';

  return (
    <label className="block text-sm text-slate-200">
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {textarea ? (
        <textarea
          className={`${baseClassName} min-h-20 resize-y`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input className={baseClassName} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
