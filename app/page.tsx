import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { todayBangkok } from "@/lib/format";
import QuickAddForm from "@/components/QuickAddForm";

export const dynamic = "force-dynamic";

export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { personId } = await requireUser();
  const db = await getDb();
  const [stores, persons] = await Promise.all([
    db.getStores(),
    db.getPersons(),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">บันทึกของที่ซื้อ</h1>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          กรอกไม่ครบหรือยอดเงินไม่ถูกต้อง ลองใหม่อีกครั้งครับ
        </p>
      )}
      <QuickAddForm
        stores={stores}
        persons={persons}
        today={todayBangkok()}
        currentPersonId={personId}
      />
    </div>
  );
}
