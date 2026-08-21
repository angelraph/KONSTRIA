// v1 price-coverage regions (see plan). Adding a country/region later is a
// data-row addition, not a schema change — Project.region/.country are
// already generic strings, not Nigeria-hardcoded.
export const NIGERIA_REGIONS = ["Lagos", "FCT", "Rivers", "Oyo", "Kano", "Enugu"] as const;
