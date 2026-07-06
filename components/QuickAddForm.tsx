"use client";

import { useRef, useState } from "react";
import type { Person, Store } from "@/lib/db";
import { addPurchase } from "@/app/actions";
import Avatar from "./Avatar";
import { CameraIcon, PencilIcon, ReceiptIcon, XIcon } from "./icons";

/** Downscale to ≤1280px JPEG so uploads stay small on mobile data. */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "slip.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

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
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedStore = stores.find((s) => s.id === storeId);

  async function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    if (compressed !== file) {
      const dt = new DataTransfer();
      dt.items.add(compressed);
      input.files = dt.files;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(compressed));
  }

  function clearReceipt() {
    if (fileRef.current) fileRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  return (
    <form action={addPurchase} className="flex flex-col gap-5">
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="payer_id" value={payerId} />

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">ซื้อที่ร้าน</p>
        <div className="grid grid-cols-2 gap-3">
          {stores.map((store) => {
            const active = storeId === store.id;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => setStoreId(store.id)}
                className={`rounded-2xl px-3 py-4 text-base font-semibold transition active:scale-[0.98] ${
                  active
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-600/30"
                    : "bg-white text-neutral-700 shadow-sm ring-1 ring-black/5"
                }`}
              >
                <span
                  className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${
                    active ? "bg-white/15" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {store.has_receipt ? (
                    <ReceiptIcon className="h-5 w-5" />
                  ) : (
                    <PencilIcon className="h-5 w-5" />
                  )}
                </span>
                <span className="mt-2 block truncate">{store.name}</span>
                <span
                  className={`mt-0.5 block text-xs font-normal ${
                    active ? "text-teal-100" : "text-neutral-400"
                  }`}
                >
                  {store.has_receipt ? "มีบิล" : "ไม่มีบิล"}
                </span>
              </button>
            );
          })}
        </div>
        {selectedStore && !selectedStore.has_receipt && (
          <p className="mt-2.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
            ร้านนี้ไม่มีบิล — จดตอนนี้เลยกันลืม ใส่โน้ตสั้น ๆ ก็ช่วยได้
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">
          ยอดเงิน (บาท)
        </p>
        <div className="flex items-center rounded-2xl bg-white px-5 shadow-sm ring-1 ring-black/5 transition focus-within:ring-2 focus-within:ring-teal-500">
          <span className="text-2xl font-semibold text-neutral-300">฿</span>
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            required
            className="w-full bg-transparent px-2 py-4 text-center text-4xl font-bold tabular-nums tracking-tight outline-none placeholder:text-neutral-200"
          />
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-neutral-500">ใครจ่าย</p>
        <div className="flex rounded-2xl bg-neutral-200/50 p-1.5 ring-1 ring-black/5">
          {persons.map((person) => {
            const active = payerId === person.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setPayerId(person.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-base font-semibold transition active:scale-[0.98] ${
                  active ? "bg-white text-neutral-800 shadow" : "text-neutral-400"
                }`}
              >
                <Avatar name={person.name} personId={person.id} />
                <span className="truncate">{person.name}</span>
                {person.id === currentPersonId && (
                  <span
                    className={`rounded-md px-1 py-0.5 text-[10px] font-medium ${
                      active
                        ? "bg-teal-50 text-teal-700"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    คุณ
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <input
          ref={fileRef}
          type="file"
          name="receipt"
          accept="image/*"
          onChange={onPickReceipt}
          className="hidden"
        />
        {preview ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="สลิปที่แนบ"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <span className="flex-1 text-sm font-medium text-neutral-600">
              แนบสลิปแล้ว ✓
            </span>
            <button
              type="button"
              onClick={clearReceipt}
              aria-label="ลบรูปที่แนบ"
              className="rounded-lg p-2 text-neutral-400 active:bg-red-50 active:text-red-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 py-3.5 text-sm font-medium text-neutral-500 transition active:scale-[0.99] active:bg-white"
          >
            <CameraIcon className="h-5 w-5" />
            แนบสลิป / รูปบิล (ไม่บังคับ)
          </button>
        )}
      </section>

      {showMore ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <label className="text-sm font-medium text-neutral-500">
            วันที่
            <input
              name="date"
              type="date"
              defaultValue={today}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base font-normal text-neutral-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </label>
          <label className="text-sm font-medium text-neutral-500">
            โน้ต (เช่น ผัก+ไข่+หมู)
            <input
              name="note"
              type="text"
              placeholder="ซื้ออะไรมาบ้าง"
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base font-normal text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </label>
        </section>
      ) : (
        <>
          <input type="hidden" name="date" value={today} />
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="self-start text-sm font-medium text-teal-700"
          >
            + วันที่ย้อนหลัง / ใส่โน้ต
          </button>
        </>
      )}

      <button
        type="submit"
        className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-teal-600/30 transition active:scale-[0.98]"
      >
        บันทึก
      </button>
    </form>
  );
}
