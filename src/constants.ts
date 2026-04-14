export const DASH_PATTERN = /[\u2013\u2014]/;

export const DEFAULT_CORRECTION_PROMPT =
  "Your previous response contained em-dashes (\u2014) or en-dashes (\u2013). " +
  "Rewrite it completely without any em-dashes or en-dashes. " +
  "Restructure the sentences -- do not just swap in hyphens.";
