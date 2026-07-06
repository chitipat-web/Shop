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
        <p className="mb-2 text-sm font-medium text-neutral-500">ซื้อที่ร้าน</p>
        <div className="grid grid-cols-2 gap-3">
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setStoreId(store.id)}
              className={`rounded-2xl border-2 px-3 py-4 text-base font-semibold transition active:scale-[0.98] ${
                storeId === store.id
                  ? "border-teal-500 bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-800 shadow-md shadow-teal-600/10"
                  : "border-transparent bg-white text-neutral-700 shadow-sm"
              }`}
            >
              <span className="block text-2xl leading-none">
                {store.has_receipt ? "🧾" : "✏️"}
              </span>
              <span className="mt-1.5 block">{store.name}</span>
              <span
                className={`mt-0.5 block text-xs font-normal ${
                  storeId === store.id ? "text-teal-600" : "text-neutral-400"
                }`}
              >
                {store.has_receipt ? "มีบิล" : "ไม่มีบิล"}
              </span>
            </button>
          ))}
        </div>
        {selectedStore && !selectedStore.has_receipt && (
          <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            💡 ร้านนี้ไม่มีบิล — จดตอนนี้เลยกันลืม ใส่โน้ตสั้น ๆ ก็ช่วยได้
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">
          ยอดเงิน (บาท)
        </p>
        <div className="flex items-center rounded-2xl bg-white px-5 shadow-sm ring-2 ring-transparent transition focus-within:ring-teal-500">
          <span className="text-2xl font-semibold text-neutral-300">฿</span>
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            required
            className="w-full bg-transparent px-2 py-4 text-center text-4xl font-bold tracking-tight outline-none placeholder:text-neutral-200"
          />
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">ใครจ่าย</p>
        <div className="flex rounded-2xl bg-neutral-200/60 p-1.5">
          {persons.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setPayerId(person.id)}
              className={`flex-1 rounded-xl py-2.5 text-base font-semibold transition active:scale-[0.98] ${
                payerId === person.id
                  ? "bg-white text-teal-700 shadow"
                  : "text-neutral-500"
              }`}
            >
              {person.id === 1 ? "🧑‍💼 " : "🧑‍🍳 "}
              {person.name}
            </button>
          ))}
        </div>
      </section>

      {showMore ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <label className="text-sm font-medium text-neutral-500">
            วันที่
            <input
              name="date"
              type="date"
              defaultValue={today}
              className="mt-1 w-full rounded-xl border-2 border-neutral-100 bg-white px-3 py-2.5 text-base font-normal text-neutral-800 outline-none focus:border-teal-500"
            />
          </label>
          <label className="text-sm font-medium text-neutral-500">
            โน้ต (เช่น ผัก+ไข่+หมู)
            <input
              name="note"
              type="text"
              placeholder="ซื้ออะไรมาบ้าง"
              className="mt-1 w-full rounded-xl border-2 border-neutral-100 bg-white px-3 py-2.5 text-base font-normal text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-teal-500"
            />
          </label>
        </section>
      ) : (
        <>
          <input type="hidden" name="date" value={today} />
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="self-start text-sm font-medium text-teal-700 underline underline-offset-4"
          >
            + วันที่ย้อนหลัง / ใส่โน้ต
          </button>
        </>
      )}

      <button
        type="submit"
        className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-teal-600/30 transition active:scale-[0.98]"
      >
        บันทึก
      </button>
    </form>
  );
}
