export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  linkedIn: string;
  github: string;
  university: string;
  degree: string;
  skills: string;
  experience: string;
}

export const emptyProfile: Profile = {
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
};
