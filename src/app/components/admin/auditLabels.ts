/**
 * Shared wording for audit entries.
 *
 * The dashboard and the audit reader both render the same rows, and each had its
 * own copy of the action formatter. The dashboard's copy never received the
 * resource-label mapping, so it still printed internal slugs ("Generate b2b")
 * next to a reader that had been fixed. One definition removes the possibility.
 */

/** Internal resource slugs, as an admin would name them. The keys are the values
 *  the API records, so they stay usable as filter keys; only the display changes.
 *  "b2b" in particular is an internal prefix that should never reach a reader. */
const RESOURCE_LABELS: Record<string, string> = {
  b2b: 'Business Intelligence',
  b2b_subscription: 'Business Intelligence subscription',
  b2b_invite: 'Business Intelligence invite',
  b2b_request: 'Business Intelligence package',
  auth: 'Admin sign-in',
  admin_user: 'Admin user',
  email_gating: 'Email gating',
  pdf_report: 'Customer report',
  data_source: 'Data source',
  territory_profile: 'Territory profile',
  comparable: 'Comparable production',
  incentive: 'Incentive programme',
  grant: 'Grant',
  festival: 'Festival',
};

export function resourceLabel(resourceType: string): string {
  const mapped = RESOURCE_LABELS[resourceType];
  if (mapped) return mapped;
  const spaced = resourceType.replace(/_/g, ' ');
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

/** Turn `update.incentive` into `Update incentive programme` for display, leaving
 *  the raw value intact as the filter key. */
export function humaniseAction(action: string): string {
  const [verb, ...rest] = action.split('.');
  const resourceKey = rest.join('.');
  const readableVerb = verb.replace(/[-_]/g, ' ');
  const verbCased = `${readableVerb.charAt(0).toUpperCase()}${readableVerb.slice(1)}`;
  if (!resourceKey) return verbCased;
  // Lowercased because it follows a verb: "Generate Business Intelligence" reads
  // correctly, "Update Incentive programme" does not.
  const label = resourceLabel(resourceKey);
  const tail = RESOURCE_LABELS[resourceKey] ? label : label.toLowerCase();
  return `${verbCased} ${tail}`;
}

/** What actually happened, in words. Returns the raw code separately so it can
 *  sit in a tooltip rather than in the column an admin reads. */
export function describeOutcome(
  statusCode: number | null,
  succeeded: boolean | null,
): { label: string; detail: string } {
  if (succeeded === null) {
    return {
      label: 'No response recorded',
      detail: 'The request was logged but no response was captured, usually because the server restarted mid-request.',
    };
  }
  if (succeeded) {
    return {
      label: 'Success',
      detail: statusCode ? `The change was applied. HTTP ${statusCode}.` : 'The change was applied.',
    };
  }
  const byCode: Record<number, { label: string; detail: string }> = {
    400: { label: 'Rejected', detail: 'The submitted data was not valid, so nothing changed.' },
    401: { label: 'Not signed in', detail: 'The session had expired, so nothing changed.' },
    403: { label: 'Denied', detail: 'This admin does not hold the permission for that action, so nothing changed.' },
    404: { label: 'Not found', detail: 'The record no longer exists, so nothing changed.' },
    409: { label: 'Conflict', detail: 'The record already exists or was changed by someone else, so nothing changed.' },
    422: { label: 'Rejected', detail: 'A required field was missing or malformed, so nothing changed.' },
    429: { label: 'Rate limited', detail: 'Too many attempts in a short window, so the request was blocked.' },
  };
  const known = statusCode != null ? byCode[statusCode] : undefined;
  if (known) return { label: known.label, detail: `${known.detail} HTTP ${statusCode}.` };
  if (statusCode != null && statusCode >= 500) {
    return {
      label: 'Server error',
      detail: `The platform failed to complete the action, so it may not have applied. HTTP ${statusCode}.`,
    };
  }
  return {
    label: 'Failed',
    detail: statusCode ? `The action did not complete. HTTP ${statusCode}.` : 'The action did not complete.',
  };
}
