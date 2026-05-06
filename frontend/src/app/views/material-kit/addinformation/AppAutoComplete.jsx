import Box from "@mui/material/Box";
import styled from "@mui/material/styles/styled";
import { useTranslation } from "react-i18next";
import { Breadcrumb, SimpleCard } from "app/components";
import AsyncAutocomplete from "./AsyncAutocomplete";
import AutocompleteCombo from "./AutocompleteCombo";
import BadgeAutocomplete from "./BadgeAutocomplete";

const Container = styled("div")(({ theme }) => ({
  margin: "30px",
  [theme.breakpoints.down("sm")]: { margin: "16px" },
  "& .breadcrumb": {
    marginBottom: "30px",
    [theme.breakpoints.down("sm")]: { marginBottom: "16px" }
  }
}));

export default function AppAutoComplete() {
  const { t } = useTranslation(); // استفاده از ترجمه

  return (
    <Container>
      <Box className="breadcrumb">
        <Breadcrumb
          routeSegments={[
            { name: t("material"), path: "/material" }, 
            { name: t("autocomplete") }
          ]}
        />
      </Box>

      <SimpleCard title={t("autocomplete_combo")}>
        <AutocompleteCombo />
      </SimpleCard>

      <Box py="12px" />

      <SimpleCard title={t("async_autocomplete")}>
        <AsyncAutocomplete />
      </SimpleCard>

      <Box py="12px" />

      <SimpleCard title={t("badge_autocomplete")}>
        <BadgeAutocomplete />
      </SimpleCard>
    </Container>
  );
}
