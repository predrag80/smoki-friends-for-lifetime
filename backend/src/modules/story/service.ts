import {
  defaultLocale,
  generationsLeft,
  type AppLocale,
  type LifePeriod,
  type MomentDto,
  type Territory
} from "@sffl/shared";

/** Absolute URL of a stored file; served only to its owner by GET /media/:id. */
export function mediaUrl(apiUrl: string, assetId: string): string {
  return `${apiUrl.replace(/\/$/, "")}/media/${assetId}`;
}

export type MomentRow = {
  id: string;
  period: LifePeriod;
  targetAge: number;
  status: MomentDto["status"];
  photoAssetId: string | null;
  createdAt: Date;
  scene: { id: string; territory: Territory; translations: { locale: AppLocale; title: string }[] };
  latestJob: { status: string; errorCode: string | null } | null;
  recentJobs: number;
};

const periodOrder: Record<LifePeriod, number> = { YESTERDAY: 0, TODAY: 1, SOMEDAY: 2 };

export function toMomentDto(row: MomentRow, options: { apiUrl: string; locale: AppLocale; dailyLimit: number }): MomentDto {
  const title =
    row.scene.translations.find((translation) => translation.locale === options.locale)?.title ??
    row.scene.translations.find((translation) => translation.locale === defaultLocale)?.title ??
    row.scene.id;
  const pending = row.latestJob?.status === "QUEUED" || row.latestJob?.status === "IN_PROGRESS";

  return {
    id: row.id,
    period: row.period,
    targetAge: row.targetAge,
    scene: { id: row.scene.id, title, territory: row.scene.territory },
    status: row.status,
    pending,
    photoUrl: row.photoAssetId ? mediaUrl(options.apiUrl, row.photoAssetId) : null,
    error: !pending && row.status === "FAILED" ? "GENERATION_FAILED" : null,
    generationsLeft: generationsLeft(row.recentJobs, options.dailyLimit),
    createdAt: row.createdAt.toISOString()
  };
}

export function sortMoments<T extends { period: LifePeriod }>(moments: T[]): T[] {
  return [...moments].sort((a, b) => periodOrder[a.period] - periodOrder[b.period]);
}
