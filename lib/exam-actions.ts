"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { notifyCoordinators, notifyUser } from "@/lib/notification-actions";

export type ActionResult = { success?: string; error?: string };

// ─── Criação / status ─────────────────────────────────────────────────────────

export async function criarSimulado(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const title = formData.get("title")?.toString().trim();
  const area = formData.get("area")?.toString().trim() || null;
  const optionsCount = Number(formData.get("options_count") ?? 4);

  if (!title) return { error: "Título é obrigatório." };

  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exams (title, area, options_count, status, created_by)
      VALUES (${title}, ${area}, ${optionsCount}, 'collecting', ${session.id})
    `;
    revalidatePath("/dashboard/simulados");
    revalidatePath("/dashboard");
    return { success: "Simulado criado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao criar simulado." };
  }
}

export async function atualizarStatusSimulado(
  examId: number,
  status: string
): Promise<ActionResult> {
  try {
    if (status === "locked") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'locked' WHERE id = ${examId}`;
    } else if (status === "collecting") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'collecting' WHERE id = ${examId}`;
    } else if (status === "generated") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'generated' WHERE id = ${examId}`;
    } else if (status === "published") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'published' WHERE id = ${examId}`;
    } else if (status === "archived") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'archived' WHERE id = ${examId}`;
    } else if (status === "review") {
      await prisma.$executeRaw`UPDATE samba_edvance.exams SET status = 'review' WHERE id = ${examId}`;
    }

    // Busca dados do simulado para notificações
    const exams = await prisma.$queryRaw<Array<{ title: string; created_by: number | null }>>`
      SELECT title, created_by FROM samba_edvance.exams WHERE id = ${examId}
    `;
    const exam = exams[0];

    if (exam) {
      const link = `/dashboard/simulados/${examId}`;
      if (status === "collecting") {
        // Notifica professores atribuídos que podem começar a enviar questões
        const teachers = await prisma.$queryRaw<Array<{ teacher_id: number }>>`
          SELECT DISTINCT eta.teacher_id
          FROM samba_edvance.exam_teacher_assignments eta
          WHERE eta.exam_id = ${examId}
        `;
        if (teachers.length > 0 && prisma.notification) {
          await prisma.notification.createMany({
            data: teachers.map(t => ({
              userId:  t.teacher_id,
              title:   `Simulado liberado para envio`,
              message: `O simulado "${exam.title}" está coletando questões. Envie suas contribuições.`,
              link,
            })),
          });
        }
      } else if (status === "review") {
        // Notifica coordenadores que o simulado está pronto para revisão
        await notifyCoordinators(
          `Simulado em revisão`,
          `O simulado "${exam.title}" está pronto para revisão e aprovação das questões.`,
          link
        );
      } else if (status === "published") {
        // Notifica professores que o simulado foi publicado
        const teachers = await prisma.$queryRaw<Array<{ teacher_id: number }>>`
          SELECT DISTINCT eta.teacher_id
          FROM samba_edvance.exam_teacher_assignments eta
          WHERE eta.exam_id = ${examId}
        `;
        if (teachers.length > 0 && prisma.notification) {
          await prisma.notification.createMany({
            data: teachers.map(t => ({
              userId:  t.teacher_id,
              title:   `Simulado publicado`,
              message: `O simulado "${exam.title}" foi publicado e está disponível para aplicação.`,
              link,
            })),
          });
        }
      } else if (status === "locked") {
        // Notifica o criador que foi bloqueado
        if (exam.created_by) {
          await notifyUser(
            exam.created_by,
            `Simulado finalizado`,
            `O simulado "${exam.title}" foi finalizado e bloqueado para edições.`,
            link
          );
        }
      }
    }

    revalidatePath(`/dashboard/simulados/${examId}`);
    revalidatePath("/dashboard");
    return { success: "Status atualizado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao atualizar status." };
  }
}

// ─── Destravar simulado (volta a collecting e limpa PDFs gerados) ─────────────

/**
 * Destravar o simulado: apaga todos os PDFs gerados, limpa o campo pdf_path
 * na tabela de exams (se existir) e retorna o status para 'collecting'.
 * Somente ADMIN e COORDINATOR podem executar esta ação.
 */
export async function destravarSimulado(examId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") {
    return { error: "Acesso restrito a coordenadores e administradores." };
  }

  try {
    // ── 1. Apaga arquivos PDF gerados do disco ────────────────────────────────
    // Os cadernos são salvos em public/uploads/exam-{id}/pdfs/
    const pdfDir = path.join(process.cwd(), "public", "uploads", `exam-${examId}`, "pdfs");
    if (fs.existsSync(pdfDir)) {
      const files = fs.readdirSync(pdfDir);
      for (const file of files) {
        if (file.endsWith(".pdf")) {
          try {
            fs.unlinkSync(path.join(pdfDir, file));
          } catch {
            // ignora erros individuais — arquivo pode já ter sido removido
          }
        }
      }
      // Remove o diretório se estiver vazio
      try { fs.rmdirSync(pdfDir); } catch { /* não vazio ou já removido */ }
    }

    // ── 2. Reseta status para 'collecting' ───────────────────────────────────
    await prisma.$executeRaw`
      UPDATE samba_edvance.exams
      SET status = 'collecting'
      WHERE id = ${examId}
    `;
    // Reseta progresso dos professores para 'pending' / 'partial' (remove 'done')
    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress
      SET status = CASE
        WHEN submitted = 0 THEN 'pending'
        WHEN submitted >= quota AND quota > 0 THEN 'complete'
        ELSE 'partial'
      END,
      updated_at = NOW()
      WHERE exam_id = ${examId} AND status = 'done'
    `;

    // ── 3. Notifica o criador do simulado ─────────────────────────────────────
    const exams = await prisma.$queryRaw<Array<{ title: string; created_by: number | null }>>`
      SELECT title, created_by FROM samba_edvance.exams WHERE id = ${examId}
    `;
    const exam = exams[0];
    if (exam?.created_by && prisma.notification) {
      await prisma.notification.create({
        data: {
          userId:  exam.created_by,
          title:   `Simulado destravado`,
          message: `O simulado "${exam.title}" foi destravado. Os cadernos gerados foram removidos e o simulado está aberto para nova geração.`,
          link:    `/dashboard/simulados/${examId}`,
        },
      });
    }

    revalidatePath(`/dashboard/simulados/${examId}`);
    revalidatePath("/dashboard");
    return { success: "Simulado destravado. PDFs gerados foram removidos." };
  } catch (e) {
    console.error("[destravarSimulado]", e);
    return { error: "Erro ao destravar simulado." };
  }
}

// ─── Turmas ───────────────────────────────────────────────────────────────────

export async function getExamClasses(examId: number) {
  return prisma.$queryRaw<Array<{ id: number; class_id: number; class_name: string }>>`
    SELECT eca.id, eca.class_id, sc.name AS class_name
    FROM samba_edvance.exam_class_assignments eca
    JOIN samba_school.school_classes sc ON sc.id = eca.class_id
    WHERE eca.exam_id = ${examId}
    ORDER BY sc.name
  `;
}

export async function atribuirTurma(examId: number, classId: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_class_assignments (exam_id, class_id)
      VALUES (${examId}, ${classId})
      ON CONFLICT DO NOTHING
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Turma adicionada." };
  } catch {
    return { error: "Erro ao adicionar turma." };
  }
}

export async function removerTurma(examId: number, classId: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.exam_class_assignments
      WHERE exam_id = ${examId} AND class_id = ${classId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Turma removida." };
  } catch {
    return { error: "Erro ao remover turma." };
  }
}

// ─── Cotas por disciplina ─────────────────────────────────────────────────────

export async function getExamQuotas(examId: number) {
  return prisma.$queryRaw<Array<{ id: number; discipline_id: number; discipline_name: string; quota: number }>>`
    SELECT edq.id, edq.discipline_id, d.name AS discipline_name, edq.quota
    FROM samba_edvance.exam_discipline_quotas edq
    JOIN samba_school.disciplines d ON d.id = edq.discipline_id
    WHERE edq.exam_id = ${examId}
    ORDER BY d.name
  `;
}

export async function salvarCota(
  examId: number,
  disciplineId: number,
  quota: number
): Promise<ActionResult> {
  try {
    // Get old quota for log
    const old = await prisma.$queryRaw<[{ quota: number }]>`
      SELECT COALESCE(quota, 0) AS quota
      FROM samba_edvance.exam_discipline_quotas
      WHERE exam_id = ${examId} AND discipline_id = ${disciplineId}
    `;
    const oldQuota = old[0]?.quota ?? 0;

    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_discipline_quotas (exam_id, discipline_id, quota)
      VALUES (${examId}, ${disciplineId}, ${quota})
      ON CONFLICT (exam_id, discipline_id) DO UPDATE SET quota = ${quota}
    `;

    // Update progress for all teachers in this exam+discipline
    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress
      SET quota = ${quota},
          status = CASE
            WHEN submitted = 0 THEN 'pending'
            WHEN submitted >= ${quota} THEN 'complete'
            ELSE 'partial'
          END,
          updated_at = NOW()
      WHERE exam_id = ${examId} AND discipline_id = ${disciplineId}
    `;

    // Log event
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_progress_log
        (exam_id, discipline_id, event_type, quota_before, quota_after)
      VALUES
        (${examId}, ${disciplineId}, 'QUOTA_CHANGED', ${oldQuota}, ${quota})
    `;

    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Cota salva." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao salvar cota." };
  }
}

// ─── Atribuição professor ─────────────────────────────────────────────────────

export async function getExamTeacherAssignments(examId: number) {
  return prisma.$queryRaw<Array<{
    id: number; class_id: number; class_name: string;
    discipline_id: number; discipline_name: string;
    teacher_id: number; teacher_name: string;
    submitted: number; quota: number; progress_status: string;
  }>>`
    SELECT
      eta.id, eta.class_id, sc.name AS class_name,
      eta.discipline_id, d.name AS discipline_name,
      eta.teacher_id, u.name AS teacher_name,
      COALESCE(etp.submitted, 0) AS submitted,
      COALESCE(etp.quota, 0) AS quota,
      COALESCE(etp.status, 'pending') AS progress_status
    FROM samba_edvance.exam_teacher_assignments eta
    JOIN samba_school.school_classes sc ON sc.id = eta.class_id
    JOIN samba_school.disciplines d ON d.id = eta.discipline_id
    JOIN samba_school.users u ON u.id = eta.teacher_id
    LEFT JOIN samba_edvance.exam_teacher_progress etp
      ON etp.exam_id = eta.exam_id
      AND etp.teacher_id = eta.teacher_id
      AND etp.discipline_id = eta.discipline_id
      AND etp.class_id = eta.class_id
    WHERE eta.exam_id = ${examId}
    ORDER BY sc.name, d.name, u.name
  `;
}

export async function atribuirProfessor(
  examId: number,
  classId: number,
  disciplineId: number,
  teacherId: number
): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_teacher_assignments
        (exam_id, class_id, discipline_id, teacher_id)
      VALUES (${examId}, ${classId}, ${disciplineId}, ${teacherId})
      ON CONFLICT (exam_id, class_id, discipline_id) DO UPDATE SET teacher_id = ${teacherId}
    `;

    // Get quota for this discipline to initialize progress
    const quota = await prisma.$queryRaw<[{ quota: number }]>`
      SELECT COALESCE(quota, 0) AS quota
      FROM samba_edvance.exam_discipline_quotas
      WHERE exam_id = ${examId} AND discipline_id = ${disciplineId}
    `;

    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_teacher_progress
        (exam_id, teacher_id, discipline_id, class_id, quota, submitted, status)
      VALUES (${examId}, ${teacherId}, ${disciplineId}, ${classId}, ${quota[0]?.quota ?? 0}, 0, 'pending')
      ON CONFLICT (exam_id, teacher_id, discipline_id, class_id) DO NOTHING
    `;

    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Professor atribuído." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao atribuir professor." };
  }
}

export async function removerAtribuicaoProfessor(
  assignmentId: number,
  examId: number
): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.exam_teacher_assignments WHERE id = ${assignmentId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Atribuição removida." };
  } catch {
    return { error: "Erro ao remover atribuição." };
  }
}

// ─── Questões submetidas (visão do coordenador) ───────────────────────────────

export async function getExamQuestions(examId: number) {
  return prisma.$queryRaw<Array<{
    id: number; stem: string; state: string; source: string;
    correct_label: string | null; created_at: Date;
    teacher_name: string; discipline_name: string; class_name: string;
    options: string; images: string; // both JSON
  }>>`
    SELECT
      q.id, q.stem, q.state, q.source, q.correct_label, q.created_at,
      u.name AS teacher_name, d.name AS discipline_name, sc.name AS class_name,
      COALESCE(
        json_agg(json_build_object('label', qo.label, 'text', qo.text) ORDER BY qo.label)
        FILTER (WHERE qo.id IS NOT NULL),
        '[]'
      )::text AS options,
      q.images
    FROM samba_edvance.questions q
    JOIN samba_school.users u ON u.id = q.teacher_id
    JOIN samba_school.disciplines d ON d.id = q.discipline_id
    JOIN samba_school.school_classes sc ON sc.id = q.class_id
    LEFT JOIN samba_edvance.question_options qo ON qo.question_id = q.id
    WHERE q.exam_id = ${examId}
    GROUP BY q.id, u.name, d.name, sc.name
    ORDER BY d.name, q.created_at DESC
  `;
}

export async function aprovarTodasQuestoes(examId: number): Promise<ActionResult & { count?: number }> {
  try {
    await prisma.$executeRaw`
      UPDATE samba_edvance.questions
      SET state = 'approved'
      WHERE exam_id = ${examId} AND state != 'approved'
    `;
    const [row] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM samba_edvance.questions
      WHERE exam_id = ${examId} AND state = 'approved'
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Todas as questões aprovadas.", count: Number(row?.count ?? 0) };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao aprovar questões." };
  }
}

export async function atualizarEstadoQuestao(
  questionId: number,
  examId: number,
  state: "approved" | "rejected"
): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      UPDATE samba_edvance.questions SET state = ${state} WHERE id = ${questionId}
    `;

    // Notifica o professor autor da questão
    const authors = await prisma.$queryRaw<Array<{ created_by: number | null; exam_title: string }>>`
      SELECT q.created_by, e.title AS exam_title
      FROM samba_edvance.questions q
      JOIN samba_edvance.exams e ON e.id = q.exam_id
      WHERE q.id = ${questionId}
    `;
    const author = authors[0];
    if (author?.created_by) {
      await notifyUser(
        author.created_by,
        state === "approved" ? "Questão aprovada" : "Questão rejeitada",
        state === "approved"
          ? `Uma das suas questões no simulado "${author.exam_title}" foi aprovada.`
          : `Uma das suas questões no simulado "${author.exam_title}" foi rejeitada e precisa de revisão.`,
        `/dashboard/simulados/${examId}`
      );
    }

    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: state === "approved" ? "Questão aprovada." : "Questão rejeitada." };
  } catch {
    return { error: "Erro ao atualizar questão." };
  }
}

export async function atualizarGabaritoQuestao(
  questionId: number,
  examId: number,
  correctLabel: string
): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`
      UPDATE samba_edvance.questions SET correct_label = ${correctLabel} WHERE id = ${questionId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    return { success: "Gabarito atualizado." };
  } catch {
    return { error: "Erro ao atualizar gabarito." };
  }
}

export async function criarSimuladoCompleto(data: {
  title: string;
  area: string | null;
  optionsCount: number;
  classIds: number[];
  quotas: Array<{ disciplineId: number; quota: number }>;
  assignments: Array<{ classId: number; disciplineId: number; teacherId: number }>;
}): Promise<ActionResult & { examId?: number }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  try {
    // 1. Create exam
    const examRow = await prisma.$queryRaw<[{ id: number }]>`
      INSERT INTO samba_edvance.exams (title, area, options_count, status, created_by)
      VALUES (${data.title}, ${data.area}, ${data.optionsCount}, 'collecting', ${session.id})
      RETURNING id
    `;
    const examId = examRow[0].id;

    // 2. Assign classes
    for (const classId of data.classIds) {
      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_class_assignments (exam_id, class_id)
        VALUES (${examId}, ${classId})
        ON CONFLICT DO NOTHING
      `;
    }

    // 3. Set quotas
    for (const q of data.quotas) {
      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_discipline_quotas (exam_id, discipline_id, quota)
        VALUES (${examId}, ${q.disciplineId}, ${q.quota})
        ON CONFLICT (exam_id, discipline_id) DO UPDATE SET quota = ${q.quota}
      `;
    }

    // 4. Assign teachers + init progress
    for (const a of data.assignments) {
      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_teacher_assignments
          (exam_id, class_id, discipline_id, teacher_id)
        VALUES (${examId}, ${a.classId}, ${a.disciplineId}, ${a.teacherId})
        ON CONFLICT (exam_id, class_id, discipline_id) DO UPDATE SET teacher_id = ${a.teacherId}
      `;
      const q = data.quotas.find((q) => q.disciplineId === a.disciplineId);
      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_teacher_progress
          (exam_id, teacher_id, discipline_id, class_id, quota, submitted, status)
        VALUES (${examId}, ${a.teacherId}, ${a.disciplineId}, ${a.classId}, ${q?.quota ?? 0}, 0, 'pending')
        ON CONFLICT (exam_id, teacher_id, discipline_id, class_id) DO NOTHING
      `;
    }

    revalidatePath("/dashboard/simulados");
    revalidatePath("/dashboard");
    return { success: "Simulado criado.", examId };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao criar simulado." };
  }
}

export async function excluirSimulado(examId: number): Promise<ActionResult> {
  try {
    await prisma.$executeRaw`DELETE FROM samba_edvance.exams WHERE id = ${examId}`;
    revalidatePath("/dashboard/simulados");
    revalidatePath("/dashboard");
    return { success: "Simulado excluído." };
  } catch {
    return { error: "Erro ao excluir simulado." };
  }
}

// ─── Helpers para selects ─────────────────────────────────────────────────────

export async function getAllClasses() {
  return prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT id, name FROM samba_school.school_classes ORDER BY name
  `;
}

export async function getTeachersForClassDiscipline(classId: number, disciplineId: number) {
  return prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT u.id, u.name
    FROM samba_school.teacher_assignments ta
    JOIN samba_school.users u ON u.id = ta.user_id
    WHERE ta.class_id = ${classId} AND ta.discipline_id = ${disciplineId}
    ORDER BY u.name
  `;
}

export async function listarAlunosDaTurma(classId: number) {
  return prisma.$queryRaw<Array<{ id: number; ra: string; name: string; class_name: string }>>`
    SELECT s.id, s.ra, s.name, c.name AS class_name
    FROM samba_school.students s
    JOIN samba_school.school_classes c ON c.id = s.class_id
    WHERE s.class_id = ${classId} AND s.is_active = TRUE
    ORDER BY s.name
  `;
}

export async function getTeachersAll() {
  return prisma.$queryRaw<Array<{ id: number; name: string; email: string }>>`
    SELECT u.id, u.name, u.email
    FROM samba_school.users u
    JOIN samba_school.user_roles ur ON ur.user_id = u.id
    JOIN samba_school.roles r ON r.id = ur.role_id
    WHERE r.name IN ('TEACHER', 'COORDINATOR') AND u.is_active = TRUE
    ORDER BY u.name
  `;
}

export async function getSimuladoById(examId: number) {
  const rows = await prisma.$queryRaw<Array<{
    id: number; title: string; area: string | null; status: string;
    options_count: number; answer_source: string; created_at: Date;
    created_by: number | null; creator_name: string | null;
  }>>`
    SELECT e.id, e.title, e.area, e.status, e.options_count, e.answer_source,
           e.created_at, e.created_by, u.name AS creator_name
    FROM samba_edvance.exams e
    LEFT JOIN samba_school.users u ON u.id = e.created_by
    WHERE e.id = ${examId}
  `;
  return rows[0] ?? null;
}

export async function getSimulados() {
  return prisma.$queryRaw<Array<{
    id: number; title: string; status: string; created_at: Date;
    class_count: bigint; question_count: bigint; creator_name: string | null;
  }>>`
    SELECT
      e.id, e.title, e.status, e.created_at,
      COUNT(DISTINCT eca.class_id) AS class_count,
      COUNT(DISTINCT q.id) AS question_count,
      u.name AS creator_name
    FROM samba_edvance.exams e
    LEFT JOIN samba_edvance.exam_class_assignments eca ON eca.exam_id = e.id
    LEFT JOIN samba_edvance.questions q ON q.exam_id = e.id
    LEFT JOIN samba_school.users u ON u.id = e.created_by
    GROUP BY e.id, u.name
    ORDER BY e.created_at DESC
  `;
}

export async function getMatrizesParaWizard() {
  return prisma.$queryRaw<Array<{ id: number; name: string; config_json: string }>>`
    SELECT id, name, config_json FROM samba_edvance.blueprints ORDER BY name ASC
  `;
}

// ─── Submissão de questões (professor) ───────────────────────────────────────

export async function getMyAssignments(examId: number, teacherId: number) {
  return prisma.$queryRaw<Array<{
    class_id: number; class_name: string;
    discipline_id: number; discipline_name: string;
    submitted: number; quota: number; progress_status: string;
  }>>`
    SELECT
      eta.class_id, sc.name AS class_name,
      eta.discipline_id, d.name AS discipline_name,
      COALESCE(etp.submitted, 0) AS submitted,
      COALESCE(etp.quota, 0) AS quota,
      COALESCE(etp.status, 'pending') AS progress_status
    FROM samba_edvance.exam_teacher_assignments eta
    JOIN samba_school.school_classes sc ON sc.id = eta.class_id
    JOIN samba_school.disciplines d ON d.id = eta.discipline_id
    LEFT JOIN samba_edvance.exam_teacher_progress etp
      ON etp.exam_id = eta.exam_id AND etp.teacher_id = ${teacherId}
      AND etp.discipline_id = eta.discipline_id AND etp.class_id = eta.class_id
    WHERE eta.exam_id = ${examId} AND eta.teacher_id = ${teacherId}
    ORDER BY sc.name, d.name
  `;
}

export async function getMyQuestions(examId: number, teacherId: number) {
  return prisma.$queryRaw<Array<{
    id: number; stem: string; state: string; correct_label: string | null;
    created_at: Date; discipline_name: string; class_name: string;
    options: string; images: string;
  }>>`
    SELECT
      q.id, q.stem, q.state, q.correct_label, q.created_at,
      d.name AS discipline_name, sc.name AS class_name,
      COALESCE(
        json_agg(json_build_object('label', qo.label, 'text', qo.text) ORDER BY qo.label)
        FILTER (WHERE qo.id IS NOT NULL),
        '[]'
      )::text AS options,
      q.images
    FROM samba_edvance.questions q
    JOIN samba_school.disciplines d ON d.id = q.discipline_id
    JOIN samba_school.school_classes sc ON sc.id = q.class_id
    LEFT JOIN samba_edvance.question_options qo ON qo.question_id = q.id
    WHERE q.exam_id = ${examId} AND q.teacher_id = ${teacherId}
    GROUP BY q.id, d.name, sc.name
    ORDER BY q.created_at DESC
  `;
}

export async function submeterQuestao(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const examId = Number(formData.get("exam_id"));
  const disciplineId = Number(formData.get("discipline_id"));
  const classId = Number(formData.get("class_id"));
  const stem = formData.get("stem")?.toString().trim();
  const correctLabel = formData.get("correct_label")?.toString() || null;
  const optionsRaw = formData.get("options_json")?.toString();

  if (!stem || !examId || !disciplineId || !classId)
    return { error: "Preencha todos os campos." };

  // Check quota
  const quota = await prisma.$queryRaw<[{ quota: number; submitted: number }]>`
    SELECT COALESCE(edq.quota, 0) AS quota, COALESCE(etp.submitted, 0) AS submitted
    FROM samba_edvance.exam_discipline_quotas edq
    LEFT JOIN samba_edvance.exam_teacher_progress etp
      ON etp.exam_id = edq.exam_id AND etp.teacher_id = ${session.id}
      AND etp.discipline_id = edq.discipline_id AND etp.class_id = ${classId}
    WHERE edq.exam_id = ${examId} AND edq.discipline_id = ${disciplineId}
  `;

  const q = quota[0];
  if (q && q.quota > 0 && q.submitted >= q.quota) {
    return { error: `Cota atingida (${q.quota} questões). Não é possível enviar mais.` };
  }

  try {
    const result = await prisma.$queryRaw<[{ id: number }]>`
      INSERT INTO samba_edvance.questions
        (exam_id, teacher_id, discipline_id, class_id, stem, correct_label, source)
      VALUES
        (${examId}, ${session.id}, ${disciplineId}, ${classId}, ${stem}, ${correctLabel}, 'manual')
      RETURNING id
    `;
    const questionId = result[0].id;

    // Insert options
    if (optionsRaw) {
      const options: Array<{ label: string; text: string }> = JSON.parse(optionsRaw);
      for (const opt of options) {
        if (opt.text.trim()) {
          await prisma.$executeRaw`
            INSERT INTO samba_edvance.question_options (question_id, label, text)
            VALUES (${questionId}, ${opt.label}, ${opt.text})
          `;
        }
      }
    }

    // Update progress
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_teacher_progress
        (exam_id, teacher_id, discipline_id, class_id, quota, submitted, status)
      VALUES (
        ${examId}, ${session.id}, ${disciplineId}, ${classId},
        COALESCE((SELECT quota FROM samba_edvance.exam_discipline_quotas WHERE exam_id = ${examId} AND discipline_id = ${disciplineId}), 0),
        1, 'partial'
      )
      ON CONFLICT (exam_id, teacher_id, discipline_id, class_id) DO UPDATE
      SET submitted = exam_teacher_progress.submitted + 1,
          status = CASE
            WHEN exam_teacher_progress.submitted + 1 >= exam_teacher_progress.quota AND exam_teacher_progress.quota > 0 THEN 'complete'
            ELSE 'partial'
          END,
          updated_at = NOW()
    `;

    // Log
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_progress_log
        (exam_id, teacher_id, discipline_id, class_id, question_id, event_type, submitted_snap)
      SELECT ${examId}, ${session.id}, ${disciplineId}, ${classId}, ${questionId}, 'QUESTION_ADDED',
             submitted
      FROM samba_edvance.exam_teacher_progress
      WHERE exam_id = ${examId} AND teacher_id = ${session.id}
        AND discipline_id = ${disciplineId} AND class_id = ${classId}
    `;

    revalidatePath(`/dashboard/simulados/${examId}/questoes`);
    revalidatePath("/dashboard");
    return { success: "Questão enviada com sucesso." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao enviar questão." };
  }
}

export async function uploadManualImage(
  formData: FormData
): Promise<ActionResult & { url?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const file = formData.get("file") as File | null;
  const examId = Number(formData.get("exam_id") ?? 0);
  if (!file) return { error: "Arquivo não enviado." };
  if (!examId) return { error: "Simulado inválido." };

  const ext = path.extname(file.name).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    return { error: "Formato não suportado. Use PNG, JPG ou WebP." };
  }

  if (file.size === 0) return { error: "Arquivo vazio." };

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", `exam-${examId}`, "manual");
    fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `img_${Date.now()}${ext}`;
    const dest = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    return { success: "Imagem enviada.", url: `/uploads/exam-${examId}/manual/${filename}` };
  } catch (e: any) {
    console.error("[uploadManualImage]", e);
    return { error: `Erro ao salvar imagem: ${e?.message ?? "desconhecido"}` };
  }
}

export async function submeterQuestaoParaTurmas(data: {
  examId: number;
  targets: Array<{ classId: number; disciplineId: number }>;
  stem: string;
  correctLabel: string | null;
  options: Array<{ label: string; text: string }>;
  images?: string[] | { stem: string[]; options: Record<string, string[]> };
}): Promise<ActionResult & { count?: number }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  if (!data.stem?.trim()) return { error: "Enunciado é obrigatório." };
  if (data.targets.length === 0) return { error: "Selecione pelo menos uma turma." };


  const imagesJson = JSON.stringify(data.images ?? []);
  let inserted = 0;
  for (const t of data.targets) {
    // Check quota
    const quota = await prisma.$queryRaw<[{ quota: number; submitted: number }]>`
      SELECT COALESCE(edq.quota, 0) AS quota, COALESCE(etp.submitted, 0) AS submitted
      FROM samba_edvance.exam_discipline_quotas edq
      LEFT JOIN samba_edvance.exam_teacher_progress etp
        ON etp.exam_id = edq.exam_id AND etp.teacher_id = ${session.id}
        AND etp.discipline_id = edq.discipline_id AND etp.class_id = ${t.classId}
      WHERE edq.exam_id = ${data.examId} AND edq.discipline_id = ${t.disciplineId}
    `;
    const q = quota[0];
    if (q && q.quota > 0 && q.submitted >= q.quota) continue; // skip full slots silently

    try {
      const result = await prisma.$queryRaw<[{ id: number }]>`
        INSERT INTO samba_edvance.questions
          (exam_id, teacher_id, discipline_id, class_id, stem, correct_label, source, images)
        VALUES
          (${data.examId}, ${session.id}, ${t.disciplineId}, ${t.classId},
           ${data.stem.trim()}, ${data.correctLabel}, 'manual', ${imagesJson})
        RETURNING id
      `;
      const questionId = result[0].id;

      for (const opt of data.options) {
        if (opt.text.trim()) {
          await prisma.$executeRaw`
            INSERT INTO samba_edvance.question_options (question_id, label, text)
            VALUES (${questionId}, ${opt.label}, ${opt.text})
          `;
        }
      }

      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_teacher_progress
          (exam_id, teacher_id, discipline_id, class_id, quota, submitted, status)
        VALUES (
          ${data.examId}, ${session.id}, ${t.disciplineId}, ${t.classId},
          COALESCE((SELECT quota FROM samba_edvance.exam_discipline_quotas
                    WHERE exam_id = ${data.examId} AND discipline_id = ${t.disciplineId}), 0),
          1, 'partial'
        )
        ON CONFLICT (exam_id, teacher_id, discipline_id, class_id) DO UPDATE
        SET submitted = exam_teacher_progress.submitted + 1,
            status = CASE
              WHEN exam_teacher_progress.submitted + 1 >= exam_teacher_progress.quota
                   AND exam_teacher_progress.quota > 0 THEN 'complete'
              ELSE 'partial'
            END,
            updated_at = NOW()
      `;

      await prisma.$executeRaw`
        INSERT INTO samba_edvance.exam_progress_log
          (exam_id, teacher_id, discipline_id, class_id, question_id, event_type, submitted_snap)
        SELECT ${data.examId}, ${session.id}, ${t.disciplineId}, ${t.classId},
               ${questionId}, 'QUESTION_ADDED', submitted
        FROM samba_edvance.exam_teacher_progress
        WHERE exam_id = ${data.examId} AND teacher_id = ${session.id}
          AND discipline_id = ${t.disciplineId} AND class_id = ${t.classId}
      `;

      inserted++;
    } catch (e) {
      console.error(e);
    }
  }

  if (inserted === 0) return { error: "Nenhuma questão enviada. Verifique as cotas." };

  revalidatePath(`/dashboard/simulados/${data.examId}`);
  revalidatePath("/dashboard");
  return {
    success: inserted === 1
      ? "Questão enviada com sucesso."
      : `Questão enviada para ${inserted} turma(s).`,
    count: inserted,
  };
}

export async function parsearDocx(
  formData: FormData
): Promise<ActionResult & { questions?: import("./docx-parser").ParsedQuestion[] }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Arquivo não enviado." };

  try {
    const { parseDocxBuffer } = await import("./docx-parser");
    const buffer = Buffer.from(await file.arrayBuffer());
    const examId = Number(formData.get("exam_id") ?? 0);
    const questions = await parseDocxBuffer(buffer, examId);
    if (questions.length === 0) return { error: "Nenhuma questão encontrada no arquivo." };
    return { success: `${questions.length} questão(ões) encontrada(s).`, questions };
  } catch (e: any) {
    console.error(e);
    return { error: e?.message ?? "Erro ao processar arquivo." };
  }
}

export async function importarQuestoesDocx(data: {
  examId: number;
  questions: Array<{
    stem: string;
    correctLabel: string | null;
    options: Array<{ label: string; text: string }>;
    images?: string[];
  }>;
  targets: Array<{ classId: number; disciplineId: number }>;
}): Promise<ActionResult & { count?: number }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  if (data.questions.length === 0) return { error: "Nenhuma questão para importar." };
  if (data.targets.length === 0) return { error: "Selecione pelo menos uma turma." };

  // Garante coluna images

  let inserted = 0;

  for (const q of data.questions) {
    const imagesJson = JSON.stringify(q.images ?? []);
    for (const t of data.targets) {
      // Check quota
      const quotaRows = await prisma.$queryRaw<[{ quota: number; submitted: number }]>`
        SELECT COALESCE(edq.quota, 0) AS quota, COALESCE(etp.submitted, 0) AS submitted
        FROM samba_edvance.exam_discipline_quotas edq
        LEFT JOIN samba_edvance.exam_teacher_progress etp
          ON etp.exam_id = edq.exam_id AND etp.teacher_id = ${session.id}
          AND etp.discipline_id = edq.discipline_id AND etp.class_id = ${t.classId}
        WHERE edq.exam_id = ${data.examId} AND edq.discipline_id = ${t.disciplineId}
      `;
      const qr = quotaRows[0];
      if (qr && qr.quota > 0 && qr.submitted >= qr.quota) continue;

      try {
        const result = await prisma.$queryRaw<[{ id: number }]>`
          INSERT INTO samba_edvance.questions
            (exam_id, teacher_id, discipline_id, class_id, stem, correct_label, source, images)
          VALUES
            (${data.examId}, ${session.id}, ${t.disciplineId}, ${t.classId},
             ${q.stem}, ${q.correctLabel}, 'docx', ${imagesJson})
          RETURNING id
        `;
        const questionId = result[0].id;

        for (const opt of q.options) {
          if (opt.text.trim()) {
            await prisma.$executeRaw`
              INSERT INTO samba_edvance.question_options (question_id, label, text)
              VALUES (${questionId}, ${opt.label}, ${opt.text})
            `;
          }
        }

        await prisma.$executeRaw`
          INSERT INTO samba_edvance.exam_teacher_progress
            (exam_id, teacher_id, discipline_id, class_id, quota, submitted, status)
          VALUES (
            ${data.examId}, ${session.id}, ${t.disciplineId}, ${t.classId},
            COALESCE((SELECT quota FROM samba_edvance.exam_discipline_quotas
                      WHERE exam_id = ${data.examId} AND discipline_id = ${t.disciplineId}), 0),
            1, 'partial'
          )
          ON CONFLICT (exam_id, teacher_id, discipline_id, class_id) DO UPDATE
          SET submitted = exam_teacher_progress.submitted + 1,
              status = CASE
                WHEN exam_teacher_progress.submitted + 1 >= exam_teacher_progress.quota
                     AND exam_teacher_progress.quota > 0 THEN 'complete'
                ELSE 'partial'
              END,
              updated_at = NOW()
        `;

        inserted++;
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (inserted === 0) return { error: "Nenhuma questão importada. Verifique as cotas." };

  revalidatePath(`/dashboard/simulados/${data.examId}`);
  revalidatePath("/dashboard");
  return {
    success: `${inserted} questão(ões) importada(s) com sucesso.`,
    count: inserted,
  };
}

export async function excluirQuestao(
  questionId: number,
  examId: number,
  teacherId: number
): Promise<ActionResult> {
  try {
    const q = await prisma.$queryRaw<[{ discipline_id: number; class_id: number }]>`
      SELECT discipline_id, class_id FROM samba_edvance.questions
      WHERE id = ${questionId}
    `;
    if (!q[0]) return { error: "Questão não encontrada." };

    await prisma.$executeRaw`DELETE FROM samba_edvance.questions WHERE id = ${questionId}`;

    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress
      SET submitted = GREATEST(submitted - 1, 0),
          status = CASE
            WHEN GREATEST(submitted - 1, 0) = 0 THEN 'pending'
            WHEN GREATEST(submitted - 1, 0) >= quota AND quota > 0 THEN 'complete'
            ELSE 'partial'
          END,
          updated_at = NOW()
      WHERE exam_id = ${examId} AND teacher_id = ${teacherId}
        AND discipline_id = ${q[0].discipline_id} AND class_id = ${q[0].class_id}
    `;

    revalidatePath(`/dashboard/simulados/${examId}/questoes`);
    revalidatePath("/dashboard");
    return { success: "Questão removida." };
  } catch {
    return { error: "Erro ao remover questão." };
  }
}

// ─── Excluir todas as questões do professor (não aprovadas) ───────────────────

export async function excluirMinhasQuestoes(examId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  const teacherId = session.id;

  try {
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.question_options
      WHERE question_id IN (
        SELECT id FROM samba_edvance.questions
        WHERE exam_id = ${examId} AND teacher_id = ${teacherId}
          AND state != 'approved'
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.questions
      WHERE exam_id = ${examId} AND teacher_id = ${teacherId}
        AND state != 'approved'
    `;
    // Recalcula submitted = questões aprovadas restantes por turma/disciplina
    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress etp
      SET submitted = (
            SELECT COUNT(*) FROM samba_edvance.questions q
            WHERE q.exam_id = etp.exam_id AND q.teacher_id = ${teacherId}
              AND q.discipline_id = etp.discipline_id AND q.class_id = etp.class_id
          ),
          status = CASE
            WHEN (SELECT COUNT(*) FROM samba_edvance.questions q
                  WHERE q.exam_id = etp.exam_id AND q.teacher_id = ${teacherId}
                    AND q.discipline_id = etp.discipline_id AND q.class_id = etp.class_id) = 0
                 THEN 'pending'
            WHEN (SELECT COUNT(*) FROM samba_edvance.questions q
                  WHERE q.exam_id = etp.exam_id AND q.teacher_id = ${teacherId}
                    AND q.discipline_id = etp.discipline_id AND q.class_id = etp.class_id) >= quota
                 AND quota > 0
                 THEN 'complete'
            ELSE 'partial'
          END,
          updated_at = NOW()
      WHERE exam_id = ${examId} AND teacher_id = ${teacherId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    revalidatePath("/dashboard");
    return { success: "Questões removidas com sucesso." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao remover questões." };
  }
}

// ─── Finalizar envios (professor) ─────────────────────────────────────────────

export async function finalizarEnviosProfessor(examId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  if (session.role !== "TEACHER") return { error: "Acesso restrito a professores." };

  try {
    // Marca todos os progresses do professor neste simulado como 'done'
    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress
      SET status = 'done', updated_at = NOW()
      WHERE exam_id = ${examId} AND teacher_id = ${session.id}
    `;

    // Busca título do simulado para a notificação
    const exams = await prisma.$queryRaw<[{ title: string; created_by: number | null }]>`
      SELECT title, created_by FROM samba_edvance.exams WHERE id = ${examId}
    `;
    const exam = exams[0];
    const link = `/dashboard/simulados/${examId}`;

    if (exam?.created_by) {
      await notifyUser(
        exam.created_by,
        `Professor finalizou envios`,
        `${session.name} finalizou o envio de questões para o simulado "${exam.title}".`,
        link
      );
    }
    await notifyCoordinators(
      `Professor finalizou envios`,
      `${session.name} finalizou o envio de questões para o simulado "${exam?.title ?? examId}".`,
      link
    );

    revalidatePath(`/dashboard/simulados/${examId}`);
    revalidatePath("/dashboard");
    return { success: "Envios finalizados. O coordenador foi notificado." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao finalizar envios." };
  }
}

// ─── Limpar todas as questões de um simulado ──────────────────────────────────

export async function limparTodasQuestoes(examId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") {
    return { error: "Acesso restrito." };
  }
  try {
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.question_options
      WHERE question_id IN (
        SELECT id FROM samba_edvance.questions WHERE exam_id = ${examId}
      )
    `;
    await prisma.$executeRaw`
      DELETE FROM samba_edvance.questions WHERE exam_id = ${examId}
    `;
    // Reset progress counters
    await prisma.$executeRaw`
      UPDATE samba_edvance.exam_teacher_progress
      SET submitted = 0, status = 'pending', updated_at = NOW()
      WHERE exam_id = ${examId}
    `;
    revalidatePath(`/dashboard/simulados/${examId}`);
    revalidatePath("/dashboard");
    return { success: "Todas as questões foram removidas." };
  } catch (e) {
    console.error(e);
    return { error: "Erro ao limpar questões." };
  }
}
