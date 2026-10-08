"use client";

import {
  canOfferMarketing,
  digitalConsentAgeByMarket,
  getAge,
  isValidBirth,
  marketCodes,
  MIN_USER_AGE,
  requiresGuardianConsent,
  type AppLocale,
  type MarketCode
} from "@sffl/shared";

import { format } from "../lib/messages";
import { useMessages } from "./messages-provider";
import ui from "./ui.module.css";

export type ProfileState = {
  birthMonth: string;
  birthYear: string;
  market: MarketCode | "";
  guardianEmail: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingOptIn: boolean;
};

export const emptyProfile: ProfileState = {
  birthMonth: "",
  birthYear: "",
  market: "",
  guardianEmail: "",
  acceptTerms: false,
  acceptPrivacy: false,
  marketingOptIn: false
};

export type DerivedProfile = {
  age: number | null;
  underAge: boolean;
  guardianRequired: boolean;
  consentAge: number | null;
  marketingAllowed: boolean;
};

/** Same rules as the backend (shared package), so the form reacts while the user types. */
export function deriveProfile(state: ProfileState, now: Date = new Date()): DerivedProfile {
  const birth = { month: Number(state.birthMonth), year: Number(state.birthYear) };
  const age = state.birthMonth && state.birthYear && isValidBirth(birth, now) ? getAge(birth, now) : null;
  const market = state.market || null;

  return {
    age,
    underAge: age !== null && age < MIN_USER_AGE,
    guardianRequired: age !== null && market !== null && age >= MIN_USER_AGE && requiresGuardianConsent(age, market),
    consentAge: market ? digitalConsentAgeByMarket[market] : null,
    marketingAllowed: age !== null && canOfferMarketing(age)
  };
}

/** Returns an error key from messages.errors, or null when the profile can be submitted. */
export function validateProfile(state: ProfileState, derived: DerivedProfile): string | null {
  if (!state.birthMonth || !state.birthYear || !state.market) return "required";
  if (derived.age === null) return "INVALID_BIRTH_DATE";
  if (derived.underAge) return "UNDER_MIN_AGE";
  if (derived.guardianRequired && !state.guardianEmail.includes("@")) return "GUARDIAN_EMAIL_REQUIRED";
  if (!state.acceptTerms || !state.acceptPrivacy) return "acceptRequired";
  return null;
}

export function toProfilePayload(state: ProfileState, derived: DerivedProfile, locale: AppLocale) {
  return {
    birthMonth: Number(state.birthMonth),
    birthYear: Number(state.birthYear),
    market: state.market as MarketCode,
    locale,
    acceptTerms: true as const,
    acceptPrivacy: true as const,
    marketingOptIn: derived.marketingAllowed && state.marketingOptIn,
    guardianEmail: derived.guardianRequired ? state.guardianEmail.trim() : undefined
  };
}

type ProfileFieldsProps = { value: ProfileState; onChange: (value: ProfileState) => void };

export function ProfileFields({ value, onChange }: ProfileFieldsProps) {
  const { messages } = useMessages();
  const f = messages.form;
  const derived = deriveProfile(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => currentYear - index);

  function set<K extends keyof ProfileState>(key: K, next: ProfileState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <>
      <fieldset className={ui.fieldset}>
        <legend className={ui.label}>{f.birth}</legend>
        <div className={ui.row}>
          <label>
            <span className="visually-hidden">{f.month}</span>
            <select
              className={ui.select}
              value={value.birthMonth}
              onChange={(event) => set("birthMonth", event.target.value)}
              required
            >
              <option value="">{f.month}</option>
              {messages.months.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">{f.year}</span>
            <select
              className={ui.select}
              value={value.birthYear}
              onChange={(event) => set("birthYear", event.target.value)}
              required
            >
              <option value="">{f.year}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {derived.underAge ? <p className={ui.error}>{messages.errors.UNDER_MIN_AGE}</p> : null}

      <label className={ui.field}>
        <span className={ui.label}>{f.market}</span>
        <select
          className={ui.select}
          value={value.market}
          onChange={(event) => set("market", event.target.value as MarketCode | "")}
          required
        >
          <option value="">{f.choose}</option>
          {marketCodes.map((market) => (
            <option key={market} value={market}>
              {messages.markets[market]}
            </option>
          ))}
        </select>
      </label>

      {derived.guardianRequired ? (
        <label className={ui.field}>
          <span className={ui.label}>{f.guardianEmail}</span>
          <input
            className={ui.input}
            type="email"
            autoComplete="off"
            value={value.guardianEmail}
            onChange={(event) => set("guardianEmail", event.target.value)}
            required
          />
          <span className={ui.hint}>{format(f.guardianHint, { age: derived.consentAge ?? "" })}</span>
        </label>
      ) : null}

      <label className={ui.check}>
        <input
          type="checkbox"
          checked={value.acceptTerms}
          onChange={(event) => set("acceptTerms", event.target.checked)}
        />
        <span>{f.acceptTerms}</span>
      </label>
      <label className={ui.check}>
        <input
          type="checkbox"
          checked={value.acceptPrivacy}
          onChange={(event) => set("acceptPrivacy", event.target.checked)}
        />
        <span>{f.acceptPrivacy}</span>
      </label>
      {derived.marketingAllowed ? (
        <label className={ui.check}>
          <input
            type="checkbox"
            checked={value.marketingOptIn}
            onChange={(event) => set("marketingOptIn", event.target.checked)}
          />
          <span>{f.marketing}</span>
        </label>
      ) : null}
      <p className={ui.hint}>{f.legalPending}</p>
    </>
  );
}
