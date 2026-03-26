import { getDisciplinas } from "@/lib/actions";
import { getSkills, getSkillAreas } from "@/lib/skill-actions";
import { DisciplinasClient } from "@/components/dashboard/disciplinas/DisciplinasClient";

export default async function DisciplinasPage() {
  const [disciplinas, skills, areas] = await Promise.all([
    getDisciplinas(),
    getSkills(),
    getSkillAreas(),
  ]);

  return (
    <DisciplinasClient
      disciplinas={disciplinas as any}
      skills={skills as any}
      areas={areas}
    />
  );
}
