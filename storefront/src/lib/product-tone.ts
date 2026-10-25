/** The pastel behind a product photo, keyed by the tone the catalogue assigns.
 *
 * This map was copy-pasted between the product card and the product page, so a
 * new tone had to be added twice or the two disagreed. Both now import it.
 *
 * The values are literal hex rather than tokens because they are photo
 * backdrops, not UI surfaces: a product shot cut out on white reads as floating
 * on a dark panel. They are deliberately light in both themes; the dark variant
 * dims them instead of inverting, so the photo still sits on something soft.
 */
export const productTones: Record<string, string> = {
  gray: "bg-[#F1EFE8] dark:bg-[#F1EFE8]/85",
  green: "bg-[#EAF3DE] dark:bg-[#EAF3DE]/85",
  teal: "bg-[#E1F5EE] dark:bg-[#E1F5EE]/85",
  purple: "bg-[#EEEDFE] dark:bg-[#EEEDFE]/85",
  coral: "bg-[#FAECE7] dark:bg-[#FAECE7]/85",
  amber: "bg-[#FAEEDA] dark:bg-[#FAEEDA]/85",
  pink: "bg-[#FBEAF0] dark:bg-[#FBEAF0]/85",
  blue: "bg-[#E6F1FB] dark:bg-[#E6F1FB]/85",
  red: "bg-[#FCEBEB] dark:bg-[#FCEBEB]/85",
};

/** Falls back to the neutral tone for a product whose tone is unset or unknown. */
export function productTone(tone: string | undefined): string {
  return productTones[tone ?? ""] ?? productTones.gray;
}
