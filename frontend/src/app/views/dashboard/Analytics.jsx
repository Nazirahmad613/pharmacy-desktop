import { Fragment, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import MainLayoutjur from "../../../components/Mainlayoutjur";
import MedicationStockChart from "../material-kit/reports/medication-stock/MedicationStockChart";
import SalesChart from "../material-kit/reports/sales/SalesChart";
import DashboardDailyChart from "../material-kit/reports/dashboard/DashboardDailyChart";
import BenefitsChart from "../material-kit/reports/BenefitsChart";
import SimpleClock from "../material-kit/SimpleClock";
import NavigationHub from "../../../modules/NavigationHub";
import MatxLoading from "../../components/MatxLoading";

const ContentBox = styled("div")(({ theme }) => ({
  margin: "2rem",
  [theme.breakpoints.down("sm")]: { margin: "1rem" }
}));

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <div style={{ textAlign: "right", marginBottom: "1rem" }}>
      <button style={{background:"green",color:"white"}}onClick={() => changeLanguage('en')}>English</button>
      <button style={{background:"blue",color:"white"}} onClick={() => changeLanguage('fa')}>فارسی</button>
    </div>
  );
};

export default function Analytics() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayoutjur>  {/* فقط MainLayoutjur - حذف AnimatedBackground */}
      <Fragment>
        {/* هدر بالا */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 1,
            backgroundColor: 'transparent',
          }}
        >
          <SimpleClock />
          <LanguageSwitcher />
        </Box>

        {/* لودینگ ماشین در بالای صفحه */}
        {isLoading && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            py: 2,
            mb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}>
            <MatxLoading isComplete={false} isSmall={true} />
          </Box>
        )}

        <ContentBox className="analytics">
          <Box sx={{ mb: 4 }}>
            <NavigationHub />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 400, overflow: "auto", px: 3, py: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <DashboardDailyChart />
                <Box mt={2} textAlign="center">
                  <Link to="/reports/DashboardDailyTable" style={{ textDecoration: "none" }}>
                    مشاهده جزئیات گزارش روزانه
                  </Link>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: 400, display: "flex", flexDirection: "column", px: 3, py: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <MedicationStockChart />
                </Box>
                <Box mt={2} textAlign="center">
                  <Link to="/reports/MedicationStockTable">
                    <Button variant="outlined">دیدن جزئیات</Button>
                  </Link>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ px: 3, py: 2, height: "100%", backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <BenefitsChart />
                    <Box mt={2} textAlign="center">
                      <Link to="/reports/benefits" style={{ textDecoration: "none" }}>
                        مشاهده جزئیات گزارش فواید
                      </Link>
                    </Box>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ px: 2, py: 2, height: "100%", backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <SalesChart />
                    <Box mt={2} textAlign="center">
                      <Link to="/reports/sales-table" style={{ textDecoration: "none" }}>
                        جزئیات بیشتر فروش
                      </Link>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </ContentBox>
      </Fragment>
    </MainLayoutjur>
  );
}