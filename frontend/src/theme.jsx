import { createTheme } from "@mui/material/styles";

const getTheme = (direction) => {
  return createTheme({
    direction: direction,
  });
};

export default getTheme;