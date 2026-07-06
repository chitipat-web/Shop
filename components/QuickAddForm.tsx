"use client";

import { useState } from "react";
import type { Person, Store } from "@/lib/db";
import { addPurchase } from "@/app/actions";

export default function QuickAddForm({
  stores,
  persons,
  today,
  currentPersonId,
}: {
  stores: Store[];
  persons: Person[];
  today: string;
  currentPersonId: number;
}) {
  const [storeId, setStoreId] = useState(stores[0]?.id ?? 0);
  // Default the payer to whoever is logged in — they can still tap the other.
  const [payerId, setPayerId] = useState(currentPersonId);
  const [showMore, setShowMore] = useState(false);

  const selectedStore = stores.find((s) => s.id === storeId);

  return (
    <form action={addPurchase} className="flex flex-col gap-5">
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="payer_id" value={payerId} />

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-600">ซื้อที่ร้าน</p>
        <div className="grid grid-cols-2 gap-2">
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setStoreId(store.id)}
              className={`rounded-xl border-2 px-3 py-4 text-base font-semibold ${
                storeId === store.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {store.name}
              <span className="mt-1 block text-xs font-normal text-neutral-500">
                {store.has_receipt ? "🧾 มีบิล" : "✏️ ไม่มีบิล"}
              </span>
            </button>
          ))}
        </div>
        {selectedStore && !selectedStore.has_receipt && (
          <p className="mt-2 text-xs text-amber-700">
            ร้านนี้ไม่มีบิล — จดตอนนี้เลยกันลืม ใส่โน้ตสั้น ๆ ก็ช่วยได้
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-600">ยอดเงิน (บาท)</p>
        <input
          name="amount"
          type="text"
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
          required
          className="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-4 text-center text-3xl font-bold outline-none focus:border-teal-600"
        />
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-600">ใครจ่าย</p>
        <div className="grid grid-cols-2 gap-2">
          {persons.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setPayerId(person.id)}
              className={`rounded-xl border-2 px-3 py-3 text-base font-semibold ${
                payerId === person.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {person.name}
            </button>
          ))}
        </div>
      </section>

      {showMore ? (
        <section className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-600">
            วันที่
            <input
              name="date"
              type="date"
              defaultValue={today}
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-600"
            />
          </label>
          <label className="text-sm font-medium text-neutral-600">
            โน้ต (เช่น ผัก+ไข่+หมู)
            <input
              name="note"
              type="text"
              placeholder="ซื้ออะไรมาบ้าง"
              className="mt-1 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-600"
            />
          </label>
        </section>
      ) : (
        <>
          <input type="hidden" name="date" value={today} />
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="self-start text-sm text-teal-700 underline underline-offset-2"
          >
            + วันที่ย้อนหลัง / ใส่โน้ต
          </button>
        </>
      )}

      <button
        type="submit"
        className="rounded-xl bg-teal-600 py-4 text-lg font-bold text-white active:bg-teal-700"
      >
        บันทึก
      </button>
    </form>
  );
}
