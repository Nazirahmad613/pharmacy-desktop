 import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Formik } from "formik";
import * as Yup from "yup";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid2";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import LoadingButton from "@mui/lab/LoadingButton";
import { styled, useTheme } from "@mui/material/styles";

import { Paragraph } from "app/components/Typography";
import MatxDivider from "app/components/MatxDivider";

import { useAuth } from "app/contexts/AuthContext";

const RegisterRoot = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1A2038",
  minHeight: "100vh !important",
  "& .card": { maxWidth: 750, margin: 16, borderRadius: 12 }
});

const initialValues = { email: "", password: "", remember: true };
const validationSchema = Yup.object().shape({
  email: Yup.string().email("ایمیل نادرست است").required("ایمیل ضروری است"),
  password: Yup.string().min(6, "رمز عبور حداقل ۶ حرف باشد").required("رمز عبور ضروری است")
});

export default function Register() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (values) => {
    try {
      setLoading(true);
      await register(values.email, values.password);
      enqueueSnackbar("ثبت نام موفقانه انجام شد", { variant: "success" });
      navigate("/");
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterRoot>
      <Card className="card">
        <Grid container>
          <Grid size={{ md: 6, xs: 12 }}>
            <Box p={4}>
              <MatxDivider sx={{ mt: 3 }} text="Register" />
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleFormSubmit}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                  <form onSubmit={handleSubmit}>
                    <TextField
                      fullWidth
                      size="small"
                      type="email"
                      name="email"
                      label="Email"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.email}
                      onChange={handleChange}
                      helperText={touched.email && errors.email}
                      error={Boolean(errors.email && touched.email)}
                      sx={{ mb: 3 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="password"
                      name="password"
                      label="Password"
                      variant="outlined"
                      onBlur={handleBlur}
                      value={values.password}
                      onChange={handleChange}
                      helperText={touched.password && errors.password}
                      error={Boolean(errors.password && touched.password)}
                      sx={{ mb: 1.5 }}
                    />

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Checkbox
                        size="small"
                        name="remember"
                        onChange={handleChange}
                        checked={values.remember}
                      />
                      <Paragraph>من شرایط و قوانین را خوانده و قبول دارم</Paragraph>
                    </Box>

                    <LoadingButton
                      type="submit"
                      color="primary"
                      loading={loading}
                      variant="contained"
                      fullWidth
                    >
                      Register
                    </LoadingButton>

                    <Paragraph mt={2}>
                      حساب دارید؟
                      <NavLink
                        to="/session/signin"
                        style={{ marginLeft: 5, color: theme.palette.primary.main }}
                      >
                        ورود
                      </NavLink>
                    </Paragraph>
                  </form>
                )}
              </Formik>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </RegisterRoot>
  );
}
