/**
 * The question bank: every template, indexed by id, skill, domain and course.
 */

import { buildQuestion } from "@/lib/practice/question";
import { DOMAINS, SKILLS, findSkill } from "@/lib/practice/taxonomy";
import { AP_CALCULUS_TEMPLATES } from "@/lib/practice/templates/ap-calculus";
import { AP_STATISTICS_TEMPLATES } from "@/lib/practice/templates/ap-statistics";
import { EXTENDED_TEMPLATES } from "@/lib/practice/templates/extended";
import { SAT_ADVANCED_TEMPLATES } from "@/lib/practice/templates/sat-advanced";
import { SAT_ALGEBRA_TEMPLATES } from "@/lib/practice/templates/sat-algebra";
import { SAT_DATA_TEMPLATES } from "@/lib/practice/templates/sat-data";
import { SAT_GEOMETRY_TEMPLATES } from "@/lib/practice/templates/sat-geometry";
import type { CourseId, DomainId, Question, QuestionRef, Template } from "@/types/practice";

export const TEMPLATES: readonly Template[] = [
  ...SAT_ALGEBRA_TEMPLATES,
  ...SAT_ADVANCED_TEMPLATES,
  ...SAT_DATA_TEMPLATES,
  ...SAT_GEOMETRY_TEMPLATES,
  ...AP_CALCULUS_TEMPLATES,
  ...AP_STATISTICS_TEMPLATES,
  ...EXTENDED_TEMPLATES,
];

const BY_ID: ReadonlyMap<string, Template> = new Map(
  TEMPLATES.map((template) => [template.id, template]),
);

const BY_SKILL: ReadonlyMap<string, readonly Template[]> = (() => {
  const map = new Map<string, Template[]>();
  for (const template of TEMPLATES) {
    const list = map.get(template.skillId);
    if (list === undefined) map.set(template.skillId, [template]);
    else list.push(template);
  }
  return map;
})();

export function getTemplate(id: string): Template | null {
  return BY_ID.get(id) ?? null;
}

export function templatesForSkill(skillId: string): readonly Template[] {
  return BY_SKILL.get(skillId) ?? [];
}

export function templatesForDomain(domain: DomainId): readonly Template[] {
  return TEMPLATES.filter((template) => findSkill(template.skillId)?.domain === domain);
}

export function templatesForCourse(course: CourseId): readonly Template[] {
  const domains = new Set(
    DOMAINS.filter((domain) => domain.course === course).map((domain) => domain.id),
  );
  return TEMPLATES.filter((template) => {
    const skill = findSkill(template.skillId);
    return skill !== null && domains.has(skill.domain);
  });
}

/** Rebuild the exact question a stored reference points to. */
export function regenerate(ref: QuestionRef): Question | null {
  const template = getTemplate(ref.templateId);
  if (template === null) return null;
  try {
    return buildQuestion(template, ref);
  } catch {
    return null;
  }
}

export interface BankSummary {
  readonly templates: number;
  readonly skills: number;
  readonly variants: number;
}

/** Counts shown on the site, computed from the bank rather than typed by hand. */
export function summarizeBank(course?: CourseId): BankSummary {
  const templates = course === undefined ? TEMPLATES : templatesForCourse(course);
  const skills = new Set(templates.map((template) => template.skillId));
  const variants = templates.reduce(
    (total, template) => total + template.levels.length * template.formats.length,
    0,
  );
  return { templates: templates.length, skills: skills.size, variants };
}

/** Skills that have no template yet — must be empty in a shipped build. */
export function uncoveredSkills(): readonly string[] {
  return SKILLS.filter((skill) => templatesForSkill(skill.id).length === 0).map((skill) => skill.id);
}
