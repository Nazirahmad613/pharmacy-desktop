import { Small } from "app/components/Typography";
import { MatxProgressBar, SimpleCard } from "app/components";
import { useTranslation } from "react-i18next";
// import "...";

export default function Campaigns() {
  const { t } = useTranslation(); // دریافت تابع ترجمه

  return (
    <div>
      <SimpleCard title={t("campaigns")}>
        <Small color="text.secondary">{t("today")}</Small>
        <MatxProgressBar value={75} color="primary" text={t("google_visits", { count: 102 })} />
        <MatxProgressBar value={45} color="secondary" text={t("twitter_visits", { count: 40 })} />
        <MatxProgressBar value={75} color="primary" text={t("tensor_visits", { count: 80 })} />

        <Small color="text.secondary" display="block" pt={4}>
          {t("yesterday")}
        </Small>
        <MatxProgressBar value={75} color="primary" text={t("google_visits", { count: 102 })} />
        <MatxProgressBar value={45} color="secondary" text={t("twitter_visits", { count: 40 })} />
        <MatxProgressBar value={75} color="primary" text={t("tensor_visits", { count: 80 })} />
      </SimpleCard>
    </div>
  );
}
