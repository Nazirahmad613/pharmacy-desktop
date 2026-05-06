import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import Loading from "./MatxLoading";

const Loadable = (Component) => (props) => {
  const { t } = useTranslation(); // اضافه کردن ترجمه

  return (
    <Suspense fallback={<Loading text={t("loading.message")} />}>
      <Component {...props} />
    </Suspense>
  );
};

export default Loadable;
