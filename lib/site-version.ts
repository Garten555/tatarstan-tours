import pkg from "../package.json";

/** Версия приложения: semver из package.json (цифры и точки: MAJOR.MINOR.PATCH). */
export const SITE_VERSION: string = pkg.version;
