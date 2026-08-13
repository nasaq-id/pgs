export function isTeacherMatch(
  teacherVal: string | { id?: string; nama?: string; namaLengkap?: string } | null | undefined,
  target: string | { id?: string; nama?: string; namaLengkap?: string } | null | undefined
): boolean {
  if (!teacherVal || !target) return false;

  const getId = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.id || '';
  };

  const getName = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.namaLengkap || val?.nama || '';
  };

  const id1 = getId(teacherVal);
  const id2 = getId(target);
  if (id1 && id2 && id1 === id2) return true;

  const name1 = getName(teacherVal).toLowerCase().trim();
  const name2 = getName(target).toLowerCase().trim();
  if (!name1 || !name2) return false;

  // Clean common academic titles for relaxed match
  const cleanTitle = (name: string) => {
    return name
      .replace(/(s\.?pd|m\.?pd|drs|dra|h\.?|hj\.?|st|s\.?kom|s\.?si|ph\.?d|prof|dr\.?)\.?/gi, "")
      .replace(/,\s*/g, "")
      .trim();
  };

  const clean1 = cleanTitle(name1);
  const clean2 = cleanTitle(name2);

  return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1);
}

export function calculateTeacherJP(
  teacher: { id: string; namaLengkap?: string; nama?: string } | null | undefined,
  schedules: Array<{ guruId: string; jpCount: number | null }>,
): number {
  if (!teacher) return 0;
  return schedules
    .filter((s) => s.guruId === teacher.id)
    .reduce((acc, s) => acc + (s.jpCount ?? 0), 0);
}
