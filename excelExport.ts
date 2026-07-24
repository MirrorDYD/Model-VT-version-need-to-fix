import { PrEntry } from "./types";

/**
 * Real Syteline procurement planning dataset for Requisition PR 12606C0016 (Kingwhale Corporation),
 * sourced directly from the "KingWhale.xlsx" Syteline export.
 *
 * Source columns:
 * - dueDateStr          <- "Due Date" column        (the item's required arrival date)
 * - prDeliveryDateStr   <- "PR Delivery Date" column (ship-basis date used for grouping/Days Early math)
 *
 * IMPORTANT: dates in the source file are written Day/Month/Year (e.g. "30/9/2026" = 30 Sep 2026,
 * "4/10/2026" = 4 Oct 2026) — NOT Month/Day/Year. The strings below have already been converted to
 * unambiguous ISO YYYY-MM-DD so no re-parsing/guessing is needed when this file loads. (The separate
 * runtime uploader in PrUploader.tsx auto-detects Day/Month/Year vs Month/Day/Year per-column for
 * user-uploaded files, since those arrive as raw strings like "4/10/2026" that ARE ambiguous.)
 */
export const SAMPLE_PR_DATA = [
  { id: "PR-101", itemCode: "CKPXXBX60N018", itemDescription: "KW-M1117", colorCode: "BLK:BLACK", qty: 481.347, unitPrice: 2.75, dueDateStr: "2026-09-30", prDeliveryDateStr: "2026-09-12", cbm: 0.649818045, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-102", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 1181.427, unitPrice: 6.4, dueDateStr: "2026-09-30", prDeliveryDateStr: "2026-09-12", cbm: 6.249749888, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-103", itemCode: "CKXFLE0001000031", itemDescription: "KW-3582A", colorCode: "WSTO:WEATHERED STONE-DARK WEATHERED STON", qty: 771.205, unitPrice: 6.4, dueDateStr: "2026-09-29", prDeliveryDateStr: "2026-09-11", cbm: 4.079676037, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-104", itemCode: "CKXFLE0001100041", itemDescription: "KW-M1117", colorCode: "WSTO:WEATHERED STONE", qty: 14.843, unitPrice: 2.75, dueDateStr: "2026-09-29", prDeliveryDateStr: "2026-09-11", cbm: 0.020037915, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-105", itemCode: "CKXFLE0001100041", itemDescription: "KW-M1117", colorCode: "WSTO:WEATHERED STONE", qty: 431.153, unitPrice: 2.75, dueDateStr: "2026-09-29", prDeliveryDateStr: "2026-09-11", cbm: 0.58205628, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-106", itemCode: "CKPXXBX60N018", itemDescription: "KW-M1117", colorCode: "BLK:BLACK", qty: 77.891, unitPrice: 2.75, dueDateStr: "2026-10-04", prDeliveryDateStr: "2026-09-16", cbm: 0.10515285, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-107", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 229.483, unitPrice: 6.4, dueDateStr: "2026-10-04", prDeliveryDateStr: "2026-09-16", cbm: 1.213962954, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-108", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 19.823, unitPrice: 6.4, dueDateStr: "2026-10-04", prDeliveryDateStr: "2026-09-16", cbm: 0.104865786, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-109", itemCode: "CKXFLE0001000016", itemDescription: "KW-3582A", colorCode: "OLGG:OLD GROWTH GREEN-BLACK X-DYE", qty: 2032.291, unitPrice: 6.4, dueDateStr: "2026-10-04", prDeliveryDateStr: "2026-09-16", cbm: 10.750821506, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-110", itemCode: "CKXFLE0001000031", itemDescription: "KW-3582A", colorCode: "WSTO:WEATHERED STONE-DARK WEATHERED STON", qty: 920.181, unitPrice: 6.4, dueDateStr: "2026-10-02", prDeliveryDateStr: "2026-09-14", cbm: 4.867756432, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-111", itemCode: "CKXFLE0001000041", itemDescription: "KW-3582A", colorCode: "FLBN:FOSSIL BROWN -DARK FOSSIL BROWN X-D", qty: 1020.027, unitPrice: 6.4, dueDateStr: "2026-10-02", prDeliveryDateStr: "2026-09-14", cbm: 6.375166875, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-112", itemCode: "CKXFLE0001000041", itemDescription: "KW-3582A", colorCode: "FLBN:FOSSIL BROWN -DARK FOSSIL BROWN X-D", qty: 280.417, unitPrice: 6.4, dueDateStr: "2026-10-02", prDeliveryDateStr: "2026-09-14", cbm: 1.75260375, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-113", itemCode: "CKXFLE0001100026", itemDescription: "KW-M1117", colorCode: "OLGG : OLD GROWTHGREEN", qty: 645.416, unitPrice: 2.75, dueDateStr: "2026-10-04", prDeliveryDateStr: "2026-09-16", cbm: 0.8713116, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-114", itemCode: "CKXFLE0001100041", itemDescription: "KW-M1117", colorCode: "WSTO:WEATHERED STONE", qty: 133.986, unitPrice: 2.75, dueDateStr: "2026-10-03", prDeliveryDateStr: "2026-09-15", cbm: 0.18088056, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-115", itemCode: "CKXFLE0001100052", itemDescription: "KW-M1117", colorCode: "FLBN:FOSSIL BROWN", qty: 111.979, unitPrice: 2.75, dueDateStr: "2026-10-03", prDeliveryDateStr: "2026-09-15", cbm: 0.151171785, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-116", itemCode: "CKPXXNX60N028", itemDescription: "KW-M1117", colorCode: "NENA:NEW NAVY", qty: 1633.388, unitPrice: 2.75, dueDateStr: "2026-10-05", prDeliveryDateStr: "2026-09-17", cbm: 2.205073125, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-117", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 4787.726, unitPrice: 6.4, dueDateStr: "2026-10-05", prDeliveryDateStr: "2026-09-17", cbm: 25.327072656, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-118", itemCode: "CKPXXBX60N018", itemDescription: "KW-M1117", colorCode: "BLK:BLACK", qty: 37.169, unitPrice: 2.75, dueDateStr: "2026-10-07", prDeliveryDateStr: "2026-09-19", cbm: 0.050177475, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-119", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 262.267, unitPrice: 6.4, dueDateStr: "2026-10-07", prDeliveryDateStr: "2026-09-19", cbm: 1.387391901, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-120", itemCode: "CKPXXBX60N018", itemDescription: "KW-M1117", colorCode: "BLK:BLACK", qty: 120.406, unitPrice: 2.75, dueDateStr: "2026-10-09", prDeliveryDateStr: "2026-09-21", cbm: 0.1625481, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-121", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 840.769, unitPrice: 6.4, dueDateStr: "2026-10-09", prDeliveryDateStr: "2026-09-21", cbm: 4.447665365, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-122", itemCode: "CKPXXNX60N028", itemDescription: "KW-M1117", colorCode: "NENA:NEW NAVY", qty: 116.892, unitPrice: 2.75, dueDateStr: "2026-10-09", prDeliveryDateStr: "2026-09-21", cbm: 0.15780393, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-123", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 813.189, unitPrice: 6.4, dueDateStr: "2026-10-09", prDeliveryDateStr: "2026-09-21", cbm: 4.301767694, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-124", itemCode: "CKXFLE0001100049", itemDescription: "KW-M1117", colorCode: "BLSG:BLUE SAGE", qty: 286.627, unitPrice: 2.75, dueDateStr: "2026-10-08", prDeliveryDateStr: "2026-09-20", cbm: 0.38694672, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-125", itemCode: "CKXFLE0008400002", itemDescription: "KW-3602A", colorCode: "BSGK:BLUE SAGE - SUMMIT BLUE X-DYE", qty: 907.055, unitPrice: 6.7, dueDateStr: "2026-10-08", prDeliveryDateStr: "2026-09-20", cbm: 5.66909375, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-126", itemCode: "CKPXXNX60N028", itemDescription: "KW-M1117", colorCode: "NENA:NEW NAVY", qty: 69.448, unitPrice: 2.75, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.09375426, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-127", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 478.942, unitPrice: 6.4, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 2.53360318, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-128", itemCode: "CKXFLE0001000016", itemDescription: "KW-3582A", colorCode: "OLGG:OLD GROWTH GREEN-BLACK X-DYE", qty: 910.285, unitPrice: 6.4, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 4.815406592, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-129", itemCode: "CKXFLE0001100026", itemDescription: "KW-M1117", colorCode: "OLGG : OLD GROWTHGREEN", qty: 312.679, unitPrice: 2.75, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.422115975, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-130", itemCode: "CKXFLE0001100049", itemDescription: "KW-M1117", colorCode: "BLSG:BLUE SAGE", qty: 110.586, unitPrice: 2.75, dueDateStr: "2026-10-10", prDeliveryDateStr: "2026-09-22", cbm: 0.149290965, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-131", itemCode: "CKXFLE0008400002", itemDescription: "KW-3602A", colorCode: "BSGK:BLUE SAGE - SUMMIT BLUE X-DYE", qty: 324.011, unitPrice: 6.7, dueDateStr: "2026-10-10", prDeliveryDateStr: "2026-09-22", cbm: 2.025065625, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-132", itemCode: "CKPXXNX60N028", itemDescription: "KW-M1117", colorCode: "NENA:NEW NAVY", qty: 28.694, unitPrice: 2.75, dueDateStr: "2026-10-12", prDeliveryDateStr: "2026-09-24", cbm: 0.03873744, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-133", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 286.532, unitPrice: 6.4, dueDateStr: "2026-10-12", prDeliveryDateStr: "2026-09-24", cbm: 1.515756396, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-134", itemCode: "CKXFLE0001100049", itemDescription: "KW-M1117", colorCode: "BLSG:BLUE SAGE", qty: 7.811, unitPrice: 2.75, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.010544715, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-135", itemCode: "CKXFLE0001100049", itemDescription: "KW-M1117", colorCode: "BLSG:BLUE SAGE", qty: 11.1, unitPrice: 2.75, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.014984595, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-136", itemCode: "CKXFLE0008400002", itemDescription: "KW-3602A", colorCode: "BSGK:BLUE SAGE - SUMMIT BLUE X-DYE", qty: 32.522, unitPrice: 6.7, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.203259375, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-137", itemCode: "CKXFLE0008400002", itemDescription: "KW-3602A", colorCode: "BSGK:BLUE SAGE - SUMMIT BLUE X-DYE", qty: 22.886, unitPrice: 6.7, dueDateStr: "2026-10-11", prDeliveryDateStr: "2026-09-23", cbm: 0.143034375, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-138", itemCode: "CKPXXCX60N023", itemDescription: "KW-M1117", colorCode: "NHG:NARWHAL GREY", qty: 1093.676, unitPrice: 2.75, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 1.476462735, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-139", itemCode: "CKPXXCX60N023", itemDescription: "KW-M1117", colorCode: "NHG:NARWHAL GREY", qty: 1047.001, unitPrice: 2.75, dueDateStr: "2026-10-23", prDeliveryDateStr: "2026-10-05", cbm: 1.41345135, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-140", itemCode: "CKPXXCX60N028", itemDescription: "KW-3582A", colorCode: "STH:STONEWASH/NARWHAL GREY X-DYE", qty: 46.361, unitPrice: 6.4, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 0.245250219, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-141", itemCode: "CKPXXCX60N028", itemDescription: "KW-3582A", colorCode: "STH:STONEWASH/NARWHAL GREY X-DYE", qty: 3044.436, unitPrice: 6.4, dueDateStr: "2026-10-23", prDeliveryDateStr: "2026-10-05", cbm: 16.105067498, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-142", itemCode: "CKPXXCX60N028", itemDescription: "KW-3582A", colorCode: "STH:STONEWASH/NARWHAL GREY X-DYE", qty: 3148.14, unitPrice: 6.4, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 16.6536606, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-143", itemCode: "CKPXXNX60N028", itemDescription: "KW-M1117", colorCode: "NENA:NEW NAVY", qty: 197.095, unitPrice: 2.75, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 0.26607852, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-144", itemCode: "CKPXXNX60N030", itemDescription: "KW-3582A", colorCode: "NENA:NEW NAVY/DARK NEW NAVY X-DYE", qty: 1983.771, unitPrice: 6.4, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 10.494149648, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-145", itemCode: "CKPXXBX60N018", itemDescription: "KW-M1117", colorCode: "BLK:BLACK", qty: 1873.061, unitPrice: 2.75, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 2.52863208, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-146", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 3000.0, unitPrice: 6.4, dueDateStr: "2026-10-14", prDeliveryDateStr: "2026-09-26", cbm: 15.87, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
  { id: "PR-147", itemCode: "CKPXXBX60N019", itemDescription: "KW-3582A", colorCode: "BLK:BLACK/BLACK X-DYE", qty: 2485.922, unitPrice: 6.4, dueDateStr: "2026-10-22", prDeliveryDateStr: "2026-10-04", cbm: 13.15052738, moq: 1000, shipFrom: "Taiwan Keelung", transitLeadTimeDays: 18, consolidateWeekdayRaw: "Tuesday, Friday" },
];

export function loadSamplePrEntries(): PrEntry[] {
  const parseIsoDate = (isoStr: string): Date => {
    const [year, month, day] = isoStr.split("-").map(n => parseInt(n, 10));
    return new Date(year, month - 1, day);
  };

  return SAMPLE_PR_DATA.map(item => {
    return {
      id: item.id,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      colorCode: item.colorCode,
      qty: item.qty,
      originalQty: item.qty,
      unitPrice: item.unitPrice,
      // "PR Delivery Date" column -> ship-basis date used for grouping/Days Early math
      prDueDate: parseIsoDate(item.prDeliveryDateStr),
      // "Due Date" column -> the item's true required arrival date, shown separately in reports
      dueDateRaw: parseIsoDate(item.dueDateStr),
      cbm: item.cbm,
      moq: item.moq,
      currency: "USD",
      currencyRate: undefined,
      vendor: "KINGWHALE CORPORATION",
      shipFrom: item.shipFrom,
      transitLeadTimeDays: item.transitLeadTimeDays,
      consolidateWeekdayRaw: item.consolidateWeekdayRaw,
    };
  });
}
