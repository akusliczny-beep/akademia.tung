import { type Language } from "../i18n";

export interface Project {
  name: string;
  description: string;
  url: string;
  icon: string;
  tech: string[];
  status: string;
}

export function getProjects(_lang: Language): Project[] {
  return [
    {
      name: "Akademia Tunga",
      description:
        "Serwis poświęcony akupunkturze Mistrza Tunga, opracowaniom punktów i notatkom klinicznym.",
      url: "https://tung.sliczny-tcm.pl",
      icon: "icon-[simple-icons--astro]",
      tech: ["Astro", "Vue", "TypeScript"],
      status: "Aktywny",
    },
  ];
}
