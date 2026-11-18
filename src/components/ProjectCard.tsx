import Image from "next/image";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project-card" data-project={project.number} tabIndex={0} aria-label={`Project ${project.number}: ${project.title}`}>
      <div className="project-card__display">
        <span className="project-card__index">P.{project.number}</span>
        <h3 className="project-card__title">{project.title}</h3>
        <span className="project-card__arrow" aria-hidden="true">→</span>
      </div>
      <div className="project-card__meta-strip">
        <span className="project-card__label">PROJECT {project.number}</span>
        <p className="project-card__description">{project.description}</p>
        <dl className="project-card__meta">
          <div><dt>Role</dt><dd>{project.role}</dd></div>
          <div><dt>With</dt><dd>{project.collaborators}</dd></div>
          {project.technologies.length > 0 && <div><dt>Built with</dt><dd>{project.technologies.join(" · ")}</dd></div>}
          <div><dt>Year</dt><dd>{project.year}</dd></div>
        </dl>
      </div>
      <div className="project-card__preview-source" aria-hidden="true">
        <Image src={project.image} alt="" fill sizes="(max-width: 760px) 80vw, 24vw" />
      </div>
    </article>
  );
}
