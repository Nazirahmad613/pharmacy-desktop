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
        // ویو اصلی خلاصه حساب‌ها
        // ============================================================
        DB::statement(<<<'SQL'
            CREATE VIEW v_account_summary AS
            SELECT
                /* ===== کلید یگانه ===== */
                COALESCE(
                    'acc_' || j.account_id,
                    j.ref_type || '_' || j.ref_id
                ) AS account_key,

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
                    (SELECT u.name FROM users u
                     WHERE u.id IN (j.doc_id, j.cust_id, j.supplier_id)
                     LIMIT 1),
                    (SELECT ep.patient_name FROM external_prescriptions ep
                     WHERE ep.id = j.ref_id AND j.ref_type = 'external_prescription'
                     LIMIT 1),
                    NULLIF(TRIM(j.description), ''),
                    j.ref_type || ' #' || j.ref_id
                ) AS account_name,

                /* ===== تذکره ===== */
                COALESCE(
                    a.tazkira_number,
                    (SELECT p.national_id FROM patients p
                     WHERE p.id = COALESCE(j.patient_id, j.ref_id) LIMIT 1),
                    j.tazkira_number
                ) AS tazkira_number,

                /* ===== شمارش ژورنال‌ها ===== */
                COUNT(j.id) AS journal_count,

                /* ============================================================
                 * ✅ اصلاح مهم:
                 * entry_type = 'debit'  → اخذ پول (بدهی مشتری) = total_credit
                 * entry_type = 'credit' → پرداخت پول (پرداخت مشتری) = total_debit
                 * ============================================================ */

                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount END), 0) AS total_debit,

                /* ===== باقی‌مانده ===== */
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount END), 0)
                  - COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount END), 0) AS balance,

                /* ============================================================
                 * ✅ فیلدهای اضافی برای هماهنگی با JournalController@index
                 * که در transform استفاده می‌شوند
                 * ============================================================ */

                /* amount = مبلغ اصلی ژورنال (جمع خالص) */
                COALESCE(SUM(j.amount), 0) AS amount,

                /* paid_amount = مجموع پرداخت‌ها (credit) */
                COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount END), 0) AS paid_amount,

                /* total_amount = مجموع فاکتور (debit) */
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit' THEN j.amount END), 0) AS total_amount,

                /* due_amount = باقی‌مانده */
                COALESCE(SUM(CASE WHEN j.entry_type = 'debit'  THEN j.amount END), 0)
                  - COALESCE(SUM(CASE WHEN j.entry_type = 'credit' THEN j.amount END), 0) AS due_amount

            FROM journals j
            LEFT JOIN accounts a ON a.id = j.account_id

            /* ✅ فقط ژورنال‌های ریشه (نه فرزندان) تا دوبار شمرده نشوند */
            WHERE j.parent_journal_id IS NULL

            GROUP BY
                COALESCE(
                    'acc_' || j.account_id,
                    j.ref_type || '_' || j.ref_id
                )
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
                COALESCE(
                    'acc_' || j.account_id,
                    j.ref_type || '_' || j.ref_id
                ) AS account_key
            FROM journals j
        SQL);
    }

    public function down(): void
    {
        DB::statement("DROP VIEW IF EXISTS v_account_journal_detail");
        DB::statement("DROP VIEW IF EXISTS v_account_summary");
    }
};