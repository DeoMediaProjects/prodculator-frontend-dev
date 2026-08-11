/**
 * Filming start, duration and completion are three views of two facts, so the form
 * fills in whichever one the producer has not given.
 *
 * The rule that matters is which field is allowed to be written to. Duration and
 * completion each derive from the other, and the original effect derived both
 * unconditionally. With a start date and a completion date present, deleting the
 * only digit in Filming Duration made the effect immediately re-derive it from the
 * dates, so the digit reappeared and the field could never be cleared or retyped.
 *
 * The fix is one idea: the field the user is currently editing is an input, never an
 * output. `driver` names it. Everything else is unchanged.
 */

export const MS_PER_WEEK = 7 * 86_400_000;

/** The field the user last typed in, or null when neither is mid-edit. */
export type ScheduleDriver = 'duration' | 'completion' | null;

export interface ScheduleInput {
  filmingStart: string;
  filmingDuration: string;
  completionDate: string;
  driver: ScheduleDriver;
  /** The last completion date this function produced, so a value the user has since
   *  overwritten by hand is recognised as theirs and left alone. */
  autoCompletion: string;
  /** As above, for duration. */
  autoDuration: string;
}

export interface ScheduleOutput {
  /** Undefined means "leave this field exactly as it is". */
  completionDate?: string;
  filmingDuration?: string;
  autoCompletion?: string;
  autoDuration?: string;
}

export function deriveSchedule(input: ScheduleInput): ScheduleOutput {
  const { filmingStart, filmingDuration, completionDate, driver } = input;
  if (!filmingStart) return {};

  const start = new Date(filmingStart);
  if (Number.isNaN(start.getTime())) return {};

  // start + duration -> completion.
  // Skipped while completion is being edited, so a date the producer is typing is
  // not overwritten by the duration already sitting in the form.
  const weeks = Number(filmingDuration);
  if (driver !== 'completion' && filmingDuration && Number.isFinite(weeks) && weeks > 0) {
    const completion = new Date(start.getTime() + weeks * MS_PER_WEEK)
      .toISOString()
      .slice(0, 10);
    if (completionDate === '' || completionDate === input.autoCompletion) {
      return {
        ...(completion !== completionDate ? { completionDate: completion } : {}),
        autoCompletion: completion,
      };
    }
  }

  // start + completion -> duration.
  // Skipped while duration is being edited. This is the branch that made the field
  // unclearable: an empty duration looked exactly like a duration waiting to be
  // filled in, and was refilled on the same keystroke that emptied it.
  if (driver !== 'duration' && completionDate) {
    const end = new Date(completionDate);
    if (!Number.isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      const wks = String(Math.round((end.getTime() - start.getTime()) / MS_PER_WEEK));
      if (filmingDuration === '' || filmingDuration === input.autoDuration) {
        return {
          ...(wks !== filmingDuration ? { filmingDuration: wks } : {}),
          autoDuration: wks,
        };
      }
    }
  }

  return {};
}
