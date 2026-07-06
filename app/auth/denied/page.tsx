import { signOut } from "@/app/auth/actions";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function DeniedPage() {
  const { data: session } = await auth.getSession();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 text-center">
      <p className="text-5xl">🚫</p>
      <div>
        <h1 className="text-xl font-bold">บัญชีนี้ไม่มีสิทธิ์เข้าใช้</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {session?.user?.email
            ? `คุณเข้าสู่ระบบด้วย ${session.user.email}`
            : "แอพนี้เปิดให้เฉพาะสมาชิก 2 คนที่ลงทะเบียนไว้"}
        </p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-xl bg-neutral-800 px-5 py-2.5 text-sm font-semibold text-white active:bg-neutral-700"
        >
          ออกจากระบบ แล้วเข้าด้วยบัญชีอื่น
        </button>
      </form>
    </div>
  );
}
