import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { addStore, updatePersonNames, updateStore } from "@/app/actions";
import { signOut } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const user = await requireUser();
  const db = await getDb();
  const [persons, stores] = await Promise.all([
    db.getPersons(),
    db.getStores(),
  ]);

  const inputCls =
    "w-full rounded-xl border-2 border-neutral-100 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">ตั้งค่า</h1>

      {saved && (
        <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
          ✓ บันทึกแล้ว
        </p>
      )}

      <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">👥 ชื่อสมาชิก 2 คน</h2>
        <form action={updatePersonNames} className="flex flex-col gap-3">
          {persons.map((person) => (
            <input
              key={person.id}
              name={`person_${person.id}`}
              defaultValue={person.name}
              required
              className={inputCls}
            />
          ))}
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 py-2.5 font-semibold text-white shadow-md shadow-teal-600/20 transition active:scale-[0.98]"
          >
            บันทึกชื่อ
          </button>
        </form>
      </section>

      <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">🏪 ร้านค้า</h2>
        <div className="flex flex-col gap-4">
          {stores.map((store) => (
            <form
              key={store.id}
              action={updateStore}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="id" value={store.id} />
              <input
                name="name"
                defaultValue={store.name}
                required
                className={`min-w-0 flex-1 ${inputCls}`}
              />
              <label className="flex shrink-0 items-center gap-1 text-sm text-neutral-500">
                <input
                  type="checkbox"
                  name="has_receipt"
                  defaultChecked={!!store.has_receipt}
                  className="accent-teal-600"
                />
                มีบิล
              </label>
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-600 transition active:bg-neutral-200"
              >
                บันทึก
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">➕ เพิ่มร้านใหม่</h2>
        <form action={addStore} className="flex items-center gap-2">
          <input
            name="name"
            placeholder="ชื่อร้าน"
            required
            className={`min-w-0 flex-1 ${inputCls} placeholder:text-neutral-300`}
          />
          <label className="flex shrink-0 items-center gap-1 text-sm text-neutral-500">
            <input type="checkbox" name="has_receipt" className="accent-teal-600" />
            มีบิล
          </label>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition active:scale-[0.98]"
          >
            เพิ่ม
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold">🔐 บัญชีผู้ใช้</h2>
        <p className="mb-3 text-sm text-neutral-500">
          เข้าสู่ระบบด้วย {user.email}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-600 transition active:bg-neutral-200"
          >
            ออกจากระบบ
          </button>
        </form>
      </section>
    </div>
  );
}
