/*
 * Open business decisions of the next-gen calculator (spec
 * 02_FDM-BUSINESS/Marketing/2026-09-30_nextgen-kalkulator-spec.md,
 * "Owner-Entscheidungen"). Each is one explicit constant with the
 * conservative default until the owner decides; nothing else in the code
 * guesses these values.
 */

export const OWNER_DECISIONS = {
  /**
   * Show material and machine time as separate lines (the machine rate can
   * then be derived from hours and euros). Default: no - both are shown as
   * one "Fertigung" line; hours are still shown, the euro split is not.
   */
  showMachineRate: false,
  /**
   * Filament colours offered in the viewer. The pricing config has no colour
   * list, so the viewer shows the natural tone per material family only and
   * says so. Replace with the colours actually stocked, per family.
   */
  filamentColours: null as null | Readonly<Record<string, readonly { name: string; hex: string }[]>>,
  /**
   * Latest time on a workday (Europe/Berlin) at which an approved offer still
   * counts for that day. Spec proposal 12:00.
   */
  approvalCutoffHour: 12,
  /**
   * Narrow the upper range factor once the printability check knows support
   * volume and pose (spec 4.2). Default: off - the range factors in
   * PRICING_CONFIG stay as they are; needs owner approval and a sync with the
   * druckwerk SSoT before it changes a price.
   */
  narrowRangeWithPrintCheck: false,
  /** Post-processing is not priced in the model; the page says "auf Anfrage". */
  postProcessingPriced: false,
  /**
   * Show the owner's name and photo ("Geprüft von S. Windt"). Default: no name
   * and no photo; the copy uses first person without naming anyone.
   */
  showReviewerName: false,
} as const;
