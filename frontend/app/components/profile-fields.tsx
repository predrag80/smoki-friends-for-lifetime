"use client";

import { marketCodes, type MarketCode } from "@sffl/shared";

import { errorMessage, format } from "../lib/messages";
import { deriveProfile, type ProfileErrors, type ProfileState } from "../lib/profile";
import { useMessages } from "./messages-provider";
import { TextField } from "./text-field";
import ui from "./ui.module.css";

export {
  deriveProfile,
  emptyProfile,
  profileFieldByServerError,
  toProfilePayload,
  validateProfile,
  type ProfileErrors,
  type ProfileState
} from "../lib/profile";

type ProfileFieldsProps = {
  value: ProfileState;
  onChange: (value: ProfileState) => void;
  errors?: ProfileErrors;
};

export function ProfileFields({ value, onChange, errors = {} }: ProfileFieldsProps) {
  const { messages } = useMessages();
  const f = messages.form;
  const derived = deriveProfile(value);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, index) => currentYear - index);

  function set<K extends keyof ProfileState>(key: K, next: ProfileState[K]) {
    onChange({ ...value, [key]: next });
  }

  const birthError = errors.birth ?? (derived.underAge ? "UNDER_MIN_AGE" : undefined);

  return (
    <>
      <fieldset className={ui.fieldset} aria-describedby={birthError ? "birth-error" : undefined}>
        <legend className={ui.label}>{f.birth}</legend>
        <div className={ui.row}>
          <label>
            <span className="visually-hidden">{f.month}</span>
            <select
              className={ui.select}
              value={value.birthMonth}
              aria-invalid={birthError ? true : undefined}
              onChange={(event) => set("birthMonth", event.target.value)}
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
              aria-invalid={birthError ? true : undefined}
              onChange={(event) => set("birthYear", event.target.value)}
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
        {birthError ? (
          <p id="birth-error" className={ui.fieldError}>
            {errorMessage(messages, birthError)}
          </p>
        ) : null}
      </fieldset>

      <label className={ui.field}>
        <span className={ui.label}>{f.market}</span>
        <select
          className={ui.select}
          value={value.market}
          aria-invalid={errors.market ? true : undefined}
          aria-describedby={errors.market ? "market-error" : undefined}
          onChange={(event) => set("market", event.target.value as MarketCode | "")}
        >
          <option value="">{f.choose}</option>
          {marketCodes.map((market) => (
            <option key={market} value={market}>
              {messages.markets[market]}
            </option>
          ))}
        </select>
        {errors.market ? (
          <span id="market-error" className={ui.fieldError}>
            {errorMessage(messages, errors.market)}
          </span>
        ) : null}
      </label>

      {derived.guardianRequired ? (
        <TextField
          label={f.guardianEmail}
          type="email"
          autoComplete="off"
          maxLength={254}
          value={value.guardianEmail}
          onChange={(next) => set("guardianEmail", next)}
          hint={format(f.guardianHint, { age: derived.consentAge ?? "" })}
          error={errors.guardianEmail}
        />
      ) : null}

      <div className={ui.stack}>
        <label className={ui.check}>
          <input
            type="checkbox"
            checked={value.acceptTerms}
            aria-invalid={errors.accept && !value.acceptTerms ? true : undefined}
            onChange={(event) => set("acceptTerms", event.target.checked)}
          />
          <span>{f.acceptTerms}</span>
        </label>
        <label className={ui.check}>
          <input
            type="checkbox"
            checked={value.acceptPrivacy}
            aria-invalid={errors.accept && !value.acceptPrivacy ? true : undefined}
            onChange={(event) => set("acceptPrivacy", event.target.checked)}
          />
          <span>{f.acceptPrivacy}</span>
        </label>
        {errors.accept ? <p className={ui.fieldError}>{errorMessage(messages, errors.accept)}</p> : null}
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
      </div>
      <p className={ui.hint}>{f.legalPending}</p>
    </>
  );
}
