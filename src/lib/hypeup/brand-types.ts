import type { TermsInput } from "./lens-rules";

export type BrandAccountSummary = {
  email: string;
  contactName: string;
  company: string;
};

export type BrandInquirySummary = {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  lastBody: string;
  lastAt: string;
};

export type BrandFavorite = {
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
};

export type BrandProposalTemplate = {
  id: string;
  name: string;
  terms: TermsInput;
};

export type BrandContractDetails = {
  kind: "individual" | "company";
  legalName: string;
  birthDate: string;
  registrationNumber: string;
  phone: string;
  address: string;
  signature: string | null;
};

export const MAX_BRAND_SIGNATURE_LENGTH = 256 * 1024;

export const EMPTY_BRAND_CONTRACT: BrandContractDetails = {
  kind: "company",
  legalName: "",
  birthDate: "",
  registrationNumber: "",
  phone: "",
  address: "",
  signature: null,
};
