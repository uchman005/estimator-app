// A facility's type — what kind of building/asset it is. Two kinds:
// - A building (Alpha Clinic, Remote Clinic, Residential Apartment, ICT
//   Hub, ...) — one per seeded building template (see db/schema.ts's
//   buildingTemplates), always chosen by name from that live list, never
//   hardcoded here. Anything that's actually a structure gets priced this
//   way — modeled square-meter billing, not a hand-typed number — so
//   picking one at facility creation generates its BOQ immediately, see
//   insertBuildingFromTemplate() in lib/data.ts.
// - A flat, non-building asset (Ambulance — a vehicle, not a structure) or
//   free text for anything else that genuinely isn't priced per m² — just
//   a label, priced by hand.
export const FLAT_FACILITY_TYPE_PRESETS = ["Ambulance"] as const;

// Server-side fallback only (a request that somehow omits facilityType) —
// not offered as a dropdown choice itself.
export const DEFAULT_FACILITY_TYPE = "Facility";

// Whether a facility's medical-equipment section (HospitalEquipmentPanel.tsx)
// should show — matched loosely against the free-text facilityType rather
// than an exact "Hospital" string, since the seeded building templates are
// named "Remote Clinic"/"Alpha Clinic" (no template is literally "Hospital")
// and a user can also just type "Hospital" via the free-text flat type.
export function isHospitalFacility(facilityType: string): boolean {
  return /hospital|clinic/i.test(facilityType);
}
