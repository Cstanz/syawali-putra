export type Project = {
  number: string;
  title: string;
  year: string;
  role: string;
  collaborators: string;
  description: string;
  technologies: string[];
  image: string;
  alt: string;
  tone: "citrus" | "blue" | "rose";
};

export const projects: Project[] = [
  { number: "01", title: "COMING SOON", year: "SOON", role: "PERSONAL", collaborators: "—", description: "Projects and experiments will appear here soon.", technologies: [], image: "/images/project-01.svg", alt: "Abstract lime and ink project artwork", tone: "citrus" },
];
