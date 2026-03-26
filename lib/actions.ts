"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult = { success?: string; error?: string };

// ─── Disciplinas ──────────────────────────────────────────────────────────────

export async function getDisciplinas() {
  return prisma.$queryRaw<Array<{ id: number; name: string; item_count: bigint }>>`
    SELECT d.id, d.name, COUNT(i.id) AS item_count
    FROM samba_school.disciplines d
    LEFT JOIN samba_edvance.items i ON i.discipline_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.name
  `;
}

export async function getDisciplinasSimples() {
  return prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT id, name FROM samba_school.disciplines ORDER BY name
  `;
}

export async function criarDisciplina(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Nome é obrigatório." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_school.disciplines (name) VALUES (${name})
    `;
    revalidatePath("/dashboard/disciplinas");
    return { success: "Disciplina criada." };
  } catch {
    return { error: "Erro ao criar disciplina." };
  }
}

export async function excluirDisciplina(id: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      DELETE FROM samba_school.disciplines WHERE id = ${id}
    `;
    revalidatePath("/dashboard/disciplinas");
    return { success: "Disciplina excluída." };
  } catch {
    return { error: "Não é possível excluir: há itens ou habilidades vinculados." };
  }
}

// ─── Habilidades (Skills) ─────────────────────────────────────────────────────

export async function getHabilidades(disciplineId?: number) {
  if (disciplineId) {
    return prisma.$queryRaw<Array<{ id: number; code: string; description: string; discipline_id: number; discipline_name: string }>>`
      SELECT s.id, s.code, s.description, d.id AS discipline_id, d.name AS discipline_name
      FROM samba_edvance.skills s
      JOIN samba_school.disciplines d ON d.name = s.area
      WHERE d.id = ${disciplineId}
      ORDER BY s.code
    `;
  }
  return prisma.$queryRaw<Array<{ id: number; code: string; description: string; discipline_id: number; discipline_name: string }>>`
    SELECT s.id, s.code, s.description, d.id AS discipline_id, d.name AS discipline_name
    FROM samba_edvance.skills s
    LEFT JOIN samba_school.disciplines d ON d.name = s.area
    ORDER BY s.area, s.code
  `;
}

export async function criarHabilidade(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const code = formData.get("code")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const disciplineId = Number(formData.get("discipline_id"));

  if (!code || !description || !disciplineId)
    return { error: "Todos os campos são obrigatórios." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.skills (code, description, area)
      SELECT ${code}, ${description}, name
      FROM samba_school.disciplines
      WHERE id = ${disciplineId}
    `;
    revalidatePath("/dashboard/disciplinas");
    return { success: "Habilidade criada." };
  } catch {
    return { error: "Código já existe ou erro ao salvar." };
  }
}

export async function excluirHabilidade(id: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`DELETE FROM samba_edvance.skills WHERE id = ${id}`;
    revalidatePath("/dashboard/disciplinas");
    return { success: "Habilidade excluída." };
  } catch {
    return { error: "Não é possível excluir: há itens vinculados." };
  }
}

// ─── Itens ────────────────────────────────────────────────────────────────────

type ItemRow = {
  id: number;
  stem: string;
  difficulty: string;
  item_type: string;
  serie: string;
  latex: boolean;
  created_at: Date;
  discipline_name: string;
  skill_code: string | null;
  owner_name: string | null;
};

export async function getItens(filters?: {
  disciplineId?: number;
  difficulty?: string;
  itemType?: string;
  search?: string;
  page?: number;
}) {
  const limit = 20;
  const offset = ((filters?.page ?? 1) - 1) * limit;
  const search = filters?.search ? `%${filters.search}%` : null;

  // Build queries based on filter combinations to avoid nested template literals
  let rows: ItemRow[];
  let total: [{ count: bigint }];

  if (filters?.disciplineId && filters?.difficulty && filters?.itemType && search) {
    rows = await prisma.$queryRaw<ItemRow[]>`
      SELECT i.id, i.stem, i.difficulty, i.item_type, i.serie, i.latex, i.created_at,
             d.name AS discipline_name, s.code AS skill_code, u.name AS owner_name
      FROM samba_edvance.items i
      JOIN samba_school.disciplines d ON d.id = i.discipline_id
      LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
      LEFT JOIN samba_school.users u ON u.id = i.owner_id
      WHERE i.discipline_id = ${filters.disciplineId}
        AND i.difficulty = ${filters.difficulty}::"samba_edvance"."Difficulty"
        AND i.item_type = ${filters.itemType}::"samba_edvance"."ItemType"
        AND i.stem ILIKE ${search}
      ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    total = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM samba_edvance.items i
      WHERE i.discipline_id = ${filters.disciplineId}
        AND i.difficulty = ${filters.difficulty}::"samba_edvance"."Difficulty"
        AND i.item_type = ${filters.itemType}::"samba_edvance"."ItemType"
        AND i.stem ILIKE ${search}`;
  } else if (filters?.disciplineId && search) {
    rows = await prisma.$queryRaw<ItemRow[]>`
      SELECT i.id, i.stem, i.difficulty, i.item_type, i.serie, i.latex, i.created_at,
             d.name AS discipline_name, s.code AS skill_code, u.name AS owner_name
      FROM samba_edvance.items i
      JOIN samba_school.disciplines d ON d.id = i.discipline_id
      LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
      LEFT JOIN samba_school.users u ON u.id = i.owner_id
      WHERE i.discipline_id = ${filters.disciplineId} AND i.stem ILIKE ${search}
      ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    total = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM samba_edvance.items i
      WHERE i.discipline_id = ${filters.disciplineId} AND i.stem ILIKE ${search}`;
  } else if (filters?.disciplineId) {
    rows = await prisma.$queryRaw<ItemRow[]>`
      SELECT i.id, i.stem, i.difficulty, i.item_type, i.serie, i.latex, i.created_at,
             d.name AS discipline_name, s.code AS skill_code, u.name AS owner_name
      FROM samba_edvance.items i
      JOIN samba_school.disciplines d ON d.id = i.discipline_id
      LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
      LEFT JOIN samba_school.users u ON u.id = i.owner_id
      WHERE i.discipline_id = ${filters.disciplineId}
      ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    total = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM samba_edvance.items WHERE discipline_id = ${filters.disciplineId}`;
  } else if (search) {
    rows = await prisma.$queryRaw<ItemRow[]>`
      SELECT i.id, i.stem, i.difficulty, i.item_type, i.serie, i.latex, i.created_at,
             d.name AS discipline_name, s.code AS skill_code, u.name AS owner_name
      FROM samba_edvance.items i
      JOIN samba_school.disciplines d ON d.id = i.discipline_id
      LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
      LEFT JOIN samba_school.users u ON u.id = i.owner_id
      WHERE i.stem ILIKE ${search}
      ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    total = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM samba_edvance.items WHERE stem ILIKE ${search}`;
  } else {
    rows = await prisma.$queryRaw<ItemRow[]>`
      SELECT i.id, i.stem, i.difficulty, i.item_type, i.serie, i.latex, i.created_at,
             d.name AS discipline_name, s.code AS skill_code, u.name AS owner_name
      FROM samba_edvance.items i
      JOIN samba_school.disciplines d ON d.id = i.discipline_id
      LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
      LEFT JOIN samba_school.users u ON u.id = i.owner_id
      ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    total = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM samba_edvance.items`;
  }

  return { rows, total: Number(total[0]?.count ?? 0) };
}

export async function getItemById(id: number) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      stem: string;
      difficulty: string;
      item_type: string;
      serie: string;
      latex: boolean;
      options_json: string | null;
      numeric_answer: string | null;
      media_url: string | null;
      discipline_id: number;
      skill_id: number | null;
      owner_id: number | null;
    }>
  >`
    SELECT id, stem, difficulty, item_type, serie, latex,
           options_json, numeric_answer, media_url, discipline_id, skill_id, owner_id
    FROM samba_edvance.items WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function criarItem(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const stem = formData.get("stem")?.toString().trim();
  const disciplineId = Number(formData.get("discipline_id"));
  const skillId = formData.get("skill_id") ? Number(formData.get("skill_id")) : null;
  const serie = formData.get("serie")?.toString().trim() ?? "";
  const difficulty = formData.get("difficulty")?.toString();
  const itemType = formData.get("item_type")?.toString();
  const latex = formData.get("latex") === "true";
  const optionsJson = formData.get("options_json")?.toString() ?? null;
  const numericAnswer = formData.get("numeric_answer")?.toString() ?? null;

  if (!stem || !disciplineId || !serie || !difficulty || !itemType)
    return { error: "Preencha todos os campos obrigatórios." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.items
        (owner_id, discipline_id, skill_id, serie, difficulty, item_type, stem, options_json, numeric_answer, latex)
      VALUES
        (${session.id}, ${disciplineId}, ${skillId},
         ${serie}, ${difficulty}::"samba_edvance"."Difficulty",
         ${itemType}::"samba_edvance"."ItemType",
         ${stem}, ${optionsJson}, ${numericAnswer}, ${latex})
    `;
    revalidatePath("/dashboard/itens");
    return { success: "Item criado com sucesso." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao salvar item." };
  }
}

export async function atualizarItem(
  id: number,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const stem = formData.get("stem")?.toString().trim();
  const disciplineId = Number(formData.get("discipline_id"));
  const skillId = formData.get("skill_id") ? Number(formData.get("skill_id")) : null;
  const serie = formData.get("serie")?.toString().trim() ?? "";
  const difficulty = formData.get("difficulty")?.toString();
  const itemType = formData.get("item_type")?.toString();
  const latex = formData.get("latex") === "true";
  const optionsJson = formData.get("options_json")?.toString() ?? null;
  const numericAnswer = formData.get("numeric_answer")?.toString() ?? null;

  if (!stem || !disciplineId || !serie || !difficulty || !itemType)
    return { error: "Preencha todos os campos obrigatórios." };

  try {
    await prisma.$executeRaw`
      UPDATE samba_edvance.items SET
        discipline_id = ${disciplineId},
        skill_id = ${skillId},
        serie = ${serie},
        difficulty = ${difficulty}::"samba_edvance"."Difficulty",
        item_type = ${itemType}::"samba_edvance"."ItemType",
        stem = ${stem},
        options_json = ${optionsJson},
        numeric_answer = ${numericAnswer},
        latex = ${latex}
      WHERE id = ${id}
    `;
    revalidatePath("/dashboard/itens");
    revalidatePath(`/dashboard/itens/${id}`);
    return { success: "Item atualizado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao atualizar item." };
  }
}

export async function excluirItem(id: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`DELETE FROM samba_edvance.items WHERE id = ${id}`;
    revalidatePath("/dashboard/itens");
    return { success: "Item excluído." };
  } catch {
    return { error: "Não é possível excluir: item está em uso em um simulado." };
  }
}

// ─── Simulados (Exams) ────────────────────────────────────────────────────────

export async function getSimulados() {
  return prisma.$queryRaw<
    Array<{
      id: number;
      title: string;
      status: string;
      created_at: Date;
      opened_at: Date | null;
      closed_at: Date | null;
      question_count: bigint;
      creator_name: string | null;
    }>
  >`
    SELECT
      e.id, e.title, e.status, e.created_at, e.opened_at, e.closed_at,
      COUNT(eq.id) AS question_count,
      u.name AS creator_name
    FROM samba_edvance.exams e
    LEFT JOIN samba_edvance.exam_questions eq ON eq.exam_id = e.id
    LEFT JOIN samba_school.users u ON u.id = e.created_by
    GROUP BY e.id, u.name
    ORDER BY e.created_at DESC
  `;
}

export async function getSimuladoById(id: number) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      title: string;
      status: string;
      created_at: Date;
      opened_at: Date | null;
      closed_at: Date | null;
      class_id: number | null;
      blueprint_id: number | null;
      created_by: number | null;
    }>
  >`
    SELECT id, title, status, created_at, opened_at, closed_at,
           class_id, blueprint_id, created_by
    FROM samba_edvance.exams WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getQuestoesDoSimulado(examId: number) {
  return prisma.$queryRaw<
    Array<{
      eq_id: number;
      position: number;
      answer_key: string | null;
      item_id: number;
      stem: string;
      item_type: string;
      difficulty: string;
      discipline_name: string;
      skill_code: string | null;
    }>
  >`
    SELECT
      eq.id AS eq_id, eq.position, eq.answer_key,
      i.id AS item_id, i.stem, i.item_type, i.difficulty,
      d.name AS discipline_name,
      s.code AS skill_code
    FROM samba_edvance.exam_questions eq
    JOIN samba_edvance.items i ON i.id = eq.item_id
    JOIN samba_school.disciplines d ON d.id = i.discipline_id
    LEFT JOIN samba_edvance.skills s ON s.id = i.skill_id
    WHERE eq.exam_id = ${examId}
    ORDER BY eq.position
  `;
}

export async function criarSimulado(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const title = formData.get("title")?.toString().trim();
  if (!title) return { error: "Título é obrigatório." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exams (title, status, created_by)
      VALUES (${title}, 'draft', ${session.id})
    `;
    revalidatePath("/dashboard/simulados");
    return { success: "Simulado criado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao criar simulado." };
  }
}

export async function atualizarStatusSimulado(
  id: number,
  status: "draft" | "open" | "closed" | "graded"
): Promise<ActionResult> {
  try {
    if (status === "open") {
      await prisma.$executeRaw`
        UPDATE samba_edvance.exams SET status = 'open', opened_at = NOW() WHERE id = ${id}
      `;
    } else if (status === "closed") {
      await prisma.$executeRaw`
        UPDATE samba_edvance.exams SET status = 'closed', closed_at = NOW() WHERE id = ${id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE samba_edvance.exams SET status = ${status}::"samba_edvance"."ExamStatus" WHERE id = ${id}
      `;
    }
    revalidatePath("/dashboard/simulados");
    revalidatePath(`/dashboard/simulados/${id}`);
    return { success: "Status atualizado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao atualizar status." };
  }
}

export async function adicionarItemAoSimulado(
  examId: number,
  itemId: number
): Promise<ActionResult> {
  try {
    const pos = await prisma.$queryRaw<[{ max: number | null }]>`
      SELECT MAX(position) as max FROM samba_edvance.exam_questions WHERE exam_id = ${examId}
    `;
    const nextPos = (pos[0]?.max ?? 0) + 1;

    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_questions (exam_id, item_id, position)
      VALUES (${examId}, ${itemId}, ${nextPos})
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Item adicionado." };
  } catch {
    return { error: "Item já está neste simulado." };
  }
}

export async function removerItemDoSimulado(
  examQuestionId: number,
  examId: number
): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.exam_questions WHERE id = ${examQuestionId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Item removido." };
  } catch {
    return { error: "Erro ao remover item." };
  }
}

export async function excluirSimulado(id: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`DELETE FROM samba_edvance.exams WHERE id = ${id}`;
    revalidatePath("/dashboard/simulados");
    return { success: "Simulado excluído." };
  } catch {
    return { error: "Não é possível excluir este simulado." };
  }
}

// ─── Matrizes (Blueprints) ────────────────────────────────────────────────────

export async function getMatrizes() {
  return prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      description: string | null;
      created_at: Date;
      owner_name: string | null;
      exam_count: bigint;
    }>
  >`
    SELECT
      b.id, b.name, b.description, b.created_at,
      u.name AS owner_name,
      COUNT(e.id) AS exam_count
    FROM samba_edvance.blueprints b
    LEFT JOIN samba_school.users u ON u.id = b.owner_id
    LEFT JOIN samba_edvance.exams e ON e.blueprint_id = b.id
    GROUP BY b.id, u.name
    ORDER BY b.created_at DESC
  `;
}

export async function criarMatriz(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const configJson = formData.get("config_json")?.toString() ?? "{}";

  if (!name) return { error: "Nome é obrigatório." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.blueprints (name, description, owner_id, config_json)
      VALUES (${name}, ${description}, ${session.id}, ${configJson})
    `;
    revalidatePath("/dashboard/matrizes");
    return { success: "Matriz criada." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao criar matriz." };
  }
}

export async function excluirMatriz(id: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`DELETE FROM samba_edvance.blueprints WHERE id = ${id}`;
    revalidatePath("/dashboard/matrizes");
    return { success: "Matriz excluída." };
  } catch {
    return { error: "Não é possível excluir: há simulados vinculados." };
  }
}

// ─── Turmas ───────────────────────────────────────────────────────────────────

export async function getTurmas() {
  return prisma.$queryRaw<Array<{
    id: number; name: string;
    grade_label: string; level: string; year_number: number;
    student_count: bigint; discipline_count: bigint;
  }>>`
    SELECT sc.id, sc.name,
           sg.label AS grade_label, sg.level, sg.year_number,
           COUNT(DISTINCT st.id)  FILTER (WHERE st.is_active = true) AS student_count,
           COUNT(DISTINCT cd.discipline_id) AS discipline_count
    FROM samba_school.school_classes sc
    LEFT JOIN samba_school.school_grades sg ON sg.id = sc.grade_id
    LEFT JOIN samba_school.students st ON st.class_id = sc.id
    LEFT JOIN samba_school.class_disciplines cd ON cd.class_id = sc.id
    GROUP BY sc.id, sc.name, sg.label, sg.level, sg.year_number
    ORDER BY sg.year_number, sc.name
  `;
}

export async function getTurmaById(id: number) {
  const rows = await prisma.$queryRaw<Array<{
    id: number; name: string;
    grade_label: string; level: string; year_number: number;
  }>>`
    SELECT sc.id, sc.name, sg.label AS grade_label, sg.level, sg.year_number
    FROM samba_school.school_classes sc
    LEFT JOIN samba_school.school_grades sg ON sg.id = sc.grade_id
    WHERE sc.id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getTurmaStudents(classId: number) {
  return prisma.$queryRaw<Array<{
    id: number; ra: string; dig_ra: string | null; name: string; is_active: boolean; call_number: number | null;
  }>>`
    SELECT id, ra, dig_ra, name, is_active, call_number
    FROM samba_school.students
    WHERE class_id = ${classId}
    ORDER BY call_number NULLS LAST, name
  `;
}

export async function getTurmaTeachers(classId: number) {
  return prisma.$queryRaw<Array<{
    user_id: number; teacher_name: string; email: string; discipline_name: string;
  }>>`
    SELECT ta.user_id, u.name AS teacher_name, u.email, d.name AS discipline_name
    FROM samba_school.teacher_assignments ta
    JOIN samba_school.users u ON u.id = ta.user_id
    JOIN samba_school.disciplines d ON d.id = ta.discipline_id
    WHERE ta.class_id = ${classId}
    ORDER BY d.name, u.name
  `;
}

export async function getTurmaSimulados(classId: number) {
  return prisma.$queryRaw<Array<{
    id: number; title: string; status: string; area: string | null;
  }>>`
    SELECT DISTINCT e.id, e.title, e.status, e.area
    FROM samba_edvance.exams e
    JOIN samba_edvance.exam_class_assignments eca ON eca.exam_id = e.id
    WHERE eca.class_id = ${classId}
    ORDER BY e.id DESC
  `;
}

// ─── Alunos ───────────────────────────────────────────────────────────────────


type AlunoRow = {
  id: number; ra: string; dig_ra: string | null; name: string;
  class_name: string | null; is_active: boolean; call_number: number | null;
};

export async function getAlunos(search?: string, classId?: number): Promise<AlunoRow[]> {
  if (classId && search) {
    return prisma.$queryRaw<AlunoRow[]>`
      SELECT s.id, s.ra, s.dig_ra, s.name, c.name AS class_name, s.is_active, s.call_number
      FROM samba_school.students s
      LEFT JOIN samba_school.school_classes c ON c.id = s.class_id
      WHERE s.class_id = ${classId}
        AND (s.name ILIKE ${'%' + search + '%'} OR s.ra ILIKE ${'%' + search + '%'})
        AND s.is_active = true
      ORDER BY s.call_number NULLS LAST, s.name
    `;
  }
  if (classId) {
    return prisma.$queryRaw<AlunoRow[]>`
      SELECT s.id, s.ra, s.dig_ra, s.name, c.name AS class_name, s.is_active, s.call_number
      FROM samba_school.students s
      LEFT JOIN samba_school.school_classes c ON c.id = s.class_id
      WHERE s.class_id = ${classId} AND s.is_active = true
      ORDER BY s.call_number NULLS LAST, s.name
    `;
  }
  if (search) {
    return prisma.$queryRaw<AlunoRow[]>`
      SELECT s.id, s.ra, s.dig_ra, s.name, c.name AS class_name, s.is_active, s.call_number
      FROM samba_school.students s
      LEFT JOIN samba_school.school_classes c ON c.id = s.class_id
      WHERE s.is_active = true
        AND (s.name ILIKE ${'%' + search + '%'} OR s.ra ILIKE ${'%' + search + '%'})
      ORDER BY c.name, s.call_number NULLS LAST, s.name
      LIMIT 200
    `;
  }
  return prisma.$queryRaw<AlunoRow[]>`
    SELECT s.id, s.ra, s.dig_ra, s.name, c.name AS class_name, s.is_active, s.call_number
    FROM samba_school.students s
    LEFT JOIN samba_school.school_classes c ON c.id = s.class_id
    WHERE s.is_active = true
    ORDER BY c.name, s.call_number NULLS LAST, s.name
    LIMIT 200
  `;
}

export async function importarAlunosCSV(
  formData: FormData
): Promise<ActionResult & { inserted?: number; updated?: number }> {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COORDINATOR")) {
    return { error: "Acesso negado." };
  }

  const classId = Number(formData.get("class_id"));
  const file = formData.get("csv") as File | null;
  if (!classId) return { error: "Selecione uma turma." };
  if (!file)    return { error: "Selecione um arquivo CSV." };


  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim());

  // Encontra a linha do cabeçalho (contém "Nome do Aluno")
  const headerIdx = lines.findIndex(l =>
    l.includes("Nome do Aluno") || l.startsWith("Nº de chamada")
  );
  if (headerIdx < 0) return { error: "Formato inválido: cabeçalho não encontrado." };

  const dataLines = lines.slice(headerIdx + 1).filter(Boolean);
  let inserted = 0, updated = 0;

  for (const line of dataLines) {
    const parts = line.split(";");
    if (parts.length < 5) continue;

    const callNumber = parseInt(parts[0].trim()) || null;
    const name       = parts[1].trim();
    const ra         = parts[2].trim();
    const digRa      = parts[3]?.trim() || null;
    const situation  = (parts[7] ?? parts[4] ?? "").trim().toLowerCase();

    if (!name || !ra) continue;
    if (situation !== "ativo") continue; // ignora inativos

    const existing = await prisma.$queryRaw<Array<{ id: number; is_active: boolean }>>`
      SELECT id, is_active FROM samba_school.students WHERE ra = ${ra}
    `;

    if (existing.length > 0) {
      if (!existing[0].is_active) continue; // não reativa inativo
      await prisma.$executeRaw`
        UPDATE samba_school.students
        SET name = ${name}, class_id = ${classId}, call_number = ${callNumber}, dig_ra = ${digRa}
        WHERE ra = ${ra}
      `;
      updated++;
    } else {
      await prisma.$executeRaw`
        INSERT INTO samba_school.students (ra, dig_ra, name, class_id, call_number, is_active)
        VALUES (${ra}, ${digRa}, ${name}, ${classId}, ${callNumber}, true)
      `;
      inserted++;
    }
  }

  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard/turmas");

  return {
    success: `Importação concluída: ${inserted} inserido${inserted !== 1 ? "s" : ""}, ${updated} atualizado${updated !== 1 ? "s" : ""}.`,
    inserted,
    updated,
  };
}
