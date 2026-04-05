/**
 * GET /api/exams/[id]/pdf?type=booklet|omr&class_id=<n>
 *
 * Gera e retorna o PDF do caderno ou folha de respostas para um simulado/turma.
 * type=booklet  → caderno de questões
 * type=omr      → folha de respostas
 * class_id (opcional) → filtra questões por turma; sem class_id usa todas aprovadas
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildBooklet, buildAnswerSheet, ExamData, QuestionData, StudentInfo } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const isCoordinator = session.role === "ADMIN" || session.role === "COORDINATOR";
  if (!isCoordinator) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const { id } = await params;
  const examId = Number(id);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "booklet";
  const classId = url.searchParams.get("class_id") ? Number(url.searchParams.get("class_id")) : null;
  const studentId = url.searchParams.get("student_id") ? Number(url.searchParams.get("student_id")) : null;
  const blank = url.searchParams.get("blank") === "1";

  // ── Busca dados do simulado ───────────────────────────────────────────────
  const examRows = await prisma.$queryRaw<Array<{
    id: number; title: string; area: string | null; status: string;
    options_count: number;
  }>>`
    SELECT id, title, area, status, options_count
    FROM samba_edvance.exams WHERE id = ${examId}
  `;
  const exam = examRows[0];
  if (!exam) {
    return NextResponse.json({ error: "Simulado não encontrado." }, { status: 404 });
  }

  // ── Busca questões aprovadas ──────────────────────────────────────────────
  const filteredRows = classId
    ? await prisma.$queryRaw<Array<{
        id: number; stem: string; correct_label: string | null; images: string;
        class_id: number; discipline_id: number; discipline_name: string;
      }>>`
        SELECT q.id, q.stem, q.correct_label, q.images, q.class_id, q.discipline_id,
               d.name AS discipline_name
        FROM samba_edvance.questions q
        JOIN samba_school.disciplines d ON d.id = q.discipline_id
        WHERE q.exam_id = ${examId}
          AND q.state = 'approved'
          AND q.class_id = ${classId}
        ORDER BY d.name, q.id
      `
    : await prisma.$queryRaw<Array<{
        id: number; stem: string; correct_label: string | null; images: string;
        class_id: number; discipline_id: number; discipline_name: string;
      }>>`
        SELECT q.id, q.stem, q.correct_label, q.images, q.class_id, q.discipline_id,
               d.name AS discipline_name
        FROM samba_edvance.questions q
        JOIN samba_school.disciplines d ON d.id = q.discipline_id
        WHERE q.exam_id = ${examId}
          AND q.state = 'approved'
        ORDER BY d.name, q.id
      `;

  // ── Busca opções de cada questão ──────────────────────────────────────────
  const qIds = filteredRows.map((r: { id: number }) => r.id);
  let optionRows: Array<{ question_id: number; label: string; text: string }> = [];

  if (qIds.length > 0) {
    optionRows = await prisma.$queryRaw<Array<{
      question_id: number; label: string; text: string;
    }>>`
      SELECT question_id, label, text
      FROM samba_edvance.question_options
      WHERE question_id = ANY(${qIds}::int[])
      ORDER BY label
    `;
  }

  // Monta mapa id → opções
  const optMap = new Map<number, Array<{ label: string; text: string }>>();
  for (const opt of optionRows) {
    if (!optMap.has(opt.question_id)) optMap.set(opt.question_id, []);
    optMap.get(opt.question_id)!.push({ label: opt.label, text: opt.text });
  }

  // Monta lista de questões numeradas
  const questions: QuestionData[] = filteredRows.map((r, i) => {
    let stemImages: string[] = [];
    let optionImagesMap: Record<string, string[]> = {};
    try {
      const parsed = JSON.parse(r.images ?? "[]");
      if (Array.isArray(parsed)) {
        // Formato legado: array plano — tudo vai para o enunciado
        stemImages = parsed;
      } else if (parsed && typeof parsed === "object" && "stem" in parsed) {
        // Formato estruturado
        stemImages = parsed.stem ?? [];
        optionImagesMap = parsed.options ?? {};
      }
    } catch { /* */ }
    return {
      number: i + 1,
      stem: r.stem,
      correct_label: r.correct_label,
      options: (optMap.get(r.id) ?? []).map(opt => ({
        label: opt.label,
        text: opt.text,
        images: optionImagesMap[opt.label] ?? [],
      })),
      images: stemImages,
    };
  });

  const examData: ExamData = {
    id: exam.id,
    title: exam.title,
    area: exam.area,
    options_count: exam.options_count ?? 4,
  };

  // ── Busca alunos (por turma, por aluno individual, ou nenhum = em branco) ──
  let students: StudentInfo[] = [];
  if (studentId) {
    // Um único aluno
    const rows = await prisma.$queryRaw<Array<{ ra: string; name: string; class_name: string }>>`
      SELECT s.ra, s.name, c.name AS class_name
      FROM samba_school.students s
      JOIN samba_school.school_classes c ON c.id = s.class_id
      WHERE s.id = ${studentId}
    `;
    students = rows.map(r => ({ name: r.name, ra: r.ra, className: r.class_name }));
  } else if (classId && !blank) {
    // Todos os alunos da turma
    const rows = await prisma.$queryRaw<Array<{ ra: string; name: string; class_name: string }>>`
      SELECT s.ra, s.name, c.name AS class_name
      FROM samba_school.students s
      JOIN samba_school.school_classes c ON c.id = s.class_id
      WHERE s.class_id = ${classId} AND s.is_active = true
      ORDER BY s.name
    `;
    students = rows.map(r => ({ name: r.name, ra: r.ra, className: r.class_name }));
  }
  // Sem classId nem studentId → PDF em branco (sem dados de aluno)

  // ── Gera o PDF ────────────────────────────────────────────────────────────
  try {
    let pdfBuffer: Buffer;
    let filename: string;

    if (type === "omr") {
      pdfBuffer = await buildAnswerSheet(examData, questions.length, students);
      const suffix = studentId ? `_aluno${studentId}` : classId ? `_turma${classId}` : "_branco";
      filename = `resposta_${sanitize(exam.title)}${suffix}.pdf`;
    } else {
      pdfBuffer = await buildBooklet(examData, questions, students);
      const suffix = studentId ? `_aluno${studentId}` : classId ? `_turma${classId}` : "_branco";
      filename = `caderno_${sanitize(exam.title)}${suffix}.pdf`;
    }

    const uint8 = new Uint8Array(pdfBuffer);
    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8.byteLength.toString(),
      },
    });
  } catch (e: any) {
    console.error("[PDF Route]", e);
    return NextResponse.json(
      { error: "Erro ao gerar PDF.", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
}
