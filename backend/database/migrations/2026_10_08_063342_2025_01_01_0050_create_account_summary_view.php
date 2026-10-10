<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_account_summary");
        DB::statement("DROP VIEW IF EXISTS v_account_journal_detail");

        // ============================================================
        // ویو اصلی خلاصه حساب‌ها (سازگار با SQLite)
        //
        // منطق:
        //   - journals.amount = پرداخت واقعی (همیشه debit در syncFee)
        //   - total_amount (فیس کل) از جدول اصلی می‌آید
        //   - balance = total_amount - paid_amount
        // ============================================================
        DB::statement(<<<'SQL'
            CREATE VIEW v_account_summary AS
            SELECT
                sub.account_key,
                sub.account_id,
                sub.account_type,
                sub.account_name,
                sub.tazkira_number,
                SUM(sub.journal_count)   AS journal_count,
                SUM(sub.paid_amount)     AS total_credit,
                SUM(sub.total_amount)    AS total_debit,
                SUM(sub.total_amount) - SUM(sub.paid_amount) AS balance,
                SUM(sub.paid_amount)     AS amount,
                SUM(sub.paid_amount)     AS paid_amount,
                SUM(sub.total_amount)    AS total_amount,
                SUM(sub.total_amount) - SUM(sub.paid_amount) AS due_amount
            FROM (
                SELECT
                    /* ===== کلید یگانه ===== */
                    CASE
                        WHEN j.account_id IS NOT NULL
                            THEN 'acc_' || CAST(j.account_id AS TEXT)
                        ELSE j.ref_type || '_' || CAST(j.ref_id AS TEXT)
                    END AS account_key,

                    COALESCE(j.account_id, j.ref_id) AS account_id,

                    /* ===== نوع حساب ===== */
                    COALESCE(a.account_type, j.ref_type) AS account_type,

                    /* ===== نام حساب ===== */
                    COALESCE(
                        a.account_name,

                        (SELECT NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), '')
                         FROM patients p
                         WHERE p.id = COALESCE(j.patient_id, j.ref_id)
                         LIMIT 1),

                        (SELECT NULLIF(TRIM(COALESCE(p2.first_name,'') || ' ' || COALESCE(p2.last_name,'')), '')
                         FROM registrations r
                         INNER JOIN patients p2 ON p2.id = r.patient_id
                         WHERE r.reg_id = COALESCE(j.reg_id, j.ref_id)
                         LIMIT 1),

                        (SELECT NULLIF(TRIM(u.name), '')
                         FROM users u
                         WHERE u.id IN (j.doc_id, j.cust_id, j.supplier_id)
                         LIMIT 1),

                        (SELECT NULLIF(TRIM(ep.patient_name), '')
                         FROM external_prescriptions ep
                         WHERE ep.id = j.ref_id AND j.ref_type = 'external_prescription'
                         LIMIT 1),

                        NULLIF(TRIM(j.description), ''),

                        j.ref_type || ' #' || CAST(j.ref_id AS TEXT)
                    ) AS account_name,

                    /* ===== تذکره ===== */
                    COALESCE(
                        (SELECT p.national_id FROM patients p
                         WHERE p.id = COALESCE(j.patient_id, j.ref_id) LIMIT 1),

                        (SELECT p2.national_id
                         FROM registrations r
                         INNER JOIN patients p2 ON p2.id = r.patient_id
                         WHERE r.reg_id = COALESCE(j.reg_id, j.ref_id)
                         LIMIT 1),

                        (SELECT ep.tazkira_number FROM external_prescriptions ep
                         WHERE ep.id = j.ref_id AND j.ref_type = 'external_prescription'
                         LIMIT 1),

                        j.tazkira_number
                    ) AS tazkira_number,

                    /* ===== شمارش ژورنال‌ها ===== */
                    1 AS journal_count,

                    /* ===== پرداخت واقعی (amount ژورنال) ===== */
                    COALESCE(j.amount, 0) AS paid_amount,

                    /* ===== فیس کل از جدول اصلی ===== */
                    CASE
                        /* ---------- نسخه بیرونی ---------- */
                        WHEN j.ref_type = 'external_prescription' THEN
                            COALESCE(
                                (SELECT ep.total_amount - COALESCE(ep.discount, 0)
                                 FROM external_prescriptions ep
                                 WHERE ep.id = j.ref_id
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- نسخه داخلی ---------- */
                        WHEN j.ref_type = 'prescription_fee' AND j.pres_id IS NOT NULL THEN
                            COALESCE(
                                (SELECT p.net_amount FROM prescriptions p
                                 WHERE p.pres_id = j.pres_id
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- فروش ---------- */
                        WHEN j.ref_type = 'sale' THEN
                            COALESCE(
                                (SELECT s.net_sales FROM sales s
                                 WHERE s.id = j.ref_id
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- خرید ---------- */
                        WHEN j.ref_type = 'parchase' THEN
                            COALESCE(
                                (SELECT pa.total_parchase FROM parchases pa
                                 WHERE pa.parchase_id = j.ref_id
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- فیس‌های دیگر (لابراتوار، رادیولوژی، ...) ---------- */
                        WHEN j.ref_type = 'laboratory_fee' THEN
                            COALESCE(
                                (SELECT lf.amount FROM laboratory_fees lf
                                 WHERE lf.id = j.ref_id
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- patient (فیس مراجعه) ---------- */
                        WHEN j.ref_type = 'patient' THEN
                            COALESCE(
                                (SELECT r.registration_fee FROM registrations r
                                 WHERE r.reg_id = COALESCE(j.reg_id, j.ref_id)
                                 LIMIT 1),
                                COALESCE(j.amount, 0)
                            )

                        /* ---------- پیش‌فرض: همان amount ژورنال ===== */
                        ELSE COALESCE(j.amount, 0)
                    END AS total_amount

                FROM journals j
                LEFT JOIN accounts a ON a.id = j.account_id
            ) AS sub
            GROUP BY
                sub.account_key,
                sub.account_id,
                sub.account_type,
                sub.account_name,
                sub.tazkira_number
        SQL);

        // ============================================================
        // ویو تفصیلی
        // ============================================================
        DB::statement(<<<'SQL'
            CREATE VIEW v_account_journal_detail AS
            SELECT
                j.id            AS journal_id,
                j.journal_date  AS journal_date,
                j.entry_type    AS entry_type,
                j.amount        AS amount,
                j.description   AS description,
                j.ref_type      AS ref_type,
                j.ref_id        AS ref_id,
                j.account_id    AS account_id,
                j.reg_id        AS reg_id,
                j.patient_id    AS patient_id,
                j.pres_id       AS pres_id,
                j.pres_num      AS pres_num,
                j.tazkira_number AS tazkira_number,
                j.parent_journal_id AS parent_journal_id,
                CASE
                    WHEN j.account_id IS NOT NULL
                        THEN 'acc_' || CAST(j.account_id AS TEXT)
                    ELSE j.ref_type || '_' || CAST(j.ref_id AS TEXT)
                END AS account_key
            FROM journals j
        SQL);
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_account_journal_detail");
        DB::statement("DROP VIEW IF EXISTS v_account_summary");
    }
};